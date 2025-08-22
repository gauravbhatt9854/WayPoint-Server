// server.js
import http from "http";
import express from "express";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socketHandlers.js";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);

const AllowedUrl = process.env.CLIENT_ORIGINS.split(',');

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || AllowedUrl.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by Socket.IO CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

registerSocketHandlers(io);

export { app, server };