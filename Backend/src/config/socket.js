import pool from "./db.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // ==========================================
  // SOCKET MIDDLEWARE
  // ==========================================
  io.use((socket, next) => {
    try {
      const headerCookie = socket.handshake.headers.cookie;
      if (!headerCookie) {
        return next(new Error("Authentication error: No cookies found"));
      }
      const cookies = cookie.parse(headerCookie);
      const token = cookies.token;

      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err)
          return next(
            new Error("Authentication error: Invalid or expired token"),
          );
        socket.userId = decoded.id;
        next();
      });
    } catch (error) {
      return next(new Error("Authentication error"));
    }
  });

  // ==========================================
  // SOCKET CONNECTIONS
  // ==========================================
  io.on("connection", async (socket) => {
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);

    console.log(`User ${socket.userId} joined personal room: ${userRoom}`);

    if (socket.userId) {
      try {
        const activeSockets = await io.in(userRoom).fetchSockets();

        if (activeSockets.length === 1) {
          const result = await pool.query(
            `UPDATE users
             SET status =
             CASE
               WHEN status = 'invisible'
               THEN 'invisible'
               ELSE 'online'
             END
             WHERE id = $1
             RETURNING id, username, avatar_url, status`,
            [socket.userId],
          );

          socket.broadcast.emit("user_status_changed", {
            userId: socket.userId,
            status: result.rows[0].status,
          });
        }
      } catch (err) {
        console.error(
          "Socket link online status update DB error:",
          err.message,
        );
      }
    }

    socket.on("join_room", async (roomId) => {
      try {
        if (roomId.startsWith("channel_")) {
          const channelId = parseInt(roomId.replace("channel_", ""), 10);

          const result = await pool.query(
            `SELECT 1
             FROM server_members sm
             JOIN channels c
             ON c.server_id = sm.server_id
             WHERE sm.member_id = $1
             AND c.id = $2`,
            [socket.userId, channelId],
          );

          if (result.rowCount === 0) {
            return;
          }
        }

        if (roomId.startsWith("dm_")) {
          const conversationId = parseInt(roomId.replace("dm_", ""), 10);

          const result = await pool.query(
            `SELECT 1
             FROM conversations
             WHERE id = $1
             AND (user_one_id = $2 OR user_two_id = $2)`,
            [conversationId, socket.userId],
          );

          if (result.rowCount === 0) {
            return;
          }
        }

        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
      } catch (err) {
        console.error("join_room:", err.message);
      }
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room: ${roomId}`);
    });

    socket.on("send_message", async (data) => {
      const { roomId, message } = data;
      const senderId = socket.userId;
      const cleanMessage = message.trim();

      if (!roomId || cleanMessage.length === 0 || cleanMessage.length > 2000)
        return;

      try {
        if (roomId.startsWith("channel_")) {
          const channelId = parseInt(roomId.replace("channel_", ""), 10);

          if (isNaN(channelId)) return;

          const permission = await pool.query(
            `SELECT 1
             FROM server_members sm
             JOIN channels c
             ON c.server_id = sm.server_id
             WHERE sm.member_id = $1
             AND c.id = $2`,
            [senderId, channelId],
          );

          if (permission.rowCount === 0) {
            return;
          }

          await pool.query(
            "INSERT INTO channel_messages (message, channel_id, sender_id) VALUES ($1, $2, $3)",
            [message, channelId, senderId],
          );

          const membersResult = await pool.query(
            `SELECT member_id FROM server_members 
             WHERE server_id = (SELECT server_id FROM channels WHERE id = $1)
             AND member_id != $2`,
            [channelId, senderId],
          );

          for (const member of membersResult.rows) {
            if (member.member_id) {
              const personalRoom = `user_${member.member_id}`;

              io.to(personalRoom).emit("global_unread_notification", {
                channelId: channelId,
              });
            }
          }
        } else if (roomId.startsWith("dm_")) {
          const conversationId = parseInt(roomId.replace("dm_", ""), 10);

          if (isNaN(conversationId)) return;

          const permission = await pool.query(
            `SELECT 1
             FROM conversations
             WHERE id = $1
             AND (user_one_id = $2 OR user_two_id = $2)`,
            [conversationId, senderId],
          );

          if (permission.rowCount === 0) {
            return;
          }

          await pool.query(
            "INSERT INTO direct_messages (message, conversation_id, sender_id) VALUES ($1, $2, $3)",
            [message, conversationId, senderId],
          );
        }
      } catch (error) {
        console.error("DB Error inside send_message:", error.message);
      }

      const broadcastData = { ...data, senderId };
      socket.to(roomId).emit("receive_message", broadcastData);
    });

    socket.on("update_status", async ({ status }) => {
      const allowed = ["online", "idle", "dnd", "invisible"];

      if (!allowed.includes(status)) return;

      try {
        await pool.query("UPDATE users SET status = $1 WHERE id = $2", [
          status,
          socket.userId,
        ]);

        io.emit("user_status_changed", {
          userId: socket.userId,
          status,
        });
      } catch (err) {
        console.error(err.message);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.id}`);

      if (socket.userId) {
        setTimeout(async () => {
          try {
            const activeSockets = await io.in(userRoom).fetchSockets();

            if (activeSockets.length > 0) {
              return;
            }

            const result = await pool.query(
              "SELECT status FROM users WHERE id = $1",
              [socket.userId],
            );

            if (result.rows[0].status !== "invisible") {
              await pool.query(
                "UPDATE users SET status = 'offline' WHERE id = $1",
                [socket.userId],
              );

              io.emit("user_status_changed", {
                userId: socket.userId,
                status: "offline",
              });
            }
          } catch (err) {
            console.error(
              "Socket link offline status update DB error:",
              err.message,
            );
          }
        }, 3000);
      }
    });
  });

  return io;
};
