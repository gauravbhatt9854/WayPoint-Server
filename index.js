import { app, server } from "./server/server.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import os from 'os';

dotenv.config();
const allowedOrigins = process.env.CLIENT_ORIGINS.split(",");
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// app.use(cors())
app.use(bodyParser.json());
dotenv.config();

app.get("/", (req, res) => {
  const hostname = os.hostname(); // returns container's hostname
  res.send(`Hello from ${hostname}`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server running at port : ' ,PORT );
});
