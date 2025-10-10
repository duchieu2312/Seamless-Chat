import express from "express";
import cors from "cors";
import helmet from "helmet";
import registerUser from "./controllers/authController.js"; // Import hàm vừa viết

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.post("/api/auth/register", registerUser);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
