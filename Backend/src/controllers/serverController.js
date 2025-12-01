import pool from "../config/db.js";
import { getIO } from "../socket.js";
import crypto from "crypto";

export async function getCommunities(req, res) {
  try {
    const userId = req.user.id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 10);
    const search = req.query.search?.trim() || "";

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT 
        s.id, 
        s.name, 
        s.icon_url AS "iconUrl",
        s.description,
        (
          SELECT COUNT(*) 
          FROM server_members sm 
          WHERE sm.server_id = s.id
        )::INT AS "members",
        EXISTS (
          SELECT 1 
          FROM server_members sm 
          WHERE sm.server_id = s.id 
          AND sm.member_id = $1
        ) AS "joined"
       FROM servers s
       WHERE s.is_public = true
         AND s.name ILIKE $2
       ORDER BY s.created_at DESC
       LIMIT $3
       OFFSET $4`,
      [userId, `%${search}%`, limit + 1, offset],
    );

    const hasMore = result.rows.length > limit;
    const communities = result.rows.slice(0, limit);

    return res.json({
      communities,
      page,
      limit,
      hasMore,
    });
  } catch (err) {
    console.error("Error inside getCommunities controller:", err);
    return res.status(500).json({ message: err.message });
  }
}

export async function joinServer(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (isNaN(cleanServerId)) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    await client.query("BEGIN");

    const serverResult = await client.query(
      `SELECT s.id, s.is_public
       FROM servers s
       WHERE s.id = $1`,
      [cleanServerId],
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
      [cleanServerId, userId],
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
      [cleanServerId, userId],
    );

    await client.query("COMMIT");

    const io = getIO();

    io.to(`user_${userId}`).emit("servers_updated");
    io.to(`server_${cleanServerId}`).emit("server_members_updated", {
      serverId: cleanServerId,
    });

    res.json({ message: "Joined server successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}

export async function joinServerByCode(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const cleanCode = req.body.code?.trim();

    if (!cleanCode) {
      return res.status(400).json({ message: "Invite code is required." });
    }

    await client.query("BEGIN");

    const serverResult = await client.query(
      `SELECT s.id, s.is_public
       FROM servers s
       WHERE s.invite_code = $1`,
      [cleanCode],
    );

    if (serverResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Invalid invite code." });
    }

    const { id: serverId } = serverResult.rows[0];

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
       VALUES($1, $2)`,
      [serverId, userId],
    );

    await client.query("COMMIT");

    const io = getIO();

    io.to(`user_${userId}`).emit("servers_updated");

    io.to(`server_${serverId}`).emit("server_members_updated", {
      serverId,
    });

    res.json({
      message: "Joined server successfully.",
      serverId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}

export async function leaveServer(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (isNaN(cleanServerId)) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    const member = await pool.query(
      `SELECT role
       FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, userId],
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
      [cleanServerId, userId],
    );

    const io = getIO();

    io.to(`user_${userId}`).emit("servers_updated");
    io.to(`server_${cleanServerId}`).emit("server_members_updated", {
      serverId: cleanServerId,
    });

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
       ORDER BY s.name ASC`,
      [userId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getServerChannels(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (isNaN(cleanServerId)) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

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
      [userId, cleanServerId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getServerMembers(req, res) {
  try {
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

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

export async function checkServerName(req, res) {
  try {
    const { name } = req.query;
    const cleanName = name?.trim();

    if (!cleanName) {
      return res.status(400).json({ message: "Server name is required." });
    }

    const result = await pool.query(
      `SELECT EXISTS (
       SELECT 1
       FROM servers
       WHERE name = $1
      ) AS "exists"`,
      [cleanName],
    );

    return res.json({ exists: result.rows[0].exists });
  } catch (err) {
    console.error("Error inside checkServerName controller:", err);
    return res.status(500).json({ message: err.message });
  }
}

export async function createNewServer(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { name, iconUrl, description, isPublic = true } = req.body;
    const cleanName = name?.trim();

    if (!cleanName) {
      return res.status(400).json({ message: "Server name is required." });
    }

    const cleanDescription = description?.trim() || null;

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ message: "Invalid public status." });
    }

    const inviteCode = crypto.randomBytes(12).toString("base64url");

    await client.query("BEGIN");

    const serverResult = await client.query(
      `INSERT INTO servers (name,icon_url,description,invite_code,is_public,owner_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [
        cleanName,
        iconUrl || null,
        cleanDescription,
        inviteCode,
        isPublic,
        userId,
      ],
    );

    const server = serverResult.rows[0];

    await client.query(
      `INSERT INTO server_members (server_id,member_id,role)
       VALUES ($1, $2, 'owner')`,
      [server.id, userId],
    );

    const channelResult = await client.query(
      `INSERT INTO channels (name,type,server_id)
       VALUES ('General', 'text', $1),
              ('General Voice', 'voice', $1)
       RETURNING id`,
      [server.id],
    );

    await client.query("COMMIT");

    const channel = channelResult.rows[0];

    const io = getIO();

    io.to(`user_${userId}`).emit("servers_updated");

    return res.status(201).json({
      message: "Server created successfully.",
      serverId: server.id,
      channelId: channel.id,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.constraint === "servers_name_unique") {
      return res.status(409).json({
        message: "A server with this name already exists.",
      });
    }

    console.error("Error inside createServer controller:", err);
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}
