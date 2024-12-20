import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with specific origins in production
    methods: ["GET", "POST"],
  },
});

let clients = [];

// Handle incoming socket connections
io.on("connection", (socket) => {
  console.log("A user connected with socket id:", socket.id);

  socket.emit('setCookie', {
    name: 'userSession',
    value: "server-01",   // Example value
    options: {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,  // 7 days
    }
  });

  socket.on("loc-res", ({ l1, l2, username, profileUrl }) => {
    const existing = clients.find((co) => co.id === socket.id);
    if (existing) {
      // Update existing client's location and profile URL
      existing.l1 = l1;
      existing.l2 = l2;
    } else {
      // Add new client
      let newClient = {
        id: socket.id,
        l1: l1,
        l2: l2,
        username: username,
        profileUrl: profileUrl,
      };
      clients.push(newClient);
    }
    console.log(l1, " <<--->> ", l2);
    clients.map((item) => {
      console.log(item.username);
    });
    io.emit("allLocations", clients); // Send updated locations and profile URLs to all clients
  });

  socket.on("chatMessage", (message) => {
    const sender = clients.find((client) => client.id === socket.id);
    if (sender) {
      const chatData = {
        username: sender.username,
        message: message,
        profileUrl: sender.profileUrl,
        timestamp: new Date(),
      };
      console.log("chat rec in backend");
      socket.broadcast.emit("newChatMessage", chatData); // Broadcast message to everyone except the sender
      console.log(`Message from ${sender.username}: ${message}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    clients = clients.filter((client) => client.id !== socket.id); // Remove disconnected client
    io.emit("allLocations", clients); // Update all clients with the current locations
  });
});

export { app, server };
