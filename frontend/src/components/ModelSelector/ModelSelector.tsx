import { useState, useEffect, useRef } from "react";
import axios from "axios";
import type { Model } from "../../types";
import styles from "./ModelSelector.module.css";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios
      .get("http://localhost:5001/api/models")
      .then((res) => {
        setModels(res.data);
        setLoading(false);
        if (
          res.data.length > 0 &&
          !res.data.find((m: Model) => m.id === value)
        ) {
          onChange(res.data[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load models:", err);
        setLoading(false);
      });
  }, [onChange, value]);

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

  const selectedModel = models.find((m) => m.id === value);
  const displayName = selectedModel ? selectedModel.name : "Loading...";

  if (loading) {
    return (
      <div className={`${styles.customSelect} ${styles.disabled}`}>
        Loading...
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className={`${styles.customSelect} ${styles.disabled}`}>
        No models configured
      </div>
    );
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
          {models.map((model) => (
            <div
              key={model.id}
              className={`${styles.customOption} ${
                value === model.id ? styles.selected : ""
              }`}
              onClick={() => {
                onChange(model.id);
                setIsOpen(false);
              }}
            >
              {model.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
