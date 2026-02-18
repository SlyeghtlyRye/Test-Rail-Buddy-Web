import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import AppStructure from "./tools/AppStructure";
import { useEffect } from "react";

export default function App() {

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      const t = JSON.parse(saved);
      const root = document.documentElement;
      root.style.setProperty("--bg", t.bg);
      root.style.setProperty("--bg-panel", t.panel);
      root.style.setProperty("--border", t.border);
      root.style.setProperty("--accent", t.accent);
      root.style.setProperty("--text", t.text);
      root.style.setProperty("--text-muted", t.muted);
      root.style.setProperty("--text-dim", t.dim);
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/app-structure" element={<AppStructure />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}