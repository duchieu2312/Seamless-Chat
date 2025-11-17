import React, { useState, useRef, useEffect } from "react";
import ChatHeader from "./ChatArea/ChatHeader";
import MessageList from "./ChatArea//MessageList";
import MessageInput from "./ChatArea//MessageInput";

function ChatArea(props) {
  const { channel, messages, onSendMessage, isDM, getAvatarColor } = props;

  const [message, setMessage] = useState("");

  const messagesEndRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [channel?.id]);

  useEffect(() => {
    if (!messages.length) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: isFirstLoad.current ? "auto" : "smooth",
    });

    isFirstLoad.current = false;
  }, [messages]);

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
        messagesEndRef={messagesEndRef}
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
