import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authenticateToken from "./middlewares/authMiddleware.js";
import { createServer } from "node:http";
import { initSocket } from "./config/socket.js";
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
  getChannelMessages,
  getJoinedServers,
  getPublicWithJoinStatus,
  getServerChannels,
  getServerMembers,
  updateLastSeen,
} from "./controllers/serverController.js";
import {
  getDirectMessages,
  updateDmLastSeen,
} from "./controllers/directMessageController.js";

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
  "/api/users/friends/accept/:id",
  authenticateToken,
  acceptFriendRequest,
);
app.delete(
  "/api/users/friends/decline/:id",
  authenticateToken,
  declineFriendRequest,
);
app.post("/api/users/friends/block/:id", authenticateToken, blockUser);
app.delete("/api/users/friends/unblock/:id", authenticateToken, unblockUser);
app.delete("/api/users/friends/unfriend/:id", authenticateToken, unfriend);

// SERVER ROUTES
app.get("/api/servers/public", authenticateToken, getPublicWithJoinStatus);
app.get("/api/servers/joined", authenticateToken, getJoinedServers);
app.get(
  "/api/servers/:serverId/channels",
  authenticateToken,
  getServerChannels,
);
app.get(
  "/api/channels/:channelId/messages",
  authenticateToken,
  getChannelMessages,
);
app.get("/api/servers/:serverId/members", authenticateToken, getServerMembers);
app.post(
  "/api/channels/:channelId/last-read",
  authenticateToken,
  updateLastSeen,
);

// DIRECT MESSAGE ROUTES
app.get(
  "/api/conversations/:conversationId/messages",
  authenticateToken,
  getDirectMessages,
);
app.post(
  "/api/conversations/:conversationId/last-read",
  authenticateToken,
  updateDmLastSeen,
);

// START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startTokenCleanupJob();
});
