import http from "http";
import express from "express";
import { Server } from "socket.io";
import { createRedisClients } from "../config/redis.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Replace with specific origins in production
    methods: ["GET", "POST"],
  },
});

const clientsKey = "socket:clients";

(async () => {
  const { pubClient, subClient } = await createRedisClients();

  io.on("connection", (socket) => {
    console.log("✅ A user connected with socket id:", socket.id);

    socket.emit('setCookie', {
      name: 'userSession',
      value: os.hostname(), // dynamically sets the server hostname
      options: {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }
    });

    socket.on("register", async ({ l1, l2, username, profileUrl }) => {
      const clientData = {
        id: socket.id,
        l1,
        l2,
        username,
        profileUrl,
      };

      // Store client in Redis hash
      await pubClient.hset(clientsKey, socket.id, JSON.stringify(clientData));

      console.log(`🔐 Registered client: ${username} at ${l1}, ${l2}`);

      // Emit updated clients to all
      const allClientsRaw = await pubClient.hvals(clientsKey);
      const allClients = allClientsRaw.map((c) => JSON.parse(c));
      io.emit("allUsers", allClients);
    });

    socket.on("loc-res", async ({ l1, l2 }) => {
      const rawClient = await pubClient.hget(clientsKey, socket.id);
      if (rawClient) {
        const client = JSON.parse(rawClient);
        client.l1 = l1;
        client.l2 = l2;

        await pubClient.hset(clientsKey, socket.id, JSON.stringify(client));
        const allClientsRaw = await pubClient.hvals(clientsKey);
        const allClients = allClientsRaw.map((c) => JSON.parse(c));
        io.emit("allUsers", allClients);
      }
    });

    socket.on("chatMessage", async (message) => {
      const rawClient = await pubClient.hget(clientsKey, socket.id);
      if (rawClient) {
        const sender = JSON.parse(rawClient);
        const chatData = {
          username: sender.username,
          message,
          profileUrl: sender.profileUrl,
          timestamp: new Date(),
        };
        socket.broadcast.emit("newChatMessage", chatData);
        console.log(`📨 Message from ${sender.username}: ${message}`);
      } else {
        console.log("⚠️ Message received from unregistered user.");
      }
    });

    socket.on("disconnect", async () => {
      console.log("🚪 User disconnected:", socket.id);
      await pubClient.hdel(clientsKey, socket.id);

      const allClientsRaw = await pubClient.hvals(clientsKey);
      const allClients = allClientsRaw.map((c) => JSON.parse(c));
      io.emit("allUsers", allClients);
    });
  });
})();

export { app, server };
