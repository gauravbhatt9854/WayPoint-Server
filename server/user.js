import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import authenticateUser from '../middleware/auth.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET;

// Google OAuth login
router.post("/auth/google", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "No token provided" });

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    const serverToken = jwt.sign(
      { username: payload.name , picture: payload.picture , email: payload.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("access_token", serverToken, {
      httpOnly: true,
      secure: false, // true in production with https
      sameSite: "Strict",
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

// Protected route /me
router.get("/me", authenticateUser, (req, res) => {
  res.json({ user: req.user });
});

export default router;