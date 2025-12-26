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
    return res.sendStatus(500);
  }
}

export async function joinServer(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
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
    io.to(`user_${userId}`).emit("communities_updated");

    io.to(`server_${cleanServerId}`).emit("server_members_updated", {
      serverId: cleanServerId,
    });

    res.json({ message: "Joined server successfully." });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Error inside joinServer controller:", err);
    return res.sendStatus(500);
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
      `SELECT s.id
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
    io.to(`user_${userId}`).emit("communities_updated");

    io.to(`server_${serverId}`).emit("server_members_updated", {
      serverId,
    });

    res.json({
      message: "Joined server successfully.",
      serverId,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Error inside joinServerByCode controller:", err);
    return res.sendStatus(500);
  } finally {
    client.release();
  }
}

export async function getJoinedServers(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT s.id, s.name, s.icon_url AS "iconUrl", s.description, s.invite_code AS "inviteCode", s.is_public AS "isPublic", s.owner_id AS "ownerId", sm.role
       FROM servers s
       INNER JOIN server_members sm ON s.id = sm.server_id
       WHERE sm.member_id = $1
       ORDER BY s.name ASC`,
      [userId],
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Error inside getJoinedServers controller:", err);
    return res.sendStatus(500);
  }
}

export async function getServerChannels(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
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
    console.error("Error inside getServerChannels controller:", err);
    return res.sendStatus(500);
  }
}

export async function getServerMembers(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    const result = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.avatar_url AS "avatarUrl",
        u.status,
        sm.role,
        TO_CHAR(sm.joined_at, 'YYYY-MM-DD HH:MI AM') AS "joinedAt",
        CASE
          WHEN f.status = 'accepted' THEN 'accepted'

          WHEN f.status = 'blocked' AND f.user_id = $1
            THEN 'blocked_by_me'

          WHEN f.status = 'blocked' AND f.friend_id = $1
            THEN 'blocked_by_them'

          WHEN f.status = 'pending' AND f.user_id = $1
            THEN 'pending_sent'

          WHEN f.status = 'pending' AND f.friend_id = $1
            THEN 'pending_received'

          ELSE 'none'
        END AS "friendshipStatus"
      FROM server_members sm
      INNER JOIN users u
        ON sm.member_id = u.id
      LEFT JOIN LATERAL (
        SELECT
          f.status,
          f.user_id,
          f.friend_id
        FROM friendships f
        WHERE
          (f.user_id = $1 AND f.friend_id = u.id)
          OR
          (f.user_id = u.id AND f.friend_id = $1)
        ORDER BY
          CASE
            WHEN f.status = 'pending' THEN 0
            ELSE 1
          END
          LIMIT 1
      ) f ON true
      WHERE sm.server_id = $2
      ORDER BY
      CASE WHEN sm.role = 'owner' THEN 0 ELSE 1 END,
      u.username ASC`,
      [userId, cleanServerId],
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Error inside getServerMembers controller:", err);
    return res.sendStatus(500);
  }
}

export async function updateServerDetails(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    const { name, description, isPublic } = req.body;
    const cleanName = name?.trim();

    if (!cleanName) {
      return res.status(400).json({ message: "Server name is required." });
    }

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ message: "Invalid public status." });
    }

    const cleanDescription = description?.trim() || null;

    const result = await pool.query(
      `UPDATE servers
       SET name = $1,
           description = $2,
           is_public = $3
       WHERE id = $4
       AND owner_id = $5
       RETURNING
         id,
         name,
         icon_url AS "iconUrl",
         description,
         invite_code AS "inviteCode",
         is_public AS "isPublic",
         owner_id AS "ownerId"`,
      [cleanName, cleanDescription, isPublic, cleanServerId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Server not found or you are not the owner.",
      });
    }

    const server = result.rows[0];

    const io = getIO();

    io.to(`server_${cleanServerId}`).emit("servers_updated");
    io.to(`server_${cleanServerId}`).emit("communities_updated");

    return res.json({
      message: "Server details updated successfully.",
      server,
    });
  } catch (err) {
    if (err.constraint === "servers_name_unique") {
      return res.status(409).json({
        message: "A server with this name already exists.",
        code: "NAME_TAKEN",
      });
    }

    console.error("Error inside updateServerDetails controller:", err);
    return res.sendStatus(500);
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
    io.to(`user_${userId}`).emit("communities_updated");

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
        code: "NAME_TAKEN",
      });
    }

    console.error("Error inside createNewServer controller:", err);
    return res.sendStatus(500);
  } finally {
    client.release();
  }
}

export async function createChannel(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    const { name, type } = req.body;
    const cleanName = name?.trim();

    if (!cleanName) {
      return res.status(400).json({ message: "Channel name is required." });
    }

    if (!["text", "voice"].includes(type)) {
      return res.status(400).json({ message: "Invalid channel type." });
    }

    const member = await pool.query(
      `SELECT role
       FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, userId],
    );

    if (member.rowCount === 0) {
      return res.status(403).json({
        message: "You are not a member of this server.",
      });
    }

    if (member.rows[0].role !== "owner") {
      return res.status(403).json({
        message: "Only the server owner can manage channels.",
      });
    }

    const result = await pool.query(
      `INSERT INTO channels (name, type, server_id)
       VALUES ($1, $2, $3)
       RETURNING
         id,
         name,
         type,
         server_id AS "serverId"`,
      [cleanName, type, cleanServerId],
    );

    const channel = result.rows[0];

    const io = getIO();

    io.to(`server_${cleanServerId}`).emit("server_channels_updated", {
      serverId: cleanServerId,
    });

    return res.status(201).json({
      message: "Channel created successfully.",
      channel,
    });
  } catch (err) {
    console.error("Error inside createChannel controller:", err);
    return res.sendStatus(500);
  }
}

