import pool from "../config/db.js";
import { getIO } from "../socket.js";

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

    return res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getConversations(req, res) {
  try {
    const userId = req.user.id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 20);

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
        c.id,
        u.id AS "userId",
        u.username,
        u.avatar_url AS "avatarUrl",
        u.status,
        (
          SELECT COUNT(*)::INT
          FROM direct_messages dm
          WHERE dm.conversation_id = c.id
            AND dm.sender_id <> $1
            AND dm.sent_at >
              CASE
                WHEN c.user_one_id = $1
                THEN c.user_one_last_read
                ELSE c.user_two_last_read
              END
        ) AS "unread"
      FROM conversations c
      JOIN users u
        ON u.id = CASE
          WHEN c.user_one_id = $1
          THEN c.user_two_id
          ELSE c.user_one_id
        END
      WHERE
        (c.user_one_id = $1 OR c.user_two_id = $1)
        AND EXISTS (
          SELECT 1
          FROM friendships f
          WHERE (
            (f.user_id = $1 AND f.friend_id = u.id)
            OR
            (f.user_id = u.id AND f.friend_id = $1)
          )
          AND f.status = 'accepted'
        )
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT $2
      OFFSET $3`,
      [userId, limit + 1, offset],
    );

    const hasMore = result.rows.length > limit;
    const conversations = result.rows.slice(0, limit);

    return res.json({
      conversations,
      page,
      limit,
      hasMore,
    });
  } catch (err) {
    console.error("Error inside getConversations controller:", err);
    return res.status(500).json({ message: err.message });
  }
}

export async function getFriends(req, res) {
  try {
    const userId = req.user.id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 20);
    const search = req.query.search?.trim() || "";

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.avatar_url AS "avatarUrl",
        u.status,
        c.id AS "conversationId",
        COUNT(*) OVER() AS "total"
      FROM friendships f
      JOIN users u
        ON f.friend_id = u.id
      LEFT JOIN conversations c
        ON (
          (c.user_one_id = $1 AND c.user_two_id = f.friend_id)
          OR
          (c.user_one_id = f.friend_id AND c.user_two_id = $1)
        )
      WHERE f.user_id = $1
        AND f.status = 'accepted'
        AND u.username ILIKE $2
      ORDER BY u.username
      LIMIT $3
      OFFSET $4`,
      [userId, `%${search}%`, limit + 1, offset],
    );

    const hasMore = result.rows.length > limit;
    const friends = result.rows
      .slice(0, limit)
      .map(({ total, ...friend }) => friend);
    const total = result.rows[0]?.total ?? 0;

    return res.json({
      friends,
      page,
      limit,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("Error inside getFriends controller:", err);
    return res.status(500).json({ message: err.message });
  }
}

export async function getPendingRequests(req, res) {
  try {
    const userId = req.user.id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 20);
    const search = req.query.search?.trim() || "";

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.avatar_url AS "avatarUrl",
        COUNT(*) OVER() AS "total"
       FROM friendships f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1
         AND f.status = 'pending'
         AND u.username ILIKE $2
       ORDER BY f.updated_at DESC
       LIMIT $3
       OFFSET $4`,
      [userId, `%${search}%`, limit + 1, offset],
    );

    const hasMore = result.rows.length > limit;
    const pendingRequests = result.rows
      .slice(0, limit)
      .map(({ total, ...pendingRequest }) => pendingRequest);
    const total = result.rows[0]?.total ?? 0;

    return res.json({
      pendingRequests,
      page,
      limit,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("Error inside getPendingRequests controller:", err);
    return res.status(500).json({ message: err.message });
  }
}

export async function getBlockedUsers(req, res) {
  try {
    const userId = req.user.id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 20);
    const search = req.query.search?.trim() || "";

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.avatar_url AS "avatarUrl",
        f.updated_at AS "updatedAt",
        COUNT(*) OVER() AS "total"
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 
         AND f.status = 'blocked'
         AND u.username ILIKE $2
       ORDER BY f.updated_at DESC
       LIMIT $3
       OFFSET $4`,
      [userId, `%${search}%`, limit + 1, offset],
    );

    const hasMore = result.rows.length > limit;
    const blockedUsers = result.rows
      .slice(0, limit)
      .map(({ total, ...blockedUser }) => blockedUser);
    const total = result.rows[0]?.total ?? 0;

    return res.json({
      blockedUsers,
      page,
      limit,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("Error inside getBlockedUsers controller:", err);
    return res.status(500).json({ message: err.message });
  }
}

