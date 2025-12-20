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
  const [, setIsPlaying] = useState(false);
  const speechRate = 1.0;
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
      </div>
    </div>
  );
};

export default MessageBubble;
