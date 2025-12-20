import React, { useState, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import type { Message } from "../../types";
import MessageList from "../MessageList/MessageList";
import MessageInput from "../MessageInput/MessageInput";
import styles from "./ChatInterface.module.css";

interface ChatInterfaceProps {
  agentId: string;
  modelId: string;
  voiceMode: "female" | "male" | "off";
  language: "ru" | "en";
  sessionId?: string;
  onSessionIdChange?: (sessionId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  agentId,
  modelId,
  voiceMode,
  language,
  sessionId: propSessionId,
  onSessionIdChange,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => {
    const id = propSessionId || `session_${Date.now()}`;
    if (onSessionIdChange) {
      onSessionIdChange(id);
    }
    return id;
  });

  useEffect(() => {
    if (onSessionIdChange && sessionId) {
      onSessionIdChange(sessionId);
      const savedDoc = localStorage.getItem(`document_${sessionId}`);
      if (savedDoc) {
        fetch(`http://localhost:5001/api/chat/session/${sessionId}/document`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: savedDoc }),
        }).catch(console.error);
      }
    }
  }, [sessionId, onSessionIdChange]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const newSocket = io("http://localhost:5001");

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setSocket(newSocket);
    });

    newSocket.on(
      "chat:stream",
      (data: { chunk: string; done: boolean; fullMessage?: string }) => {
        if (data.done) {
          if (data.fullMessage && data.fullMessage.trim()) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: data.fullMessage || "",
                timestamp: new Date(),
              },
            ]);
          }
          setCurrentResponse("");
          setIsLoading(false);
        } else {
          setCurrentResponse((prev) => prev + data.chunk);
        }
      }
    );

    newSocket.on("chat:error", (data: { error: string }) => {
      console.error("Chat error:", data.error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        },
      ]);
      setCurrentResponse("");
      setIsLoading(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSendMessage = (message: string) => {
    if (!socket || !message.trim() || isLoading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);
    setCurrentResponse("");

    socket.emit("chat:message", {
      message,
      sessionId,
      modelId,
      agentId,
    });
  };

  const handleStop = () => {
    console.log("[Frontend] Stop button clicked");
    window.speechSynthesis.cancel();
    setCurrentResponse("");
    setIsLoading(false);
    if (socket) {
      socket.emit("chat:stop", { sessionId });
      console.log("[Frontend] Stop signal sent to server");
    }
  };

  const handleClear = () => {
    window.speechSynthesis.cancel();
    setMessages([]);
    setCurrentResponse("");
    setIsLoading(false);
  };

  const translations = {
    ru: {
      stop: "Остановить",
    },
    en: {
      stop: "Stop",
    },
  };

  const t = translations[language];

  return (
    <div className={styles.chatInterface}>
      <div className={styles.chatContent}>
        <MessageList
          messages={messages}
          currentResponse={currentResponse}
          isLoading={isLoading}
          voiceMode={voiceMode}
          language={language}
        />
      </div>
      <div className={styles.inputWrapper}>
        <MessageInput
          onSend={handleSendMessage}
          onClear={handleClear}
          disabled={isLoading}
          language={language}
          onStop={isLoading ? handleStop : undefined}
          stopLabel={t.stop}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
