import express from "express";
import cors from "cors";
import helmet from "helmet";
import pool from "./config/db.js";
import cookieParser from "cookie-parser";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
} from "./controllers/authController.js";
import authenticateToken from "./middlewares/authMiddleware.js";
import { startTokenCleanupJob } from "./utils/cleanupTokens.js";
import { loginLimiter, refreshLimiter } from "./middlewares/rateLimiter.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginLimiter, loginUser);
app.post("/api/auth/logout", logoutUser);
app.post("/api/auth/refresh", refreshLimiter, refreshToken);

app.get("/api/users/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, username, avatar_url FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startTokenCleanupJob();
});
