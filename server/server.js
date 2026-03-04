import http from "http"
import express from "express"
import { Server } from "socket.io"
import router from "./routes.js"
import { registerSocketHandlers } from "./socketHandlers.js"
import cors from 'cors';

const app = express()
const server = http.createServer(app)

const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(",")

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json())
app.use("/", router)


const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
})

registerSocketHandlers(io)

export { app, server }