import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

const authenticateUser = (req, res, next) => {

  console.log("Authenticating user...");
  const JWT_SECRET = process.env.JWT_SECRET;
  console.log("JWT_SECRET:", JWT_SECRET);
  const token = req.cookies?.access_token;
  if (!token) {  
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user; // attach user info to request
    console.log("middleware: Authenticated user:", user);
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authenticateUser;