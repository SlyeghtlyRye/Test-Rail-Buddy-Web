import { useState } from "react";

const colors = {
  bg: "#0a0f1e",
  panel: "#0f172a",
  border: "#1e293b",
  blue: "#3b82f6",
  teal: "#14b8a6",
  purple: "#8b5cf6",
  green: "#22c55e",
  orange: "#f97316",
  yellow: "#eab308",
  red: "#ef4444",
  text: "#f8fafc",
  muted: "#94a3b8",
  dim: "#334155",
};

const structure = {
  frontend: {
    label: "Frontend",
    color: colors.blue,
    path: "frontend/src/",
    children: {
      pages: {
        label: "pages/",
        color: colors.teal,
        files: [
          { name: "LoginPage.jsx", desc: "Login form, verifies credentials, redirects to /projects" },
          { name: "ProjectsPage.jsx", desc: "Main app — three panel layout, all navigation logic, state management" },
        ],
      },
      components: {
        label: "components/",
        color: colors.purple,
        files: [
          { name: "ToolsPanel.jsx", desc: "Modal overlay — lists all tools, renders active tool component" },
        ],
      },
      tools: {
        label: "tools/",
        color: colors.orange,
        files: [
          { name: "CreateCase.jsx", desc: "Form to create a new test case in a selected section" },
          { name: "CreateSection.jsx", desc: "Form to create a new section, supports nesting under parent" },
          { name: "ExportCases.jsx", desc: "Export all cases in project/suite to CSV download" },
          { name: "BulkEditIDs.jsx", desc: "Assign sequential IDs to all cases in a section" },
          { name: "FixTestNames.jsx", desc: "Replace spaces with underscores in test names" },
          { name: "ConvertFormat.jsx", desc: "Convert old single-field steps to separated steps format" },
        ],
      },
      root: {
        label: "root files",
        color: colors.yellow,
        files: [
          { name: "api.js", desc: "All API calls — verifyAuth, getProjects, getSuites, getSections, getCases, getCase, createSection" },
          { name: "AuthContext.jsx", desc: "React context — stores credentials, persists to sessionStorage" },
          { name: "App.jsx", desc: "Router setup with AuthProvider wrapper, defines routes" },
          { name: "index.css", desc: "Global styles — reset, scrollbars, full height layout" },
        ],
      },
    },
  },
  backend: {
    label: "Backend",
    color: colors.green,
    path: "app/",
    children: {
      api: {
        label: "api/",
        color: colors.teal,
        files: [
          { name: "auth.py", desc: "POST /api/auth/verify — validates TestRail credentials" },
          { name: "projects.py", desc: "GET projects, suites, sections — also create section endpoint" },
          { name: "cases.py", desc: "GET cases, GET single case, POST create case" },
          { name: "tools.py", desc: "POST export-csv, bulk-ids, fix-names tool endpoints" },
        ],
      },
      core: {
        label: "core/",
        color: colors.purple,
        files: [
          { name: "config.py", desc: "App settings — CORS origins, environment variables" },
          { name: "testrail.py", desc: "TestRail API client wrapper — handles auth and requests" },
        ],
      },
      root: {
        label: "root files",
        color: colors.yellow,
        files: [
          { name: "main.py", desc: "FastAPI app entry point — registers all routers" },
        ],
      },
    },
  },
  infra: {
    label: "Infrastructure",
    color: colors.red,
    path: "root/",
    children: {
      docker: {
        label: "Docker",
        color: colors.orange,
        files: [
          { name: "Dockerfile", desc: "Packages backend into a container image" },
          { name: "docker-compose.yml", desc: "Run backend locally with one command" },
        ],
      },
      k8s: {
        label: "k8s/",
        color: colors.red,
        files: [
          { name: "deployment.yaml", desc: "Kubernetes deployment — pods, replicas, health checks" },
          { name: "configmap.yaml", desc: "Behavior flags — READ_ONLY_MODE, ENABLE_LOGGING etc" },
        ],
      },
      scripts: {
        label: "scripts",
        color: colors.yellow,
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
        backgroundColor: isSelected ? "#1e3a5f" : "transparent",
        border: isSelected ? "1px solid #3b82f6" : "1px solid transparent",
        transition: "all 0.15s",
      }}
    >
      <div style={{ color: colors.text, fontSize: "0.85rem", fontFamily: "'SF Mono', monospace" }}>
        {file.name}
      </div>
    </div>
  );
}

