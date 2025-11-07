import { motion } from "framer-motion";
import {
  FiSearch,
  FiUserPlus,
  FiMessageSquare,
  FiUserX,
  FiSlash,
  FiUnlock,
  FiClock,
  FiCheck,
} from "react-icons/fi";
import { useState, useEffect } from "react";

export default function PeopleView({
  friends = [],
  blockedUsers = [],
  pendingRequests = [],
  onChat,
  onSendFriendRequest,
  setConfirmModal,
  getAvatarColor,
}) {
  const [activeTab, setActiveTab] = useState("friends");
  const [addFriendInput, setAddFriendInput] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilter(filterInput);
    }, 300);

    return () => clearTimeout(handler);
  }, [filterInput]);

  const tabs = [
    { id: "friends", label: "Friends", count: friends.length },
    { id: "pending", label: "Pending", count: pendingRequests.length },
    { id: "blocked", label: "Blocked", count: blockedUsers.length },
  ];

  const handleSendRequest = () => {
    if (!addFriendInput.trim()) return;
    if (onSendFriendRequest) {
      onSendFriendRequest(addFriendInput.trim());
      setAddFriendInput("");
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(debouncedFilter.toLowerCase()),
  );

  const filteredPending = pendingRequests.filter((p) =>
    p.username.toLowerCase().includes(debouncedFilter.toLowerCase()),
  );

  const filteredBlocked = blockedUsers.filter((u) =>
    u.username.toLowerCase().includes(debouncedFilter.toLowerCase()),
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 select-none">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-gray-100">People</h2>

        {/* ==========================================
            ADD FRIEND BAR CONTROL
           ========================================== */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-200">
            <FiUserPlus /> Add Friend
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={addFriendInput}
              onChange={(e) => setAddFriendInput(e.target.value)}
              placeholder="You can add friends with their username..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <button
              onClick={handleSendRequest}
              disabled={!addFriendInput.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 disabled:cursor-not-allowed px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all shadow-md flex items-center gap-2"
            >
              Send Request
            </button>
          </div>
        </div>

        {/* ==========================================
            NAVIGATION TABS & INTERNAL FILTER
           ========================================== */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex border-b border-white/10 bg-black/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFilterInput("");
                }}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative
                  ${activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}
              >
                {tab.label} — {tab.count}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activePeopleTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            <div className="relative mb-4">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={16}
              />
              <input
                type="text"
                value={filterInput}
                onChange={(e) => setFilterInput(e.target.value)}
                placeholder={`Search in ${activeTab}...`}
                className="w-full bg-black/20 border border-white/5 rounded-xl pl-11 pr-4 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/30"
              />
            </div>

            {/* ==========================================
                TAB CONTENT: FRIENDS
               ========================================== */}
            {activeTab === "friends" && (
              <div className="space-y-3">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    {debouncedFilter
                      ? "No matching friends found."
                      : "No friends yet. Add some!"}
                  </div>
                ) : (
                  filteredFriends.map((friend) => (
                    <motion.div
                      key={friend.id}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <div className="relative flex-shrink-0">
                        {friend.avatarUrl ? (
                          <img
                            src={friend.avatarUrl}
                            alt={friend.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(friend.username)} flex items-center justify-center font-bold text-white text-base`}
                          >
                            {friend.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1e293b] ${friend.status === "online" ? "bg-green-500" : friend.status === "idle" ? "bg-yellow-500" : "bg-gray-500"}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-200 truncate">
                          {friend.username}
                        </div>
                        <div className="text-xs text-gray-400 capitalize leading-none mt-1">
                          {friend.status || "offline"}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => onChat(friend.conversationId)}
                          className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors group"
                          title="Chat"
                        >
                          <FiMessageSquare
                            size={18}
                            className="text-gray-400 group-hover:text-indigo-400 transition-colors"
                          />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              open: true,
                              type: "unfriend",
                              friend,
                            })
                          }
                          className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors group"
                          title="Unfriend"
                        >
                          <FiUserX
                            size={18}
                            className="text-gray-400 group-hover:text-orange-400 transition-colors"
                          />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              open: true,
                              type: "block",
                              friend,
                            })
                          }
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                          title="Block"
                        >
                          <FiSlash
                            size={18}
                            className="text-gray-400 group-hover:text-red-400 transition-colors"
                          />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ==========================================
                TAB CONTENT: PENDING
               ========================================== */}
            {activeTab === "pending" && (
              <div className="space-y-3">
                {filteredPending.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    {debouncedFilter
                      ? "No matching requests found."
                      : "No pending friend requests."}
                  </div>
                ) : (
                  filteredPending.map((reqUser) => (
                    <motion.div
                      key={reqUser.id}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <div className="flex-shrink-0">
                        {reqUser.avatarUrl ? (
                          <img
                            src={reqUser.avatarUrl}
                            alt={reqUser.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(reqUser.username)} flex items-center justify-center font-bold text-white text-base`}
                          >
                            {reqUser.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-200 truncate">
                          {reqUser.username}
                        </div>
                        <div className="text-xs text-indigo-400 flex items-center gap-1 mt-0.5">
                          <FiClock size={12} /> Incoming Friend Request
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            setConfirmModal({
                              open: true,
                              type: "accept",
                              friend: reqUser,
                            })
                          }
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold shadow"
                        >
                          <FiCheck size={14} /> Accept
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              open: true,
                              type: "decline",
                              friend: reqUser,
                            })
                          }
                          className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                          title="Decline"
                        >
                          <FiUserX size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ==========================================
                TAB CONTENT: BLOCKED
               ========================================== */}
            {activeTab === "blocked" && (
              <div className="space-y-3">
                {filteredBlocked.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    {debouncedFilter
                      ? "No matching blocked users found."
                      : "Your block list is clean."}
                  </div>
                ) : (
                  filteredBlocked.map((user) => (
                    <motion.div
                      key={user.id}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <div className="flex-shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(user.username)} flex items-center justify-center font-bold text-white text-base`}
                          >
                            {user.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-400 truncate">
                          {user.username}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Blocked on {user.blockedAt || "N/A"}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            type: "unblock",
                            friend: user,
                          })
                        }
                        className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold flex-shrink-0"
                      >
                        <FiUnlock size={16} /> Unblock
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
