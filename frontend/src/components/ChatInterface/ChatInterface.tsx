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
  const [isPaused, setIsPaused] = useState(false);
  const [pausedText, setPausedText] = useState("");
  const accumulatedResponseRef = React.useRef("");

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
          setCurrentResponse((prev) => {
            const finalText =
              data.fullMessage || accumulatedResponseRef.current || prev;
            if (finalText.trim()) {
              setMessages((msgPrev) => {
                const lastMessage = msgPrev[msgPrev.length - 1];
                if (
                  lastMessage &&
                  lastMessage.role === "assistant" &&
                  lastMessage.content === finalText
                ) {
                  return msgPrev;
                }
                return [
                  ...msgPrev,
                  {
                    role: "assistant",
                    content: finalText,
                    timestamp: new Date(),
                  },
                ];
              });
            }
            accumulatedResponseRef.current = "";
            return "";
          });
          setIsLoading(false);
        } else {
          accumulatedResponseRef.current += data.chunk;
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
      accumulatedResponseRef.current = "";
      setIsLoading(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSendMessage = (message: string) => {
    if (!socket || !message.trim() || isLoading) return;

    if (isPaused && !message.trim()) {
      handleContinue();
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
        timestamp: new Date(),
      },
    ]);

    setIsPaused(false);
    setPausedText("");
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

    const currentText = currentResponse || accumulatedResponseRef.current;
    if (currentText.trim()) {
      setMessages((msgPrev) => {
        const lastMessage = msgPrev[msgPrev.length - 1];
        if (
          lastMessage &&
          lastMessage.role === "assistant" &&
          lastMessage.content === currentText
        ) {
          return msgPrev;
        }
        return [
          ...msgPrev,
          {
            role: "assistant",
            content: currentText,
            timestamp: new Date(),
          },
        ];
      });
      setPausedText(currentText);
    }

    setCurrentResponse("");
    accumulatedResponseRef.current = "";
    setIsLoading(false);
    setIsPaused(true);
    if (socket) {
      socket.emit("chat:stop", { sessionId });
      console.log("[Frontend] Stop signal sent to server");
    }
  };

  const handleContinue = () => {
    if (!socket || !pausedText.trim()) return;

    setIsPaused(false);
    setIsLoading(true);
    setCurrentResponse("");

    const trimmedText = pausedText.trim();
    const words = trimmedText.split(/\s+/);
    const lastWord = words[words.length - 1] || "";

    const lastCompleteWord = lastWord.replace(/[.,!?;:—\-–]+$/, "") || lastWord;

    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "user");

    const continueMessage = lastUserMessage
      ? `Продолжи ответ на: "${lastUserMessage.content}". Продолжи с последнего слова: "${lastCompleteWord}"`
      : `Продолжи предыдущий ответ с последнего слова: "${lastCompleteWord}"`;

    socket.emit("chat:message", {
      message: continueMessage,
      sessionId,
      modelId,
      agentId,
    });
  };

  const handleClear = () => {
    window.speechSynthesis.cancel();
    setMessages([]);
    setCurrentResponse("");
    setIsLoading(false);
    setIsPaused(false);
    setPausedText("");
  };

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
          onPause={isLoading ? handlePause : undefined}
          isPaused={isPaused}
          onContinue={isPaused ? handleContinue : undefined}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
