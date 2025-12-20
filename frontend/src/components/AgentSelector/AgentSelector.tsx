import { useState, useEffect, useRef } from "react";
import axios from "axios";
import type { Agent } from "../../types";
import styles from "./AgentSelector.module.css";

interface AgentSelectorProps {
  value: string;
  onChange: (agentId: string) => void;
  language: "ru" | "en";
}

const AgentSelector: React.FC<AgentSelectorProps> = ({
  value,
  onChange,
  language,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios
      .get("http://localhost:5001/api/agents")
      .then((res) => {
        setAgents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load agents:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const agentNames = {
    ru: {
      Assistant: "Ассистент",
      Support: "Поддержка",
      Coder: "Программист",
    },
    en: {
      Assistant: "Assistant",
      Support: "Support",
      Coder: "Coder",
    },
  };

  const translations = {
    ru: {
      loading: "Загрузка...",
      noAgents: "Нет агентов",
    },
    en: {
      loading: "Loading...",
      noAgents: "No agents",
    },
  };

  const t = translations[language];

  const selectedAgent = agents.find((a) => a.id === value);
  const displayName = selectedAgent
    ? (agentNames[language] as Record<string, string>)[selectedAgent.name] ||
      selectedAgent.name
    : t.loading;

  if (loading) {
    return <div className={`${styles.customSelect} ${styles.disabled}`}>{t.loading}</div>;
  }

  return (
    <div className={styles.customSelectWrapper} ref={dropdownRef}>
      <div
        className={`${styles.customSelect} ${isOpen ? styles.open : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayName}</span>
        <svg
          className={styles.selectArrow}
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <path d="M6 9L1 4h10z" fill="currentColor" />
        </svg>
      </div>
      {isOpen && (
        <div className={styles.customDropdown}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`${styles.customOption} ${
                value === agent.id ? styles.selected : ""
              }`}
              onClick={() => {
                onChange(agent.id);
                setIsOpen(false);
              }}
            >
              {(agentNames[language] as Record<string, string>)[agent.name] ||
                agent.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentSelector;

