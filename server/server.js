import http from "http";
import express from "express";
import { Server } from "socket.io";
import os from "os"; // Added missing import
import { createRedisClients } from "../config/redis.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const clientsKey = "socket:clients";

(async () => {
  const { pubClient } = await createRedisClients(); // Removed unused subClient

  io.on("connection", (socket) => {
    console.log("✅ A user connected with socket id:", socket.id);

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
        if (!username || typeof l1 !== "number" || typeof l2 !== "number") {
          socket.emit("error", { message: "Invalid registration data" });
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

        const allClientsRaw = await pubClient.hvals(clientsKey);
        const allClients = allClientsRaw
          .map((c) => {
            try {
              return JSON.parse(c);
            } catch {
              return null;
            }
          })
          .filter((c) => c !== null);
        io.emit("allUsers", allClients);
      } catch (error) {
        console.error(`❌ Error registering client: ${error.message}`);
        socket.emit("error", { message: "Failed to register client" });
      }
    });

    socket.on("loc-res", async ({ l1, l2 }) => {
      try {
        const rawClient = await pubClient.hget(clientsKey, socket.id);
        if (rawClient) {
          const client = JSON.parse(rawClient);
          client.l1 = l1;
          client.l2 = l2;

          await pubClient.hset(clientsKey, socket.id, JSON.stringify(client));
          const allClientsRaw = await pubClient.hvals(clientsKey);
          const allClients = allClientsRaw
            .map((c) => {
              try {
                return JSON.parse(c);
              } catch {
                return null;
              }
            })
            .filter((c) => c !== null);
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
          timestamp: Date.now(), // Changed to Unix timestamp
        };
        socket.broadcast.emit("newChatMessage", chatData);
        console.log(`📨 Message from ${sender.username}: ${message}`);
      } catch (error) {
        console.error(`❌ Error processing chat message: ${error.message}`);
      }
    });

    socket.on("disconnect", async () => {
      try {
        console.log("🚪 User disconnected:", socket.id);
        await pubClient.hdel(clientsKey, socket.id);

        const allClientsRaw = await pubClient.hvals(clientsKey);
        const allClients = allClientsRaw
          .map((c) => {
            try {
              return JSON.parse(c);
            } catch {
              return null;
            }
          })
          .filter((c) => c !== null);
        io.emit("allUsers", allClients);
      } catch (error) {
        console.error(`❌ Error handling disconnect: ${error.message}`);
      }
    });
  });
})();

export { app, server };