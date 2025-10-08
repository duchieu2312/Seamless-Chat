import express from "express";
import cors from "cors";
import helmet from "helmet";
import pool from "./config/db.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "OK", time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
