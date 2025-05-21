import {app , server} from './server/server.js'
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
    origin: "*", // Allow all origins for testing; change if you want credentials/cookies
    methods: ["GET", "POST"],
    // credentials: true, // Uncomment only if you set a specific origin above
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
