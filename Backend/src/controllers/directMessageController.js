import pool from "../config/db.js";

export async function getDirectMessages(req, res) {
  try {
    const { conversationId } = req.params;

    const result = await pool.query(
      `SELECT 
         dm.id,
         dm.conversation_id AS "conversationId",
         u.username,
         u.avatar_url AS "avatarUrl",
         dm.message,
         TO_CHAR(dm.sent_at, 'HH:MI AM') AS "time"
       FROM direct_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE dm.conversation_id = $1 
       ORDER BY dm.sent_at ASC`,
      [conversationId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function updateDmLastSeen(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await pool.query(
      `UPDATE conversations
       SET
         user_one_last_read = CASE
           WHEN user_one_id = $2 THEN CURRENT_TIMESTAMP
           ELSE user_one_last_read
         END,
         user_two_last_read = CASE
           WHEN user_two_id = $2 THEN CURRENT_TIMESTAMP
           ELSE user_two_last_read
         END
       WHERE id = $1
       AND ($2 = user_one_id OR $2 = user_two_id)
       RETURNING id`,
      [conversationId, userId],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}
