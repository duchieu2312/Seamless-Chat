import { motion } from "framer-motion";
import {
  FiHash,
  FiSettings,
  FiVolume2,
  FiHome,
  FiUsers,
  FiGlobe,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import React from "react";

const homeItems = [
  { id: "home", icon: FiHome, label: "Home" },
  { id: "people", icon: FiUsers, label: "People" },
  { id: "community", icon: FiGlobe, label: "Community" },
];

function ServerBar({
  currentSpace,
  activeHomeTab,
  setActiveHomeTab,
  server,
  textChannels,
  voiceChannels,
  activeChannel,
  setActiveChannel,
  onJoinVoice,
  friends,
  activeDM,
  setActiveDM,
  getAvatarColor,
}) {
  return (
    <div className="w-[280px] min-w-[280px] max-w-[280px] basis-[280px] flex-shrink-0 bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-30">
      {currentSpace === "SERVER" ? (
        <>
          {/* Server Header Information */}
          <div className="h-14 px-4 border-b border-white/5 flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <HiSparkles className="text-indigo-400 flex-shrink-0" size={20} />
              <span className="font-bold text-lg truncate" title={server?.name}>
                {server?.name}
              </span>
            </div>
            <FiSettings
              size={18}
              className="text-gray-400 hover:text-white cursor-pointer transition-colors flex-shrink-0"
            />
          </div>

          {/* Text Channels List Navigation */}
          <div className="flex-1 p-2 space-y-1 overflow-y-auto">
            <div className="px-2 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
              Text Channels
            </div>
            {textChannels.map((channel) => (
              <motion.button
                key={channel.id}
                whileHover={{ x: 4 }}
                onClick={() => setActiveChannel(channel.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-all group
                  ${activeChannel === channel.id ? "bg-white/10 text-white" : ""}`}
              >
                <FiHash size={18} className="flex-shrink-0" />
                <span className="text-sm font-medium flex-1 text-left truncate">
                  {channel.name}
                </span>
                {channel.unread > 0 && (
                  <span className="bg-red-500 text-white  text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    {channel.unread > 99 ? "99+" : channel.unread}
                  </span>
                )}
              </motion.button>
            ))}

            {/* Voice Channels List Navigation */}
            <div className="px-2 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">
              Voice Channels
            </div>
            {voiceChannels.map((channel) => {
              const connectedUsers = channel.connected || [];
              return (
                <button
                  key={channel.id}
                  onClick={() => onJoinVoice(channel.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-all"
                >
                  <FiVolume2 size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left truncate">
                    {channel.name}
                  </span>
                  {connectedUsers.length > 0 && (
                    <div className="flex -space-x-1.5 flex-shrink-0">
                      {connectedUsers.map((userInVoice, i) => (
                        <div key={i} className="relative select-none">
                          {userInVoice.avatarUrl ? (
                            <img
                              src={userInVoice.avatarUrl}
                              alt={userInVoice.username}
                              className="w-5 h-5 rounded-full object-cover border border-[#1e293b]"
                            />
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarColor(userInVoice.username)} border border-[#1e293b] flex items-center justify-center text-[10px] font-bold text-white`}
                            >
                              {userInVoice.username?.charAt(0).toUpperCase() ||
                                "?"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Home Tab Header */}
          <div className="h-14 px-4 border-b border-white/5 flex items-center flex-shrink-0">
            <span className="font-bold text-lg">Home</span>
          </div>

          {/* Home, People, Community Routes */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {homeItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeHomeTab === item.id && !activeDM;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      setActiveHomeTab(item.id);
                      setActiveDM(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                      ${isActive ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Direct Messages Section */}
            <div className="px-2 mt-4">
              <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Direct Messages
              </div>
              <div className="space-y-0.5">
                {friends.map((friend) => {
                  const isActive = activeDM === friend.conversationId;
                  return (
                    <motion.button
                      key={friend.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setActiveDM(friend.conversationId)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group
                        ${isActive ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                    >
                      <div className="relative flex-shrink-0">
                        {friend.avatarUrl ? (
                          <img
                            src={friend.avatarUrl}
                            alt={friend.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(friend.username)} flex items-center justify-center font-bold text-white text-sm select-none`}
                          >
                            {friend.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e293b]
                          ${friend.status === "online" ? "bg-green-500" : friend.status === "idle" ? "bg-yellow-500" : "bg-gray-500"}`}
                        />
                      </div>
                      <span className="text-sm font-medium flex-1 text-left truncate">
                        {friend.username}
                      </span>
                      {friend.unread > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {friend.unread > 99 ? "99+" : friend.unread}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(ServerBar);
