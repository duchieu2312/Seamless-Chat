import React, { useEffect, useRef } from "react";

function MessageList({
  messages,
  channel,
  isDM,
  getAvatarColor,
  onLoadMore,
  hasMore,
  loadingMore,
}) {
  const containerRef = useRef(null);
  const previousScrollRef = useRef(null);
  const isInitialLoad = useRef(true);
  const previousLastMessageId = useRef(null);

  // Reset scroll state when switching between channels or direct messages
  useEffect(() => {
    isInitialLoad.current = true;
    previousScrollRef.current = null;
    previousLastMessageId.current = null;
  }, [channel?.id]);

  // Handle scroll position when the message list changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !messages.length) return;
    const currentLastMessage = messages[messages.length - 1];

    // Scroll to the bottom when the conversation is loaded for the first time
    if (isInitialLoad.current) {
      container.scrollTop = container.scrollHeight;
      isInitialLoad.current = false;
      previousLastMessageId.current = currentLastMessage.id;
      return;
    }

    // Restore the previous scroll position after loading older messages
    if (previousScrollRef.current) {
      const { scrollHeight, scrollTop } = previousScrollRef.current;
      const heightDifference = container.scrollHeight - scrollHeight;
      container.scrollTop = scrollTop + heightDifference;
      previousScrollRef.current = null;
      previousLastMessageId.current = currentLastMessage.id;
      return;
    }

    // Handle newly received messages
    const previousLastId = previousLastMessageId.current;
    const isNewMessage =
      previousLastId !== null && currentLastMessage.id !== previousLastId;

    if (isNewMessage) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      const isNearBottom = distanceFromBottom < 300;
      if (isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }

    previousLastMessageId.current = currentLastMessage.id;
  }, [messages]);

  // Load older messages when the user scrolls near the top
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop <= 100 && hasMore && !loadingMore) {
      // Save the current scroll position before loading older messages
      previousScrollRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
      onLoadMore();
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFullMessageTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

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
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-6 space-y-4"
    >
      {loadingMore && (
        <div className="flex justify-center py-2">
          <span className="text-xs text-gray-500">
            Loading older messages...
          </span>
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className="flex gap-3">
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

              <span
                className="text-xs text-gray-500"
                title={formatFullMessageTime(msg.time)}
              >
                {formatMessageTime(msg.time)}
              </span>
            </div>
            <div className="text-gray-200">{msg.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(MessageList);
