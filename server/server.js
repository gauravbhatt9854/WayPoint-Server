import http from "http";
import express from "express";
import { Server } from "socket.io";
import os from "os";
import { createRedisClients } from "../config/redis.js";
import { createAdapter } from "@socket.io/redis-adapter";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
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
      const allClientsRaw = await pubClient.hvals(clientsKey);
      const allClients = allClientsRaw.map((item) => JSON.parse(item));
      io.emit("allUsers", allClients);
    } catch (err) {
      console.error("🔁 Failed to broadcast clients", err);
    }
  };

  setInterval(broadcastClients, 30000); // Re-broadcast every 30 seconds just in case

  io.on("connection", async (socket) => {
    console.log(`✅ Connected: ${socket.id}`);

    await broadcastClients(); // sync client immediately

    socket.on("register", async ({ l1, l2, username, profileUrl }) => {
      if (
        !username?.trim() ||
        typeof l1 !== "number" ||
        typeof l2 !== "number" ||
        l1 < -90 || l1 > 90 || l2 < -180 || l2 > 180
      ) {
        socket.emit("error", { message: "Invalid registration data or coordinates" });
        return;
      }

      const clientData = {
        id: socket.id,
        l1,
        l2,
        username: username.trim(),
        profileUrl: profileUrl || "",
      };

      await pubClient.hset(clientsKey, socket.id, JSON.stringify(clientData));
      console.log(`🔐 Registered ${username} at ${l1},${l2}`);
      await broadcastClients();

      socket.emit("setCookie", {
        name: "userSession",
        value: os.hostname(),
        options: {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        },
      });
    });

    socket.on("loc-res", async ({ l1, l2 }) => {
      if (typeof l1 !== "number" || typeof l2 !== "number") return;

      const rawClient = await pubClient.hget(clientsKey, socket.id);
      if (rawClient) {
        const client = JSON.parse(rawClient);
        client.l1 = l1;
        client.l2 = l2;

        await pubClient.hset(clientsKey, socket.id, JSON.stringify(client));
        await broadcastClients();
      }
    });

    socket.on("chatMessage", async (message) => {
      const rawClient = await pubClient.hget(clientsKey, socket.id);
      if (!rawClient) {
        socket.emit("error", { message: "Please register first." });
        return;
      }

      const sender = JSON.parse(rawClient);
      const chatData = {
        username: sender.username,
        message,
        profileUrl: sender.profileUrl,
        timestamp: new Date().toISOString(),
      };

      socket.broadcast.emit("newChatMessage", chatData);
    });

    socket.on("disconnect", async () => {
      console.log(`🚪 Disconnected: ${socket.id}`);
      await pubClient.hdel(clientsKey, socket.id);
      await broadcastClients();
    });
  });
})();
