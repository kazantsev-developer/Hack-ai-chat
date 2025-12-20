import React, { useState, useEffect } from "react";
import styles from "./FileUploader.module.css";

interface FileUploaderProps {
  language: "ru" | "en";
  sessionId: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ language, sessionId }) => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(
    null
  );

  const translations = {
    ru: {
      title: "Загрузить документ",
      selectFile: "Выбрать файл",
      upload: "Загрузить",
      uploading: "Загрузка...",
      success: "Документ загружен",
      error: "Ошибка загрузки",
      supported: "PDF, DOC, DOCX и TXT файлы",
      documentLoaded: "Документ загружен и готов к использованию",
    },
    en: {
      title: "Upload Document",
      selectFile: "Select File",
      upload: "Upload",
      uploading: "Uploading...",
      success: "Document uploaded",
      error: "Upload error",
      supported: "PDF, DOC, DOCX and TXT files",
      documentLoaded: "Document loaded and ready",
    },
  };

  const t = translations[language];

  useEffect(() => {
    const savedDocumentId = localStorage.getItem(
      `rag_document_id_${sessionId}`
    );
    if (savedDocumentId) {
      setCurrentDocumentId(savedDocumentId);
      const translations = {
        ru: {
          documentLoaded: "Документ загружен и готов к использованию",
        },
        en: {
          documentLoaded: "Document loaded and ready",
        },
      };
      setMessage(translations[language].documentLoaded);
    }
  }, [sessionId, language]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setMessage("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5001/api/rag/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const documentId = data.documentId;
        if (documentId && sessionId) {
          const docResponse = await fetch(
            `http://localhost:5001/api/chat/session/${sessionId}/document`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentId }),
            }
          );
          if (docResponse.ok) {
            console.log(`Document ${documentId} saved to session ${sessionId}`);
            localStorage.setItem(`rag_document_id_${sessionId}`, documentId);
            setCurrentDocumentId(documentId);
            setMessage(t.success);
          } else {
            console.error("Failed to save document to session");
            setError("Документ загружен, но не привязан к сессии");
          }
        } else if (!sessionId) {
          setError("Ошибка: сессия не найдена");
        } else {
          setMessage(t.success);
        }
      } else {
        setError(data.error || t.error);
      }
    } catch {
      setError(t.error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className={styles.fileUploader}>
      <label className={styles.fileUploadLabel}>
        <input
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleFileChange}
          disabled={uploading}
          className={styles.fileInput}
        />
        <span className={styles.fileUploadButton}>
          {uploading ? t.uploading : t.selectFile}
        </span>
        <span className={styles.fileUploadHint}>{t.supported}</span>
      </label>
      {message && <div className={styles.fileUploadMessage}>{message}</div>}
      {error && <div className={styles.fileUploadError}>{error}</div>}
      {currentDocumentId && !message && !error && (
        <div className={styles.fileUploadMessage}>{t.documentLoaded}</div>
      )}
    </div>
  );
};

export default FileUploader;