export async function sendFriendRequest(req, res) {
  const client = await pool.connect();

  try {
    const senderId = req.user.id;
    const { targetUser: targetUsername } = req.body;

    const targetUserRes = await client.query(
      "SELECT id FROM users WHERE username = $1",
      [targetUsername],
    );

    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const targetId = targetUserRes.rows[0].id;

    if (senderId === targetId) {
      return res
        .status(400)
        .json({ message: "You cannot add yourself as a friend." });
    }

    const relationRes = await client.query(
      `SELECT user_id, friend_id, status
       FROM friendships
       WHERE
         (user_id = $1 AND friend_id = $2)
         OR
         (user_id = $2 AND friend_id = $1)`,
      [senderId, targetId],
    );

    const relations = relationRes.rows;

    const blocked = relations.find((r) => r.status === "blocked");
    if (blocked) {
      if (blocked.user_id === senderId) {
        return res.status(403).json({ message: "You have blocked this user." });
      }

      return res.status(403).json({ message: "This user has blocked you." });
    }

    if (relations.some((r) => r.status === "accepted")) {
      return res.status(400).json({ message: "You are already friends." });
    }

    const pending = relations.find((r) => r.status === "pending");
    if (pending) {
      if (pending.user_id === senderId) {
        return res
          .status(400)
          .json({ message: "Friend request has already been sent." });
      }

      await client.query("BEGIN");

      try {
        await client.query(
          `UPDATE friendships
           SET status = 'accepted',
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1
             AND friend_id = $2`,
          [targetId, senderId],
        );

        await client.query(
          `INSERT INTO friendships (user_id, friend_id, status)
           VALUES ($1, $2, 'accepted')
           ON CONFLICT (user_id, friend_id)
           DO UPDATE
           SET status = 'accepted',
               updated_at = CURRENT_TIMESTAMP`,
          [senderId, targetId],
        );

        const [userOne, userTwo] = [senderId, targetId].sort();

        await client.query(
          `INSERT INTO conversations (user_one_id, user_two_id)
           VALUES ($1, $2)
           ON CONFLICT (user_one_id, user_two_id)
           DO NOTHING`,
          [userOne, userTwo],
        );

        await client.query("COMMIT");

        return res.json({ message: "Friend request accepted." });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    await client.query(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')`,
      [senderId, targetId],
    );

    const io = getIO();

    io.to(`user_${targetId}`).emit("pending_updated");

    return res
      .status(201)
      .json({ message: "Friend request sent successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}

export async function acceptFriendRequest(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { senderId } = req.params;

    await client.query("BEGIN");

    const updateRes = await client.query(
      "UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'",
      [senderId, userId],
    );

    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Friend request does not exist or has already been cancelled.",
      });
    }

    await client.query(
      `INSERT INTO friendships (user_id, friend_id, status) 
       VALUES ($1, $2, 'accepted')
       ON CONFLICT (user_id, friend_id) 
       DO UPDATE SET status = 'accepted', updated_at = CURRENT_TIMESTAMP`,
      [userId, senderId],
    );

    const [userOne, userTwo] = [userId, senderId].sort();

    const convRes = await client.query(
      `INSERT INTO conversations (user_one_id, user_two_id)
       VALUES ($1, $2)
       ON CONFLICT (user_one_id, user_two_id)
       DO UPDATE
       SET user_one_id = conversations.user_one_id
       RETURNING id`,
      [userOne, userTwo],
    );

    await client.query("COMMIT");

    const io = getIO();

    io.to(`user_${userId}`).emit("friends_updated");
    io.to(`user_${senderId}`).emit("friends_updated");

    io.to(`user_${userId}`).emit("pending_updated");
    io.to(`user_${senderId}`).emit("pending_updated");

    return res.json({
      message: "Friend request accepted successfully.",
      conversationId: convRes.rows[0]?.id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}

export async function declineFriendRequest(req, res) {
  try {
    const userId = req.user.id;
    const { senderId } = req.params;

    const result = await pool.query(
      `DELETE FROM friendships
       WHERE user_id = $1
         AND friend_id = $2
         AND status = 'pending'`,
      [senderId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Friend request does not exist or has already been cancelled.",
      });
    }

    const io = getIO();

    io.to(`user_${userId}`).emit("pending_updated");
    io.to(`user_${senderId}`).emit("pending_updated");

    return res.json({ message: "Friend request declined successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function blockUser(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { targetId } = req.params;

    if (userId === targetId) {
      return res.status(400).json({ message: "You cannot block yourself." });
    }

    await client.query("BEGIN");

    await client.query(
      `INSERT INTO friendships (user_id, friend_id, status, updated_at)
       VALUES ($1, $2, 'blocked', CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, friend_id)
       DO UPDATE
       SET status = 'blocked',
           updated_at = CURRENT_TIMESTAMP`,
      [userId, targetId],
    );

    await client.query(
      `DELETE FROM friendships
       WHERE user_id = $1
          AND friend_id = $2
          AND status <> 'blocked'`,
      [targetId, userId],
    );

    await client.query("COMMIT");

    const io = getIO();

    io.to(`user_${userId}`).emit("friends_updated");
    io.to(`user_${targetId}`).emit("friends_updated");
    io.to(`user_${userId}`).emit("blocked_updated");
    io.to(`user_${userId}`).emit("pending_updated");
    io.to(`user_${targetId}`).emit("pending_updated");

    return res.json({ message: "User has been blocked." });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}

export async function unblockUser(req, res) {
  try {
    const userId = req.user.id;
    const { targetId } = req.params;

    const deleteRes = await pool.query(
      "DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'blocked'",
      [userId, targetId],
    );

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ message: "This user is not blocked." });
    }

    const io = getIO();

    io.to(`user_${userId}`).emit("blocked_updated");

    return res.json({ message: "User has been unblocked." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function unfriend(req, res) {
  try {
    const userId = req.user.id;
    const { targetId } = req.params;

    const result = await pool.query(
      `DELETE FROM friendships
       WHERE
         (user_id = $1 AND friend_id = $2)
         OR
         (user_id = $2 AND friend_id = $1)`,
      [userId, targetId],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "You are not friends with this user." });
    }

    const io = getIO();

    io.to(`user_${userId}`).emit("friends_updated");
    io.to(`user_${targetId}`).emit("friends_updated");

    return res.json({ message: "Friend removed successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
