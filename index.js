import 'dotenv/config';

import { app, server } from "./server/server.js";
import bodyParser from "body-parser";
import cors from "cors";
import frontendRoutes from './server/routes.js';

const PORT = process.env.PORT || 8000;


const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(',');

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// app.use(cors());



app.use(bodyParser.json());
app.use(frontendRoutes);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});