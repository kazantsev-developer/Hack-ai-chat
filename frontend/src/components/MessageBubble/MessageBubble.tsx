import { useState, useEffect, useRef } from "react";
import type { Message } from "../../types";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  voiceMode?: "female" | "male" | "off";
  language?: "ru" | "en";
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  voiceMode = "off",
  language = "ru",
}) => {
  const isUser = message.role === "user";
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (
        !isUser &&
        !isStreaming &&
        voiceMode !== "off" &&
        message.content &&
        "speechSynthesis" in window
      ) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return;

        const utterance = new SpeechSynthesisUtterance(message.content);
        utterance.lang = language === "ru" ? "ru-RU" : "en-US";
        utterance.rate = speechRate;
        if (voiceMode === "male") {
          utterance.pitch = language === "ru" ? 0.5 : 0.6;
        } else if (voiceMode === "female") {
          utterance.pitch = 1.2;
        } else {
          utterance.pitch = 1.0;
        }

        let selectedVoice = null;
        const langPrefix = language === "ru" ? "ru" : "en";
        const langVoices = voices.filter((voice) =>
          voice.lang.startsWith(langPrefix)
        );

        if (langVoices.length === 0) return;

        if (voiceMode === "male") {
          const maleKeywords =
            language === "ru"
              ? [
                  "male",
                  "man",
                  "yuri",
                  "dmitri",
                  "nikolai",
                  "михаил",
                  "андрей",
                  "сергей",
                  "владимир",
                  "иван",
                  "павел",
                  "олег",
                  "дмитрий",
                  "николай",
                ]
              : [
                  "male",
                  "man",
                  "daniel",
                  "alex",
                  "thomas",
                  "david",
                  "james",
                  "john",
                  "mark",
                  "paul",
                  "peter",
                  "robert",
                  "steve",
                  "tom",
                  "william",
                ];

          selectedVoice = langVoices.find((voice) =>
            maleKeywords.some((keyword) =>
              voice.name.toLowerCase().includes(keyword)
            )
          );

          if (!selectedVoice && langVoices.length > 0) {
            if (language === "ru") {
              if (langVoices.length >= 3) {
                selectedVoice = langVoices[langVoices.length - 1];
              } else if (langVoices.length === 2) {
                selectedVoice = langVoices[1];
              } else {
                selectedVoice = langVoices[0];
              }
            } else {
              if (langVoices.length >= 3) {
                selectedVoice = langVoices[0];
              } else if (langVoices.length === 2) {
                selectedVoice = langVoices[0];
              } else {
                selectedVoice = langVoices[0];
              }
            }
          }
        } else {
          const femaleKeywords = [
            "female",
            "woman",
            "milena",
            "samantha",
            "anna",
            "katya",
            "elena",
            "karen",
            "susan",
            "linda",
            "lisa",
            "mary",
            "nancy",
            "patricia",
            "sarah",
            "анна",
            "елена",
            "мария",
            "наталья",
            "ольга",
            "татьяна",
          ];

          selectedVoice = langVoices.find((voice) =>
            femaleKeywords.some((keyword) =>
              voice.name.toLowerCase().includes(keyword)
            )
          );

          if (!selectedVoice && langVoices.length > 0) {
            if (langVoices.length >= 2) {
              selectedVoice = langVoices[langVoices.length - 1];
            } else {
              selectedVoice = langVoices[0];
            }
          }
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          setIsPlaying(true);
        };

        utterance.onend = () => {
          setIsPlaying(false);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
        };

        utteranceRef.current = utterance;

        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 300);
      }
    };

    if ("speechSynthesis" in window) {
      const checkVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          loadVoices();
        } else {
          setTimeout(checkVoices, 100);
        }
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        loadVoices();
      } else {
        const handleVoicesChanged = () => {
          checkVoices();
          window.speechSynthesis.onvoiceschanged = null;
        };
        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        setTimeout(checkVoices, 100);
      }
    }

    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isUser, isStreaming, voiceMode, message.content, language, speechRate]);

  const handlePlayAudio = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert(
        language === "ru"
          ? "Ваш браузер не поддерживает синтез речи"
          : "Your browser does not support speech synthesis"
      );
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = language === "ru" ? "ru-RU" : "en-US";
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const changeSpeed = () => {
    const speeds = [1.0, 1.5, 2.0, 2.5, 3.0];
    const currentIndex = speeds.indexOf(speechRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeechRate(speeds[nextIndex]);

    if (isPlaying && utteranceRef.current) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={`${styles.messageBubble} ${
        isUser ? styles.user : styles.assistant
      } ${isStreaming ? styles.streaming : ""}`}
    >
      <div className={styles.messageContent}>
        <div className={styles.messageText}>
          {message.content}
          {isStreaming && <span className={styles.cursor}>▊</span>}
        </div>
        {!isUser && !isStreaming && (
          <div className={styles.ttsControls}>
            <button
              className={styles.ttsButton}
              onClick={handlePlayAudio}
              title={
                isPlaying
                  ? language === "ru"
                    ? "Остановить"
                    : "Stop"
                  : language === "ru"
                  ? "Прослушать"
                  : "Listen"
              }
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                {isPlaying ? (
                  <>
                    <rect
                      x="6"
                      y="4"
                      width="4"
                      height="16"
                      fill="currentColor"
                    />
                    <rect
                      x="14"
                      y="4"
                      width="4"
                      height="16"
                      fill="currentColor"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M11 5L6 9H2V15H6L11 19V5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.54 8.46C16.4774 9.39764 17.0039 10.6692 17.0039 11.995C17.0039 13.3208 16.4774 14.5924 15.54 15.53"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19.07 4.93C20.9447 6.80528 21.9979 9.34836 21.9979 12C21.9979 14.6516 20.9447 17.1947 19.07 19.07"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>
            </button>
            <button
              className={styles.speedButton}
              onClick={changeSpeed}
              title={
                language === "ru"
                  ? `Скорость: ${speechRate}x`
                  : `Speed: ${speechRate}x`
              }
            >
              {speechRate}x
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
