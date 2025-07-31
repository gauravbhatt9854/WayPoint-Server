// server.js
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import router from "./routes.js";
import { registerSocketHandlers } from "./socketHandlers.js";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use("/", router);

let AllowedUrl = process.env.CLIENT_ORIGINS.split(',');

const io = new Server(server, {
  cors: {
    origin: AllowedUrl || ["*"],
    methods: ["GET", "POST"]
  }
});

registerSocketHandlers(io);

export { app, server };