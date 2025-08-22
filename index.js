import { app, server } from "./server/server.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import frontendRoutes from './server/routes.js';
import userRoutes from './server/user.js';
import cookieParser from 'cookie-parser';
dotenv.config();

let allowedOrigins = process.env.CLIENT_ORIGINS
allowedOrigins = allowedOrigins.split(",");
const PORT = process.env.PORT || 8000;


app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors({
    origin: function (origin, callback) {
    // origin is undefined for non-browser requests
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // allow request
    } else {
      callback(new Error("Not allowed by CORS")); // block browser request from disallowed origin
    }
  },
  credentials: true
}));


app.use(frontendRoutes);
app.use(userRoutes);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});