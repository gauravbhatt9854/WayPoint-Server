import http from "http"
import express from "express"
import { Server } from "socket.io"
import clientRouter from "../routes/client.js"
import authRouter from "../routes/auth.js";
import { registerSocketHandlers } from "./socketHandlers.js"
import cors from 'cors';
import cookieParser from "cookie-parser";

const app = express();
const server = http.createServer(app)

const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(",")

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


app.use(cookieParser());
app.use(express.json())
app.use("/", clientRouter);
app.use("/auth" , authRouter);


const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
})

registerSocketHandlers(io)

export { app, server }