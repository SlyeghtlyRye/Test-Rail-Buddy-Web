    import { useState, useEffect } from "react";
    import axios from "axios";
    import AppStructure from "./AppStructure";
    import DependencyMap from "./DependencyMap";
    import { THEMES, applyTheme, loadSavedTheme } from "../theme";
    const BASE_URL = "http://localhost:8000";

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





    const DOCS = [  
    { label: "Frontend", path: "frontend/src/", desc: "React + Vite" },
    { label: "Pages", path: "frontend/src/pages/", desc: "LoginPage.jsx, ProjectsPage.jsx" },
    { label: "Components", path: "frontend/src/components/", desc: "ToolsPanel.jsx" },
    { label: "Tools", path: "frontend/src/tools/", desc: "CreateCase, CreateSection, ExportCases, BulkEditIDs, FixTestNames, ConvertFormat, Settings" },
    { label: "API Calls", path: "frontend/src/api.js", desc: "All HTTP calls to backend" },
    { label: "Auth Context", path: "frontend/src/AuthContext.jsx", desc: "Credentials stored in sessionStorage" },
    { label: "Backend", path: "app/", desc: "FastAPI — Python" },
    { label: "API Routes", path: "app/api/", desc: "auth.py, projects.py, cases.py, tools.py" },
    { label: "Core", path: "app/core/", desc: "config.py, testrail.py" },
    { label: "Infrastructure", path: "root/", desc: "Dockerfile, docker-compose.yml, k8s/, start.ps1" },
    ];

    export default function Settings({ credentials }) {
    const [activeSection, setActiveSection] = useState("theme");
    const [selectedTheme, setSelectedTheme] = useState("default");
    const [apiStatus, setApiStatus] = useState(null);
    const [apiLoading, setApiLoading] = useState(false);
    const [showStructure, setShowStructure] = useState(false);
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        loadSavedTheme();
        const saved = localStorage.getItem("theme");
        if (saved) setSelectedTheme(JSON.parse(saved).id);
    }, []);

    const testApi = async () => {
        setApiLoading(true);
        setApiStatus(null);
        try {
        const start = Date.now();
        await axios.post(`${BASE_URL}/api/auth/verify`, credentials);
        const ms = Date.now() - start;
        setApiStatus({ ok: true, ms });
        } catch (err) {
        setApiStatus({ ok: false, error: err.message });
        }
        setApiLoading(false);
    };

    const sections = [
        { id: "theme", label: "Theme" },
        { id: "test", label: "API Test" },
        { id: "docs", label: "App Framework" },
        { id: "version", label: "Version" },
    ];





    return (
        <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
            {sections.map((s) => (
            <div
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                ...styles.sidebarItem,
                backgroundColor: activeSection === s.id ? "var(--accent)" : "transparent",
                color: activeSection === s.id ? "white" : "var(--text-muted)",
                }}
            >
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
                {THEMES.map((t) => (
                    <div
                    key={t.id}
                    onClick={() => { applyTheme(t); setSelectedTheme(t.id); }}
                    style={{
                        ...styles.themeCard,
                        border: selectedTheme === t.id ? `2px solid var(--accent)` : `1px solid var(--border)`,


                    }}
                    >
                    <div style={{
                        height: "60px", borderRadius: "6px", marginBottom: "8px",
                        backgroundColor: t.bg, border: `1px solid ${t.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    }}>
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
                <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Backend URL</span>
                    <span style={styles.infoValue}>{BASE_URL}</span>
                </div>
                <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>TestRail URL</span>
                    <span style={styles.infoValue}>{credentials?.url || "—"}</span>
                </div>
                <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Email</span>
                    <span style={styles.infoValue}>{credentials?.email || "—"}</span>
                </div>
                </div>

                <button style={styles.btn} onClick={testApi} disabled={apiLoading}>
                {apiLoading ? "Testing..." : "Run Test"}
                </button>

                {apiStatus && (
                <div style={{
                    ...styles.resultBox,
                    borderColor: apiStatus.ok ? "#22c55e" : "#ef4444",
                }}>
                    {apiStatus.ok ? (
                    <>
                        <div style={{ color: "#22c55e", fontWeight: "700" }}>✓ Connection Successful</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>
                        Response time: {apiStatus.ms}ms
                        </div>
                    </>
                    ) : (
                    <>
                        <div style={{ color: "#ef4444", fontWeight: "700" }}>✕ Connection Failed</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>{apiStatus.error}</div>
                    </>
                    )}
                </div>
                )}
            </div>
            )}

            {/* DOCS */}
            {activeSection === "docs" && (
                <div style={styles.section}>
                    <h3 style={styles.heading}>App Framework</h3>
                    <p style={styles.description}>
                    Opens an interactive map of the entire codebase.
                    </p>
                    <button style={styles.btn} onClick={() => setShowStructure(true)}>
                    Open App Structure
                    </button>
                    <button style={styles.btn} onClick={() => setShowMap(true)}>
                    Open Dependency Map
                    </button>
                    <button style={styles.btn} onClick={() => window.open(`${BASE_URL}/docs`, "_blank")}>
                    Open API Docs
                    </button>
                </div>
                )}

            {/* VERSION */}
            {activeSection === "version" && (
            <div style={styles.section}>
                <h3 style={styles.heading}>Version</h3>
                <div style={styles.versionBox}>
                <div style={styles.versionNumber}>v{VERSION.number}</div>
                <div style={styles.versionDate}>Last updated: {VERSION.updated}</div>
                <div style={styles.versionNotes}>
                    {VERSION.notes.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                    </div>
                </div>
                <p style={styles.description} >
                To update the version, edit the VERSION object at the top of
                <span style={{ fontFamily: "monospace", color: "#94a3b8" }}> frontend/src/tools/Settings.jsx</span>.
                </p>
            </div>
            )}


            {showStructure && (
                    <div style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 200, display: "flex", flexDirection: "column",
                    }}>
                        <div style={{
                        padding: "12px 20px", borderBottom: "1px solid #1e293b",
                        display: "flex", justifyContent: "flex-end",
                        backgroundColor: "var(--bg)",
                        }}>
                        <button
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1rem" }}
                            onClick={() => setShowStructure(false)}
                        >
                            ✕ Close
                        </button>
                        </div>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                        <AppStructure />
                        </div>
                    </div>
                    )}

            {showMap && (
            <div style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 200, display: "flex", flexDirection: "column",
            }}>
                <div style={{
                padding: "12px 20px", borderBottom: "1px solid var(--border)",
                display: "flex", justifyContent: "flex-end",
                backgroundColor: "var(--bg)",
                }}>
                <button
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}
                    onClick={() => setShowMap(false)}
                >
                    ✕ Close
                </button>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                <DependencyMap />
                </div>
            </div>
            )}


        </div>
        </div>
    );
    }

    const styles = {
    container: { display: "flex", height: "100%", gap: "0" },
    sidebar: {
        width: "140px", borderRight: "1px solid var(--border)",
        paddingRight: "12px", display: "flex", flexDirection: "column", gap: "2px",
        flexShrink: 0,
    },
    sidebarItem: {
        padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
        fontSize: "0.88rem", transition: "all 0.15s",
    },
    content: { flex: 1, paddingLeft: "20px", overflowY: "auto", display: "flex", flexDirection: "column" },
    section: { display: "flex", flexDirection: "column", gap: "14px" },
    heading: { color: "var(--text)", fontSize: "1rem", margin: 0 },
    description: { color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 },
    themeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
    themeCard: {
        padding: "12px", borderRadius: "8px", cursor: "pointer",
        backgroundColor: "var(--bg-panel)", transition: "border 0.15s",
    },
    infoBox: {
        backgroundColor: "var(--bg-panel)", borderRadius: "8px", padding: "14px",
        display: "flex", flexDirection: "column", gap: "10px",
    },
    infoRow: { display: "flex", flexDirection: "column", gap: "2px" },
    infoLabel: { color: "var(--text-dim)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" },
    infoValue: { color: "var(--text)", fontSize: "0.88rem", fontFamily: "monospace" },
    btn: {
        padding: "10px 20px", borderRadius: "6px", border: "none",
        backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem",
        cursor: "pointer", alignSelf: "flex-start",
    },
    resultBox: {
        backgroundColor: "var(--bg-panel)", borderRadius: "8px", padding: "14px",
        border: "1px solid",
    },
    versionBox: {
        backgroundColor: "var(--bg-panel)", borderRadius: "8px", padding: "20px",
        display: "flex", flexDirection: "column", gap: "8px",
    },
    versionNumber: { color: "var(--accent)", fontSize: "2rem", fontWeight: "700", fontFamily: "monospace" },
    versionDate: { color: "var(--text-muted)", fontSize: "0.85rem" },
    versionNotes: { color: "var(--text)", fontSize: "0.9rem", marginTop: "4px" },
    };