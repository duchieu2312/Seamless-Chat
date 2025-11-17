import React from "react";
import { FiSend } from "react-icons/fi";

function MessageInput({ value, onChange, onSend, channel, isDM }) {
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!value.trim()) return;

    onSend(e);
  };

  return (
    <div className="p-6 flex-shrink-0 bg-gradient-to-t from-[#1e293b]/20 to-transparent">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={value}
            disabled={!channel}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              !channel
                ? "Select a channel first"
                : isDM
                  ? `Message @${channel?.name || "..."}`
                  : `Message #${channel?.name || "..."}`
            }
            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 pl-5 pr-24 py-4 rounded-2xl text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!value.trim()}
            className="absolute right-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
          >
            <span>Send</span>
            <FiSend size={14} className="mt-[1px]" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(MessageInput);
