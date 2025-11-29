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
  const [activeHomeTab, setActiveHomeTab] = useState(() => {
    return localStorage.getItem("last_current_home_tab") || "home";
  }); // "home", "people", "community"

  // Community States
  const [communities, setCommunities] = useState([]);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityHasMore, setCommunityHasMore] = useState(true);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");

  // People States
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [peoplePage, setPeoplePage] = useState({
    friends: 1,
    pending: 1,
    blocked: 1,
  });
  const [peopleHasMore, setPeopleHasMore] = useState({
    friends: true,
    pending: true,
    blocked: true,
  });
  const [peopleLoading, setPeopleLoading] = useState({
    friends: false,
    pending: false,
    blocked: false,
  });
  const [peopleSearch, setPeopleSearch] = useState({
    friends: "",
    pending: "",
    blocked: "",
  });
  const [peopleTotal, setPeopleTotal] = useState({
    friends: 0,
    pending: 0,
    blocked: 0,
  });

  // Direct Message States
  const [conversations, setConversations] = useState([]);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [conversationsHasMore, setConversationsHasMore] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [dmMessages, setDmMessages] = useState({});
  const [dmHasMore, setDmHasMore] = useState({});
  const [loadingMoreDM, setLoadingMoreDM] = useState(false);
  const [activeDM, setActiveDM] = useState(() => {
    const saved = localStorage.getItem("last_active_dm");
    return saved ? Number(saved) : null;
  }); // Conversation ID for Direct Messages

  // Servers / Channels States
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
  const [channelHasMore, setChannelHasMore] = useState({});
  const [loadingMoreChannel, setLoadingMoreChannel] = useState(false);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [serverMembers, setServerMembers] = useState([]);

  // Input states
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    friend: null,
  });

  // Synchronize dynamic people search reference for Socket listeners securely
  const peopleSearchRef = useRef(peopleSearch);
  useEffect(() => {
    peopleSearchRef.current = peopleSearch;
  }, [peopleSearch]);

  // Synchronize dynamic server reference for Socket listeners securely
  const activeServerRef = useRef(activeServer);
  useEffect(() => {
    activeServerRef.current = activeServer;
  }, [activeServer]);

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

  const fetchJoinedServers = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/servers/joined");
      setServers(res.data);

      // Auto-select the first server if no historical active server is stored
      if (res.data.length > 0 && !localStorage.getItem("last_active_server")) {
        const defaultServerId = res.data[0].id;
        setActiveServer(defaultServerId);
        localStorage.setItem("last_active_server", defaultServerId);
      }
    } catch (err) {
      console.error("Failed to fetch joined servers:", err);
    }
  }, []);

  const fetchServerMembers = useCallback(async (serverId) => {
    try {
      const res = await axiosInstance.get(`/servers/${serverId}/members`);
      setServerMembers(res.data);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }, []);

  const fetchPeople = useCallback(
    async (type, page = 1, search = "", append = false) => {
      const config = {
        friends: {
          endpoint: "/users/friends",
          setData: setFriends,
          responseKey: "friends",
        },
        pending: {
          endpoint: "/users/friends/pending",
          setData: setPendingRequests,
          responseKey: "pendingRequests",
        },
        blocked: {
          endpoint: "/users/friends/blocked",
          setData: setBlockedUsers,
          responseKey: "blockedUsers",
        },
      };
      const current = config[type];
      if (!current) return;
      try {
        setPeopleLoading((prev) => ({
          ...prev,
          [type]: true,
        }));
        const res = await axiosInstance.get(current.endpoint, {
          params: {
            page,
            limit: 20,
            search,
          },
        });
        const newItems = res.data[current.responseKey] || [];
        current.setData((prev) => (append ? [...prev, ...newItems] : newItems));
        setPeoplePage((prev) => ({
          ...prev,
          [type]: page,
        }));
        setPeopleHasMore((prev) => ({
          ...prev,
          [type]: res.data.hasMore,
        }));
        setPeopleTotal((prev) => ({
          ...prev,
          [type]: res.data.total,
        }));
      } catch (err) {
        console.error(`Error fetching ${type}:`, err);
      } finally {
        setPeopleLoading((prev) => ({
          ...prev,
          [type]: false,
        }));
      }
    },
    [],
  );

  const fetchConversations = useCallback(
    async ({ page = 1, append = false } = {}) => {
      try {
        setConversationsLoading(true);

        const response = await axiosInstance.get("/users/conversations", {
          params: {
            page,
            limit: 20,
          },
        });

        const { conversations: newConversations, hasMore } = response.data;

        setConversations((prev) =>
          append ? [...prev, ...newConversations] : newConversations,
        );

        setConversationsPage(page);
        setConversationsHasMore(hasMore);
      } catch (err) {
        console.error("Error fetching conversations:", err);

        toast.error(
          err.response?.data?.message || "Failed to load conversations",
        );
      } finally {
        setConversationsLoading(false);
      }
    },
    [],
  );

  const fetchCommunities = useCallback(
    async ({ page = 1, search = "", append = false } = {}) => {
      try {
        setCommunityLoading(true);

        const response = await axiosInstance.get("/servers/public", {
          params: {
            page,
            limit: 10,
            search,
          },
        });

        const { communities: newCommunities, hasMore } = response.data;

        setCommunities((prev) =>
          append ? [...prev, ...newCommunities] : newCommunities,
        );

        setCommunityPage(page);
        setCommunityHasMore(hasMore);
      } catch (err) {
        console.error("Error fetching communities:", err);

        toast.error(
          err.response?.data?.message || "Failed to load communities",
        );
      } finally {
        setCommunityLoading(false);
      }
    },
    [],
  );

  // Fetch initial application data after user authentication
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchJoinedServers(),
      fetchConversations({
        page: 1,
        append: false,
      }),
      fetchPeople("friends"),
      fetchPeople("pending"),
      fetchPeople("blocked"),
    ]).catch((err) => {
      console.error(err);
      toast.error("Failed to load application data.");
    });
  }, [user, fetchJoinedServers, fetchConversations, fetchPeople]);

  // Initialize Socket.io connection and establish global event listeners
  useEffect(() => {
    if (!user) return;

    socketRef.current = io("http://localhost:5000", { withCredentials: true });

    // Handle real-time incoming messages (DMs and Channel chats)
    socketRef.current.on("receive_message", (incomingMsg) => {
      const { roomId } = incomingMsg;

      if (roomId.startsWith("dm_")) {
        const conversationId = Number(roomId.replace("dm_", ""));

        setDmMessages((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), incomingMsg],
        }));
      } else if (roomId.startsWith("channel_")) {
        const channelId = Number(roomId.replace("channel_", ""));

        setChannelMessages((prev) => ({
          ...prev,
          [channelId]: [...(prev[channelId] || []), incomingMsg],
        }));
      }
    });

    // Handle background notification increments for other channels
    socketRef.current.on("channel_unread_notification", ({ channelId }) => {
      if (Number(channelId) !== Number(activeChannelRef.current)) {
        setTextChannels((prevChannels) =>
          prevChannels.map((c) =>
            Number(c.id) === Number(channelId)
              ? { ...c, unread: (c.unread || 0) + 1 }
              : c,
          ),
        );
      }
    });

    // Handle background notification increments for other DMs
    socketRef.current.on("dm_unread_notification", ({ conversationId }) => {
      if (Number(conversationId) !== Number(activeDMRef.current)) {
        setConversations((prevConversations) =>
          prevConversations.map((conversation) =>
            Number(conversation.id) === Number(conversationId)
              ? { ...conversation, unread: (conversation.unread || 0) + 1 }
              : conversation,
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

      setConversations((prevConversations) =>
        prevConversations.map((conversation) =>
          String(conversation.userId) === String(userId)
            ? { ...conversation, status }
            : conversation,
        ),
      );
    });

    socketRef.current.on("friends_updated", () => {
      fetchPeople("friends", 1, peopleSearchRef.friends, false);
    });

    socketRef.current.on("pending_updated", () => {
      fetchPeople("pending", 1, peopleSearchRef.pending, false);
    });

    socketRef.current.on("blocked_updated", () => {
      fetchPeople("blocked", 1, peopleSearchRef.blocked, false);
    });

    socketRef.current.on("servers_updated", () => {
      fetchCommunities({
        page: 1,
        search: "",
        append: false,
      });
      fetchJoinedServers();
    });

    socketRef.current.on("server_members_updated", ({ serverId }) => {
      if (Number(serverId) === Number(activeServerRef.current)) {
        fetchServerMembers(serverId);
      }
    });

    return () => {
      if (!socketRef.current) return;
      socketRef.current.disconnect();
      socketRef.current = null;
    };
  }, [
    user,
    peopleSearchRef,
    fetchCommunities,
    fetchJoinedServers,
    fetchPeople,
    fetchServerMembers,
  ]);

  // Join or leave specific Socket rooms when changing active server
  useEffect(() => {
    if (activeServer && socketRef.current) {
      socketRef.current.emit("join_room", `server_${activeServer}`);
    }
    return () => {
      if (activeServer && socketRef.current) {
        socketRef.current.emit("leave_room", `server_${activeServer}`);
      }
    };
  }, [activeServer]);

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
              ? Number(savedChannelId)
              : null;

            const existsInServer = text.some(
              (c) => Number(c.id) === parsedSavedId,
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
          {
            params: {
              limit: 30,
            },
          },
        );

        setChannelMessages((prev) => ({
          ...prev,
          [activeChannel]: res.data.messages,
        }));

        setChannelHasMore((prev) => ({
          ...prev,
          [activeChannel]: res.data.hasMore,
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
        Number(c.id) === Number(activeChannel) ? { ...c, unread: 0 } : c,
      ),
    );

    const updateLastRead = () => {
      axiosInstance
        .post(`/channels/${activeChannel}/last_read`)
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
          {
            params: {
              limit: 30,
            },
          },
        );

        setDmMessages((prev) => ({
          ...prev,
          [activeDM]: res.data.messages,
        }));

        setDmHasMore((prev) => ({
          ...prev,
          [activeDM]: res.data.hasMore,
        }));
      } catch (err) {
        console.error("Error fetching DM message history:", err);
      }
    };

    fetchDmMessages();
  }, [activeDM, user]);

  // Reset client side DM notifications and sync read markers with server database
  useEffect(() => {
    if (!activeDM) return;

    setConversations((prevConversations) =>
      prevConversations.map((conversation) =>
        Number(conversation.id) === Number(activeDM)
          ? {
              ...conversation,
              unread: 0,
            }
          : conversation,
      ),
    );

    const updateLastRead = () => {
      axiosInstance
        .post(`/conversations/${activeDM}/last_read`)
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

  // Debounce community search to avoid sending a request on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommunities({
        page: 1,
        search: communitySearch,
        append: false,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [fetchCommunities, communitySearch]);

  // ==========================================
  // ACTION EVENT HANDLERS
  // ==========================================

  //User Action Events
  const handleHomeClick = useCallback(() => {
    setCurrentSpace("HOME");
    localStorage.setItem("last_current_space", "HOME");
  }, []);

  const handleHomeTabClick = useCallback((homeTab) => {
    setActiveHomeTab(homeTab);
    setActiveDM(null);
    localStorage.setItem("last_current_home_tab", homeTab);
    localStorage.removeItem("last_active_dm");
  }, []);

  const handleDMClick = useCallback((conversationId) => {
    setActiveDM(conversationId);
    localStorage.setItem("last_active_dm", conversationId);
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

  const handleJoinVoice = useCallback((channelId) => {
    toast.info(`Joining voice channel... ${channelId}`);
  }, []);

  // Messages Action Events
  const handleSendChannelMessage = async (e, message) => {
    e.preventDefault();
    if (!message.trim() || !activeChannel) return;
    await axiosInstance.post("/channels/send_messages", {
      channelId: activeChannel,
      message: message,
    });
  };

  const handleLoadMoreChannelMessages = useCallback(async () => {
    if (!activeChannel || loadingMoreChannel) return;
    const currentMessages = channelMessages[activeChannel] || [];

    if (!currentMessages.length) return;
    const oldestMessage = currentMessages[0];

    try {
      setLoadingMoreChannel(true);
      const res = await axiosInstance.get(
        `/channels/${activeChannel}/messages`,
        {
          params: {
            limit: 15,
            beforeTime: oldestMessage.time,
            beforeId: oldestMessage.id,
          },
        },
      );
      setChannelMessages((prev) => ({
        ...prev,
        [activeChannel]: [...res.data.messages, ...(prev[activeChannel] || [])],
      }));
      setChannelHasMore((prev) => ({
        ...prev,
        [activeChannel]: res.data.hasMore,
      }));
    } catch (err) {
      console.error("Error loading older channel messages:", err);
    } finally {
      setLoadingMoreChannel(false);
    }
  }, [activeChannel, channelMessages, loadingMoreChannel]);

  const handleSendDM = async (e, message) => {
    e.preventDefault();
    if (!message.trim() || !activeDM) return;
    await axiosInstance.post("/conversations/send_messages", {
      conversationId: activeDM,
      message: message,
    });
  };

  const handleLoadMoreDMMessages = useCallback(async () => {
    if (!activeDM || loadingMoreDM) return;
    const currentMessages = dmMessages[activeDM] || [];

    if (!currentMessages.length) return;
    const oldestMessage = currentMessages[0];

    try {
      setLoadingMoreDM(true);
      const res = await axiosInstance.get(
        `/conversations/${activeDM}/messages`,
        {
          params: {
            limit: 15,
            beforeTime: oldestMessage.time,
            beforeId: oldestMessage.id,
          },
        },
      );
      setDmMessages((prev) => ({
        ...prev,
        [activeDM]: [...res.data.messages, ...(prev[activeDM] || [])],
      }));
      setDmHasMore((prev) => ({
        ...prev,
        [activeDM]: res.data.hasMore,
      }));
    } catch (err) {
      console.error("Error loading older DM messages:", err);
    } finally {
      setLoadingMoreDM(false);
    }
  }, [activeDM, dmMessages, loadingMoreDM]);

  // People Action Events
  const handleLoadMoreConversations = useCallback(() => {
    if (conversationsLoading || !conversationsHasMore) return;

    fetchConversations({
      page: conversationsPage + 1,
      append: true,
    });
  }, [
    conversationsLoading,
    conversationsHasMore,
    conversationsPage,
    fetchConversations,
  ]);

  const handleLoadMorePeople = useCallback(
    (type) => {
      if (peopleLoading[type] || !peopleHasMore[type]) return;

      const nextPage = peoplePage[type] + 1;

      fetchPeople(type, nextPage, peopleSearch[type], true);
    },
    [peopleLoading, peopleHasMore, peoplePage, peopleSearch, fetchPeople],
  );

  const handlePeopleSearch = useCallback(
    (type, search) => {
      setPeopleSearch((prev) => ({
        ...prev,
        [type]: search,
      }));

      setPeopleHasMore((prev) => ({
        ...prev,
        [type]: true,
      }));

      // RESET pagination
      setPeoplePage((prev) => ({
        ...prev,
        [type]: 1,
      }));

      fetchPeople(type, 1, search, false);
    },
    [fetchPeople],
  );

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

      await Promise.all([
        fetchPeople("friends", 1, peopleSearch.friends),
        fetchPeople("pending", 1, peopleSearch.pending),
        fetchConversations(),
      ]);

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

      fetchPeople("pending", 1, peopleSearch.pending);

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

      await Promise.all([
        fetchPeople("friends", 1, peopleSearch.friends),
        fetchPeople("blocked", 1, peopleSearch.blocked),
        fetchConversations(),
      ]);

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

      await Promise.all([
        fetchPeople("friends", 1, peopleSearch.friends),
        fetchConversations(),
      ]);

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

      fetchPeople("blocked", 1, peopleSearch.blocked);

      toast.success(`Unblocked ${targetUser.username}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unblock user.");
    } finally {
      setConfirmModal({ open: false, type: "", friend: null });
    }
  };

  // Server Action Events
  const handleLoadMoreCommunities = useCallback(() => {
    if (communityLoading || !communityHasMore) return;

    fetchCommunities({
      page: communityPage + 1,
      search: communitySearch,
      append: true,
    });
  }, [
    fetchCommunities,
    communityLoading,
    communityHasMore,
    communityPage,
    communitySearch,
  ]);

  const handleJoinServer = async (serverId) => {
    try {
      const response = await axiosInstance.post(`/servers/${serverId}/join`);

      await Promise.all([
        fetchJoinedServers(),
        fetchCommunities({
          page: 1,
          search: communitySearch,
          append: false,
        }),
      ]);

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

      await Promise.all([
        fetchJoinedServers(),
        fetchCommunities({
          page: 1,
          search: communitySearch,
          append: false,
        }),
      ]);

      setCurrentSpace("HOME");
      setActiveServer(null);
      setActiveChannel(null);
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

  const handleCreateServer = async (newServerData) => {
    try {
      const checkResponse = await axiosInstance.get(
        "/servers/checkServerName",
        {
          params: {
            name: newServerData.name,
          },
        },
      );

      if (checkResponse.data.exists) {
        toast.error(`Server name "${newServerData.name}" already exists.`);

        return false;
      }

      const response = await axiosInstance.post(
        "/servers/createServer",
        newServerData,
      );

      const { serverId, channelId } = response.data;

      setCurrentSpace("SERVER");
      setActiveServer(serverId);
      setActiveChannel(channelId);

      setServerHistory((prev) => ({
        ...prev,
        [serverId]: channelId,
      }));

      localStorage.setItem("last_current_space", "SERVER");
      localStorage.setItem("last_active_server", serverId);
      localStorage.setItem("last_active_channel", channelId);

      toast.success(`Server "${newServerData.name}" created successfully!`);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create server");
      return false;
    }
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

  const activeChannelData = useMemo(
    () => textChannels.find((c) => Number(c.id) === Number(activeChannel)),
    [textChannels, activeChannel],
  );

  const activeConversationData = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(activeDM)),
    [conversations, activeDM],
  );
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
              channel={activeChannelData}
              messages={channelMessages[activeChannel] || []}
              onSendMessage={handleSendChannelMessage}
              getAvatarColor={getAvatarColor}
              onLoadMore={handleLoadMoreChannelMessages}
              hasMore={channelHasMore[activeChannel] ?? false}
              loadingMore={loadingMoreChannel}
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
      return (
        <ChatArea
          channel={activeConversationData}
          messages={dmMessages[activeDM] || []}
          onSendMessage={handleSendDM}
          isDM={true}
          getAvatarColor={getAvatarColor}
          onLoadMore={handleLoadMoreDMMessages}
          hasMore={dmHasMore[activeDM] ?? false}
          loadingMore={loadingMoreDM}
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
            onChat={handleDMClick}
            onSendFriendRequest={handleSendFriendRequest}
            setConfirmModal={setConfirmModal}
            getAvatarColor={getAvatarColor}
            onLoadMore={handleLoadMorePeople}
            onSearch={handlePeopleSearch}
            hasMore={peopleHasMore}
            loading={peopleLoading}
            total={peopleTotal}
          />
        );
      case "community":
        return (
          <CommunityView
            communities={communities}
            getAvatarColor={getAvatarColor}
            onJoinServer={handleJoinServer}
            communitySearch={communitySearch}
            setCommunitySearch={setCommunitySearch}
            onLoadMore={handleLoadMoreCommunities}
            hasMore={communityHasMore}
            loading={communityLoading}
          />
        );
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-gray-100 overflow-hidden serialization-context seamless-scrollbar">
      {/* LEFT NAVIGATION COLUMN */}
      <div className="w-[360px] min-w-[360px] max-w-[360px] flex-shrink-0 basis-[360px] flex flex-col min-h-0">
        <div className="flex flex-1 min-h-0 relative">
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
            onHomeTabClick={handleHomeTabClick}
            server={servers.find((s) => s.id === activeServer)}
            textChannels={filteredTextChannels}
            voiceChannels={filteredVoiceChannels}
            activeChannel={activeChannel}
            onChannelClick={handleChannelClick}
            onJoinVoice={handleJoinVoice}
            conversations={conversations}
            onLoadMore={handleLoadMoreConversations}
            hasMore={conversationsHasMore}
            loading={conversationsLoading}
            activeDM={activeDM}
            onDMClick={handleDMClick}
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
