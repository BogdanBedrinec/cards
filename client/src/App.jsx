import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import StartMenu from "./components/StartMenu.jsx";
import Flashcards from "./components/Flashcards.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StartMenu />} />
      <Route path="/login" element={<StartMenu initialMode="login" />} />
      <Route path="/register" element={<StartMenu initialMode="register" />} />

      <Route
        path="/flashcards"
        element={
          <ProtectedRoute>
            <Flashcards />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
