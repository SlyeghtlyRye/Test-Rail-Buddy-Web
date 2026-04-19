import { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Infrastructure is static since it's not Python or JSX ───────────────────
const INFRA = [
  { name: "Dockerfile",         path: "Dockerfile",            folder: "docker",   documented: true,  description: "Packages backend into a container image" },
  { name: "docker-compose.yml", path: "docker-compose.yml",    folder: "docker",   documented: true,  description: "Run backend locally with one command" },
  { name: "deployment.yaml",    path: "k8s/deployment.yaml",   folder: "k8s",      documented: true,  description: "Kubernetes deployment — pods, replicas, health checks" },
  { name: "configmap.yaml",     path: "k8s/configmap.yaml",    folder: "k8s",      documented: true,  description: "Behavior flags — READ_ONLY_MODE, ENABLE_LOGGING etc" },
  { name: "start.ps1",          path: "start.ps1",             folder: "scripts",  documented: true,  description: "Launches backend + frontend + opens browser automatically" },
  { name: "requirements.txt",   path: "requirements.txt",      folder: "scripts",  documented: true,  description: "Python dependencies for the backend" },
  { name: "pyproject.toml",     path: "pyproject.toml",        folder: "scripts",  documented: true,  description: "pytest and black (formatter) configuration" },
];

const SECTION_COLORS = {
  pages:        "#14b8a6",
  components:   "#8b5cf6",
  tools:        "#f97316",
  api:          "#14b8a6",
  core:         "#8b5cf6",
  models:       "#eab308",
  services:     "#3b82f6",
  "":           "#eab308",
  docker:       "#0ea5e9",
  k8s:          "#6366f1",
  scripts:      "#eab308",
  undocumented: "#ef4444",
};

function colorFor(folder) {
  const key = folder.replace(/\\/g, "/").split("/").pop().toLowerCase();
  return SECTION_COLORS[key] || "#64748b";
}

function groupFiles(files) {
  const groups = {};
  for (const f of files) {
    const key = f.folder || "(root)";
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  const undocumented = files.filter(f => !f.documented);
  return { groups, undocumented };
}

function FileRow({ file, isSelected, onClick }) {
  const isUndoc = !file.documented;
  return (
    <div
      onClick={() => onClick(file)}
      style={{
        padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
        backgroundColor: isSelected ? (isUndoc ? "#1a0a0a" : "var(--highlight)") : "transparent",
        border: isSelected ? `1px solid ${isUndoc ? "#ef4444" : "var(--accent)"}` : "1px solid transparent",
        display: "flex", alignItems: "center", gap: "6px",
        transition: "all 0.15s",
      }}
    >
      {isUndoc && <span title="Undocumented" style={{ fontSize: "0.7rem" }}>⚠️</span>}
      <span style={{ color: isUndoc ? "#ef4444" : "var(--text)", fontSize: "0.85rem", fontFamily: "'SF Mono', monospace" }}>
        {file.name}
      </span>
    </div>
  );
}

function Section({ label, color, files, selectedFile, onSelect, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "8px" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "4px 0", marginBottom: "4px" }}>
        <span style={{ color, fontSize: "0.7rem" }}>{open ? "▼" : "▶"}</span>
        <span style={{ color, fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>({files.length})</span>
      </div>
      {open && (
        <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {files.map(f => (
            <FileRow key={f.path} file={f} isSelected={selectedFile?.path === f.path} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppStructure() {
  const [activeTab, setActiveTab]       = useState("frontend");
  const [selectedFile, setSelectedFile] = useState(null);
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => {
    axios.get(`${BASE_URL}/api/structure/`)
      .then(res => setData(res.data))
      .catch(() => setError("Failed to load project structure."))
      .finally(() => setLoading(false));
  }, []);

  const isInfra = activeTab === "infrastructure";
  const files = isInfra ? INFRA : (data?.[activeTab] ?? []);
  const { groups, undocumented } = groupFiles(files);
  const docCount = files.filter(f => f.documented).length;

  // Build undocumented label split by frontend/backend
  const undocLabel = (() => {
    if (isInfra) return undocumented.length > 0 ? `${undocumented.length} undocumented` : null;
    const f = (data?.frontend ?? []).filter(f => !f.documented).length;
    const b = (data?.backend  ?? []).filter(f => !f.documented).length;
    if (!f && !b) return null;
    if (f && b)  return `${f} frontend, ${b} backend undocumented file(s)`;
    if (f)       return `${f} frontend undocumented file(s)`;
    return       `${b} backend undocumented file(s)`;
  })();

  const tabs = [
    { key: "frontend",       label: "Frontend",       color: "#3b82f6" },
    { key: "backend",        label: "Backend",        color: "#22c55e" },
    { key: "infrastructure", label: "Infrastructure", color: "#ef4444" },
  ];

  return (
    <div style={{ backgroundColor: "var(--bg)", height: "100vh", fontFamily: "system-ui, sans-serif", color: "var(--text)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text)" }}>TestRail Buddy</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            App Structure Map
            {!loading && <span style={{ marginLeft: "8px", color: "var(--text-dim)" }}>— {docCount}/{files.length} documented</span>}
            {!loading && undocLabel && <span style={{ marginLeft: "8px", color: "#ef4444" }}>— ⚠️ {undocLabel}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedFile(null); }} style={{
              padding: "7px 16px", borderRadius: "6px", border: "none",
              backgroundColor: activeTab === t.key ? t.color : "var(--text-dim)",
              color: "white", cursor: "pointer", fontSize: "0.82rem",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* File Tree */}
        <div style={{ width: "280px", borderRight: "1px solid var(--border)", padding: "16px", paddingBottom: "80px", overflowY: "auto", flexShrink: 0, minHeight: 0 }}>
          {loading && !isInfra && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Scanning files…</p>}
          {error    && !isInfra && <p style={{ color: "#f87171",       fontSize: "0.85rem" }}>{error}</p>}

          {(!loading || isInfra) && !error && (
            <>
              {Object.entries(groups).map(([folder, folderFiles]) => {
                if (folderFiles.length === 0) return null;
                const label = folder === "(root)" ? "root files" : folder;
                return (
                  <Section key={folder} label={label} color={colorFor(folder)}
                    files={folderFiles} selectedFile={selectedFile} onSelect={setSelectedFile} />
                );
              })}

              {undocumented.length > 0 && (
                <Section label="undocumented" color="#ef4444" defaultOpen={true}
                  files={undocumented} selectedFile={selectedFile} onSelect={setSelectedFile} />
              )}
            </>
          )}
        </div>

        {/* Detail Panel */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          {!selectedFile && (!loading || isInfra) && (
            <div style={{ marginTop: "60px", textAlign: "center" }}>
              <p style={{ color: "var(--text-dim)", fontSize: "0.95rem" }}>Select a file to see what it does</p>
              {undocumented.length > 0 && (
                <div style={{ marginTop: "24px", backgroundColor: "var(--bg-panel)", borderRadius: "8px", padding: "14px 18px", border: "1px solid #ef4444", display: "inline-block", textAlign: "left" }}>
                  <span style={{ color: "#ef4444", fontSize: "0.85rem" }}>
                    ⚠️ {undocumented.length} undocumented file{undocumented.length !== 1 ? "s" : ""}:
                  </span>
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {undocumented.map(f => (
                      <span key={f.path} style={{ color: "#ef4444", fontSize: "0.82rem", fontFamily: "'SF Mono', monospace" }}>
                        # {activeTab} — {f.name}
                      </span>
                    ))}
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginTop: "10px", display: "block" }}>
                    Add descriptions to <code style={{ color: "var(--accent)" }}>app/api/structure.py</code> under <code style={{ color: "var(--accent)" }}>KNOWN</code>
                  </span>
                </div>
              )}
            </div>
          )}

          {selectedFile && (
            <div style={{ maxWidth: "600px" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "8px", fontFamily: "'SF Mono', monospace" }}>
                {activeTab === "frontend" ? "frontend/src/" : activeTab === "backend" ? "app/" : ""}{selectedFile.path}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <h2 style={{ color: selectedFile.documented ? "var(--text)" : "#ef4444", fontSize: "1.4rem", margin: 0, fontFamily: "'SF Mono', monospace" }}>
                  {selectedFile.name}
                </h2>
                {!selectedFile.documented && (
                  <span style={{ backgroundColor: "#ef444422", border: "1px solid #ef4444", borderRadius: "4px", padding: "2px 8px", color: "#ef4444", fontSize: "0.72rem" }}>
                    undocumented
                  </span>
                )}
              </div>

              <div style={{ backgroundColor: selectedFile.documented ? "var(--bg-panel)" : "#1a0a0a", borderRadius: "10px", padding: "20px", border: `1px solid ${selectedFile.documented ? "var(--border)" : "#ef4444"}`, marginBottom: "20px" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  What it does
                </div>
                {selectedFile.documented
                  ? <p style={{ color: "var(--text)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>{selectedFile.description}</p>
                  : <p style={{ color: "#ef444499", fontSize: "0.9rem", margin: 0 }}>
                      No description yet. Add one in{" "}
                      <code style={{ color: "var(--accent)" }}>app/api/structure.py</code>{" "}
                      under the <code style={{ color: "var(--accent)" }}>KNOWN</code> dict
                      {" "}({activeTab === "frontend" ? "Frontend" : activeTab === "backend" ? "Backend" : "Infrastructure"} section).
                    </p>
                }
              </div>

              {(() => {
                const siblings = files.filter(f => f.folder === selectedFile.folder && f.path !== selectedFile.path);
                if (siblings.length === 0) return null;
                return (
                  <div style={{ backgroundColor: "var(--bg-panel)", borderRadius: "10px", padding: "20px", border: "1px solid var(--border)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                      Other files in {selectedFile.folder || "root"}
                    </div>
                    {siblings.map(f => (
                      <div key={f.path} onClick={() => setSelectedFile(f)} style={{
                        padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px",
                      }}>
                        {!f.documented && <span style={{ fontSize: "0.7rem" }}>⚠️</span>}
                        <span style={{ color: colorFor(f.folder), fontSize: "0.7rem" }}>●</span>
                        <span style={{ color: f.documented ? "var(--text)" : "#ef4444", fontSize: "0.85rem", fontFamily: "'SF Mono', monospace" }}>{f.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}