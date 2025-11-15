import pool from "./config/db.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import {
  sendDMMessage,
  sendChannelMessage,
} from "./controllers/messageController.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
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
        if (roomId.startsWith("server_")) {
          const serverId = Number(roomId.replace("server_", ""));

          const result = await pool.query(
            `SELECT 1
             FROM server_members
             WHERE server_id = $1
             AND member_id = $2`,
            [serverId, socket.userId],
          );

          if (result.rowCount === 0) {
            return;
          }
        }

        if (roomId.startsWith("channel_")) {
          const channelId = Number(roomId.replace("channel_", ""));

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
          const conversationId = Number(roomId.replace("dm_", ""));

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

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }

  return io;
}