export async function updateChannelName(req, res) {
  try {
    const userId = req.user.id;
    const { serverId, channelId } = req.params;

    const cleanServerId = Number(serverId);
    const cleanChannelId = Number(channelId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    if (!Number.isInteger(cleanChannelId) || cleanChannelId <= 0) {
      return res.status(400).json({ message: "Invalid channel ID format" });
    }

    const cleanName = req.body.name?.trim();

    if (!cleanName) {
      return res.status(400).json({ message: "Channel name is required." });
    }

    const member = await pool.query(
      `SELECT role
       FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, userId],
    );

    if (member.rowCount === 0) {
      return res.status(403).json({
        message: "You are not a member of this server.",
      });
    }

    if (member.rows[0].role !== "owner") {
      return res.status(403).json({
        message: "Only the server owner can manage channels.",
      });
    }

    const result = await pool.query(
      `UPDATE channels
       SET name = $1
       WHERE id = $2
       AND server_id = $3
       RETURNING
         id,
         name,
         type,
         server_id AS "serverId"`,
      [cleanName, cleanChannelId, cleanServerId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Channel not found.",
      });
    }

    const channel = result.rows[0];

    const io = getIO();

    io.to(`server_${cleanServerId}`).emit("server_channels_updated", {
      serverId: cleanServerId,
    });

    return res.json({
      message: "Channel renamed successfully.",
      channel,
    });
  } catch (err) {
    console.error("Error inside renameChannel controller:", err);
    return res.sendStatus(500);
  }
}

export async function deleteChannel(req, res) {
  try {
    const userId = req.user.id;
    const { serverId, channelId } = req.params;

    const cleanServerId = Number(serverId);
    const cleanChannelId = Number(channelId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
      return res.status(400).json({ message: "Invalid server ID format" });
    }

    if (!Number.isInteger(cleanChannelId) || cleanChannelId <= 0) {
      return res.status(400).json({ message: "Invalid channel ID format" });
    }

    const member = await pool.query(
      `SELECT role
       FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, userId],
    );

    if (member.rowCount === 0) {
      return res.status(403).json({
        message: "You are not a member of this server.",
      });
    }

    if (member.rows[0].role !== "owner") {
      return res.status(403).json({
        message: "Only the server owner can manage channels.",
      });
    }

    const channelResult = await pool.query(
      `SELECT id, name, type
       FROM channels
       WHERE id = $1
       AND server_id = $2`,
      [cleanChannelId, cleanServerId],
    );

    if (channelResult.rowCount === 0) {
      return res.status(404).json({
        message: "Channel not found.",
      });
    }

    const channel = channelResult.rows[0];

    const countResult = await pool.query(
      `SELECT COUNT(*)::INT AS count
       FROM channels
       WHERE server_id = $1
       AND type = $2`,
      [cleanServerId, channel.type],
    );

    if (countResult.rows[0].count <= 1) {
      return res.status(400).json({
        message: `You cannot delete the last ${channel.type} channel.`,
      });
    }

    await pool.query(
      `DELETE FROM channels
       WHERE id = $1
       AND server_id = $2`,
      [cleanChannelId, cleanServerId],
    );

    const io = getIO();

    io.to(`server_${cleanServerId}`).emit("server_channels_updated", {
      serverId: cleanServerId,
    });

    return res.json({
      message: "Channel deleted successfully.",
    });
  } catch (err) {
    console.error("Error inside deleteChannel controller:", err);
    return res.sendStatus(500);
  }
}

