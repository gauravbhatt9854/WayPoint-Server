import http from "http";
import express from "express";
import { Server } from "socket.io";
import os from "os";
import { createRedisClients } from "../config/redis.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_ORIGINS?.split(",") || [];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  },
});

const clientsKey = "socket:clients";

(async () => {
  const { pubClient } = await createRedisClients();

  io.on("connection", (socket) => {
    console.log(`✅ A user connected with socket id: ${socket.id}`);

    socket.emit("setCookie", {
      name: "userSession",
      value: os.hostname(),
      options: {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    });

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
        io.emit("userUpdate", clientData); // Send only the new client
      } catch (error) {
        console.error(`❌ Error registering client: ${error.message}`);
        socket.emit("error", { message: "Failed to register client" });
      }
    });

    socket.on("loc-res", async ({ l1, l2 }) => {
      try {
        if (typeof l1 !== "number" || typeof l2 !== "number" || l1 < -90 || l1 > 90 || l2 < -180 || l2 > 180) {
          socket.emit("error", { message: "Invalid coordinates" });
          return;
        }

        const rawClient = await pubClient.hget(clientsKey, socket.id);
        if (rawClient) {
          const client = JSON.parse(rawClient);
          client.l1 = l1;
          client.l2 = l2;

          await pubClient.hset(clientsKey, socket.id, JSON.stringify(client));
          io.emit("userUpdate", client); // Send only the updated client
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
        io.emit("userRemoved", { id: socket.id }); // Notify clients of removal
      } catch (error) {
        console.error(`❌ Error handling disconnect: ${error.message}`);
      }
    });
  });
})();

export { app, server };