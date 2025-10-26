import pool from "../config/db.js";

export async function getPublicWithJoinStatus(req, res) {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        s.id, 
        s.name, 
        s.icon_url AS "iconUrl",
        s.description,
        (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) AS "members",
        EXISTS (
          SELECT 1 
          FROM server_members 
          WHERE server_id = s.id AND member_id = $1
        ) AS "joined"
      FROM servers s
      WHERE s.is_public = true
      ORDER BY s.created_at DESC;
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getJoinedServers(req, res) {
  try {
    const userId = req.user.id;

    const query = `
      SELECT s.id, s.name, s.icon_url AS "iconUrl", s.owner_id AS "ownerId", sm.role
      FROM servers s
      INNER JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.member_id = $1
      ORDER BY s.created_at ASC;
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getServerChannels(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.type, 
        c.server_id AS "serverId",
        (
          SELECT COUNT(*)::INT 
          FROM channel_messages cm 
          WHERE cm.channel_id = c.id 
          AND cm.sent_at > (SELECT crs.last_read_at FROM channel_read_states crs WHERE crs.user_id = $1 AND crs.channel_id = c.id)
        ) AS "unread"
      FROM channels c
      WHERE c.server_id = $2 
      ORDER BY c.id ASC;
    `;
    const result = await pool.query(query, [userId, serverId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getChannelMessages(req, res) {
  try {
    const { channelId } = req.params;
    const cleanChannelId = parseInt(channelId, 10);

    if (isNaN(cleanChannelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    const query = `
      SELECT 
        cm.id,
        cm.channel_id AS "channelId",
        u.username,
        u.avatar_url AS "avatarUrl",
        cm.message,
        TO_CHAR(cm.sent_at, 'HH:MI AM') AS "time"
      FROM channel_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.channel_id = $1 
      ORDER BY cm.sent_at ASC;
    `;

    const result = await pool.query(query, [cleanChannelId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getServerMembers(req, res) {
  try {
    const { serverId } = req.params;
    const cleanServerId = parseInt(serverId, 10);

    if (isNaN(cleanServerId)) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    const query = `
      SELECT 
        u.id,
        u.username,
        u.avatar_url AS "avatarUrl",
        u.status,
        sm.role,
        TO_CHAR(sm.joined_at, 'YYYY-MM-DD HH:MI AM') AS "joinedAt"
      FROM server_members sm
      INNER JOIN users u ON sm.member_id = u.id
      WHERE sm.server_id = $1
      ORDER BY 
        CASE WHEN sm.role = 'owner' THEN 0 ELSE 1 END, 
        u.username ASC;
    `;

    const result = await pool.query(query, [cleanServerId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error inside getServerMembers controller:", err);
    res.status(500).json({ message: err.message });
  }
}

export async function updateLastSeen(req, res) {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const query = `
      INSERT INTO channel_read_states (user_id, channel_id, last_read_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, channel_id) 
      DO UPDATE SET last_read_at = CURRENT_TIMESTAMP;
    `;

    await pool.query(query, [userId, channelId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