export async function deleteServer(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
      return res.status(400).json({
        message: "Invalid server ID format",
      });
    }

    const memberResult = await pool.query(
      `SELECT role
       FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, userId],
    );

    if (memberResult.rowCount === 0) {
      return res.status(403).json({
        message: "You are not a member of this server.",
      });
    }

    if (memberResult.rows[0].role !== "owner") {
      return res.status(403).json({
        message: "Only the server owner can delete this server.",
      });
    }

    const result = await pool.query(
      `DELETE FROM servers
       WHERE id = $1
       AND owner_id = $2
       RETURNING id`,
      [cleanServerId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Server not found.",
      });
    }

    const io = getIO();

    io.to(`server_${cleanServerId}`).emit("servers_updated");
    io.to(`server_${cleanServerId}`).emit("communities_updated");

    io.to(`server_${cleanServerId}`).emit("server_deleted", {
      serverId: cleanServerId,
    });

    return res.json({
      message: "Server deleted successfully.",
    });
  } catch (err) {
    console.error("Error inside deleteServer controller:", err);
    return res.sendStatus(500);
  }
}

export async function leaveServer(req, res) {
  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
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
    io.to(`user_${userId}`).emit("communities_updated");

    io.to(`server_${cleanServerId}`).emit("server_members_updated", {
      serverId: cleanServerId,
    });

    return res.json({ message: "Left server successfully." });
  } catch (err) {
    console.error("Error inside leaveServer controller:", err);
    return res.sendStatus(500);
  }
}

export async function transferOwnership(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { serverId } = req.params;
    const { newOwnerId } = req.body;

    const cleanServerId = Number(serverId);

    if (!Number.isInteger(cleanServerId) || cleanServerId <= 0) {
      return res.status(400).json({
        message: "Invalid server ID format",
      });
    }

    const cleanNewOwnerId = String(newOwnerId || "").trim();

    if (!cleanNewOwnerId) {
      return res.status(400).json({
        message: "Invalid new owner ID format",
      });
    }

    if (userId === cleanNewOwnerId) {
      return res.status(400).json({
        message: "You are already the owner of this server.",
      });
    }

    await client.query("BEGIN");

    const ownerResult = await client.query(
      `SELECT owner_id
       FROM servers
       WHERE id = $1`,
      [cleanServerId],
    );

    if (ownerResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Server not found.",
      });
    }

    if (ownerResult.rows[0].owner_id !== userId) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "Only the server owner can transfer ownership.",
      });
    }

    const memberResult = await client.query(
      `SELECT role
       FROM server_members
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, cleanNewOwnerId],
    );

    if (memberResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "The new owner must be a member of this server.",
      });
    }

    await client.query(
      `UPDATE servers
       SET owner_id = $1
       WHERE id = $2`,
      [cleanNewOwnerId, cleanServerId],
    );

    await client.query(
      `UPDATE server_members
       SET role = 'member'
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, userId],
    );

    await client.query(
      `UPDATE server_members
       SET role = 'owner'
       WHERE server_id = $1
       AND member_id = $2`,
      [cleanServerId, cleanNewOwnerId],
    );

    await client.query("COMMIT");

    const io = getIO();

    io.to(`user_${userId}`).emit("servers_updated");
    io.to(`user_${cleanNewOwnerId}`).emit("servers_updated");

    io.to(`server_${cleanServerId}`).emit("server_members_updated", {
      serverId: cleanServerId,
    });

    return res.json({
      message: "Server ownership transferred successfully.",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Error inside transferOwnership controller:", err);
    return res.sendStatus(500);
  } finally {
    client.release();
  }
}
