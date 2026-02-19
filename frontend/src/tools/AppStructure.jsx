import { useState } from "react";

// Node colors stay as-is — they're semantic category colors, not theme colors
const nodeColors = {
  blue: "#3b82f6",
  teal: "#14b8a6",
  purple: "#8b5cf6",
  green: "#22c55e",
  orange: "#f97316",
  yellow: "#eab308",
  red: "#ef4444",
};

const structure = {
  frontend: {
    label: "Frontend",
    color: nodeColors.blue,
    path: "frontend/src/",
    children: {
      pages: {
        label: "pages/",
        color: nodeColors.teal,
        files: [
          { name: "LoginPage.jsx", desc: "Login form, verifies credentials, redirects to /projects" },
          { name: "ProjectsPage.jsx", desc: "Main app — three panel layout, all navigation logic, state management" },
        ],
      },
      components: {
        label: "components/",
        color: nodeColors.purple,
        files: [
          { name: "ToolsPanel.jsx", desc: "Modal overlay — lists all tools, renders active tool component" },
        ],
      },
      tools: {
        label: "tools/",
        color: nodeColors.orange,
        files: [
          { name: "CreateCase.jsx", desc: "Form to create a new test case in a selected section" },
          { name: "CreateSection.jsx", desc: "Form to create a new section, supports nesting under parent" },
          { name: "ExportCases.jsx", desc: "Export all cases in project/suite to CSV download" },
          { name: "BulkEditIDs.jsx", desc: "Assign sequential IDs to all cases in a section" },
          { name: "FixTestNames.jsx", desc: "Replace spaces with underscores in test names" },
          { name: "ConvertFormat.jsx", desc: "Convert old single-field steps to separated steps format" },
          { name: "Settings.jsx", desc: "Settings panel — Theme, API Test, App Framework, Version" },
          { name: "AppStructure.jsx", desc: "Interactive codebase map — embedded in Settings" },
        ],
      },
      root: {
        label: "root files",
        color: nodeColors.yellow,
        files: [
          { name: "api.js", desc: "All API calls — verifyAuth, getProjects, getSuites, getSections, getCases, getCase, createSection" },
          { name: "AuthContext.jsx", desc: "React context — stores credentials, persists to sessionStorage" },
          { name: "App.jsx", desc: "Router setup with AuthProvider wrapper, defines routes" },
          { name: "index.css", desc: "Global styles — reset, scrollbars, thin scrollbars, full height layout" },
        ],
      },
    },
  },
  backend: {
    label: "Backend",
    color: nodeColors.green,
    path: "app/",
    children: {
      api: {
        label: "api/",
        color: nodeColors.teal,
        files: [
          { name: "auth.py", desc: "POST /api/auth/verify — validates TestRail credentials" },
          { name: "projects.py", desc: "GET projects, suites, sections — also create section endpoint" },
          { name: "cases.py", desc: "GET cases, GET single case, POST create case" },
          { name: "tools.py", desc: "POST export-csv, bulk-ids, fix-names tool endpoints" },
        ],
      },
      core: {
        label: "core/",
        color: nodeColors.purple,
        files: [
          { name: "config.py", desc: "App settings — CORS origins, environment variables" },
          { name: "testrail.py", desc: "TestRail API client wrapper — handles auth and requests" },
        ],
      },
      root: {
        label: "root files",
        color: nodeColors.yellow,
        files: [
          { name: "main.py", desc: "FastAPI app entry point — registers all routers" },
        ],
      },
    },
  },
  infra: {
    label: "Infrastructure",
    color: nodeColors.red,
    path: "root/",
    children: {
      docker: {
        label: "Docker",
        color: nodeColors.orange,
        files: [
          { name: "Dockerfile", desc: "Packages backend into a container image" },
          { name: "docker-compose.yml", desc: "Run backend locally with one command" },
        ],
      },
      k8s: {
        label: "k8s/",
        color: nodeColors.red,
        files: [
          { name: "deployment.yaml", desc: "Kubernetes deployment — pods, replicas, health checks" },
          { name: "configmap.yaml", desc: "Behavior flags — READ_ONLY_MODE, ENABLE_LOGGING etc" },
        ],
      },
      scripts: {
        label: "scripts",
        color: nodeColors.yellow,
        files: [
          { name: "start.ps1", desc: "Launches backend + frontend + opens browser automatically" },
          { name: "requirements.txt", desc: "Python dependencies for the backend" },
          { name: "pyproject.toml", desc: "pytest and black (formatter) configuration" },
        ],
      },
    },
  },
};

