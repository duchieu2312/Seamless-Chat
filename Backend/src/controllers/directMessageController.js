import pool from "../config/db.js";

export async function getDirectMessages(req, res) {
  try {
    const { conversationId } = req.params;

    const query = `
      SELECT 
        dm.id,
        dm.conversation_id AS "conversationId",
        u.username,
        u.avatar_url AS "avatarUrl",
        dm.message,
        TO_CHAR(dm.sent_at, 'HH:MI AM') AS "time"
      FROM direct_messages dm
      JOIN users u ON dm.sender_id = u.id
      WHERE dm.conversation_id = $1 
      ORDER BY dm.sent_at ASC;
    `;

    const result = await pool.query(query, [conversationId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
