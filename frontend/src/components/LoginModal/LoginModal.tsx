import React, { useState } from "react";
import styles from "./LoginModal.module.css";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "ru" | "en";
  onSuccess?: (userId: number) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  language,
  onSuccess,
}) => {
  const [loginMethod, setLoginMethod] = useState<"email" | "telegram" | "sms">(
    "sms"
  );
  const [step, setStep] = useState<"input" | "code">("input");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showTelegramField, setShowTelegramField] = useState(false);

  if (!isOpen) return null;

  const translations = {
    ru: {
      title: "Войти",
      email: "Email",
      password: "Пароль",
      telegram: "Telegram",
      sms: "SMS",
      phone: "Номер телефона",
      telegramUsername: "Имя пользователя Telegram",
      code: "Код подтверждения",
      login: "Войти",
      register: "Зарегистрироваться",
      cancel: "Отмена",
      sendCode: "Отправить код",
      verifyCode: "Подтвердить",
      or: "или",
      enterPhone: "Введите номер телефона",
      enterEmail: "Введите email",
      enterTelegram: "Введите имя пользователя Telegram",
      enterCode: "Введите код из SMS",
      enterEmailCode: "Введите код из email",
      codeSent: "Код отправлен",
      invalidCode: "Неверный код",
      error: "Ошибка",
    },
    en: {
      title: "Sign In",
      email: "Email",
      password: "Password",
      telegram: "Telegram",
      sms: "SMS",
      phone: "Phone Number",
      telegramUsername: "Telegram Username",
      code: "Verification Code",
      login: "Sign In",
      register: "Register",
      cancel: "Cancel",
      sendCode: "Send Code",
      verifyCode: "Verify",
      or: "or",
      enterPhone: "Enter phone number",
      enterEmail: "Enter email",
      enterTelegram: "Enter Telegram username",
      enterCode: "Enter code from SMS",
      enterEmailCode: "Enter code from email",
      codeSent: "Code sent",
      invalidCode: "Invalid code",
      error: "Error",
    },
  };

  const t = translations[language];

  const handleRequestCode = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      let response;
      if (loginMethod === "sms") {
        if (!phone.trim()) {
          setError(t.enterPhone);
          setLoading(false);
          return;
        }
        response = await fetch(
          "http://localhost:5001/api/auth/request-sms-code",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, language }),
          }
        );
      } else if (loginMethod === "email") {
        if (!email.trim()) {
          setError(t.enterEmail);
          setLoading(false);
          return;
        }
        response = await fetch(
          "http://localhost:5001/api/auth/request-email-code",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, language }),
          }
        );
      } else {
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: t.error }));
        setError(errorData.message || t.error);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        if (data.code) {
          setMessage(`${t.codeSent}. Код: ${data.code}`);
        } else {
          setMessage(t.codeSent);
        }
        setStep("code");
        setShowTelegramField(true);
      } else {
        setError(data.message || t.error);
      }
    } catch (error) {
      console.error("Request error:", error);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      let response;
      if (loginMethod === "sms") {
        response = await fetch(
          "http://localhost:5001/api/auth/verify-sms-code",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone,
              code,
              telegramUsername: telegramUsername || undefined,
            }),
          }
        );
      } else if (loginMethod === "email") {
        response = await fetch(
          "http://localhost:5001/api/auth/verify-email-code",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              code,
              telegramUsername: telegramUsername || undefined,
            }),
          }
        );
      } else {
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: t.invalidCode }));
        setError(errorData.message || t.invalidCode);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        if (onSuccess) {
          onSuccess(data.userId);
        }
        handleClose();
      } else {
        setError(data.message || t.invalidCode);
      }
    } catch (error) {
      console.error("Verify error:", error);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5001/api/auth/login-telegram",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramUsername }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: t.error }));
        setError(errorData.message || t.error);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        if (onSuccess) {
          onSuccess(data.userId);
        }
        handleClose();
      } else {
        setError(data.message || t.error);
      }
    } catch (error) {
      console.error("Telegram login error:", error);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("input");
    setEmail("");
    setPhone("");
    setTelegramUsername("");
    setCode("");
    setError("");
    setMessage("");
    setShowTelegramField(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === "telegram") {
      handleTelegramLogin();
    } else if (step === "input") {
      handleRequestCode();
    } else {
      handleVerifyCode();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.modalContent}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <button className={styles.modalClose} onClick={handleClose}>
          ×
        </button>
        <h2 className={styles.modalTitle}>{t.title}</h2>
        <div className={styles.loginMethods}>
          <button
            className={`${styles.methodTab} ${
              loginMethod === "sms" ? styles.active : ""
            }`}
            onClick={() => {
              setLoginMethod("sms");
              setStep("input");
              setError("");
              setMessage("");
            }}
          >
            {t.sms}
          </button>
          <button
            className={`${styles.methodTab} ${
              loginMethod === "email" ? styles.active : ""
            }`}
            onClick={() => {
              setLoginMethod("email");
              setStep("input");
              setError("");
              setMessage("");
            }}
          >
            {t.email}
          </button>
          <button
            className={`${styles.methodTab} ${
              loginMethod === "telegram" ? styles.active : ""
            }`}
            onClick={() => {
              setLoginMethod("telegram");
              setStep("input");
              setError("");
              setMessage("");
            }}
          >
            {t.telegram}
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {loginMethod === "telegram" ? (
            <div className={styles.formGroup}>
              <label>{t.telegramUsername}</label>
              <input
                type="text"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="@username"
                required
                disabled={loading}
              />
            </div>
          ) : step === "input" ? (
            <>
              {loginMethod === "sms" ? (
                <div className={styles.formGroup}>
                  <label>{t.phone}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    required
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label>{t.email}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label>
                  {loginMethod === "sms" ? t.enterCode : t.enterEmailCode}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="1234"
                  maxLength={4}
                  required
                  disabled={loading}
                  style={{
                    textAlign: "center",
                    fontSize: "1.5rem",
                    letterSpacing: "0.5rem",
                  }}
                />
              </div>
              {showTelegramField && (
                <div className={styles.formGroup}>
                  <label>
                    {t.telegramUsername} (
                    {language === "ru" ? "необязательно" : "optional"})
                  </label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@username"
                    disabled={loading}
                  />
                </div>
              )}
            </>
          )}
          {error && <div className={styles.formError}>{error}</div>}
          {message && <div className={styles.formMessage}>{message}</div>}
          <div className={styles.formActions}>
            {step === "code" && (
              <button
                type="button"
                onClick={() => {
                  setStep("input");
                  setCode("");
                  setError("");
                  setMessage("");
                }}
                className={styles.btnSecondary}
                disabled={loading}
              >
                {t.cancel}
              </button>
            )}
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading
                ? "..."
                : loginMethod === "telegram"
                ? t.login
                : step === "input"
                ? t.sendCode
                : t.verifyCode}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
