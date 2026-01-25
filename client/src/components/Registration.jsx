import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Registration.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Registration({ onBack, onGoLogin, theme, onToggleTheme }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [interfaceLang, setInterfaceLang] = useState("en");
  const [nativeLang, setNativeLang] = useState("uk");
  const [learningLang, setLearningLang] = useState("de");

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

  const handleGoLogin = () => {
    if (typeof onGoLogin === "function") onGoLogin();
    else navigate("/login");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          interfaceLang,
          nativeLang,
          learningLang,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.message || data.error || "Registration error");
        return;
      }

      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.userId) localStorage.setItem("userId", data.userId);

      const ui = data?.interfaceLang || interfaceLang;
      const l1 = data?.nativeLang || nativeLang;
      const l2 = data?.learningLang || learningLang;

      localStorage.setItem("fc_ui_lang", ui);
      localStorage.setItem("fc_native_lang", l1);
      localStorage.setItem("fc_learning_lang", l2);

      navigate("/flashcards");
    } catch (err) {
      console.error("Registration error:", err);
      setMessage("Server is not responding");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <h1 className="auth-title">Create account</h1>

          <div className="auth-head-right">
            <button type="button" className="auth-themebtn" onClick={handleToggleTheme}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button type="button" className="auth-backbtn" onClick={handleBack}>
              Back
            </button>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
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
              autoComplete="new-password"
            />
          </div>

          <div className="auth-grid">
            <label className="auth-label">
              <span>UI language</span>
              <select value={interfaceLang} onChange={(e) => setInterfaceLang(e.target.value)}>
                <option value="en">EN — English</option>
                <option value="de">DE — Deutsch</option>
                <option value="uk">UK — Українська</option>
              </select>
            </label>

            <label className="auth-label">
              <span>Native language (L1)</span>
              <select value={nativeLang} onChange={(e) => setNativeLang(e.target.value)}>
                <option value="uk">UK — Українська</option>
                <option value="de">DE — Deutsch</option>
                <option value="en">EN — English</option>
              </select>
            </label>

            <label className="auth-label">
              <span>Learning language (L2)</span>
              <select value={learningLang} onChange={(e) => setLearningLang(e.target.value)}>
                <option value="de">DE — Deutsch</option>
                <option value="en">EN — English</option>
                <option value="uk">UK — Українська</option>
              </select>
            </label>
          </div>

          <button className="auth-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </button>

          <div className="auth-row">
            <span style={{ opacity: 0.8 }}>Already have an account?</span>
            <button type="button" className="auth-linkbtn" onClick={handleGoLogin}>
              Log in
            </button>
          </div>

          {message && <div className="auth-message">{message}</div>}
        </form>
      </div>
    </div>
  );
}
