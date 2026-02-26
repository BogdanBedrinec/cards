import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { healthCheck, login } from "../api.js"; // ✅ один імпорт

export default function Login({ onBack, onGoRegister, theme, onToggleTheme }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    if (typeof onBack === "function") onBack();
    else navigate("/");
  };

  const handleToggleTheme = () => {
    if (typeof onToggleTheme === "function") onToggleTheme();
    else {
      const current = document.body.dataset.theme === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("flashcardsTheme", next);
      document.body.dataset.theme = next;
    }
  };

  const handleGoRegister = () => {
    if (typeof onGoRegister === "function") onGoRegister();
    else navigate("/register");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setMessage("");
    setIsSubmitting(true);

    try {
      // warm-up (Render Free)
      await healthCheck().catch(() => {});

      const data = await login(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);

      // sync language settings
      if (data.interfaceLang) localStorage.setItem("fc_ui_lang", data.interfaceLang);
      if (data.nativeLang) localStorage.setItem("fc_native_lang", data.nativeLang);
      if (data.learningLang) localStorage.setItem("fc_learning_lang", data.learningLang);

      navigate("/flashcards");
    } catch (err) {
      const msg = String(err?.message || "");
      const isColdStartHint =
        msg.toLowerCase().includes("failed") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("health");

      setMessage(
        isColdStartHint
          ? "Server is waking up (Render Free). Please try again in 10–20 seconds."
          : msg || "Server is not responding"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <h1 className="auth-title">Log in</h1>

          <div className="auth-head-right">
            <button
              type="button"
              className="auth-themebtn"
              onClick={handleToggleTheme}
              title={theme === "dark" ? "Light theme" : "Dark theme"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button type="button" className="auth-linkbtn" onClick={handleBack}>
              Back
            </button>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-inputs">
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="auth-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Log in"}
          </button>

          {isSubmitting && (
            <div className="auth-message" style={{ opacity: 0.85 }}>
              Waking server up… first request can take ~30–50s on Render Free.
            </div>
          )}

          <div className="auth-row">
            <span style={{ opacity: 0.8 }}>No account?</span>
            <button type="button" className="auth-linkbtn" onClick={handleGoRegister}>
              Create account
            </button>
          </div>

          {message && <div className="auth-message">{message}</div>}
        </form>
      </div>
    </div>
  );
}