import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*", // Change for production
    methods: ["GET", "POST"],
  },
});

// In-memory store of users
let clients = {}; // { socketId: { username, profileUrl, lat, lng } }

// WebSocket connection
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);


  // User registration
  socket.on("register", ({ username, profileUrl , lat , lng }) => {
    clients[socket.id] = {
      username,
      profileUrl,
      lat,
      lng
    };
    console.log(`👤 Registered: ${username}`);
  });

  // Location update (every 5s from client)
  socket.on("locationUpdate", ({ lat, lng }) => {
    if (clients[socket.id]) {
      clients[socket.id].lat = lat;
      clients[socket.id].lng = lng;
    } else {
      console.warn(`⚠️ Location from unregistered user: ${socket.id}`);
    }
  });

  // Chat message
  socket.on("chatMessage", (message) => {
    const sender = clients[socket.id];

    if (!sender) {
      console.warn(`⚠️ Chat from unregistered socket: ${socket.id}`);
      return;
    }

    const chatData = {
      id: socket.id,
      username: sender.username,
      profileUrl: sender.profileUrl,
      message: message,
      timestamp: new Date(),
    };

    // Send to all except sender
    socket.broadcast.emit("newChatMessage", chatData);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const user = clients[socket.id];
    if (user) {
      console.log(`❌ Disconnected: ${user.username}`);
      delete clients[socket.id];
    } else {
      console.log(`❌ Unregistered user disconnected: ${socket.id}`);
    }
  });
});

// Broadcast all clients’ locations every 10 seconds
setInterval(() => {
  const locations = Object.entries(clients).map(([id, data]) => ({
    id,
    username: data.username,
    profileUrl: data.profileUrl,
    lat: data.lat,
    lng: data.lng,
  }));

  io.emit("allLocations", locations);
}, 10000);

// ────────────── HTTP ROUTES ──────────────

// Health check
app.get("/", (req, res) => {
  res.send("✅ Real-time location server is running!");
});

// See all connected clients (for testing)
app.get("/clients", (req, res) => {
  const result = Object.entries(clients).map(([id, data]) => ({
    id,
    ...data,
  }));
  res.json(result);
});

// Reset all clients (useful for dev)
app.post("/reset", (req, res) => {
  clients = {};
  io.emit("allLocations", []);
  res.send("🔄 All clients have been reset.");
});

// ────────────── EXPORT ──────────────
export { app, server };