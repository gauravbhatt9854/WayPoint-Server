// server.js
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import router from "./routes.js";
import { registerSocketHandlers } from "./socketHandlers.js";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use("/", router);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

registerSocketHandlers(io);

export { app, server };