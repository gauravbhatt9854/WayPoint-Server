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

  socket.on("register", ({ l1, l2, username, profileUrl }) => {
    const existingClientIndex = clients.findIndex(client => client.id === socket.id);
  
    if (existingClientIndex !== -1) {
      // Replace the existing client with updated information
      clients[existingClientIndex] = {
        id: socket.id,
        l1: l1,
        l2: l2,
        username: username,
        profileUrl: profileUrl,
      };
      console.log(`Updated client: ${username} at ${l1}, ${l2}`);
    } else {
      // Add a new client
      let newClient = {
        id: socket.id,
        l1: l1,
        l2: l2,
        username: username,
        profileUrl: profileUrl,
      };
      console.log(`New client added while register: ${username} at ${l1}, ${l2}`);
      clients.push(newClient);
    }
  
    // Emit the updated list of clients to all connected clients
    io.emit("allUsers", clients);
  });
  

  socket.on("loc-res", ({ l1, l2 }) => {
    const existing = clients.find((co) => co.id === socket.id);

    if (existing) {
      existing.l1 = l1;
      existing.l2 = l2;
    }
    io.emit("allUsers", clients); // Send updated locations and profile URLs to all clients
  })

  socket.on("chatMessage", (message) => {
    const sender = clients.find((client) => client.id === socket.id);
    if (sender) {
      const chatData = {
        username: sender.username,
        message: message,
        profileUrl: sender.profileUrl,
        timestamp: new Date(),
      };
      socket.broadcast.emit("newChatMessage", chatData); // Broadcast message to everyone except the sender
      console.log(`Message from ${sender.username}: ${message}`);
    }
    else console.log("Message received from an unregistered");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    clients = clients.filter((client) => client.id !== socket.id); // Remove disconnected client
    io.emit("allUsers", clients); // Update all clients with the current locations
  });
});

export { app, server };
