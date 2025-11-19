import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const isProd = process.env.NODE_ENV === "production";

const ACCESS_EXPIRES = "5m";
const REFRESH_EXPIRES = "15d";

function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

async function generateRefreshToken(userId, oldExp = null) {
  const jti = crypto.randomBytes(16).toString("hex");
  let expiresIn = REFRESH_EXPIRES;
  let expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  if (oldExp) {
    expiresAt = new Date(oldExp * 1000);
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = oldExp - now;
    if (secondsLeft <= 0) throw new Error("Old refresh token expired");
    expiresIn = secondsLeft + "s";
  }

  const refreshToken = jwt.sign(
    { id: userId, jti },
    process.env.REFRESH_SECRET,
    { expiresIn },
  );

  await pool.query(
    "INSERT INTO refresh_tokens (user_id, jti, expires_at) VALUES ($1, $2, $3)",
    [userId, jti, expiresAt],
  );

  return { refreshToken, expiresAt };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });
}

export async function registerUser(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const checkUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );

    if (checkUser.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or Email already exists" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) RETURNING id, username, avatar_url`,
      [username, email, hashedPassword],
    );
    const user = result.rows[0];

    const accessToken = generateAccessToken(user.id);
    const { refreshToken } = await generateRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }

    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
      user.id,
    ]);

    const accessToken = generateAccessToken(user.id);
    const { refreshToken } = await generateRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      message: "User login successfully",
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
}

export async function refreshToken(req, res) {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET);

    const dbToken = await pool.query(
      "SELECT * FROM refresh_tokens WHERE jti = $1 AND user_id = $2",
      [decoded.jti, decoded.id],
    );
    if (dbToken.rows.length === 0) {
      return res.status(403).json({ message: "Refresh token revoked" });
    }

    await pool.query("DELETE FROM refresh_tokens WHERE jti = $1", [
      decoded.jti,
    ]);

    const newAccessToken = generateAccessToken(decoded.id);
    const { refreshToken: newRefreshToken } = await generateRefreshToken(
      decoded.id,
      decoded.exp,
    );

    setAuthCookies(res, newAccessToken, newRefreshToken);
    return res.json({ message: "Token refreshed" });
  } catch (err) {
    console.error("Refresh Error:", err.message);
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });
    return res
      .status(403)
      .json({ message: "Invalid or expired refresh token" });
  }
}

export async function logoutUser(req, res) {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      if (decoded?.id) {
        await Promise.all([
          pool.query("DELETE FROM refresh_tokens WHERE jti = $1", [
            decoded.jti,
          ]),
          pool.query("UPDATE users SET status = 'offline' WHERE id = $1", [
            decoded.id,
          ]),
        ]);
      }
    } catch (e) {
      console.error("Logout decode error:", e.message);
    }
  }
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  });

  return res.json({ message: "User logout successfully" });
}
