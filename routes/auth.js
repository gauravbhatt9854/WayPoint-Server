import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const router = express.Router();

// 🔑 put this in env ideally
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  const { token } = req.body;


  if (!token) {
    return res.status(400).json({ message: "Token missing" });
  }

  try {
    // ✅ verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, name, picture} = payload;

    // 🧠 TODO: Replace this with DB logic
    // Example:
    // let user = await User.findOne({ email });
    // if (!user) user = await User.create({ email, name, picture });

    const user = {

      id: email, // temporary (use DB id in real app)
      email,
      name,
      picture
    };

    // ✅ create your JWT
    const appToken = jwt.sign(
      { userId: user.id, email: user.email , name: user.name , picture: user.picture},
      JWT_SECRET,
      { expiresIn: "1h" }
    );

return res
  .cookie("token", appToken, {
    httpOnly: true,              // JS cannot access (security)
    secure: false,                // true in production (HTTPS)
    sameSite: "lax",          // CSRF protection
    maxAge: 60 * 60 * 1000,      // 1 hour
  })
  .json({
    user,
  });

  } catch (err) {
    console.error(err);
    return res.status(401)
    .json({ message: "Invalid Google token" });
  }
});



router.get("/me", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    return res.json({
      user: {
        name: decoded.name,
        userId: decoded.userId,
        email: decoded.email,
        picture: decoded.picture
      },
    });

  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
});


router.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

export default router;