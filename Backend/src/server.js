import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authenticateToken from "./middlewares/authMiddleware.js";
import { createServer } from "node:http";
import { initSocket } from "./socket.js";
import { startTokenCleanupJob } from "./utils/cleanupTokens.js";
import { loginLimiter, refreshLimiter } from "./middlewares/rateLimiter.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
} from "./controllers/authController.js";
import {
  getUserInfo,
  getFriends,
  getPendingRequests,
  getBlockedUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  blockUser,
  unblockUser,
  unfriend,
} from "./controllers/userController.js";
import {
  getPublicWithJoinStatus,
  joinServer,
  leaveServer,
  getJoinedServers,
  getServerChannels,
  getServerMembers,
} from "./controllers/serverController.js";
import {
  getDirectMessages,
  sendDMMessage,
  updateDmLastSeen,
  getChannelMessages,
  sendChannelMessage,
  updateChannelLastSeen,
} from "./controllers/messageController.js";

// SETUP
const app = express();
const server = createServer(app);
initSocket(server);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ROUTES
// AUTH ROUTES
app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginLimiter, loginUser);
app.post("/api/auth/logout", logoutUser);
app.post("/api/auth/refresh", refreshLimiter, refreshToken);

// USER ROUTES
app.get("/api/users/me", authenticateToken, getUserInfo);
app.get("/api/users/friends", authenticateToken, getFriends);
app.get("/api/users/friends/pending", authenticateToken, getPendingRequests);
app.get("/api/users/friends/blocked", authenticateToken, getBlockedUsers);
app.post("/api/users/friends/request", authenticateToken, sendFriendRequest);
app.post(
  "/api/users/friends/accept/:senderId",
  authenticateToken,
  acceptFriendRequest,
);
app.delete(
  "/api/users/friends/decline/:senderId",
  authenticateToken,
  declineFriendRequest,
);
app.post("/api/users/friends/block/:targetId", authenticateToken, blockUser);
app.delete(
  "/api/users/friends/unblock/:targetId",
  authenticateToken,
  unblockUser,
);
app.delete(
  "/api/users/friends/unfriend/:targetId",
  authenticateToken,
  unfriend,
);

// SERVER ROUTES
app.get("/api/servers/public", authenticateToken, getPublicWithJoinStatus);
app.post("/api/servers/:serverId/join", authenticateToken, joinServer);
app.delete("/api/servers/:serverId/leave", authenticateToken, leaveServer);
app.get("/api/servers/joined", authenticateToken, getJoinedServers);
app.get(
  "/api/servers/:serverId/channels",
  authenticateToken,
  getServerChannels,
);
app.get("/api/servers/:serverId/members", authenticateToken, getServerMembers);

// MESSAGE ROUTES
app.get(
  "/api/conversations/:conversationId/messages",
  authenticateToken,
  getDirectMessages,
);
app.post("/api/conversations/send_messages", authenticateToken, sendDMMessage);
app.post(
  "/api/conversations/:conversationId/last_read",
  authenticateToken,
  updateDmLastSeen,
);
app.get(
  "/api/channels/:channelId/messages",
  authenticateToken,
  getChannelMessages,
);
app.post("/api/channels/send_messages", authenticateToken, sendChannelMessage);
app.post(
  "/api/channels/:channelId/last_read",
  authenticateToken,
  updateChannelLastSeen,
);

// START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startTokenCleanupJob();
});
