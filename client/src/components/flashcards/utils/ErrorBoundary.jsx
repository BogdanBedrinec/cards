import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // видно в консолі, якщо щось впаде
    console.error("Flashcards UI crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>⚠️ UI crashed</h3>
          <div style={{ opacity: 0.85, marginBottom: 8 }}>
            Це не твої дані — це помилка рендера. Скопіюй текст нижче в чат, і ми швидко поправимо.
          </div>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}