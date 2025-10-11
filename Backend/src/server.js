import express from "express";
import cors from "cors";
import helmet from "helmet";
import { registerUser, loginUser } from "./controllers/authController.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginUser);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
