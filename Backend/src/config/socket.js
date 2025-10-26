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
          await pool.query("UPDATE users SET status = 'online' WHERE id = $1", [
            socket.userId,
          ]);

          socket.broadcast.emit("user_status_changed", {
            userId: socket.userId,
            status: "online",
          });
        }
      } catch (err) {
        console.error(
          "Socket link online status update DB error:",
          err.message,
        );
      }
    }

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room: ${roomId}`);
    });

    socket.on("send_message", async (data) => {
      const { roomId, message } = data;
      const senderId = socket.userId;
      if (!roomId || !message) return;

      const broadcastData = { ...data, senderId };
      socket.to(roomId).emit("receive_message", broadcastData);

      try {
        if (roomId.startsWith("channel_")) {
          const channelId = parseInt(roomId.replace("channel_", ""), 10);
          if (isNaN(channelId)) return;

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

          membersResult.rows.forEach((member) => {
            if (member.member_id) {
              const personalRoom = `user_${member.member_id}`;

              io.to(personalRoom).emit("global_unread_notification", {
                channelId: channelId,
              });
            }
          });
        } else if (roomId.startsWith("dm_")) {
          const conversationId = parseInt(roomId.replace("dm_", ""), 10);
          if (isNaN(conversationId)) return;

          await pool.query(
            "INSERT INTO direct_messages (message, conversation_id, sender_id) VALUES ($1, $2, $3)",
            [message, conversationId, senderId],
          );
        }
      } catch (error) {
        console.error("DB Error inside send_message:", error.message);
      }
    });

    socket.on("update_status", (data) => {
      socket.broadcast.emit("user_status_changed", data);
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.id}`);

      if (socket.userId) {
        setTimeout(async () => {
          try {
            const activeSockets = await io.in(userRoom).fetchSockets();

            if (activeSockets.length === 0) {
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
