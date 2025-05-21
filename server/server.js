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
    origin: "*", // Allow all origins for testing; change to exact origins if you want to support credentials/cookies
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const clientsKey = "socket:clients";

(async () => {
  const { pubClient, subClient } = await createRedisClients();

  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", async (socket) => {
    console.log(`✅ User connected with socket id: ${socket.id}`);

    // On connection send all current clients
    const allClientsRaw = await pubClient.hvals(clientsKey);
    const allClients = allClientsRaw.map((item) => JSON.parse(item));
    socket.emit("allUsers", allClients);

    // Listen for registration
    socket.on("register", async ({ l1, l2, username, profileUrl }) => {
      try {
        if (
          !username?.trim() ||
          typeof l1 !== "number" ||
          typeof l2 !== "number" ||
          l1 < -90 ||
          l1 > 90 ||
          l2 < -180 ||
          l2 > 180
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
        console.log(`🔐 Registered client: ${username} at ${l1}, ${l2}`);

        // Broadcast updated client list
        const allClientsRaw = await pubClient.hvals(clientsKey);
        const allClients = allClientsRaw.map((item) => JSON.parse(item));
        io.emit("allUsers", allClients);

        // Send cookie-setting info to client
        socket.emit("setCookie", {
          name: "userSession",
          value: os.hostname(),
          options: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
            path: "/",
          },
        });

      } catch (error) {
        console.error(`❌ Error registering client: ${error.message}`);
        socket.emit("error", { message: "Failed to register client" });
      }
    });

    socket.on("loc-res", async ({ l1, l2 }) => {
      try {
        if (
          typeof l1 !== "number" ||
          typeof l2 !== "number" ||
          l1 < -90 ||
          l1 > 90 ||
          l2 < -180 ||
          l2 > 180
        ) {
          socket.emit("error", { message: "Invalid coordinates" });
          return;
        }

        const rawClient = await pubClient.hget(clientsKey, socket.id);
        if (rawClient) {
          const client = JSON.parse(rawClient);
          client.l1 = l1;
          client.l2 = l2;

          await pubClient.hset(clientsKey, socket.id, JSON.stringify(client));

          const allClientsRaw = await pubClient.hvals(clientsKey);
          const allClients = allClientsRaw.map((item) => JSON.parse(item));
          io.emit("allUsers", allClients);
        }
      } catch (error) {
        console.error(`❌ Error updating location: ${error.message}`);
      }
    });

    socket.on("chatMessage", async (message) => {
      try {
        const rawClient = await pubClient.hget(clientsKey, socket.id);
        if (!rawClient) {
          socket.emit("error", { message: "You must register before sending messages" });
          console.log("⚠️ Message received from unregistered user.");
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
        console.log(`📨 Message from ${sender.username}: ${message}`);
      } catch (error) {
        console.error(`❌ Error processing chat message: ${error.message}`);
      }
    });

    socket.on("disconnect", async () => {
      try {
        console.log(`🚪 User disconnected: ${socket.id}`);

        await pubClient.hdel(clientsKey, socket.id);

        const allClientsRaw = await pubClient.hvals(clientsKey);
        const allClients = allClientsRaw.map((item) => JSON.parse(item));
        io.emit("allUsers", allClients);
      } catch (error) {
        console.error(`❌ Error handling disconnect: ${error.message}`);
      }
    });
  });
})();

export { app, server };
