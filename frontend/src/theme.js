export const THEMES = [
  { id: "default", label: "Default Dark", bg: "#0f172a", panel: "#1e293b", accent: "#3b82f6", text: "#f8fafc", muted: "#94a3b8", dim: "#475569", border: "#1e293b", highlight: "#1e3a5f" },
  { id: "midnight", label: "Midnight", bg: "#09090b", panel: "#18181b", accent: "#8b5cf6", text: "#f8fafc", muted: "#94a3b8", dim: "#475569", border: "#27272a", highlight: "#2e1065" },
  { id: "light", label: "Light", bg: "#f8fafc", panel: "#e2e8f0", accent: "#2563eb", text: "#0f172a", muted: "#475569", dim: "#94a3b8", border: "#cbd5e1", highlight: "#bfdbfe" },
  { id: "warm", label: "Warm Light", bg: "#fafaf9", panel: "#e7e5e4", accent: "#ea580c", text: "#1c1917", muted: "#57534e", dim: "#a8a29e", border: "#d6d3d1", highlight: "#fed7aa" },
  { id: "forest", label: "Forest Dark", bg: "#0a0a0a", panel: "#0f1a0f", accent: "#22c55e", text: "#f0fdf4", muted: "#86efac", dim: "#4ade80", border: "#166534", highlight: "#14532d" },
  { id: "forest-light", label: "Forest Light", bg: "#f0fdf4", panel: "#def4e2", accent: "#16a34a", text: "#14532d", muted: "#15803d", dim: "#4ade80", border: "#799f86", highlight: "#bbf7d0" },
];

export function applyTheme(t) {
  const root = document.documentElement;
  root.style.setProperty("--bg", t.bg);
  root.style.setProperty("--bg-panel", t.panel);
  root.style.setProperty("--border", t.border);
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--text", t.text);
  root.style.setProperty("--text-muted", t.muted);
  root.style.setProperty("--text-dim", t.dim);
  root.style.setProperty("--highlight", t.highlight);
  localStorage.setItem("theme", JSON.stringify(t));
}

export function loadSavedTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) applyTheme(JSON.parse(saved));
}