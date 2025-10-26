import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import useAuth from "../hooks/useAuth";
import ServerBar from "../components/app/ServerBar";
import Sidebar from "../components/app/Sidebar";
import UserPanel from "../components/app/UserPanel";
import ChatArea from "../components/app/ChatArea";
import HomeView from "../components/app/HomeView";
import PeopleView from "../components/app/PeopleView";
import CommunityView from "../components/app/CommunityView";
import ConfirmModal from "../components/app/ConfirmModal";
import CreateServerModal from "../components/app/CreateServerModal";
import { FiUsers } from "react-icons/fi";
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
  const [activeDM, setActiveDM] = useState(null); // Conversation ID for Direct Messages

  // SERVER STATES
  const [communities, setCommunities] = useState([]);
  const [serverHistory, setServerHistory] = useState({});
  const [activeServer, setActiveServer] = useState(() => {
    return localStorage.getItem("last_active_server") || "";
  });
  const [activeChannel, setActiveChannel] = useState(() => {
    return localStorage.getItem("last_active_channel") || "";
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

  // ==========================================
  // MOCK DATA
  // ==========================================
  const [dmMessages, setDmMessages] = useState({
    101: [
      {
        id: 1,
        username: "john_doe",
        message: "Hey what's up?",
        avatarUrl: null,
        time: "8:30 PM",
      },
      {
        id: 2,
        username: user?.username || "you",
        message: "Nothing much",
        avatarUrl: user?.avatarUrl || null,
        time: "8:31 PM",
      },
    ],
    102: [
      {
        id: 1,
        username: "alice_dev",
        message: "Check this out",
        avatarUrl: null,
        time: "7:15 PM",
      },
    ],
  });

  const [friends, setFriends] = useState([
    {
      id: "uuid_1",
      conversation_id: 101,
      username: "john_doe",
      avatarUrl: null,
      status: "online",
    },
    {
      id: "uuid_2",
      conversation_id: 102,
      username: "alice_dev",
      avatarUrl: null,
      status: "idle",
    },
    {
      id: "uuid_3",
      conversation_id: 103,
      username: "bob_coder",
      avatarUrl: null,
      status: "offline",
    },
  ]);

  const [blockedUsers, setBlockedUsers] = useState([
    {
      id: "uuid_99",
      username: "spammer_123",
      avatarUrl: null,
      blockedAt: "2025-12-01",
    },
  ]);

  // Synchronize dynamic channel reference for Socket listeners securely
  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // ==========================================
  // DATA FETCHING & WEBSOCKETS
  // ==========================================

  // Fetch initial public communities and joined servers list on login
  useEffect(() => {
    if (!user) return;

    const fetchServerData = async () => {
      try {
        const [publicRes, joinedRes] = await Promise.all([
          axiosInstance.get("/servers/public"),
          axiosInstance.get("/servers/joined"),
        ]);

        setCommunities(publicRes.data);
        setServers(joinedRes.data);

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
    socketRef.current.on("global_unread_notification", (data) => {
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

    // Handle real-time user presence/status status updates (Online, Idle, Offline)
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

  // Reset client side notifications and sync read markers with server database
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
      window.location.href = "";
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

  const handleSendFriendRequest = async (username) => {
    toast.success(`Sent friend request to ${username}`);
  };

  const handleBlock = (friend) => {
    setFriends((prev) => prev.filter((f) => f.id !== friend.id));
    setBlockedUsers((prev) => [
      ...prev,
      { ...friend, blockedAt: new Date().toLocaleDateString() },
    ]);
    toast.success(`Blocked ${friend.username}`);
    setConfirmModal({ open: false, type: "", friend: null });
  };

  const handleUnblock = (targetUser) => {
    setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
    toast.success(`Unblocked ${targetUser.username}`);
    setConfirmModal({ open: false, type: "", friend: null });
  };

  const handleUnfriend = (friend) => {
    setFriends((prev) => prev.filter((f) => f.id !== friend.id));
    toast.success(`Unfriended ${friend.username}`);
    setConfirmModal({ open: false, type: "", friend: null });
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

          {/* RIGHT SIDEBAR: SERVER MEMBERS ROSTER PANEL */}
          <div className="w-60 min-w-[240px] max-w-[240px] bg-black/15 border-l border-white/5 flex flex-col h-full select-none flex-shrink-0">
            {/* Header tracking overall presence density counts */}
            <div className="h-14 px-4 border-b border-white/5 bg-black/10 flex items-center gap-2 text-xs font-bold text-white tracking-wider uppercase">
              <FiUsers size={14} />
              <span>Total Members — {computedServerRoster.totalCount}</span>
            </div>

            {/* Scrollable roster items column list wrapper */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar text-sm">
              {/* SECTION: SERVER OWNERS */}
              {computedServerRoster.owners.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-amber-500 tracking-wider uppercase flex items-center gap-1">
                    <span>Owner — {computedServerRoster.owners.length}</span>
                  </h4>
                  <div className="space-y-1">
                    {computedServerRoster.owners.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
                      >
                        {/* AVATAR WRAPPER WITH REALTIME STATUS BADGE */}
                        <div className="relative w-8 h-8 flex-shrink-0">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(member.username)} flex items-center justify-center font-bold text-white text-xs`}
                            >
                              {member.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {/* Dynamic Indicator Dot Alignment */}
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e293b]
                      ${member.status === "online" ? "bg-green-500" : member.status === "idle" ? "bg-yellow-500" : "bg-gray-500"}`}
                          />
                        </div>

                        <span className="font-medium text-amber-400 truncate flex-1 group-hover:text-amber-300">
                          {member.username}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: STANDARD MEMBERS */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                  <span>
                    Members — {computedServerRoster.standardMembers.length}
                  </span>
                </h4>
                <div className="space-y-1">
                  {computedServerRoster.standardMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
                    >
                      {/* AVATAR WRAPPER WITH REALTIME STATUS BADGE */}
                      <div className="relative w-8 h-8 flex-shrink-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(member.username)} flex items-center justify-center font-bold text-white text-xs`}
                          >
                            {member.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Dynamic Indicator Dot Alignment */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e293b]
                    ${member.status === "online" ? "bg-green-500" : member.status === "idle" ? "bg-yellow-500" : "bg-gray-500"}`}
                        />
                      </div>

                      <span className="font-medium text-gray-300 truncate flex-1 group-hover:text-gray-100">
                        {member.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // 2. Render for HOME space view with active DM conversation
    if (activeDM) {
      const targetFriend = friends.find(
        (f) => Number(f.conversation_id) === Number(activeDM),
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
      />
      <CreateServerModal
        isOpen={isCreateServerOpen}
        onClose={() => setIsCreateServerOpen(false)}
        onCreateServer={handleCreateServer}
      />
    </div>
  );
}
