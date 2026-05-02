// ─────────────────────────────────────────────
//  LoginPage.jsx  —  Login + Settings + Demo Mode
//  Drop this in: frontend/src/pages/LoginPage.jsx
// ─────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loadSavedTheme, THEMES, applyTheme } from "../theme";
import { verifyAuth } from "../api";
import { useAuth } from "../AuthContext";
import AppStructure from "../tools/AppStructure";
import DependencyMap from "../tools/DependencyMap";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const VERSION = {
  number: "0.3.0",
  updated: "2026-04-19",
  notes: [
    "Final release — fully deployed:",
    "— Demo mode: explore without a TestRail account",
    "— Backend hosted on Render.com",
    "— Frontend hosted on Render static site",
    "— App Structure & Dependency Map working in production",
  ],
};

export default function LoginPage() {
  const [url, setUrl] = useState("https://your-instance.testrail.io");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSection, setActiveSection] = useState("version");
  const [showStructure, setShowStructure] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState("default");
  const [apiStatus, setApiStatus] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  const [modalSize, setModalSize] = useState({ width: 620, height: 520 });
  const dragRef = useRef(null);
  const isResizing = useRef(false);

  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedTheme();
    const saved = localStorage.getItem("theme");
    if (saved) setSelectedTheme(JSON.parse(saved).id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showStructure) { setShowStructure(false); return; }
        if (showMap)       { setShowMap(false);       return; }
        setShowSettings(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, showStructure, showMap]);

  const MIN_W = 480, MIN_H = 360;
  const MAX_W = window.innerWidth  * 0.98;
  const MAX_H = window.innerHeight * 0.98;

  const startResize = (e, edge) => {
    e.preventDefault(); e.stopPropagation();
    isResizing.current = true;
    dragRef.current = { edge, startX: e.clientX, startY: e.clientY, startW: modalSize.width, startH: modalSize.height };
    function onMove(ev) {
      const { edge, startX, startY, startW, startH } = dragRef.current;
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      setModalSize(prev => {
        let w = prev.width, h = prev.height;
        if (edge.includes("e")) w = Math.min(MAX_W, Math.max(MIN_W, startW + dx));
        if (edge.includes("w")) w = Math.min(MAX_W, Math.max(MIN_W, startW - dx));
        if (edge.includes("s")) h = Math.min(MAX_H, Math.max(MIN_H, startH + dy));
        if (edge.includes("n")) h = Math.min(MAX_H, Math.max(MIN_H, startH - dy));
        return { width: w, height: h };
      });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setTimeout(() => { isResizing.current = false; }, 50);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const THICK = 6, CORNER = 14;
  const resizeHandle = (edge, cursor, style) => (
    <div key={edge} onMouseDown={e => startResize(e, edge)} style={{ position: "absolute", cursor, zIndex: 10, ...style }} />
  );

  const handleOverlayClick = () => {
    if (isResizing.current) return;
    setShowSettings(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const authRes = await verifyAuth({ url, email, password });
      if (!authRes.data.success) {
        setError("Authentication failed. Check your credentials.");
        setLoading(false); return;
      }
      login(url, email, password);
      navigate("/projects");
    } catch (err) {
      setError("Could not connect. Check your TestRail URL.");
    }
    setLoading(false);
  };

  // ── Demo Mode entry ───────────────────────
  const handleTryDemo = async () => {
    setDemoLoading(true);
    // Small artificial pause so it feels deliberate
    await new Promise(r => setTimeout(r, 600));
    loginDemo();
    navigate("/projects");
  };

  const testApi = async () => {
    setApiLoading(true); setApiStatus(null);
    try {
      const start = Date.now();
      await axios.post(`${BASE_URL}/api/auth/verify`, { url, email, password });
      setApiStatus({ ok: true, ms: Date.now() - start });
    } catch (err) {
      setApiStatus({ ok: false, error: err.message });
    }
    setApiLoading(false);
  };

  const sections = [
    { id: "theme",   label: "Theme"        },
    { id: "test",    label: "API Test"     },
    { id: "docs",    label: "App Framework"},
    { id: "version", label: "Version"      },
  ];

  return (
    <div style={styles.container}>
      {/* Gear button */}
      <button style={styles.gearBtn} onClick={() => setShowSettings(true)} title="Settings">⚙</button>

      <h1 style={styles.title}>TestRail Buddy</h1>
      <p style={styles.subtitle}>Connect to your TestRail instance</p>

      <form onSubmit={handleLogin} style={styles.form}>
        <input style={styles.input} type="url"      placeholder="TestRail URL" value={url}      onChange={e => setUrl(e.target.value)}      required autoComplete="url" />
        <input style={styles.input} type="email"    placeholder="Email"        value={email}    onChange={e => setEmail(e.target.value)}    required autoComplete="username" />
        <input style={styles.input} type="password" placeholder="Password"     value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Connect"}
        </button>
      </form>

      {/* ── Settings modal ── */}
      {showSettings && (
        <div style={styles.modalOverlay} onClick={handleOverlayClick}>
          <div style={{ ...styles.modal, width: modalSize.width, height: modalSize.height }} onClick={e => e.stopPropagation()}>
            {/* Resize handles */}
            {resizeHandle("n",  "n-resize",  { top: 0,    left: CORNER,  right: CORNER,  height: THICK  })}
            {resizeHandle("s",  "s-resize",  { bottom: 0, left: CORNER,  right: CORNER,  height: THICK  })}
            {resizeHandle("e",  "e-resize",  { right: 0,  top: CORNER,   bottom: CORNER, width: THICK   })}
            {resizeHandle("w",  "w-resize",  { left: 0,   top: CORNER,   bottom: CORNER, width: THICK   })}
            {resizeHandle("nw", "nw-resize", { top: 0,    left: 0,   width: CORNER, height: CORNER })}
            {resizeHandle("ne", "ne-resize", { top: 0,    right: 0,  width: CORNER, height: CORNER })}
            {resizeHandle("sw", "sw-resize", { bottom: 0, left: 0,   width: CORNER, height: CORNER })}
            {resizeHandle("se", "se-resize", { bottom: 0, right: 0,  width: CORNER, height: CORNER })}

            {/* Header */}
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Settings</span>
              <button style={styles.closeBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>

            {/* Body */}
            <div style={styles.modalBody}>
              {/* Sidebar */}
              <div style={styles.sidebar}>
                {sections.map(s => (
                  <div key={s.id} onClick={() => setActiveSection(s.id)} style={{
                    ...styles.sidebarItem,
                    backgroundColor: activeSection === s.id ? "#3b82f6" : "transparent",
                    color:           activeSection === s.id ? "white"   : "#94a3b8",
                  }}>
                    {s.label}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div style={styles.content}>

                {/* THEME */}
                {activeSection === "theme" && (
                  <div style={styles.section}>
                    <h3 style={styles.heading}>Theme</h3>
                    <p style={styles.description}>Choose a color theme for the app.</p>
                    <div style={styles.themeGrid}>
                      {THEMES.map(t => (
                        <div key={t.id} onClick={() => { applyTheme(t); setSelectedTheme(t.id); }}
                          style={{ ...styles.themeCard, border: selectedTheme === t.id ? `2px solid var(--accent)` : `1px solid var(--border)` }}
                        >
                          <div style={{ height: "60px", borderRadius: "6px", marginBottom: "8px", backgroundColor: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            <div style={{ width: "20px", height: "20px", borderRadius: "4px", backgroundColor: t.accent }} />
                            <div style={{ width: "40px", height: "8px", borderRadius: "4px", backgroundColor: t.accent, opacity: 0.4 }} />
                          </div>
                          <div style={{ color: "var(--text)", fontSize: "0.85rem", textAlign: "center" }}>{t.label}</div>
                          {selectedTheme === t.id && (
                            <div style={{ color: t.accent, fontSize: "0.72rem", textAlign: "center", marginTop: "4px" }}>✓ Selected</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* API TEST */}
                {activeSection === "test" && (
                  <div style={styles.section}>
                    <h3 style={styles.heading}>API Test</h3>
                    <p style={styles.description}>Test your connection to the TestRail backend and verify your credentials are working.</p>
                    <div style={styles.infoBox}>
                      <div style={styles.infoRow}><span style={styles.infoLabel}>Backend URL</span><span style={styles.infoValue}>{BASE_URL}</span></div>
                      <div style={styles.infoRow}><span style={styles.infoLabel}>TestRail URL</span><span style={styles.infoValue}>{url || "—"}</span></div>
                      <div style={styles.infoRow}><span style={styles.infoLabel}>Email</span><span style={styles.infoValue}>{email || "—"}</span></div>
                    </div>
                    <button style={styles.btn} onClick={testApi} disabled={apiLoading}>
                      {apiLoading ? "Testing..." : "Run Test"}
                    </button>
                    {apiStatus && (
                      <div style={{ ...styles.resultBox, borderColor: apiStatus.ok ? "#22c55e" : "#ef4444" }}>
                        {apiStatus.ok ? (
                          <><div style={{ color: "#22c55e", fontWeight: "700" }}>✓ Connection Successful</div><div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>Response time: {apiStatus.ms}ms</div></>
                        ) : (
                          <><div style={{ color: "#ef4444", fontWeight: "700" }}>✕ Connection Failed</div><div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>{apiStatus.error}</div></>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* APP FRAMEWORK */}
                {activeSection === "docs" && (
                  <div style={styles.section}>
                    <h3 style={styles.heading}>App Framework</h3>
                    <p style={styles.description}>Opens an interactive map of the entire codebase.</p>
                    <button style={styles.btn} onClick={() => setShowStructure(true)}>Open App Structure</button>
                    <button style={{ ...styles.btn, marginTop: "8px" }} onClick={() => setShowMap(true)}>Open Dependency Map</button>
                    <button style={{ ...styles.btn, marginTop: "8px" }} onClick={() => window.open(`${BASE_URL}/docs`, "_blank")}>Open API Docs</button>
                  </div>
                )}

                {/* VERSION + DEMO */}
                {activeSection === "version" && (
                  <div style={styles.section}>
                    <h3 style={styles.heading}>Version</h3>
                    <div style={styles.versionBox}>
                      <div style={styles.versionNumber}>v{VERSION.number}</div>
                      <div style={styles.versionDate}>Last updated: {VERSION.updated}</div>
                      <div style={styles.versionNotes}>
                        {VERSION.notes.map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                    </div>
                    <p style={styles.description}>
                      To update the version, edit the VERSION object in{" "}
                      <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>Settings.jsx</span>.
                    </p>

                    {/* ── Demo Mode card ───────────────────────── */}
                    <div style={styles.demoCard}>
                      <div style={styles.demoCardHeader}>
                        <span style={styles.demoBadge}>DEMO</span>
                        <span style={styles.demoCardTitle}>Try without a TestRail account</span>
                      </div>
                      <p style={styles.demoCardDesc}>
                        Explore the full app with pre-loaded QA projects, test suites, sections, and
                        cases — no backend or credentials required.
                      </p>
                      <button
                        style={{ ...styles.demoBtn, opacity: demoLoading ? 0.7 : 1 }}
                        onClick={handleTryDemo}
                        disabled={demoLoading}
                      >
                        {demoLoading ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={styles.demoBtnSpinner} />
                            Loading demo…
                          </span>
                        ) : (
                          "▶  Launch Demo"
                        )}
                      </button>
                    </div>
                    {/* ─────────────────────────────────────────── */}
                  </div>
                )}

              </div>
            </div>

            {/* Visual resize handle */}
            <div onMouseDown={e => startResize(e, "se")} style={styles.resizeHandle} title="Drag to resize">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M11 1L1 11M11 6L6 11" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* App Structure overlay */}
      {showStructure && (
        <div style={styles.fullOverlay}>
          <div style={styles.overlayHeader}>
            <button style={styles.overlayClose} onClick={() => setShowStructure(false)}>✕ Close</button>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}><AppStructure /></div>
        </div>
      )}

      {/* Dependency Map overlay */}
      {showMap && (
        <div style={styles.fullOverlay}>
          <div style={styles.overlayHeader}>
            <button style={styles.overlayClose} onClick={() => setShowMap(false)}>✕ Close</button>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}><DependencyMap /></div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif", position: "relative" },
  gearBtn:   { position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 },
  title:     { color: "var(--text)", fontSize: "2rem", marginBottom: "8px" },
  subtitle:  { color: "var(--text-muted)", fontSize: "1rem", marginBottom: "32px" },
  form:      { display: "flex", flexDirection: "column", width: "100%", maxWidth: "400px", gap: "12px" },
  input:     { padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "1rem", outline: "none" },
  button:    { padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "1rem", cursor: "pointer", marginTop: "8px" },
  error:     { color: "#f87171", fontSize: "0.9rem", margin: "0" },

  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:        { backgroundColor: "var(--bg-panel)", borderRadius: "10px", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", boxShadow: "0 25px 60px rgba(0,0,0,0.4)", userSelect: "none" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
  modalTitle:   { color: "var(--text)", fontSize: "1rem", fontWeight: "600" },
  closeBtn:     { background: "none", border: "none", color: "var(--text-muted)", fontSize: "1rem", cursor: "pointer" },
  modalBody:    { display: "flex", flex: 1, overflow: "hidden" },

  sidebar:     { width: "140px", borderRight: "1px solid var(--border)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 },
  sidebarItem: { padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.88rem", transition: "all 0.15s" },
  content:     { flex: 1, padding: "16px 20px", overflowY: "auto" },
  section:     { display: "flex", flexDirection: "column", gap: "14px" },
  heading:     { color: "var(--text)", fontSize: "1rem", margin: 0 },
  description: { color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 },

  themeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  themeCard: { padding: "12px", borderRadius: "8px", cursor: "pointer", backgroundColor: "var(--bg)", transition: "border 0.15s" },

  infoBox:   { backgroundColor: "var(--bg)", borderRadius: "8px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" },
  infoRow:   { display: "flex", flexDirection: "column", gap: "2px" },
  infoLabel: { color: "var(--text-dim)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" },
  infoValue: { color: "var(--text)", fontSize: "0.88rem", fontFamily: "monospace" },
  resultBox: { backgroundColor: "var(--bg)", borderRadius: "8px", padding: "14px", border: "1px solid" },

  btn: { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },

  versionBox:    { backgroundColor: "var(--bg)", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" },
  versionNumber: { color: "var(--accent)", fontSize: "2rem", fontWeight: "700", fontFamily: "monospace" },
  versionDate:   { color: "var(--text-muted)", fontSize: "0.85rem" },
  versionNotes:  { color: "var(--text)", fontSize: "0.9rem", marginTop: "4px" },

  resizeHandle: { position: "absolute", bottom: "4px", right: "4px", cursor: "se-resize", padding: "4px", opacity: 0.5, lineHeight: 0 },
  fullOverlay:  { position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" },
  overlayHeader: { padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" },
  overlayClose:  { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" },

  // ── Demo card ───────────────────────────────────────────────────────────────
  demoCard: {
    marginTop: "4px",
    padding: "16px 18px",
    borderRadius: "10px",
    border: "1px solid #3b82f633",
    background: "linear-gradient(135deg, #1e3a5f22 0%, #0f172a44 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  demoCardHeader: { display: "flex", alignItems: "center", gap: "10px" },
  demoBadge: {
    fontSize: "0.65rem",
    fontWeight: "800",
    letterSpacing: "0.12em",
    color: "#3b82f6",
    backgroundColor: "#3b82f615",
    border: "1px solid #3b82f640",
    padding: "2px 7px",
    borderRadius: "4px",
    flexShrink: 0,
  },
  demoCardTitle: { color: "var(--text)", fontSize: "0.9rem", fontWeight: "600" },
  demoCardDesc:  { color: "var(--text-muted)", fontSize: "0.83rem", lineHeight: "1.5", margin: 0 },
  demoBtn: {
    alignSelf: "flex-start",
    padding: "9px 20px",
    borderRadius: "6px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "white",
    fontSize: "0.88rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.15s",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 2px 12px #3b82f633",
  },
  demoBtnSpinner: {
    display: "inline-block",
    width: "12px",
    height: "12px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};