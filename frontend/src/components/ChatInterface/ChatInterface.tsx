import React, { useState, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import type { Message } from "../../types";
import { API_URL, SOCKET_URL } from "../../config";
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
        fetch(`${API_URL}/api/chat/session/${sessionId}/document`, {
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
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

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
          } else if (currentResponse.trim()) {
            // Сохраняем текущий ответ если он есть
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: currentResponse,
                timestamp: new Date(),
              },
            ]);
          }
          setCurrentResponse("");
          setIsLoading(false);
          setIsPaused(false);
        } else if (!isPaused) {
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
      setIsPaused(false);
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

  const handlePause = () => {
    console.log("[Frontend] Pause button clicked");
    window.speechSynthesis.cancel();
    setIsPaused(true);
    setIsLoading(false);
    if (socket) {
      socket.emit("chat:stop", { sessionId });
      console.log("[Frontend] Pause signal sent to server");
    }
    // Сохраняем текущий ответ в сообщения
    if (currentResponse.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: currentResponse,
          timestamp: new Date(),
        },
      ]);
      setCurrentResponse("");
    }
  };

  const handleDeleteCurrent = () => {
    setCurrentResponse("");
    setIsLoading(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();
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
