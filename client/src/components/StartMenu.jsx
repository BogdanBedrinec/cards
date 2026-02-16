import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Registration from "./Registration.jsx";
import Login from "./Login.jsx";
import "./StartMenu.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "demo12345";

// Demo language policy (what you asked):
// - UI: English
// - Learning (word label at top): EN
// - Native (translation label below): DE
const DEMO_UI_LANG = "en";
const DEMO_L1_NATIVE = "de";
const DEMO_L2_LEARNING = "en";

// публичні лінки (підставиш свої)
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || ""; // напр. https://cards-xxx.onrender.com
const GITHUB_URL = import.meta.env.VITE_GITHUB_URL || "";     // напр. https://github.com/you/flashcards
const VIDEO_URL = import.meta.env.VITE_VIDEO_URL || "";       // опційно, youtube/loom


function getSavedTheme() {
  const saved = localStorage.getItem("flashcardsTheme");
  return saved === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  localStorage.setItem("flashcardsTheme", theme);
  document.body.dataset.theme = theme;
}

export default function StartMenu({ initialMode = null }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState(initialMode); // null | "login" | "register"
  const [theme, setTheme] = useState(getSavedTheme);

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMsg, setDemoMsg] = useState("");

  // default UI language for public pages + apply theme
  useEffect(() => {
    const has = localStorage.getItem("fc_ui_lang");
    if (!has) localStorage.setItem("fc_ui_lang", "en");
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when route changes (/login or /register)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // keep theme synced
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // ----- ROUTE helpers -----
  function goHome() {
    setDemoMsg("");
    setMode(null);
    navigate("/");
  }

  function goLogin() {
    setDemoMsg("");
    setMode("login");
    navigate("/login");
  }

  function goRegister() {
    setDemoMsg("");
    setMode("register");
    navigate("/register");
  }

  function openUrl(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

  async function handleDemoLogin() {
    if (demoLoading) return;
    setDemoMsg("");
    setDemoLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDemoMsg(data?.message || data?.error || "Demo login failed");
        return;
      }

      // Store auth
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);

      // ✅ Force demo languages (so they never stay swapped)
      localStorage.setItem("fc_ui_lang", DEMO_UI_LANG);
      localStorage.setItem("fc_learning_lang", DEMO_L2_LEARNING); // top label: EN
      localStorage.setItem("fc_native_lang", DEMO_L1_NATIVE);     // translation label: DE

      // Optional: also override whatever backend returns (we ignore it for demo)
      // If you want, you can still read them:
      // console.log("backend langs:", data.interfaceLang, data.nativeLang, data.learningLang);

      // ✅ Hard navigation to ensure Flashcards reads fresh localStorage
      window.location.href = "/flashcards";
    } catch (err) {
      console.error("Demo login error:", err);
      setDemoMsg("Server is not responding");
    } finally {
      setDemoLoading(false);
    }
  }

  // ===== Login route UI =====
  if (mode === "login") {
    return (
      <Login
        onBack={goHome}
        onGoRegister={goRegister}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // ===== Register route UI =====
  if (mode === "register") {
    return (
      <Registration
        onBack={goHome}
        onGoLogin={goLogin}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

// ===== Home UI =====
return (
  <div className="auth-wrap">
    <div className="auth-card">
      <div className="auth-head">
<h1 className="auth-title">Flashcards Portfolio Demo</h1>


        <div className="auth-head-right">
          <div className="auth-badge">Portfolio demo</div>

          <button
            type="button"
            className="auth-themebtn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <p className="auth-sub">
        A spaced-repetition flashcards app for learning vocabulary.
        Review mode schedules cards automatically, library shows next review time,
        topics + bulk actions keep everything organized.
      </p>

      {/* PRIMARY CTA */}
      <div className="auth-actions" style={{ marginTop: 12 }}>
        <button className="auth-primary" type="button" onClick={handleDemoLogin} disabled={demoLoading}>
          {demoLoading ? "Opening demo..." : "✨ Try demo"}
        </button>

        <button className="auth-secondary" type="button" onClick={goLogin}>
          Log in
        </button>

        <button className="auth-secondary" type="button" onClick={goRegister}>
          Create account
        </button>
      </div>

      {demoMsg && <div className="auth-message">{demoMsg}</div>}

      {/* LINKS */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
<button
  className="auth-secondary"
  onClick={handleDemoLogin}
>
  🚀 Open App
</button>


<a
  href="https://github.com/BogdanBedrinec/cards"
  target="_blank"
  rel="noopener noreferrer"
  className="auth-secondary"
  style={{
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}
>
  💻 GitHub
</a>



        <button
          type="button"
          className="auth-secondary"
          onClick={() => openUrl(VIDEO_URL)}
          disabled={!VIDEO_URL}
          title={!VIDEO_URL ? "Add VIDEO_URL later" : "Watch demo video"}
        >
          🎥 Video
        </button>
      </div>

      <div className="auth-footnote" style={{ marginTop: 12 }}>
        React + Vite • Node/Express • MongoDB • JWT • REST API
      </div>
    </div>
  </div>
);

}
