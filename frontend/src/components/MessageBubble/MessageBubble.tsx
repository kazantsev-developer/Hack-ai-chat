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
  const lastSpokenTextRef = useRef("");
  const speakingQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<number | null>(null);
  const hasBeenReadRef = useRef(false);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (
      !isUser &&
      isStreaming &&
      voiceMode !== "off" &&
      message.content &&
      "speechSynthesis" in window
    ) {
      const currentText = message.content;
      let lastSpoken = lastSpokenTextRef.current;

      if (currentText.length < lastSpoken.length) {
        lastSpokenTextRef.current = "";
        lastSpoken = "";
        startTimeRef.current = null;
        hasBeenReadRef.current = false;
        if (delayTimeoutRef.current) {
          clearTimeout(delayTimeoutRef.current);
          delayTimeoutRef.current = null;
        }
      }

      if (currentText.length > lastSpoken.length) {
        if (startTimeRef.current === null) {
          startTimeRef.current = Date.now();
        }

        const elapsed = Date.now() - (startTimeRef.current || 0);
        const minDelay = 3000;
        const minTextLength = 20;

        if (elapsed < minDelay || currentText.length < minTextLength) {
          return;
        }

        const newText = currentText.slice(lastSpoken.length);

        const sentences: string[] = newText.match(/[^.!?]+[.!?]+/g) || [];

        if (sentences.length > 0) {
          speakingQueueRef.current.push(...sentences);
        } else if (newText.trim().length > 5) {
          const words = newText.split(/\s+/);
          if (words.length >= 3) {
            const lastSpace = newText.lastIndexOf(" ");
            if (lastSpace > 2) {
              speakingQueueRef.current.push(newText.slice(0, lastSpace + 1));
            } else if (newText.trim().length > 8) {
              speakingQueueRef.current.push(newText);
            }
          } else if (newText.trim().length > 8) {
            speakingQueueRef.current.push(newText);
          }
        }

        if (speakingQueueRef.current.length > 0 && !isSpeakingRef.current) {
          const speakNext = () => {
            if (speakingQueueRef.current.length === 0) {
              isSpeakingRef.current = false;
              setIsPlaying(false);
              return;
            }

            const textToSpeak = speakingQueueRef.current.shift() || "";
            if (!textToSpeak.trim()) {
              speakNext();
              return;
            }

            const continueSpeaking = (voices: SpeechSynthesisVoice[]) => {
              const utterance = new SpeechSynthesisUtterance(textToSpeak);
              utterance.lang = language === "ru" ? "ru-RU" : "en-US";
              utterance.rate = speechRate;

              if (voiceMode === "male") {
                utterance.pitch = language === "ru" ? 0.5 : 0.6;
              } else if (voiceMode === "female") {
                utterance.pitch = 1.2;
              }

              const langPrefix = language === "ru" ? "ru" : "en";
              const langVoices = voices.filter((voice) =>
                voice.lang.startsWith(langPrefix)
              );

              if (langVoices.length > 0) {
                if (voiceMode === "male") {
                  if (language === "ru") {
                    const femaleKeywords = [
                      "female",
                      "woman",
                      "milena",
                      "samantha",
                      "anna",
                      "katya",
                      "анна",
                      "елена",
                      "мария",
                      "наталья",
                      "ольга",
                      "татьяна",
                    ];
                    const maleVoices = langVoices.filter(
                      (voice) =>
                        !femaleKeywords.some((keyword) =>
                          voice.name.toLowerCase().includes(keyword)
                        )
                    );
                    if (maleVoices.length > 0) {
                      const midIndex = Math.floor(maleVoices.length / 2);
                      utterance.voice = maleVoices[midIndex];
                    } else {
                      utterance.voice = langVoices[0];
                    }
                  } else {
                    const maleKeywords = ["male", "man", "daniel", "alex"];
                    const selectedVoice = langVoices.find((voice) =>
                      maleKeywords.some((keyword) =>
                        voice.name.toLowerCase().includes(keyword)
                      )
                    );
                    utterance.voice = selectedVoice || langVoices[0];
                  }
                } else {
                  if (language === "ru") {
                    const femaleKeywords = [
                      "female",
                      "woman",
                      "milena",
                      "samantha",
                      "anna",
                      "katya",
                      "анна",
                      "елена",
                      "мария",
                      "наталья",
                      "ольга",
                      "татьяна",
                    ];
                    const selectedVoice = langVoices.find((voice) =>
                      femaleKeywords.some((keyword) =>
                        voice.name.toLowerCase().includes(keyword)
                      )
                    );
                    utterance.voice = selectedVoice || langVoices[0];
                  } else {
                    const femaleKeywords = [
                      "female",
                      "woman",
                      "samantha",
                      "anna",
                    ];
                    const selectedVoice = langVoices.find((voice) =>
                      femaleKeywords.some((keyword) =>
                        voice.name.toLowerCase().includes(keyword)
                      )
                    );
                    utterance.voice = selectedVoice || langVoices[0];
                  }
                }
              } else if (voices.length > 0) {
                utterance.voice = voices[0];
              }

              const currentLastSpokenLength = lastSpokenTextRef.current.length;
              const spokenLength = currentLastSpokenLength + textToSpeak.length;

              utterance.onend = () => {
                isSpeakingRef.current = false;
                lastSpokenTextRef.current = message.content.slice(
                  0,
                  Math.min(spokenLength, message.content.length)
                );
                if (speakingQueueRef.current.length > 0) {
                  setIsPlaying(true);
                  speakNext();
                } else {
                  hasBeenReadRef.current = true;
                  setIsPlaying(false);
                }
              };

              utterance.onerror = () => {
                isSpeakingRef.current = false;
                setIsPlaying(false);
                speakNext();
              };

              isSpeakingRef.current = true;
              setIsPlaying(true);
              window.speechSynthesis.speak(utterance);
            };

            const getVoicesAndSpeak = () => {
              const checkVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                  continueSpeaking(voices);
                } else {
                  setTimeout(checkVoices, 100);
                }
              };

              const voices = window.speechSynthesis.getVoices();
              if (voices.length > 0) {
                continueSpeaking(voices);
              } else {
                const handleVoicesChanged = () => {
                  checkVoices();
                };
                if (window.speechSynthesis.onvoiceschanged) {
                  window.speechSynthesis.onvoiceschanged = null;
                }
                window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
                setTimeout(checkVoices, 100);
              }
            };

            getVoicesAndSpeak();
          };

          speakNext();
        }
      }
    }

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
          if (language === "ru") {
            const femaleKeywords = [
              "female",
              "woman",
              "milena",
              "samantha",
              "anna",
              "katya",
              "анна",
              "елена",
              "мария",
              "наталья",
              "ольга",
              "татьяна",
            ];
            const maleVoices = langVoices.filter(
              (voice) =>
                !femaleKeywords.some((keyword) =>
                  voice.name.toLowerCase().includes(keyword)
                )
            );
            if (maleVoices.length > 0) {
              const midIndex = Math.floor(maleVoices.length / 2);
              selectedVoice = maleVoices[midIndex];
            } else {
              selectedVoice = langVoices[0];
            }
          } else {
            const maleKeywords = ["male", "man", "daniel", "alex"];
            selectedVoice = langVoices.find((voice) =>
              maleKeywords.some((keyword) =>
                voice.name.toLowerCase().includes(keyword)
              )
            );
            if (!selectedVoice) {
              selectedVoice = langVoices[0];
            }
          }
        } else {
          if (language === "ru") {
            const femaleKeywords = [
              "female",
              "woman",
              "milena",
              "samantha",
              "anna",
              "katya",
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
            if (!selectedVoice) {
              selectedVoice = langVoices[0];
            }
          } else {
            const femaleKeywords = ["female", "woman", "samantha", "anna"];
            selectedVoice = langVoices.find((voice) =>
              femaleKeywords.some((keyword) =>
                voice.name.toLowerCase().includes(keyword)
              )
            );
            if (!selectedVoice) {
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
      if (!isStreaming) {
        speakingQueueRef.current = [];
        lastSpokenTextRef.current = "";
        startTimeRef.current = null;
        hasBeenReadRef.current = false;
        if (delayTimeoutRef.current) {
          clearTimeout(delayTimeoutRef.current);
          delayTimeoutRef.current = null;
        }
      }
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isUser, isStreaming, voiceMode, message.content, language, speechRate]);

  useEffect(() => {
    if (isStreaming && !isUser) {
      hasBeenReadRef.current = false;
    }
  }, [isStreaming, isUser]);

  useEffect(() => {
    if (
      !isUser &&
      !isStreaming &&
      message.content.length > lastSpokenTextRef.current.length &&
      !hasBeenReadRef.current &&
      voiceMode !== "off"
    ) {
      const remaining = message.content.slice(lastSpokenTextRef.current.length);
      if (remaining.trim().length > 3 && !isSpeakingRef.current) {
        const getVoicesAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length === 0) {
            setTimeout(getVoicesAndSpeak, 50);
            return;
          }

          const utterance = new SpeechSynthesisUtterance(remaining);
          utterance.lang = language === "ru" ? "ru-RU" : "en-US";
          utterance.rate = speechRate;

          if (voiceMode === "male") {
            utterance.pitch = language === "ru" ? 0.5 : 0.6;
          } else if (voiceMode === "female") {
            utterance.pitch = 1.2;
          }

          const langPrefix = language === "ru" ? "ru" : "en";
          const langVoices = voices.filter((voice) =>
            voice.lang.startsWith(langPrefix)
          );

          if (langVoices.length > 0) {
            if (voiceMode === "male") {
              if (language === "ru") {
                const femaleKeywords = [
                  "female",
                  "woman",
                  "milena",
                  "samantha",
                  "anna",
                  "katya",
                  "анна",
                  "елена",
                  "мария",
                  "наталья",
                  "ольга",
                  "татьяна",
                ];
                const maleVoices = langVoices.filter(
                  (voice) =>
                    !femaleKeywords.some((keyword) =>
                      voice.name.toLowerCase().includes(keyword)
                    )
                );
                if (maleVoices.length > 0) {
                  const midIndex = Math.floor(maleVoices.length / 2);
                  utterance.voice = maleVoices[midIndex];
                } else {
                  utterance.voice = langVoices[0];
                }
              } else {
                const maleKeywords = ["male", "man", "daniel", "alex"];
                const selectedVoice = langVoices.find((voice) =>
                  maleKeywords.some((keyword) =>
                    voice.name.toLowerCase().includes(keyword)
                  )
                );
                utterance.voice = selectedVoice || langVoices[0];
              }
            } else {
              if (language === "ru") {
                const femaleKeywords = [
                  "female",
                  "woman",
                  "milena",
                  "samantha",
                  "anna",
                  "katya",
                  "анна",
                  "елена",
                  "мария",
                  "наталья",
                  "ольга",
                  "татьяна",
                ];
                const selectedVoice = langVoices.find((voice) =>
                  femaleKeywords.some((keyword) =>
                    voice.name.toLowerCase().includes(keyword)
                  )
                );
                utterance.voice = selectedVoice || langVoices[0];
              } else {
                const femaleKeywords = ["female", "woman", "samantha", "anna"];
                const selectedVoice = langVoices.find((voice) =>
                  femaleKeywords.some((keyword) =>
                    voice.name.toLowerCase().includes(keyword)
                  )
                );
                utterance.voice = selectedVoice || langVoices[0];
              }
            }
          }

          utterance.onend = () => {
            lastSpokenTextRef.current = message.content;
            hasBeenReadRef.current = true;
            isSpeakingRef.current = false;
            setIsPlaying(false);
          };

          utterance.onerror = () => {
            isSpeakingRef.current = false;
            setIsPlaying(false);
          };

          isSpeakingRef.current = true;
          setIsPlaying(true);
          window.speechSynthesis.speak(utterance);
        };
        setTimeout(getVoicesAndSpeak, 50);
      } else if (!isStreaming) {
        lastSpokenTextRef.current = "";
        speakingQueueRef.current = [];
        hasBeenReadRef.current = false;
      }
    }
  }, [isUser, isStreaming, message.content, voiceMode, language, speechRate]);

  const handlePlayAudio = () => {
    if (voiceMode === "off") {
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      isSpeakingRef.current = false;
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

    const getVoicesAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        setTimeout(getVoicesAndSpeak, 50);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = language === "ru" ? "ru-RU" : "en-US";
      utterance.rate = speechRate;

      if (voiceMode === "male") {
        utterance.pitch = language === "ru" ? 0.5 : 0.6;
      } else if (voiceMode === "female") {
        utterance.pitch = 1.2;
      }

      const langPrefix = language === "ru" ? "ru" : "en";
      const langVoices = voices.filter((voice) =>
        voice.lang.startsWith(langPrefix)
      );

      if (langVoices.length > 0) {
        if (voiceMode === "male") {
          if (language === "ru") {
            const femaleKeywords = [
              "female",
              "woman",
              "milena",
              "samantha",
              "anna",
              "katya",
              "анна",
              "елена",
              "мария",
              "наталья",
              "ольга",
              "татьяна",
            ];
            const maleVoices = langVoices.filter(
              (voice) =>
                !femaleKeywords.some((keyword) =>
                  voice.name.toLowerCase().includes(keyword)
                )
            );
            if (maleVoices.length > 0) {
              const midIndex = Math.floor(maleVoices.length / 2);
              utterance.voice = maleVoices[midIndex];
            } else {
              utterance.voice = langVoices[0];
            }
          } else {
            const maleKeywords = ["male", "man", "daniel", "alex"];
            const selectedVoice = langVoices.find((voice) =>
              maleKeywords.some((keyword) =>
                voice.name.toLowerCase().includes(keyword)
              )
            );
            utterance.voice = selectedVoice || langVoices[0];
          }
        } else {
          if (language === "ru") {
            const femaleKeywords = [
              "female",
              "woman",
              "milena",
              "samantha",
              "anna",
              "katya",
              "анна",
              "елена",
              "мария",
              "наталья",
              "ольга",
              "татьяна",
            ];
            const selectedVoice = langVoices.find((voice) =>
              femaleKeywords.some((keyword) =>
                voice.name.toLowerCase().includes(keyword)
              )
            );
            utterance.voice = selectedVoice || langVoices[0];
          } else {
            const femaleKeywords = ["female", "woman", "samantha", "anna"];
            const selectedVoice = langVoices.find((voice) =>
              femaleKeywords.some((keyword) =>
                voice.name.toLowerCase().includes(keyword)
              )
            );
            utterance.voice = selectedVoice || langVoices[0];
          }
        }
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        setIsPlaying(false);
        isSpeakingRef.current = false;
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        isSpeakingRef.current = false;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };
    getVoicesAndSpeak();
  };

  const changeSpeed = () => {
    const speeds = [1.0, 1.5, 2.0, 2.5, 3.0];
    const currentIndex = speeds.indexOf(speechRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newRate = speeds[nextIndex];

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      isSpeakingRef.current = false;

      setSpeechRate(newRate);

      setTimeout(() => {
        handlePlayAudio();
      }, 100);
    } else {
      setSpeechRate(newRate);
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
