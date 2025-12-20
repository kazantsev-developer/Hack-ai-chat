import { useState, useEffect, useRef } from "react";
import styles from "./VoiceSelector.module.css";

interface VoiceSelectorProps {
  value: "female" | "male" | "off";
  onChange: (mode: "female" | "male" | "off") => void;
  language: "ru" | "en";
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  language,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const options = {
    ru: [
      { value: "female" as const, label: "Женский" },
      { value: "male" as const, label: "Мужской" },
      { value: "off" as const, label: "Отключить" },
    ],
    en: [
      { value: "female" as const, label: "Female" },
      { value: "male" as const, label: "Male" },
      { value: "off" as const, label: "Off" },
    ],
  };

  const currentOptions = options[language];
  const selectedOption = currentOptions.find((opt) => opt.value === value);
  const displayName = selectedOption?.label || currentOptions[0].label;

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
          {currentOptions.map((option) => (
            <div
              key={option.value}
              className={`${styles.customOption} ${
                value === option.value ? styles.selected : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceSelector;
