import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import useAuth from "../hooks/useAuth";
import ServerBar from "../components/app/ServerBar";
import Sidebar from "../components/app/Sidebar";
import SidebarMember from "../components/app/SidebarMember";
import UserPanel from "../components/app/UserPanel";
import ChatArea from "../components/app/ChatArea";
import HomeView from "../components/app/HomeView";
import PeopleView from "../components/app/PeopleView";
import CommunityView from "../components/app/CommunityView";
import ConfirmModal from "../components/app/ConfirmModal";
import CreateServerModal from "../components/app/CreateServerModal";
import { io } from "socket.io-client";

// Deterministic avatar color picker based on username
const getAvatarColor = (username) => {
  const colors = [
    "from-indigo-500 to-purple-500",
    "from-emerald-500 to-teal-500",
    "from-pink-500 to-rose-500",
    "from-amber-500 to-orange-500",
    "from-blue-500 to-cyan-500",
  ];
  if (!username) return colors[0];
  const charCode = username.charCodeAt(0);
  return colors[charCode % colors.length];
};

export default function App() {
  const { user } = useAuth();
  const socketRef = useRef(null);

  // ==========================================
  // CORE STATES
  // ==========================================
  const [currentSpace, setCurrentSpace] = useState(() => {
    return localStorage.getItem("last_current_space") || "HOME";
  }); // "HOME" or "SERVER"
  const [activeHomeTab, setActiveHomeTab] = useState("home"); // "home", "people", "community"

  // FRIENDS / DIRECT MESSAGE STATES
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [dmMessages, setDmMessages] = useState({});
  const [activeDM, setActiveDM] = useState(null); // Conversation ID for Direct Messages

  // SERVER STATES
  const [communities, setCommunities] = useState([]);
  const [serverHistory, setServerHistory] = useState({});
  const [activeServer, setActiveServer] = useState(() => {
    const saved = localStorage.getItem("last_active_server");
    return saved ? Number(saved) : null;
  });
  const [activeChannel, setActiveChannel] = useState(() => {
    const saved = localStorage.getItem("last_active_channel");
    return saved ? Number(saved) : null;
  });
  const [servers, setServers] = useState([]);
  const [textChannels, setTextChannels] = useState([]);
  const [channelMessages, setChannelMessages] = useState({});
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [serverMembers, setServerMembers] = useState([]);

  // INPUT STATES
  const [newMessage, setNewMessage] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    friend: null,
  });

  // Synchronize dynamic channel reference for Socket listeners securely
  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // Synchronize dynamic DM reference for Socket listeners securely
  const activeDMRef = useRef(activeDM);
  useEffect(() => {
    activeDMRef.current = activeDM;
  }, [activeDM]);

  // ==========================================
  // DATA FETCHING & WEBSOCKETS
  // ==========================================

  // Fetch initial public communities and joined servers list on login
  useEffect(() => {
    if (!user) return;

    const fetchServerData = async () => {
      try {
        const [publicRes, joinedRes, friendsRes, pendingRes, blockedRes] =
          await Promise.all([
            axiosInstance.get("/servers/public"),
            axiosInstance.get("/servers/joined"),
            axiosInstance.get("/users/friends"),
            axiosInstance.get("/users/friends/pending"),
            axiosInstance.get("/users/friends/blocked"),
          ]);

        setCommunities(publicRes.data);
        setServers(joinedRes.data);
        setFriends(friendsRes.data);
        setPendingRequests(pendingRes.data);
        setBlockedUsers(blockedRes.data);

        // Auto-select the first server if no historical active server is stored
        if (
          joinedRes.data.length > 0 &&
          !localStorage.getItem("last_active_server")
        ) {
          const defaultServerId = joinedRes.data[0].id;
          setActiveServer(defaultServerId);
          localStorage.setItem("last_active_server", defaultServerId);
        }
      } catch (err) {
        console.error("Error fetching base server catalogs:", err);
        toast.error("Failed to load server list.");
      }
    };

    fetchServerData();
  }, [user]);

  // Initialize Socket.io connection and establish global event listeners
  useEffect(() => {
    if (!user) return;

    socketRef.current = io("http://localhost:5000", { withCredentials: true });

    // Handle real-time incoming messages (DMs and Channel chats)
    socketRef.current.on("receive_message", (incomingMsg) => {
      const { roomId } = incomingMsg;

      if (roomId.startsWith("dm_")) {
        const conversationId = parseInt(roomId.replace("dm_", ""), 10);

        setDmMessages((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), incomingMsg],
        }));
      } else if (roomId.startsWith("channel_")) {
        const channelId = parseInt(roomId.replace("channel_", ""), 10);

        setChannelMessages((prev) => ({
          ...prev,
          [channelId]: [...(prev[channelId] || []), incomingMsg],
        }));
      }
    });

    // Handle background notification increments for other channels
    socketRef.current.on("channel_unread_notification", (data) => {
      const { channelId } = data;

      if (parseInt(channelId) !== parseInt(activeChannelRef.current)) {
        setTextChannels((prevChannels) =>
          prevChannels.map((c) =>
            parseInt(c.id) === parseInt(channelId)
              ? { ...c, unread: (c.unread || 0) + 1 }
              : c,
          ),
        );
      }
    });

    // Handle background notification increments for other DMs
    socketRef.current.on("dm_unread_notification", (data) => {
      const { conversationId } = data;

      if (parseInt(conversationId) !== parseInt(activeDMRef.current)) {
        setFriends((prevFriends) =>
          prevFriends.map((f) =>
            parseInt(f.conversationId) === parseInt(conversationId)
              ? {
                  ...f,
                  unread: (f.unread || 0) + 1,
                }
              : f,
          ),
        );
      }
    });

    // Handle real-time user presence/status status updates (Online, Idle, Dnb, Invisible & Offline)
    socketRef.current.on("user_status_changed", (data) => {
      const { userId, status } = data;

      setServerMembers((prevMembers) =>
        prevMembers.map((member) =>
          String(member.id) === String(userId)
            ? { ...member, status: status }
            : member,
        ),
      );

      setFriends((prevFriends) =>
        prevFriends.map((f) =>
          String(f.id) === String(userId) ? { ...f, status: status } : f,
        ),
      );
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // Join or leave specific Socket rooms when changing active text channel
  useEffect(() => {
    if (activeChannel && socketRef.current) {
      socketRef.current.emit("join_room", `channel_${activeChannel}`);
    }
    return () => {
      if (activeChannel && socketRef.current) {
        socketRef.current.emit("leave_room", `channel_${activeChannel}`);
      }
    };
  }, [activeChannel]);

  // Join or leave specific Socket rooms when shifting active DM conversations  useEffect(() => {
  useEffect(() => {
    if (activeDM && socketRef.current) {
      socketRef.current.emit("join_room", `dm_${activeDM}`);
    }
    return () => {
      if (activeDM && socketRef.current) {
        socketRef.current.emit("leave_room", `dm_${activeDM}`);
      }
    };
  }, [activeDM]);

  // Fetch channel layouts and member roster whenever the active server switches
  useEffect(() => {
    if (!activeServer) return;

    const fetchServerDetails = async () => {
      try {
        const [channelsRes, membersRes] = await Promise.all([
          axiosInstance.get(`/servers/${activeServer}/channels`),
          axiosInstance.get(`/servers/${activeServer}/members`),
        ]);

        const text = channelsRes.data.filter((c) => c.type === "text");
        const voice = channelsRes.data.filter((c) => c.type === "voice");

        setTextChannels(text);
        setVoiceChannels(voice);
        setServerMembers(membersRes.data);

        // Fallback to last active channel or primary text channel of the chosen server
        setServerHistory((prevHistory) => {
          if (text.length > 0 && !prevHistory[activeServer]) {
            const savedChannelId = localStorage.getItem("last_active_channel");
            const parsedSavedId = savedChannelId
              ? parseInt(savedChannelId)
              : null;

            const existsInServer = text.some(
              (c) => parseInt(c.id) === parsedSavedId,
            );
            const targetId = existsInServer ? parsedSavedId : text[0].id;

            setActiveChannel(targetId);
            localStorage.setItem("last_active_channel", targetId);
            return { ...prevHistory, [activeServer]: targetId };
          }
          return prevHistory;
        });
      } catch (err) {
        console.error("Error fetching server infrastructure details:", err);
      }
    };

    fetchServerDetails();
  }, [activeServer]);

  // Sync chat message logs whenever the active text channel changes
  useEffect(() => {
    if (!activeChannel) return;

    const fetchChannelMessages = async () => {
      try {
        const res = await axiosInstance.get(
          `/channels/${activeChannel}/messages`,
        );
        setChannelMessages((prev) => ({
          ...prev,
          [activeChannel]: res.data,
        }));
      } catch (err) {
        console.error("Error fetching channel message history:", err);
      }
    };

    fetchChannelMessages();
  }, [activeChannel]);

  // Reset client side channel messages notifications and sync read markers with server database
  useEffect(() => {
    if (!activeChannel) return;

    setTextChannels((prevChannels) =>
      prevChannels.map((c) =>
        parseInt(c.id) === parseInt(activeChannel) ? { ...c, unread: 0 } : c,
      ),
    );

    const updateLastRead = () => {
      axiosInstance
        .post(`/channels/${activeChannel}/last-read`)
        .catch((err) =>
          console.error("Error updating last read position:", err),
        );
    };

    updateLastRead();

    // Ensure read status markers are synced even if user closes the tab abruptly
    const handleBeforeUnload = () => {
      updateLastRead();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateLastRead();
    };
  }, [activeChannel]);

  // Sync private direct message records when switching direct message conversations
  useEffect(() => {
    if (!activeDM) return;

    const fetchDmMessages = async () => {
      try {
        const res = await axiosInstance.get(
          `/conversations/${activeDM}/messages`,
        );
        setDmMessages((prev) => ({ ...prev, [activeDM]: res.data }));
      } catch (err) {
        console.error("Error fetching DM message history:", err);
      }
    };

    fetchDmMessages();
  }, [activeDM, user]);

  // Reset client side DM notifications and sync read markers with server database
  useEffect(() => {
    if (!activeDM) return;

    setFriends((prevFriends) =>
      prevFriends.map((f) =>
        parseInt(f.conversationId) === parseInt(activeDM)
          ? {
              ...f,
              unread: 0,
            }
          : f,
      ),
    );

    const updateLastRead = () => {
      axiosInstance
        .post(`/conversations/${activeDM}/last-read`)
        .catch(console.error);
    };

    updateLastRead();

    // Ensure read status markers are synced even if user closes the tab abruptly
    const handleBeforeUnload = () => {
      updateLastRead();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateLastRead();
    };
  }, [activeDM]);

  // ==========================================
  // ACTION EVENT HANDLERS
  // ==========================================
  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      toast.error(`Logout failed: ${err}`);
    } finally {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const handleHomeClick = useCallback(() => {
    setCurrentSpace("HOME");
    localStorage.setItem("last_current_space", "HOME");
  }, []);

  const handleServerClick = useCallback((serverId) => {
    setCurrentSpace("SERVER");
    setActiveServer(serverId);
    localStorage.setItem("last_current_space", "SERVER");
    localStorage.setItem("last_active_server", serverId);

    setServerHistory((prev) => {
      const historicalChannelId = prev[serverId];
      const targetChannel = historicalChannelId || "";
      setActiveChannel(targetChannel);
      if (targetChannel)
        localStorage.setItem("last_active_channel", targetChannel);
      return prev;
    });
  }, []);

  const handleChannelClick = useCallback(
    (channelId) => {
      setActiveChannel(channelId);
      localStorage.setItem("last_active_channel", channelId);
      setServerHistory((prev) => ({
        ...prev,
        [activeServer]: channelId,
      }));
    },
    [activeServer],
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg = {
      id: crypto.randomUUID() || Date.now(),
      roomId: `channel_${activeChannel}`,
      username: user?.username || "you",
      message: newMessage.trim(),
      avatarUrl: user?.avatarUrl || null,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    if (socketRef.current) {
      socketRef.current.emit("send_message", newMsg);
    }

    setChannelMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg],
    }));
    setNewMessage("");
  };

  const handleSendDM = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeDM) return;

    const newMsg = {
      id: crypto.randomUUID() || Date.now(),
      roomId: `dm_${activeDM}`,
      username: user?.username || "you",
      message: newMessage.trim(),
      avatarUrl: user?.avatarUrl || null,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    if (socketRef.current) {
      socketRef.current.emit("send_message", newMsg);
    }

    setDmMessages((prev) => ({
      ...prev,
      [activeDM]: [...(prev[activeDM] || []), newMsg],
    }));
    setNewMessage("");
  };

  const handleJoinVoice = useCallback((channelId) => {
    toast.info(`Joining voice channel... ${channelId}`);
  }, []);

  const handleSendFriendRequest = async (targetUser) => {
    try {
      await axiosInstance.post("/users/friends/request", { targetUser });
      toast.success(`Sent friend request to ${targetUser}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to send friend request.",
      );
    }
  };

  const handleAcceptFriendRequest = async (targetUser) => {
    try {
      const response = await axiosInstance.post(
        `/users/friends/accept/${targetUser.id}`,
      );

      const [friendsRes, pendingRes] = await Promise.all([
        axiosInstance.get("/users/friends"),
        axiosInstance.get("/users/friends/pending"),
      ]);
      setFriends(friendsRes.data);
      setPendingRequests(pendingRes.data);

      toast.success(response.data?.message || "Accepted friend request.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to accept friend request.",
      );
    } finally {
      setConfirmModal({ open: false, type: "", friend: null });
    }
  };

  const handleDeclineFriendRequest = async (targetUser) => {
    try {
      const response = await axiosInstance.delete(
        `/users/friends/decline/${targetUser.id}`,
      );

      const pendingRes = await axiosInstance.get("/users/friends/pending");
      setPendingRequests(pendingRes.data);

      toast.success(
        response.data?.message ||
          `Declined friend request from ${targetUser.username}`,
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to decline friend request.",
      );
    } finally {
      setConfirmModal({ open: false, type: "", friend: null });
    }
  };

  const handleBlock = async (targetUser) => {
    try {
      await axiosInstance.post(`/users/friends/block/${targetUser.id}`);

      const [friendsRes, blockedRes] = await Promise.all([
        axiosInstance.get("/users/friends"),
        axiosInstance.get("/users/friends/blocked"),
      ]);
      setFriends(friendsRes.data);
      setBlockedUsers(blockedRes.data);

      setActiveDM(null);

      toast.success(`Blocked ${targetUser.username}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block user.");
    } finally {
      setConfirmModal({ open: false, type: "", friend: null });
    }
  };

  const handleUnfriend = async (targetUser) => {
    try {
      await axiosInstance.delete(`/users/friends/unfriend/${targetUser.id}`);

      const friendRes = await axiosInstance.get("/users/friends");
      setFriends(friendRes.data);

      setActiveDM(null);

      toast.success(`Unfriended ${targetUser.username}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unfriend.");
    } finally {
      setConfirmModal({ open: false, type: "", friend: null });
    }
  };

  const handleUnblock = async (targetUser) => {
    try {
      await axiosInstance.delete(`/users/friends/unblock/${targetUser.id}`);

      const blockedRes = await axiosInstance.get("/users/friends/blocked");
      setBlockedUsers(blockedRes.data);

      toast.success(`Unblocked ${targetUser.username}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unblock user.");
    } finally {
      setConfirmModal({ open: false, type: "", friend: null });
    }
  };

  const handleJoinServer = async (serverId) => {
    try {
      const response = await axiosInstance.post(`/servers/${serverId}/join`);

      const [joinedRes, publicRes] = await Promise.all([
        axiosInstance.get("/servers/joined"),
        axiosInstance.get("/servers/public"),
      ]);

      setServers(joinedRes.data);
      setCommunities(publicRes.data);

      setCurrentSpace("SERVER");
      setActiveServer(serverId);

      localStorage.setItem("last_current_space", "SERVER");
      localStorage.setItem("last_active_server", serverId);

      toast.success(response.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join server.");
    }
  };

  const handleLeaveServer = async () => {
    if (!activeServer) return;

    try {
      const response = await axiosInstance.delete(
        `/servers/${activeServer}/leave`,
      );

      const [joinedRes, publicRes] = await Promise.all([
        axiosInstance.get("/servers/joined"),
        axiosInstance.get("/servers/public"),
      ]);

      setServers(joinedRes.data);
      setCommunities(publicRes.data);

      setCurrentSpace("HOME");
      setActiveServer("");
      setActiveChannel("");
      setTextChannels([]);
      setVoiceChannels([]);
      setServerMembers([]);
      setChannelMessages({});
      localStorage.removeItem("last_active_server");
      localStorage.removeItem("last_active_channel");

      toast.success(response.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave server.");
    }
  };

  const handleCreateServer = (newServerData) => {
    const newId = Date.now();
    const newServer = {
      id: newId,
      name: newServerData.name,
      iconUrl: newServerData.iconUrl,
    };
    const defaultChannelId = Date.now() + 1;

    setTextChannels((prev) => [
      ...prev,
      { id: defaultChannelId, serverId: newId, name: "general", unread: 0 },
    ]);
    setVoiceChannels((prev) => [
      ...prev,
      {
        id: defaultChannelId + 1,
        serverId: newId,
        name: "General Voice",
        connected: [],
      },
    ]);
    setServers((prev) => [...prev, newServer]);

    setCurrentSpace("SERVER");
    setActiveServer(newId);
    setActiveChannel(defaultChannelId);
    setServerHistory((prev) => ({ ...prev, [newId]: defaultChannelId }));

    toast.success(`Server "${newServerData.name}" created successfully!`);
  };

  // ==========================================
  // PERFORMANCE MEMOIZED DATA FILTERS
  // =========================================
  const filteredTextChannels = useMemo(
    () =>
      textChannels.filter((c) => Number(c.serverId) === Number(activeServer)),
    [textChannels, activeServer],
  );

  const filteredVoiceChannels = useMemo(
    () =>
      voiceChannels.filter((c) => Number(c.serverId) === Number(activeServer)),
    [voiceChannels, activeServer],
  );

  const computedServerRoster = useMemo(() => {
    const owners = serverMembers.filter((m) => m.role === "owner");
    const standardMembers = serverMembers.filter((m) => m.role === "member");
    return { owners, standardMembers, totalCount: serverMembers.length };
  }, [serverMembers]);

  // ==========================================
  // DYNAMIC VIEW ROUTER RENDERING
  // ==========================================
  const renderMainContent = () => {
    // 1. Render for SERVER space view
    if (currentSpace === "SERVER") {
      return (
        <div className="flex flex-1 h-full min-w-0 overflow-hidden">
          {/* Main Communication Feed area */}
          <div className="flex-1 min-w-0 h-full">
            <ChatArea
              channel={textChannels.find((c) => c.id === activeChannel)}
              messages={channelMessages[activeChannel] || []}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              getAvatarColor={getAvatarColor}
            />
          </div>

          <SidebarMember
            computedServerRoster={computedServerRoster}
            getAvatarColor={getAvatarColor}
          />
        </div>
      );
    }

    // 2. Render for HOME space view with active DM conversation
    if (activeDM) {
      const targetFriend = friends.find(
        (f) => Number(f.conversationId) === Number(activeDM),
      );
      return (
        <ChatArea
          channel={{ name: targetFriend?.username }}
          messages={dmMessages[activeDM] || []}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendDM}
          isDM={true}
          getAvatarColor={getAvatarColor}
        />
      );
    }

    // 3. Render for HOME space sub-tabs when no active DM is opened
    switch (activeHomeTab) {
      case "home":
        return <HomeView />;
      case "people":
        return (
          <PeopleView
            friends={friends}
            blockedUsers={blockedUsers}
            pendingRequests={pendingRequests}
            onChat={(convId) => setActiveDM(convId)}
            onSendFriendRequest={handleSendFriendRequest}
            setConfirmModal={setConfirmModal}
            getAvatarColor={getAvatarColor}
          />
        );
      case "community":
        return (
          <CommunityView
            communitySearch={communitySearch}
            setCommunitySearch={setCommunitySearch}
            communities={communities}
            getAvatarColor={getAvatarColor}
            onJoinServer={handleJoinServer}
          />
        );
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-gray-100 overflow-hidden serialization-context">
      {/* LEFT NAVIGATION COLUMN */}
      <div className="w-[360px] min-w-[360px] max-w-[360px] flex-shrink-0 basis-[360px] flex flex-col">
        <div className="flex flex-1 relative">
          <Sidebar
            currentSpace={currentSpace}
            onHomeClick={handleHomeClick}
            servers={servers}
            activeServer={activeServer}
            onServerClick={handleServerClick}
            getAvatarColor={getAvatarColor}
            onOpenCreateServer={() => setIsCreateServerOpen(true)}
          />
          <ServerBar
            currentSpace={currentSpace}
            activeHomeTab={activeHomeTab}
            setActiveHomeTab={(tab) => {
              setActiveHomeTab(tab);
              setActiveDM(null);
            }}
            server={servers.find((s) => s.id === activeServer)}
            textChannels={filteredTextChannels}
            voiceChannels={filteredVoiceChannels}
            activeChannel={activeChannel}
            setActiveChannel={handleChannelClick}
            onJoinVoice={handleJoinVoice}
            friends={friends}
            activeDM={activeDM}
            setActiveDM={setActiveDM}
            getAvatarColor={getAvatarColor}
            onLeaveServer={handleLeaveServer}
          />
        </div>
        <UserPanel
          user={user}
          onLogout={handleLogout}
          getAvatarColor={getAvatarColor}
        />
      </div>

      {/* CORE MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">{renderMainContent()}</div>

      {/* POPUPS & MODALS OVERLAYS */}
      <ConfirmModal
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        onBlock={handleBlock}
        onUnfriend={handleUnfriend}
        onUnblock={handleUnblock}
        onAcceptFriend={handleAcceptFriendRequest}
        onDeclineFriend={handleDeclineFriendRequest}
      />
      <CreateServerModal
        isOpen={isCreateServerOpen}
        onClose={() => setIsCreateServerOpen(false)}
        onCreateServer={handleCreateServer}
      />
    </div>
  );
}
