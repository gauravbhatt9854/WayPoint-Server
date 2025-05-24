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

(async () => {
  const { pubClient, subClient } = await createRedisClients();
  io.adapter(createAdapter(pubClient, subClient));

  const broadcastClients = async () => {
    try {
      const rawClients = await pubClient.hvals(clientsKey);
      const parsedClients = rawClients.map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }).filter(Boolean);
      io.emit("allUsers", parsedClients);
    } catch (err) {
      console.error("🚨 Broadcast failed:", err);
    }
  };

  io.use(async (socket, next) => {
    // Middleware to prevent unregistered clients from sending messages
    socket.onAny(async (event, ...args) => {
      if (event === "chatMessage") {
        const exists = await pubClient.hexists(clientsKey, socket.id);
        if (!exists) {
          socket.emit("error", { message: "Please register first" });
        }
      }
    });
    next();
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

      const clientData = {
        id: socket.id,
        l1,
        l2,
        username: username.trim(),
        profileUrl: profileUrl || "",
      };

      await pubClient.hset(clientsKey, socket.id, JSON.stringify(clientData));
      await broadcastClients();

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

      const raw = await pubClient.hget(clientsKey, socket.id);
      if (!raw) return;

      const client = JSON.parse(raw);
      client.l1 = l1;
      client.l2 = l2;

      await pubClient.hset(clientsKey, socket.id, JSON.stringify(client));
      await broadcastClients();
    });

    socket.on("chatMessage", async (message) => {
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

      socket.broadcast.emit("newChatMessage", chat);
    });

    socket.on("disconnect", async () => {
      console.log(`👋 Disconnected: ${socket.id}`);
      await pubClient.hdel(clientsKey, socket.id);
      await broadcastClients();
    });
  });
})();

export { app, server };