import { useState, useEffect } from "react";
import ChatInterface from "./components/ChatInterface/ChatInterface";
import AgentSelector from "./components/AgentSelector/AgentSelector";
import ModelSelector from "./components/ModelSelector/ModelSelector";
import VoiceSelector from "./components/VoiceSelector/VoiceSelector";
import ThemeSelector from "./components/ThemeSelector/ThemeSelector";
import LanguageSelector from "./components/LanguageSelector/LanguageSelector";
import LoginModal from "./components/LoginModal/LoginModal";
import FileUploader from "./components/FileUploader/FileUploader";
import "./App.css";

function App() {
  const [selectedAgent, setSelectedAgent] = useState<string>("default");
  const [selectedModel, setSelectedModel] = useState<string>("qwen-2.5-72b");
  const [voiceMode, setVoiceMode] = useState<"female" | "male" | "off">("off");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"ru" | "en">("ru");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<number | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string>(
    () => `session_${Date.now()}`
  );

  useEffect(() => {
    document.documentElement.className = theme;
    document.body.className = theme;
  }, [theme]);

  const translations = {
    ru: {
      title: "Хако ИИ",
      selectMode: "Режим",
      selectModel: "Модель",
      selectVoice: "Голос",
      selectTheme: "Тема",
      selectLanguage: "Язык",
      login: "Войти",
      logout: "Выйти",
    },
    en: {
      title: "Hacko AI",
      selectMode: "Mode",
      selectModel: "Model",
      selectVoice: "Voice",
      selectTheme: "Theme",
      selectLanguage: "Language",
      login: "Sign In",
      logout: "Sign Out",
    },
  };

  const t = translations[language];

  return (
    <div className={`app ${theme}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <img src="/icon.png" alt="AI" className="header-icon" />
            <h1>{t.title}</h1>
          </div>
          <button
            className="login-button"
            onClick={() => {
              if (currentUser) {
                setCurrentUser(null);
              } else {
                setIsLoginModalOpen(true);
              }
            }}
          >
            {currentUser ? t.logout : t.login}
          </button>
        </div>
      </header>
      <main className="app-main">
        <div className="controls-row">
          <div className="controls-column">
            <div className="control-group">
              <span className="control-label">{t.selectModel}</span>
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>
            <div className="control-group">
              <span className="control-label">{t.selectMode}</span>
              <AgentSelector
                value={selectedAgent}
                onChange={setSelectedAgent}
                language={language}
              />
            </div>
            <div className="control-group">
              <span className="control-label">{t.selectVoice}</span>
              <VoiceSelector
                value={voiceMode}
                onChange={setVoiceMode}
                language={language}
              />
            </div>
            <div className="control-group">
              <span className="control-label">{t.selectTheme}</span>
              <ThemeSelector
                value={theme}
                onChange={setTheme}
                language={language}
              />
            </div>
            <div className="control-group">
              <span className="control-label">{t.selectLanguage}</span>
              <LanguageSelector
                value={language}
                onChange={setLanguage}
                language={language}
              />
            </div>
            <div className="control-group file-uploader-group">
              <FileUploader language={language} sessionId={chatSessionId} />
            </div>
          </div>
          <div className="chat-container">
            <ChatInterface
              agentId={selectedAgent}
              modelId={selectedModel}
              voiceMode={voiceMode}
              language={language}
              sessionId={chatSessionId}
              onSessionIdChange={setChatSessionId}
            />
          </div>
        </div>
      </main>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        language={language}
        onSuccess={(userId) => {
          setCurrentUser(userId);
          setIsLoginModalOpen(false);
        }}
      />
    </div>
  );
}

export default App;
