import { app, server } from "./server/server.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";

app.use(cors());
app.use(bodyParser.json());
dotenv.config();

app.get("/", (req, res) => {
  res.send("welcome to server");
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