function FileRow({ file, isSelected, onClick }) {
  return (
    <div
      onClick={() => onClick(file)}
      style={{
        padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
        backgroundColor: isSelected ? "var(--highlight)" : "transparent",
        border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
        transition: "all 0.15s",
      }}
    >
      <div style={{ color: "var(--text)", fontSize: "0.85rem", fontFamily: "'SF Mono', monospace" }}>
        {file.name}
      </div>
    </div>
  );
}

function Section({ section, selectedFile, onSelect }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: "8px" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "4px 0", marginBottom: "4px" }}>
        <span style={{ color: section.color, fontSize: "0.7rem" }}>{open ? "▼" : "▶"}</span>
        <span style={{ color: section.color, fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {section.label}
        </span>
      </div>
      {open && (
        <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {section.files.map((f) => (
            <FileRow key={f.name} file={f} isSelected={selectedFile?.name === f.name} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppStructure() {
  const [activeTab, setActiveTab] = useState("frontend");
  const [selectedFile, setSelectedFile] = useState(null);
  const current = structure[activeTab];

  return (
    <div style={{ backgroundColor: "var(--bg)", height: "100vh", fontFamily: "system-ui, sans-serif", color: "var(--text)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text)" }}>TestRail Buddy</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>App Structure Map</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {Object.entries(structure).map(([key, val]) => (
            <button key={key} onClick={() => { setActiveTab(key); setSelectedFile(null); }} style={{
              padding: "7px 16px", borderRadius: "6px", border: "none",
              backgroundColor: activeTab === key ? val.color : "var(--text-dim)",
              color: "var(--text)", cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit",
            }}>
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* File Tree */}
        <div style={{ width: "280px", borderRight: "1px solid var(--border)", padding: "16px", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "12px", fontFamily: "'SF Mono', monospace" }}>
            📁 {current.path}
          </div>
          {Object.values(current.children).map((section) => (
            <Section key={section.label} section={section} selectedFile={selectedFile} onSelect={setSelectedFile} />
          ))}
        </div>

        {/* Detail Panel */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          {!selectedFile && (
            <div style={{ marginTop: "60px", textAlign: "center" }}>
              <p style={{ color: "var(--text-dim)", fontSize: "0.95rem" }}>Select a file to see what it does</p>
              <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "500px", margin: "40px auto 0" }}>
                {Object.values(current.children).map((section) => (
                  <div key={section.label} style={{ backgroundColor: "var(--bg-panel)", borderRadius: "8px", padding: "12px 16px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: section.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: section.color, fontSize: "0.8rem", fontWeight: "700" }}>{section.label}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{section.files.length} file{section.files.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFile && (
            <div style={{ maxWidth: "600px" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "8px", fontFamily: "'SF Mono', monospace" }}>{current.path}</div>
              <h2 style={{ color: "var(--text)", fontSize: "1.4rem", margin: "0 0 16px", fontFamily: "'SF Mono', monospace" }}>{selectedFile.name}</h2>
              <div style={{ backgroundColor: "var(--bg-panel)", borderRadius: "10px", padding: "20px", border: "1px solid var(--border)", marginBottom: "20px" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>What it does</div>
                <p style={{ color: "var(--text)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>{selectedFile.desc}</p>
              </div>
              <div style={{ backgroundColor: "var(--bg-panel)", borderRadius: "10px", padding: "20px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>All files in this section</div>
                {Object.values(current.children).map((section) =>
                  section.files.some(f => f.name === selectedFile.name) ? (
                    section.files.map((f) => (
                      <div key={f.name} onClick={() => setSelectedFile(f)} style={{
                        padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                        backgroundColor: f.name === selectedFile.name ? "var(--highlight)" : "transparent",
                        display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px",
                      }}>
                        <span style={{ color: section.color, fontSize: "0.7rem" }}>●</span>
                        <span style={{ color: "var(--text)", fontSize: "0.85rem", fontFamily: "'SF Mono', monospace" }}>{f.name}</span>
                      </div>
                    ))
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}