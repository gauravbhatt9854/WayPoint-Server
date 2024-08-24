import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io"; // Correct import for socket.io

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const clients = [];

// Handle incoming socket connections
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("loc-res", ({ l1, l2, name }) => {
    const existing = clients.find((co) => co.id === socket.id);
    if (existing) {
      existing.l1 = l1;
      existing.l2 = l2;
    } else {
      let newC = { id: socket.id, l1: l1, l2: l2, name: name };
      clients.push(newC);
    }
    console.log(l1, " <--> ", l2);
    io.emit("allLocations", clients);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

export { app, server };
