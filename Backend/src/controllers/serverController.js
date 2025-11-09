import pool from "../config/db.js";

export async function getPublicWithJoinStatus(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        s.id, 
        s.name, 
        s.icon_url AS "iconUrl",
        s.description,
        (SELECT COUNT(*) FROM server_members sm WHERE sm.server_id = s.id)::INT AS "members",
        EXISTS (
          SELECT 1 
          FROM server_members sm 
          WHERE sm.server_id = s.id AND sm.member_id = $1
        ) AS "joined"
       FROM servers s
       WHERE s.is_public = true
       ORDER BY s.created_at DESC`,
      [userId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function joinServer(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { serverId } = req.params;

    await client.query("BEGIN");

    const serverResult = await client.query(
      `SELECT s.id, s.is_public
       FROM servers s
       WHERE s.id = $1`,
      [serverId],
    );

    if (serverResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Server not found." });
    }

    if (!serverResult.rows[0].is_public) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "This server is private." });
    }

    const joined = await client.query(
      `SELECT 1
       FROM server_members sm
       WHERE sm.server_id = $1
       AND sm.member_id = $2`,
      [serverId, userId],
    );

    if (joined.rowCount > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "You have already joined this server." });
    }

    await client.query(
      `INSERT INTO server_members(server_id, member_id)
       VALUES($1,$2)`,
      [serverId, userId],
    );

    await client.query("COMMIT");

    res.json({ message: "Joined server successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}

export async function leaveServer(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;

    const member = await pool.query(
      `SELECT role
       FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [serverId, userId],
    );

    if (member.rowCount === 0) {
      return res.status(404).json({
        message: "You are not a member of this server.",
      });
    }

    if (member.rows[0].role === "owner") {
      return res.status(400).json({
        message: "Owner cannot leave the server.",
      });
    }

    await pool.query(
      `DELETE FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [serverId, userId],
    );

    return res.json({ message: "Left server successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getJoinedServers(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT s.id, s.name, s.icon_url AS "iconUrl", s.owner_id AS "ownerId", sm.role
       FROM servers s
       INNER JOIN server_members sm ON s.id = sm.server_id
       WHERE sm.member_id = $1
       ORDER BY s.created_at ASC`,
      [userId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getServerChannels(req, res) {
  try {
    const { serverId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
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
       ORDER BY c.id ASC`,
      [userId, serverId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getChannelMessages(req, res) {
  try {
    const { channelId } = req.params;
    const cleanChannelId = parseInt(channelId, 10);

    if (isNaN(cleanChannelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
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

export async function getServerMembers(req, res) {
  try {
    const { serverId } = req.params;
    const cleanServerId = parseInt(serverId, 10);

    if (isNaN(cleanServerId)) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    const result = await pool.query(
      `SELECT 
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
        u.username ASC`,
      [cleanServerId],
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Error inside getServerMembers controller:", err);
    return res.status(500).json({ message: err.message });
  }
}

export async function updateLastSeen(req, res) {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    await pool.query(
      `INSERT INTO channel_read_states (user_id, channel_id, last_read_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, channel_id) 
       DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
      [userId, channelId],
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
