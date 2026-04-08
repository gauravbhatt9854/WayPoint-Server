// routes.js
import express from "express";
import { getAllClients, resetClients } from "../server/clients.js";
const router = express.Router();

router.get("/api", (req, res) => {
  res.send("✅ Real-time location server is running!");
});

router.get("/clients", (req, res) => {
  res.json(getAllClients());
});

router.post("/reset", (req, res) => {
  resetClients();
  res.send("🔄 All clients have been reset.");
});

export default router;