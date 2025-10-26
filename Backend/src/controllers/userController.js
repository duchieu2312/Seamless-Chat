import pool from "../config/db.js";

export async function getUserInfo(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, username, avatar_url AS "avatarUrl" FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
