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

    return res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getFriends(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.avatar_url AS "avatarUrl", 
        u.status,
        c.id AS "conversationId"
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       LEFT JOIN conversations c ON 
         (c.user_one_id = $1 AND c.user_two_id = f.friend_id) OR 
         (c.user_one_id = f.friend_id AND c.user_two_id = $1)
       WHERE f.user_id = $1 AND f.status = 'accepted'`,
      [userId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getPendingRequests(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.avatar_url AS "avatarUrl"
       FROM friendships f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.updated_at DESC`,
      [userId],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getBlockedUsers(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.avatar_url AS "avatarUrl",
        f.updated_at AS "updatedAt"
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND f.status = 'blocked'
       ORDER BY f.updated_at DESC`,
      [userId],
    );

    return res.json(result.rows);
  } catch (err) {
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
    const senderId = req.params.id;

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
      `INSERT INTO friendships (user_id, friend_id, status, updated_at) 
       VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP)
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
       RETURNING id;`,
      [userOne, userTwo],
    );

    await client.query("COMMIT");
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
    const senderId = req.params.id;

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

    return res.json({ message: "Friend request declined successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function blockUser(req, res) {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const targetId = req.params.id;

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
    const targetId = req.params.id;

    const deleteRes = await pool.query(
      "DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = 'blocked'",
      [userId, targetId],
    );

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ message: "This user is not blocked." });
    }

    return res.json({ message: "User has been unblocked." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function unfriend(req, res) {
  try {
    const userId = req.user.id;
    const targetId = req.params.id;

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

    return res.json({ message: "Friend removed successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
