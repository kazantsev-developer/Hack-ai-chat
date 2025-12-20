import { useState, useEffect, useRef } from "react";
import styles from "./LanguageSelector.module.css";

interface LanguageSelectorProps {
  value: "ru" | "en";
  onChange: (language: "ru" | "en") => void;
  language: "ru" | "en";
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
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
      { value: "ru" as const, label: "Русский" },
      { value: "en" as const, label: "English" },
    ],
    en: [
      { value: "ru" as const, label: "Russian" },
      { value: "en" as const, label: "English" },
    ],
  };

  const currentOptions = options[language];
  const selectedOption = currentOptions.find((opt) => opt.value === value);
  const displayName = selectedOption?.label || currentOptions[0].label;

  return (
    <div className={`${styles.customSelectWrapper} ${styles.languageSelectorWrapper}`} ref={dropdownRef}>
      <div
        className={`${styles.customSelect} ${styles.languageSelector} ${isOpen ? styles.open : ""}`}
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

export default LanguageSelector;