function Section({ section, selectedFile, onSelect }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          cursor: "pointer", padding: "4px 0", marginBottom: "4px",
        }}
      >
        <span style={{ color: section.color, fontSize: "0.7rem" }}>{open ? "▼" : "▶"}</span>
        <span style={{ color: section.color, fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {section.label}
        </span>
      </div>
      {open && (
        <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {section.files.map((f) => (
            <FileRow
              key={f.name}
              file={f}
              isSelected={selectedFile?.name === f.name}
              onClick={onSelect}
            />
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
    <div style={{
      backgroundColor: colors.bg, height: "100vh",
      fontFamily: "system-ui, sans-serif", color: colors.text,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.2rem", color: colors.text }}>TestRail Buddy</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: colors.muted }}>App Structure Map</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {Object.entries(structure).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSelectedFile(null); }}
              style={{
                padding: "7px 16px", borderRadius: "6px", border: "none",
                backgroundColor: activeTab === key ? val.color : colors.dim,
                color: colors.text, cursor: "pointer", fontSize: "0.82rem",
                fontFamily: "inherit",
              }}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* File Tree */}
        <div style={{
          width: "280px", borderRight: `1px solid ${colors.border}`,
          padding: "16px", overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{
            fontSize: "0.72rem", color: colors.muted, marginBottom: "12px",
            fontFamily: "'SF Mono', monospace",
          }}>
            📁 {current.path}
          </div>
          {Object.values(current.children).map((section) => (
            <Section
              key={section.label}
              section={section}
              selectedFile={selectedFile}
              onSelect={setSelectedFile}
            />
          ))}
        </div>

        {/* Detail Panel */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          {!selectedFile && (
            <div style={{ marginTop: "60px", textAlign: "center" }}>
              <p style={{ color: colors.dim, fontSize: "0.95rem" }}>
                Select a file to see what it does
              </p>
              <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "500px", margin: "40px auto 0" }}>
                {Object.values(current.children).map((section) => (
                  <div key={section.label} style={{
                    backgroundColor: colors.panel, borderRadius: "8px",
                    padding: "12px 16px", border: `1px solid ${colors.border}`,
                    display: "flex", alignItems: "center", gap: "12px",
                  }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      backgroundColor: section.color, flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ color: section.color, fontSize: "0.8rem", fontWeight: "700" }}>{section.label}</div>
                      <div style={{ color: colors.muted, fontSize: "0.78rem" }}>{section.files.length} file{section.files.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFile && (
            <div style={{ maxWidth: "600px" }}>
              <div style={{
                fontSize: "0.72rem", color: colors.muted, marginBottom: "8px",
                fontFamily: "'SF Mono', monospace",
              }}>
                {current.path}
              </div>
              <h2 style={{
                color: colors.text, fontSize: "1.4rem", margin: "0 0 16px",
                fontFamily: "'SF Mono', monospace",
              }}>
                {selectedFile.name}
              </h2>

              <div style={{
                backgroundColor: colors.panel, borderRadius: "10px",
                padding: "20px", border: `1px solid ${colors.border}`,
                marginBottom: "20px",
              }}>
                <div style={{ color: colors.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  What it does
                </div>
                <p style={{ color: colors.text, fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
                  {selectedFile.desc}
                </p>
              </div>

              {/* Show related files based on current tab */}
              <div style={{
                backgroundColor: colors.panel, borderRadius: "10px",
                padding: "20px", border: `1px solid ${colors.border}`,
              }}>
                <div style={{ color: colors.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  All files in this section
                </div>
                {Object.values(current.children).map((section) =>
                  section.files.some(f => f.name === selectedFile.name) ? (
                    section.files.map((f) => (
                      <div
                        key={f.name}
                        onClick={() => setSelectedFile(f)}
                        style={{
                          padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                          backgroundColor: f.name === selectedFile.name ? "#1e3a5f" : "transparent",
                          display: "flex", alignItems: "center", gap: "8px",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: section.color, fontSize: "0.7rem" }}>●</span>
                        <span style={{ color: colors.text, fontSize: "0.85rem", fontFamily: "'SF Mono', monospace" }}>{f.name}</span>
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
