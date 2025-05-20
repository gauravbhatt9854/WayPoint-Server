import { app, server } from "./server/server.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import os from "os";

dotenv.config();

const allowedOrigins = process.env.CLIENT_ORIGINS?.split(",") || [];
const PORT = parseInt(process.env.PORT, 10) || 8000;

if (!allowedOrigins.length) {
  console.warn("⚠️ CLIENT_ORIGINS not set; CORS may block all origins.");
}

app.use(
  cors({
    // origin: (origin, callback) => {
    //   if (allowedOrigins.includes(origin) || !origin) {
    //     callback(null, true);
    //   } else {
    //     callback(new Error("Not allowed by CORS"));
    //   }
    // },
    origin:"*",
  })
);

app.use(bodyParser.json());

app.get("/", (req, res) => {
  const hostname = os.hostname();
  res.send(`Welcome from ${hostname}`);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});