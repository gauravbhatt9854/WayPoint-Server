import { app, server } from "./server/server.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import frontendRoutes from './server/routes.js';
dotenv.config();

let allowedOrigins = process.env.CLIENT_ORIGINS
allowedOrigins = allowedOrigins.split(",");
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || AllowedUrl.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));



app.use(bodyParser.json());
app.use(frontendRoutes);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});