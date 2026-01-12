import { FiHash } from "react-icons/fi";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import React from "react";
import { getAvatarUrl } from "../../../utils/avatar";

function ChatHeader({ channel, isDM, getAvatarColor, statusConfig }) {
  const displayName = channel?.name ?? channel?.username;

  return (
    <div className="h-16 px-6 border-b border-white/10 flex items-center gap-4 bg-white/5 backdrop-blur-xl">
      {isDM ? (
        <div className="relative flex-shrink-0">
          {channel?.avatarUrl ? (
            <img
              src={getAvatarUrl(channel.avatarUrl, 120)}
              alt={channel.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(
                displayName || "?",
              )} flex items-center justify-center text-white font-bold text-xl select-none`}
            >
              {displayName?.[0]?.toUpperCase() || "?"}
            </div>
          )}

          <div
            className={`absolute bottom-0 right-0 w-4 h-4 
              ${statusConfig[channel?.status]?.color || statusConfig.offline.color}
            rounded-full border-2 border-[#1e293b] transition-colors duration-300 shadow-sm`}
          />
        </div>
      ) : null}

      <div className="min-w-0">
        <h2 className="font-semibold text-white text-lg truncate">
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
