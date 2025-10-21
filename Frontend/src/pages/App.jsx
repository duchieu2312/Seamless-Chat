import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
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
  const navigate = useNavigate();
  const { user } = useAuth();

  // ==========================================
  // CORE WORKSPACE STATES
  // ==========================================
  const [currentSpace, setCurrentSpace] = useState("HOME"); // "HOME" or "SERVER"
  const [activeHomeTab, setActiveHomeTab] = useState("home"); // "home", "people", "community"
  const [activeDM, setActiveDM] = useState(null); // Stores conversation_id for DM, null if not in DM chat

  // SERVER STATES
  const [serverHistory, setServerHistory] = useState({});
  const [activeServer, setActiveServer] = useState(1);
  const [activeChannel, setActiveChannel] = useState(1);

  // CHAT & INPUT STATES
  const [newMessage, setNewMessage] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    friend: null,
  });

  // MOCK DATA
  const [servers, setServers] = useState([
    { id: 1, name: "Wuthering Waves Official", icon_url: null },
    { id: 2, name: "Punishing Gray Raven Official", icon_url: null },
    { id: 3, name: "Seamless Team", icon_url: null },
  ]);

  const [textChannels, setTextChannels] = useState([
    { id: 1, server_id: 1, name: "general", unread: 2 },
    { id: 2, server_id: 1, name: "random", unread: 0 },
    { id: 3, server_id: 2, name: "general", unread: 0 },
    { id: 4, server_id: 3, name: "dev-chat", unread: 1 },
  ]);

  const [voiceChannels, setVoiceChannels] = useState([
    {
      id: 5,
      server_id: 1,
      name: "General Voice",
      connected: [
        { username: "john", avatarUrl: null },
        { username: "alice", avatarUrl: null },
      ],
    },
    { id: 6, server_id: 2, name: "General Voice", connected: [] },
    { id: 7, server_id: 3, name: "Gaming", connected: [] },
  ]);

  const [channelMessages, setChannelMessages] = useState({
    1: [
      {
        id: 1,
        username: "john",
        content: "Welcome to Wuthering Waves general chat!",
        avatarUrl: null,
        time: "8:30 PM",
      },
      {
        id: 2,
        username: "alice",
        content: "Damn this looks clean",
        avatarUrl: null,
        time: "8:31 PM",
      },
    ],
    4: [
      {
        id: 3,
        username: "john",
        content: "Seamless Chat project setup completed.",
        avatarUrl: null,
        time: "9:00 PM",
      },
    ],
  });

  const [dmMessages, setDmMessages] = useState({
    101: [
      {
        id: 1,
        username: "john_doe",
        content: "Hey what's up?",
        avatarUrl: null,
        time: "8:30 PM",
        isMe: false,
      },
      {
        id: 2,
        username: user?.username || "you",
        content: "Nothing much",
        avatarUrl: user?.avatarUrl || null,
        time: "8:31 PM",
        isMe: true,
      },
    ],
    102: [
      {
        id: 1,
        username: "alice_dev",
        content: "Check this out",
        avatarUrl: null,
        time: "7:15 PM",
        isMe: false,
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

  const [communities] = useState([
    {
      name: "React Developers",
      iconUrl: null,
      members: "12.5k",
      desc: "Discuss React, Next.js, and modern frontend ecosystem tools",
      joined: false,
    },
    {
      name: "Wuthering Waves Official",
      iconUrl: null,
      members: "8.2k",
      desc: "Share build guides, team compositions, and echo farming strategies",
      joined: true,
    },
    {
      name: "Punishing: Gray Raven",
      iconUrl: null,
      members: "5.4k",
      desc: "Official hub for PGR global operators. Combat guides, lore, and fanart",
      joined: true,
    },
    {
      name: "Node.js Backenders",
      iconUrl: null,
      members: "9.1k",
      desc: "Deep dive into Express, NestJS, database optimization, and REST APIs",
      joined: false,
    },
    {
      name: "FPS Tavern",
      iconUrl: null,
      members: "14.3k",
      desc: "A cozy place for competitive tactical shooters players to find teammates",
      joined: false,
    },
  ]);

  // ==========================================
  // HANDLERS & NAVIGATION LOGIC
  // ==========================================
  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("user");
      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      toast.error(`Logout failed: ${err}`);
    }
  };

  const handleHomeClick = useCallback(() => {
    setCurrentSpace("HOME");
  }, []);

  const handleServerClick = (serverId) => {
    setCurrentSpace("SERVER");
    setActiveServer(serverId);

    const historicalChannelId = serverHistory[serverId];
    if (historicalChannelId) {
      setActiveChannel(historicalChannelId);
    } else {
      const defaultChannel = textChannels.find((c) => c.server_id === serverId);
      if (defaultChannel) {
        setActiveChannel(defaultChannel.id);
        setServerHistory((prev) => ({
          ...prev,
          [serverId]: defaultChannel.id,
        }));
      }
    }
  };

  const handleChannelClick = (channelId) => {
    setActiveChannel(channelId);
    setServerHistory((prev) => ({
      ...prev,
      [activeServer]: channelId,
    }));
  };

  // CHAT & MESSAGE HANDLERS
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg = {
      id: Date.now(),
      username: user?.username || "you",
      content: newMessage,
      avatarUrl: user?.avatarUrl || null,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChannelMessages({
      ...channelMessages,
      [activeChannel]: [...(channelMessages[activeChannel] || []), newMsg],
    });
    setNewMessage("");
  };

  const handleSendDM = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeDM) return;

    const newMsg = {
      id: Date.now(),
      username: user?.username || "you",
      content: newMessage,
      avatarUrl: user?.avatarUrl || null,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMe: true,
    };

    setDmMessages({
      ...dmMessages,
      [activeDM]: [...(dmMessages[activeDM] || []), newMsg],
    });
    setNewMessage("");
  };

  const handleJoinVoice = useCallback((channelId) => {
    toast.info(`Joining voice channel...`);
  }, []);

  // SOCIAL HANDLERS
  const handleSendFriendRequest = async (username) => {
    toast.success(`Sent friend request to ${username}`);
  };

  const handleBlock = (friend) => {
    setFriends(friends.filter((f) => f.id !== friend.id));
    setBlockedUsers([
      ...blockedUsers,
      { ...friend, blockedAt: new Date().toLocaleDateString() },
    ]);
    toast.success(`Blocked ${friend.username}`);
    setConfirmModal({ open: false, type: "", friend: null });
  };

  const handleUnblock = (user) => {
    setBlockedUsers(blockedUsers.filter((u) => u.id !== user.id));
    toast.success(`Unblocked ${user.username}`);
    setConfirmModal({ open: false, type: "", friend: null });
  };

  const handleUnfriend = (friend) => {
    setFriends(friends.filter((f) => f.id !== friend.id));
    toast.success(`Unfriended ${friend.username}`);
    setConfirmModal({ open: false, type: "", friend: null });
  };

  const handleCreateServer = (newServerData) => {
    const newId = Date.now();
    const newServer = {
      id: newId,
      name: newServerData.name,
      icon_url: newServerData.icon_url,
    };
    const defaultChannelId = Date.now() + 1;

    setTextChannels((prev) => [
      ...prev,
      { id: defaultChannelId, server_id: newId, name: "general", unread: 0 },
    ]);

    setVoiceChannels((prev) => [
      ...prev,
      {
        id: defaultChannelId + 1,
        server_id: newId,
        name: "General Voice",
        connected: [],
      },
    ]);

    setServers([...servers, newServer]);
    setCurrentSpace("SERVER");
    setActiveServer(newId);
    setActiveChannel(defaultChannelId);

    setServerHistory((prev) => ({ ...prev, [newId]: defaultChannelId }));
    toast.success(`Server "${newServerData.name}" created successfully!`);
  };

  // MEMOIZED FILTERS
  const filteredTextChannels = useMemo(
    () => textChannels.filter((c) => c.server_id === activeServer),
    [textChannels, activeServer],
  );

  const filteredVoiceChannels = useMemo(
    () => voiceChannels.filter((c) => c.server_id === activeServer),
    [voiceChannels, activeServer],
  );

  // ==========================================
  // RENDERING LOGIC
  // ==========================================
  const renderMainContent = () => {
    // 1. Render for SERVER space view
    if (currentSpace === "SERVER") {
      return (
        <ChatArea
          channel={textChannels.find((c) => c.id === activeChannel)}
          messages={channelMessages[activeChannel] || []}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
          getAvatarColor={getAvatarColor}
        />
      );
    }

    // 2. Render for HOME space view with active DM conversation
    if (activeDM) {
      const targetFriend = friends.find((f) => f.conversation_id === activeDM);
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
    <div className="flex h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-gray-100 overflow-hidden">
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

      <div className="flex-1 flex flex-col min-w-0">{renderMainContent()}</div>

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
