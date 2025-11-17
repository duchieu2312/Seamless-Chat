import React from "react";

function MessageList({
  messages,
  channel,
  isDM,
  getAvatarColor,
  messagesEndRef,
}) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          Welcome to{" "}
          {isDM
            ? `@${channel?.name || "this chat"}`
            : `#${channel?.name || "this channel"}`}
          !
        </h2>

        <p className="text-gray-400">
          This is the absolute start of the conversation history.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((msg, index) => (
        <div key={msg.id ?? index} className="flex gap-3">
          {msg.avatarUrl ? (
            <img
              src={msg.avatarUrl}
              alt={msg.username}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                msg.username,
              )} flex items-center justify-center text-white font-bold`}
            >
              {msg.username?.[0]?.toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex gap-2">
              <span className="font-semibold text-white">{msg.username}</span>

              <span className="text-xs text-gray-500">{msg.time}</span>
            </div>

            <div className="text-gray-200">{msg.message}</div>
          </div>
        </div>
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default React.memo(MessageList);
