import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadSavedTheme } from "../theme";
import { verifyAuth } from "../api";
import { useAuth } from "../AuthContext";
import AppStructure from "../tools/AppStructure";
import DependencyMap from "../tools/DependencyMap";

const VERSION = {
  number: "0.2.0",
  updated: "2026-02-18",
  notes: [
    "Added Tools panel:",
    "— CreateCase, CreateSection",
    "— ExportCases, BulkEditIDs",
    "— FixTestNames, ConvertFormat",
    "— Settings with API Test, App Framework viewer and Version tracking",
  ],
};

export default function LoginPage() {
  const [url, setUrl] = useState("https://phonecom.testrail.io");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSection, setActiveSection] = useState("version");
  const [showStructure, setShowStructure] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadSavedTheme(); }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const authRes = await verifyAuth({ url, email, password });
      if (!authRes.data.success) {
        setError("Authentication failed. Check your credentials.");
        setLoading(false);
        return;
      }
      login(url, email, password);
      navigate("/projects");
    } catch (err) {
      setError("Could not connect. Check your TestRail URL.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      {/* Gear button */}
      <button style={styles.gearBtn} onClick={() => setShowSettings(true)} title="Settings">⚙</button>

      <h1 style={styles.title}>TestRail Buddy</h1>
      <p style={styles.subtitle}>Connect to your TestRail instance</p>
      <form onSubmit={handleLogin} style={styles.form}>
        <input style={styles.input} type="text" placeholder="TestRail URL" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Connect"}
        </button>
      </form>

      {/* Settings modal */}
      {showSettings && (
        <div style={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Settings</span>
              <button style={styles.closeBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {/* Sidebar */}
              <div style={styles.sidebar}>
                {["version", "docs"].map((s) => (
                  <div key={s} onClick={() => setActiveSection(s)} style={{
                    ...styles.sidebarItem,
                    backgroundColor: activeSection === s ? "#3b82f6" : "transparent",
                    color: activeSection === s ? "white" : "#94a3b8",
                  }}>
                    {s === "version" ? "Version" : "App Framework"}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div style={styles.content}>
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
                  </div>
                )}

                {activeSection === "docs" && (
                  <div style={styles.section}>
                    <h3 style={styles.heading}>App Framework</h3>
                    <p style={styles.description}>Opens an interactive map of the entire codebase.</p>
                    <button style={styles.btn} onClick={() => setShowStructure(true)}>Open App Structure</button>
                    <button style={styles.btn} onClick={() => setShowMap(true)}>Open Dependency Map</button>
                  </div>
                )}
              </div>
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
          <div style={{ flex: 1, overflow: "hidden" }}>
            <AppStructure />
          </div>
        </div>
      )}

      {/* Dependency Map overlay */}
      {showMap && (
        <div style={styles.fullOverlay}>
          <div style={styles.overlayHeader}>
            <button style={styles.overlayClose} onClick={() => setShowMap(false)}>✕ Close</button>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <DependencyMap />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif", position: "relative" },
  gearBtn: { position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 },
  title: { color: "var(--text)", fontSize: "2rem", marginBottom: "8px" },
  subtitle: { color: "var(--text-muted)", fontSize: "1rem", marginBottom: "32px" },
  form: { display: "flex", flexDirection: "column", width: "100%", maxWidth: "400px", gap: "12px" },
  input: { padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "1rem", outline: "none" },
  button: { padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "1rem", cursor: "pointer", marginTop: "8px" },
  error: { color: "#f87171", fontSize: "0.9rem", margin: "0" },

  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { backgroundColor: "var(--bg-panel)", borderRadius: "10px", width: "560px", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)" },
  modalTitle: { color: "var(--text)", fontSize: "1rem", fontWeight: "600" },
  closeBtn: { background: "none", border: "none", color: "var(--text-muted)", fontSize: "1rem", cursor: "pointer" },
  modalBody: { display: "flex", flex: 1, overflow: "hidden" },

  sidebar: { width: "130px", borderRight: "1px solid var(--border)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 },
  sidebarItem: { padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.88rem" },
  content: { flex: 1, padding: "16px 20px", overflowY: "auto" },
  section: { display: "flex", flexDirection: "column", gap: "14px" },
  heading: { color: "var(--text)", fontSize: "1rem", margin: 0 },
  description: { color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 },
  btn: { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  versionBox: { backgroundColor: "var(--bg)", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" },
  versionNumber: { color: "var(--accent)", fontSize: "2rem", fontWeight: "700", fontFamily: "monospace" },
  versionDate: { color: "var(--text-muted)", fontSize: "0.85rem" },
  versionNotes: { color: "var(--text)", fontSize: "0.9rem", marginTop: "4px" },

  fullOverlay: { position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" },
  overlayHeader: { padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" },
  overlayClose: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" },
};