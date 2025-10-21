import { motion, AnimatePresence } from "framer-motion";
import { FiHash, FiSend } from "react-icons/fi";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import React, { useEffect, useRef } from "react";

function ChatArea({
  channel,
  messages = [],
  newMessage,
  setNewMessage,
  onSendMessage,
  isDM = false,
  getAvatarColor,
}) {
  const messagesEndRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [channel?.id]);

  // Handle smart scrolling down to the bottom
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        isFirstLoad.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage || !newMessage.trim()) return;
    onSendMessage(e);
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-slate-900/10">
      {/* ==========================================
          CHAT AREA HEADER BAR
         ========================================== */}
      <div className="h-14 px-6 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center gap-3 flex-shrink-0 select-none">
        {!isDM ? (
          <FiHash size={22} className="text-gray-400 flex-shrink-0" />
        ) : (
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(channel?.name || "?")} flex items-center justify-center text-xs font-bold text-white select-none flex-shrink-0`}
          >
            {channel?.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <span className="font-bold text-lg text-white truncate">
          {channel?.name || "Select a chat room"}
        </span>
      </div>

      {/* ==========================================
          MESSAGES SCROLLABLE LIST AREA
         ========================================== */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            /* Welcoming Empty State View */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-8 select-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 mb-4 border border-white/10">
                <HiChatBubbleLeftRight size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-200 mb-1">
                Welcome to
                {isDM
                  ? `@${channel?.name || "this chat"}`
                  : `#${channel?.name || "this channel"}`}
                !
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                This is the absolute start of the conversation history. Send a
                wave to break the ice!
              </p>
            </motion.div>
          ) : (
            /* Render Message Items Loop */
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                transition={{ duration: 0.15 }}
                className="flex gap-3 group min-w-0"
              >
                {/* User Avatar Pillar */}
                {msg.avatarUrl ? (
                  <img
                    src={msg.avatarUrl}
                    alt={msg.username}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-md"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(msg.username)} flex items-center justify-center font-bold text-white text-sm select-none flex-shrink-0 shadow-md`}
                  >
                    {msg.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}

                {/* Message Meta & Content Box */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className="font-semibold text-gray-200 truncate max-w-[220px] cursor-pointer hover:underline"
                      title={msg.username}
                    >
                      {msg.username}
                    </span>
                    <span
                      className="text-[10px] text-gray-500 flex-shrink-0 select-none"
                      title={msg.time}
                    >
                      {msg.time}
                    </span>
                  </div>
                  <div className="text-sm text-gray-200 bg-white/5 border border-white/5 backdrop-blur-sm px-4 py-2 rounded-2xl rounded-tl-sm inline-block max-w-full break-words shadow-sm">
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Dummy div anchor hook to handle scrolling focus position */}
        <div ref={messagesEndRef} />
      </div>

      {/* ==========================================
          BOTTOM RICH MESSAGE INPUT FORM CONTAINER
         ========================================== */}
      <div className="p-6 flex-shrink-0 bg-gradient-to-t from-[#1e293b]/20 to-transparent">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isDM
                  ? `Message @${channel?.name || "..."}`
                  : `Message #${channel?.name || "..."}`
              }
              className="w-full bg-white/5 backdrop-blur-xl border border-white/10 pl-5 pr-24 py-4 rounded-2xl text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white"
            />
            <button
              type="submit"
              disabled={!newMessage || !newMessage.trim()}
              className="absolute right-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
            >
              <span>Send</span>
              <FiSend size={14} className="mt-[1px]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default React.memo(ChatArea);
