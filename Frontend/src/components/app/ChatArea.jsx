import React, { useState } from "react";
import ChatHeader from "./ChatArea/ChatHeader";
import MessageList from "./ChatArea/MessageList";
import MessageInput from "./ChatArea/MessageInput";

function ChatArea(props) {
  const {
    channel,
    messages,
    onSendMessage,
    isDM,
    getAvatarColor,
    onLoadMore,
    hasMore,
    loadingMore,
  } = props;

  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      <ChatHeader
        channel={channel}
        isDM={isDM}
        getAvatarColor={getAvatarColor}
      />

      <MessageList
        messages={messages}
        isDM={isDM}
        channel={channel}
        getAvatarColor={getAvatarColor}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
      />

      <MessageInput
        channel={channel}
        isDM={isDM}
        value={message}
        onChange={setMessage}
        onSend={(e) => {
          onSendMessage(e, message);
          setMessage("");
        }}
      />
    </div>
  );
}

export default React.memo(ChatArea);
