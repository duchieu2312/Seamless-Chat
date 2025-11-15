import pool from "../config/db.js";
import { getIO } from "../socket.js";

export async function getDirectMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const cleanConversationId = Number(conversationId);

    if (isNaN(cleanConversationId)) {
      return res
        .status(400)
        .json({ message: "Invalid conversation ID format" });
    }

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
      [cleanConversationId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

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

    const result = await pool.query(
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
      TO_CHAR(i.sent_at, 'HH:MI AM') AS "time"
   FROM inserted i
   JOIN users u
     ON u.id = i.sender_id`,
      [cleanMessage, cleanConversationId, userId],
    );

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
    return res.status(500).json({
      message: err.message,
    });
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

export async function getChannelMessages(req, res) {
  try {
    const { channelId } = req.params;
    const cleanChannelId = Number(channelId);

    if (isNaN(cleanChannelId)) {
      return res.status(400).json({ message: "Invalid channel ID format" });
    }

    const result = await pool.query(
      `SELECT 
        cm.id,
        cm.channel_id AS "channelId",
        u.username,
        u.avatar_url AS "avatarUrl",
        cm.message,
        TO_CHAR(cm.sent_at, 'HH:MI AM') AS "time"
       FROM channel_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.channel_id = $1 
       ORDER BY cm.sent_at ASC`,
      [cleanChannelId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

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
          TO_CHAR(i.sent_at, 'HH:MI AM') AS "time"
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
