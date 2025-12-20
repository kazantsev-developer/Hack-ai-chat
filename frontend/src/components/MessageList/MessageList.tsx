import { useEffect, useRef } from "react";
import type { Message } from "../../types";
import MessageBubble from "../MessageBubble/MessageBubble";
import styles from "./MessageList.module.css";

interface MessageListProps {
  messages: Message[];
  currentResponse: string;
  isLoading: boolean;
  voiceMode: "female" | "male" | "off";
  language: "ru" | "en";
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentResponse,
  isLoading,
  voiceMode,
  language,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const translations = {
    ru: {
      emptyMessage: "Как я могу вам помочь?",
    },
    en: {
      emptyMessage: "How can I help you?",
    },
  };

  const t = translations[language];

  return (
    <div className={styles.messageList}>
      {messages.length === 0 && !currentResponse && (
        <div className={styles.emptyState}>
          <div className={styles.emptyMessage}>{t.emptyMessage}</div>
        </div>
      )}

      {messages.map((msg, idx) => (
        <MessageBubble
          key={idx}
          message={msg}
          voiceMode={voiceMode}
          language={language}
        />
      ))}

      {currentResponse && (
        <MessageBubble
          message={{ role: "assistant", content: currentResponse }}
          isStreaming
          voiceMode={voiceMode}
          language={language}
        />
      )}

      {isLoading && !currentResponse && (
        <div className={styles.typingIndicator}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
