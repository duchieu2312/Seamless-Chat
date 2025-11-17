import { FiHash } from "react-icons/fi";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import React from "react";

function ChatHeader({ channel, isDM, getAvatarColor }) {
  const displayName = channel?.name ?? channel?.username;

  const statusColor = {
    online: "bg-green-500",
    idle: "bg-yellow-500",
    dnd: "bg-red-500",
    invisible: "bg-gray-500",
    offline: "bg-gray-500",
  };

  return (
    <div className="h-16 px-6 border-b border-white/10 flex items-center gap-4 bg-white/5 backdrop-blur-xl">
      {isDM ? (
        <div className="relative">
          <div
            className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(
              displayName || "?",
            )} flex items-center justify-center text-white font-bold text-lg`}
          >
            {displayName?.[0]?.toUpperCase() || "?"}
          </div>

          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#1f2937] ${
              statusColor[channel?.status] || "bg-gray-500"
            }`}
          />
        </div>
      ) : null}

      <div>
        <h2 className="font-semibold text-white text-lg">
          {displayName || "Select a chat room"}
        </h2>

        <p className="text-xs text-gray-400 mt-0.5">
          {isDM ? (
            <>
              <HiChatBubbleLeftRight className="inline mr-1" />
              Direct Message
            </>
          ) : (
            <>
              <FiHash className="inline mr-1" />
              Channel
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default React.memo(ChatHeader);
