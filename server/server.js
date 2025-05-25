import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import os from "os";
import { createRedisClients } from "../config/redis.js";
import { createAdapter } from "@socket.io/redis-adapter";

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true,
}));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const clientsKey = "socket:clients";
const chatChannel = "chat:messages";

(async () => {
  const { pubClient, subClient } = await createRedisClients();
  io.adapter(createAdapter(pubClient, subClient));

  let broadcastTimeout;
  const debounceBroadcast = () => {
    if (broadcastTimeout) clearTimeout(broadcastTimeout);
    broadcastTimeout = setTimeout(broadcastClients, 200);
  };

  const broadcastClients = async () => {
    try {
      const rawClients = await pubClient.hvals(clientsKey);
      const parsedClients = rawClients
        .map(raw => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      io.emit("allUsers", parsedClients);
    } catch (err) {
      console.error("🚨 Broadcast failed:", err);
    }
  };

  const updateLastSeen = async (id) => {
    try {
      const raw = await pubClient.hget(clientsKey, id);
      if (!raw) return false;
      const client = JSON.parse(raw);
      client.lastSeen = Date.now();
      await pubClient.hset(clientsKey, id, JSON.stringify(client));
      return true;
    } catch {
      await pubClient.hdel(clientsKey, id);
      return false;
    }
  };

  // 🔁 Cleanup stale clients every 60 seconds
  setInterval(async () => {
    try {
      const allClients = await pubClient.hgetall(clientsKey);
      const now = Date.now();
      const threshold = 90 * 1000;

      for (const [id, raw] of Object.entries(allClients)) {
        try {
          const client = JSON.parse(raw);
          if (!client.lastSeen || now - client.lastSeen > threshold) {
            await pubClient.hdel(clientsKey, id);
            console.log(`🧹 Removed stale client: ${id}`);
          }
        } catch {
          await pubClient.hdel(clientsKey, id);
        }
      }

      await broadcastClients();
    } catch (err) {
      console.error("🧨 Cleanup error:", err);
    }
  }, 60000);

  // 📡 Listen for chat messages from Redis pub/sub
  subClient.subscribe(chatChannel, (err) => {
    if (err) console.error("❌ Failed to subscribe to chat channel:", err);
  });

  subClient.on("message", (channel, message) => {
    if (channel === chatChannel) {
      try {
        const chat = JSON.parse(message);
        io.local.emit("newChatMessage", chat); // ✅ emit only to local clients
      } catch (e) {
        console.error("📭 Invalid chat message:", e);
      }
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔗 Connected: ${socket.id}`);
    broadcastClients();

    socket.on("register", async ({ l1, l2, username, profileUrl }) => {
      if (
        !username?.trim() ||
        typeof l1 !== "number" || typeof l2 !== "number" ||
        l1 < -90 || l1 > 90 || l2 < -180 || l2 > 180
      ) {
        return socket.emit("error", { message: "Invalid registration" });
      }

      await pubClient.hdel(clientsKey, socket.id);

      const clientData = {
        id: socket.id,
        l1,
        l2,
        username: username.trim(),
        profileUrl: profileUrl || "",
        lastSeen: Date.now(),
      };

      await pubClient.hset(clientsKey, socket.id, JSON.stringify(clientData));
      debounceBroadcast();

      socket.emit("setCookie", {
        name: "userSession",
        value: os.hostname(),
        options: {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        },
      });

      console.log(`📝 Registered ${username} @ ${l1},${l2}`);
    });

    socket.on("loc-res", async ({ l1, l2 }) => {
      if (typeof l1 !== "number" || typeof l2 !== "number") return;

      try {
        const raw = await pubClient.hget(clientsKey, socket.id);
        if (!raw) return;
        const client = JSON.parse(raw);
        client.l1 = l1;
        client.l2 = l2;
        client.lastSeen = Date.now();
        await pubClient.hset(clientsKey, socket.id, JSON.stringify(client));
        debounceBroadcast();
      } catch {
        await pubClient.hdel(clientsKey, socket.id);
      }
    });

    socket.on("heartbeat", async () => {
      await updateLastSeen(socket.id);
    });

    socket.on("chatMessage", async (message) => {
      try {
        const raw = await pubClient.hget(clientsKey, socket.id);
        if (!raw) {
          return socket.emit("error", { message: "Please register first" });
        }
        const sender = JSON.parse(raw);
        const chat = {
          username: sender.username,
          profileUrl: sender.profileUrl,
          message,
          timestamp: new Date().toISOString(),
        };

        // Publish message to Redis
        await pubClient.publish(chatChannel, JSON.stringify(chat));
      } catch {
        await pubClient.hdel(clientsKey, socket.id);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`👋 Disconnected: ${socket.id}`);
      await pubClient.hdel(clientsKey, socket.id);
      await broadcastClients();
    });
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("🛑 Shutting down...");
    try {
      await pubClient.quit();
      await subClient.quit();
    } catch (err) {
      console.error("Error during Redis shutdown:", err);
    }
    server.close(() => process.exit(0));
  });
})();

export { app, server };
