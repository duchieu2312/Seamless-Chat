import pool from "../config/db.js";
import { getIO } from "../socket.js";

export const getDirectMessages = async (req, res) => {
  const { conversationId } = req.params;

  const limit = Math.min(Number(req.query.limit) || 20, 30);
  const before = req.query.before ? Number(req.query.before) : null;

  try {
    const query = `
      SELECT
        dm.id,
        dm.message,
        dm.sent_at AS time,
        u.id AS user_id,
        u.username,
        u.avatar_url AS "avatarUrl"
      FROM direct_messages dm
      JOIN users u ON u.id = dm.sender_id
      WHERE dm.conversation_id = $1
      ${before ? "AND dm.id < $2" : ""}
      ORDER BY dm.sent_at DESC
      LIMIT $${before ? 3 : 2}`;

    const params = before
      ? [conversationId, before, limit + 1]
      : [conversationId, limit + 1];
    const result = await pool.query(query, params);
    const hasMore = result.rows.length > limit;
    const messages = result.rows.slice(0, limit).reverse();

    res.status(200).json({
      messages,
      hasMore,
    });
  } catch (err) {
    console.error("Error fetching conversation messages:", err);
    res.status(500).json({ message: "Failed to fetch conversation messages." });
  }
};

export async function sendDMMessage(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId, message } = req.body;
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      return res.status(400).json({
        message: "Message cannot be empty.",
      });
    }

    const cleanConversationId = Number(conversationId);

    if (isNaN(cleanConversationId)) {
      return res
        .status(400)
        .json({ message: "Invalid conversation ID format" });
    }

    const permission = await pool.query(
      `SELECT
         CASE
           WHEN user_one_id = $1 THEN user_two_id
           ELSE user_one_id
         END AS "receiverId"
       FROM conversations
       WHERE id = $2
       AND (user_one_id = $1 OR user_two_id = $1)`,
      [userId, cleanConversationId],
    );

    if (permission.rowCount === 0) {
      return res.status(403).json({
        message: "You do not have permission to send messages.",
      });
    }

    const receiverId = permission.rows[0].receiverId;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query(
        `WITH inserted AS (
          INSERT INTO direct_messages (message, conversation_id, sender_id)
          VALUES ($1, $2, $3)
          RETURNING id, conversation_id, sender_id, message, sent_at
        )
        SELECT
          i.id,
          i.conversation_id AS "conversationId",
          i.sender_id AS "senderId",
          u.username,
          u.avatar_url AS "avatarUrl",
          i.message,
          i.sent_at AS "time"
        FROM inserted i
        JOIN users u
        ON u.id = i.sender_id`,
        [cleanMessage, cleanConversationId, userId],
      );

      await client.query(
        `UPDATE conversations
         SET last_message_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [cleanConversationId],
      );

      await client.query("COMMIT");

      const newMessage = result.rows[0];

      const io = getIO();

      io.to(`dm_${cleanConversationId}`).emit("receive_message", {
        roomId: `dm_${cleanConversationId}`,
        ...newMessage,
      });

      io.to(`user_${receiverId}`).emit("dm_unread_notification", {
        conversationId: cleanConversationId,
      });

      return res.status(201).json(newMessage);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

export async function updateDmLastSeen(req, res) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const cleanConversationId = Number(conversationId);

    if (isNaN(cleanConversationId)) {
      return res
        .status(400)
        .json({ message: "Invalid conversation ID format" });
    }

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
      [cleanConversationId, userId],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

export const getChannelMessages = async (req, res) => {
  const { channelId } = req.params;

  const limit = Math.min(Number(req.query.limit) || 20, 30);
  const before = req.query.before ? Number(req.query.before) : null;

  try {
    const query = `
      SELECT
        m.id,
        m.message,
        m.sent_at AS time,
        u.id AS user_id,
        u.username,
        u.avatar_url AS "avatarUrl"
      FROM channel_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.channel_id = $1
      ${before ? "AND m.id < $2" : ""}
      ORDER BY m.sent_at DESC
      LIMIT $${before ? 3 : 2}`;

    const params = before
      ? [channelId, before, limit + 1]
      : [channelId, limit + 1];
    const result = await pool.query(query, params);
    const hasMore = result.rows.length > limit;
    const messages = result.rows.slice(0, limit).reverse();

    res.status(200).json({
      messages,
      hasMore,
    });
  } catch (err) {
    console.error("Error fetching channel messages:", err);
    res.status(500).json({ message: "Failed to fetch channel messages." });
  }
};

export async function sendChannelMessage(req, res) {
  try {
    const userId = req.user.id;
    const { channelId, message } = req.body;
    const cleanMessage = message?.trim();

    if (!cleanMessage) {
      return res.status(400).json({
        message: "Message cannot be empty.",
      });
    }

    const cleanChannelId = Number(channelId);

    if (isNaN(cleanChannelId)) {
      return res.status(400).json({ message: "Invalid channel ID format" });
    }

    const permission = await pool.query(
      `SELECT c.server_id AS "serverId"
       FROM server_members sm
       JOIN channels c
         ON c.server_id = sm.server_id
       WHERE sm.member_id = $1
         AND c.id = $2`,
      [userId, cleanChannelId],
    );

    if (permission.rowCount === 0) {
      return res.status(403).json({
        message: "You do not have permission to send messages.",
      });
    }

    const serverId = permission.rows[0].serverId;

    const result = await pool.query(
      `WITH inserted AS (
          INSERT INTO channel_messages (message, channel_id, sender_id)
          VALUES ($1, $2, $3)
          RETURNING id, channel_id, sender_id, message, sent_at
       )
       SELECT
           i.id,
           i.channel_id AS "channelId",
           i.sender_id AS "senderId",
           u.username,
           u.avatar_url AS "avatarUrl",
           i.message,
           i.sent_at AS "time"
       FROM inserted i
       JOIN users u
       ON u.id = i.sender_id`,
      [cleanMessage, cleanChannelId, userId],
    );

    const newMessage = result.rows[0];

    const members = await pool.query(
      `SELECT member_id
       FROM server_members
       WHERE server_id = $1
         AND member_id <> $2`,
      [serverId, userId],
    );

    const io = getIO();

    io.to(`channel_${cleanChannelId}`).emit("receive_message", {
      roomId: `channel_${cleanChannelId}`,
      ...newMessage,
    });

    for (const { member_id } of members.rows) {
      io.to(`user_${member_id}`).emit("channel_unread_notification", {
        channelId: cleanChannelId,
      });
    }

    return res.status(201).json(newMessage);
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
}

export async function updateChannelLastSeen(req, res) {
  try {
    const userId = req.user.id;
    const { channelId } = req.params;
    const cleanChannelId = Number(channelId);

    if (isNaN(cleanChannelId)) {
      return res.status(400).json({ message: "Invalid channel ID format" });
    }

    await pool.query(
      `INSERT INTO channel_read_states (user_id, channel_id, last_read_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, channel_id) 
       DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
      [userId, cleanChannelId],
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
