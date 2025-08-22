// routes.js
import express from "express";
import authenticateUser from "../middleware/auth.js";
import { getAllClients, resetClients } from "./clients.js";
const router = express.Router();

router.get("/api", (req, res) => {
  res.send("✅ Real-time location server is running!");
});

router.get("/clients", authenticateUser, (req, res) => {
  res.json(getAllClients());
});

router.post("/reset", (req, res) => {
  resetClients();
  res.send("🔄 All clients have been reset.");
});

export default router;