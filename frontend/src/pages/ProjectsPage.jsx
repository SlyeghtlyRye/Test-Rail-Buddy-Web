import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects, getSuites, getSections, getCases, getCase } from "../api";
import { useAuth } from "../AuthContext";

function stripHtml(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export default function ProjectsPage() {
  const { credentials, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [suites, setSuites] = useState([]);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [sections, setSections] = useState([]);
  const [cases, setCases] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(260);
  const [middleWidth, setMiddleWidth] = useState(500);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [middleCollapsed, setMiddleCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const isResizing = useRef(false);
  const isResizingMiddle = useRef(false);

  useEffect(() => {
    if (!credentials) {
      navigate("/");
      return;
    }
    loadProjects();
  }, []);

  const handleMouseDown = () => {
    isResizing.current = true;
    const onMouseMove = (e) => {
      if (!isResizing.current) return;
      setPanelWidth(Math.min(600, Math.max(150, e.clientX)));
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleMiddleMouseDown = () => {
    isResizingMiddle.current = true;
    const onMouseMove = (e) => {
      if (!isResizingMiddle.current) return;
      const newWidth = e.clientX - panelWidth;
      setMiddleWidth(Math.min(900, Math.max(200, newWidth)));
    };
    const onMouseUp = () => {
      isResizingMiddle.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };



  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await getProjects(credentials);
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
    setLoading(false);
  };

  const handleProjectChange = async (e) => {
    const projectId = parseInt(e.target.value);
    const project = projects.find((p) => p.id === projectId);
    setSelectedProject(project);
    setSelectedSuite(null);
    setSections([]);
    setCases([]);
    setExpandedSections({});
    setSelectedCase(null);
    if (!project) return;
    setLoading(true);
    try {
      const res = await getSuites(credentials, projectId);
      setSuites(res.data);
      if (!res.data || res.data.length === 0) {
        const sectionsRes = await getSections(credentials, projectId, null);
        setSections(sectionsRes.data);
      }
    } catch (err) {
      console.error("Failed to load suites", err);
    }
    setLoading(false);
  };

  const handleSuiteClick = async (suite) => {
    setSelectedSuite(suite);
    setCases([]);
    setExpandedSections({});
    setSelectedCase(null);
    setLoading(true);
    try {
      const res = await getSections(credentials, selectedProject.id, suite.id);
      setSections(res.data);
    } catch (err) {
      console.error("Failed to load sections", err);
    }
    setLoading(false);
  };

  const toggleSection = async (section) => {
    const isExpanded = expandedSections[section.id];
    if (isExpanded) {
      setExpandedSections((prev) => ({ ...prev, [section.id]: false }));
      return;
    }
    setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
    if (!cases[section.id]) {
      try {
        const res = await getCases(
          credentials,
          selectedProject.id,
          selectedSuite?.id,
          section.id
        );
        setCases((prev) => ({ ...prev, [section.id]: res.data.cases }));
      } catch (err) {
        console.error("Failed to load cases", err);
      }
    }
  };

    const handleCaseClick = async (c) => {
    setCaseLoading(true);
    setSelectedCase(null);
    try {
        const res = await getCase(credentials, c.id);
        setSelectedCase(res.data);
    } catch (err) {
        console.error("Failed to load case", err);
    }
    setCaseLoading(false);
    };
  const rootSections = sections.filter((s) => !s.parent_id);
  const childSections = (parentId) =>
    sections.filter((s) => s.parent_id === parentId);

  const renderSection = (section, depth = 0) => (
    <div key={section.id}>
      <div
        style={{ ...styles.sectionRow, paddingLeft: `${20 + depth * 20}px` }}
        onClick={() => toggleSection(section)}
      >
        <span style={styles.sectionIcon}>
          {expandedSections[section.id] ? "▼" : "▶"}
        </span>
        <span style={styles.sectionName}>{section.name}</span>
      </div>
      {expandedSections[section.id] && (
        <div>
          {childSections(section.id).map((child) =>
            renderSection(child, depth + 1)
          )}
        {(cases[section.id] || []).map((c) => (
        <div
            key={c.id}
            style={{ ...styles.caseRow, paddingLeft: `${40 + depth * 20}px`, cursor: "pointer" }}
            onClick={(e) => {
            e.stopPropagation();
            handleCaseClick(c);
            }}
        >
            <span style={{
            display: "inline-block",
            width: "10px",
            height: "12px",
            border: "1px solid #64748b",
            borderRadius: "1px",
            flexShrink: 0
            }} />
            <span style={styles.caseName}>
            {c.custom_tc_test_case_id ? `[${c.custom_tc_test_case_id}] ` : ""}
            {c.title}
            </span>
        </div>
        ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>TestRail Buddy</h1>
        <button style={styles.logoutBtn} onClick={() => { logout(); navigate("/"); }}>
          Logout
        </button>
      </div>

      <div style={styles.content}>

        {/* LEFT COLLAPSED TAB */}
        {leftCollapsed && (
          <div style={styles.collapsedTab} onClick={() => setLeftCollapsed(false)}>
            <span style={styles.collapsedLabel}>▶ Nav</span>
          </div>
        )}

        {/* LEFT PANEL */}
        {!leftCollapsed && (
        <div style={{ ...styles.panelOuter, width: `${panelWidth}px` }}>
            <div style={styles.panelInner}>
            <div style={styles.panelHeader}>
                <span style={styles.label}>Project</span>
                <button style={styles.collapseBtn} onClick={() => setLeftCollapsed(true)}>◀</button>
            </div>
            <select style={styles.select} onChange={handleProjectChange} defaultValue="">
                <option value="" disabled>Select a project...</option>
                {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
            {suites.length > 0 && (
                <>
                <label style={{ ...styles.label, marginTop: "20px" }}>Suites</label>
                {suites.map((s) => (
                    <div
                    key={s.id}
                    style={{
                        ...styles.suiteItem,
                        backgroundColor: selectedSuite?.id === s.id ? "#1d4ed8" : "#1e293b",
                    }}
                    onClick={() => handleSuiteClick(s)}
                    >
                    {s.name}
                    </div>
                ))}
                </>
            )}
            </div>
            <div style={styles.resizeHandle} onMouseDown={handleMouseDown} />
        </div>
        )}

        {/* MIDDLE COLLAPSED TAB */}
        {middleCollapsed && (
          <div style={styles.collapsedTab} onClick={() => setMiddleCollapsed(false)}>
            <span style={styles.collapsedLabel}>▶ Cases</span>
          </div>
        )}

        {/* MIDDLE PANEL */}
        {!middleCollapsed && (
        <div style={{ ...styles.panelOuter, width: `${middleWidth}px` }}>
            <div style={styles.panelInner}>
            <div style={styles.panelHeader}>
                <span style={styles.label}>
                {selectedSuite ? selectedSuite.name : selectedProject?.name || "Cases"}
                </span>
                <button style={styles.collapseBtn} onClick={() => setMiddleCollapsed(true)}>◀</button>
            </div>
            {loading && <p style={styles.loading}>Loading...</p>}
            {!loading && sections.length === 0 && selectedProject && (
                <p style={styles.hint}>
                {suites.length > 0 ? "Select a suite to see sections" : "No sections found"}
                </p>
            )}
            {!loading && sections.length > 0 && (
                <div style={styles.tree}>
                {rootSections.map((s) => renderSection(s))}
                </div>
            )}
            {!selectedProject && !loading && (
                <p style={styles.hint}>Select a project to get started</p>
            )}
            </div>
            <div style={styles.resizeHandle} onMouseDown={handleMiddleMouseDown} />
        </div>
        )}

        {/* RIGHT COLLAPSED TAB */}
        {rightCollapsed && (
          <div style={styles.collapsedTab} onClick={() => setRightCollapsed(false)}>
            <span style={styles.collapsedLabel}>◀ Detail</span>
          </div>
        )}

        {/* RIGHT PANEL */}
        {!rightCollapsed && (
          <div style={styles.rightPanel}>
            <div style={styles.panelHeader}>
              <span style={styles.label}>Case Detail</span>
              <button style={styles.collapseBtn} onClick={() => setRightCollapsed(true)}>▶</button>
            </div>

            {caseLoading && <p style={styles.loading}>Loading case...</p>}

            {!caseLoading && !selectedCase && (
              <p style={styles.hint}>Select a test case to view details</p>
            )}

            {!caseLoading && selectedCase && (
              <div style={styles.caseDetail}>
                <h2 style={styles.caseTitle}>{selectedCase.title}</h2>

                <div style={styles.caseField}>
                  <span style={styles.fieldLabel}>Test Case ID</span>
                  <span style={styles.fieldValue}>{selectedCase.custom_tc_test_case_id || "-"}</span>
                </div>

                <div style={styles.caseField}>
                  <span style={styles.fieldLabel}>Test Name</span>
                  <span style={styles.fieldValue}>{selectedCase.custom_tc_name || "-"}</span>
                </div>

                <div style={styles.caseField}>
                  <span style={styles.fieldLabel}>Category</span>
                  <span style={styles.fieldValue}>{selectedCase.custom_tc_category || "-"}</span>
                </div>

                {selectedCase.custom_preconds && (
                  <div style={styles.caseBlock}>
                    <span style={styles.fieldLabel}>Preconditions</span>
                    <p style={styles.blockText}>{stripHtml(selectedCase.custom_preconds)}</p>
                  </div>
                )}

                {selectedCase.custom_tc_use_case && (
                  <div style={styles.caseBlock}>
                    <span style={styles.fieldLabel}>Use Case</span>
                    <p style={styles.blockText}>{stripHtml(selectedCase.custom_tc_use_case)}</p>
                  </div>
                )}

                {selectedCase.custom_steps && (
                  <div style={styles.caseBlock}>
                    <span style={styles.fieldLabel}>Test Steps</span>
                    <p style={styles.blockText}>{stripHtml(selectedCase.custom_steps)}</p>
                  </div>
                )}

                {selectedCase.custom_expected && (
                  <div style={styles.caseBlock}>
                    <span style={styles.fieldLabel}>Expected Result</span>
                    <p style={styles.blockText}>{stripHtml(selectedCase.custom_expected)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh", backgroundColor: "#0f172a",
    fontFamily: "sans-serif", display: "flex",
    flexDirection: "column", overflow: "hidden", width: "100%",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 24px", borderBottom: "1px solid #1e293b",
  },
  title: { color: "#f8fafc", fontSize: "1.5rem", margin: 0 },
  logoutBtn: {
    padding: "8px 16px", borderRadius: "6px", border: "none",
    backgroundColor: "#334155", color: "#f8fafc", cursor: "pointer", fontSize: "0.9rem",
  },
  content: { display: "flex", flex: 1, overflow: "hidden", width: "100%" },
  panelOuter: {
    position: "relative", display: "flex", flexShrink: 0,
    borderRight: "1px solid #1e293b", minWidth: "150px",
    backgroundColor: "#0f172a",
  },
  panelInner: {
    flex: 1, overflowY: "auto", padding: "20px",
    display: "flex", flexDirection: "column",
  },
  rightPanel: {
    flex: 1, padding: "20px", overflowY: "auto",
    backgroundColor: "#0f172a", position: "relative",
    minWidth: "150px", borderLeft: "1px solid #1e293b",
  },
  resizeHandle: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: "4px", cursor: "col-resize",
    backgroundColor: "#1e293b",
    zIndex: 10,
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "10px",
  },
  collapseBtn: {
    background: "none", border: "none", color: "#94a3b8",
    cursor: "pointer", fontSize: "0.85rem", padding: "2px 6px",
  },
  collapsedTab: {
    width: "28px", backgroundColor: "#1e293b", borderRight: "1px solid #334155",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  },
  collapsedLabel: {
    color: "#94a3b8", fontSize: "0.7rem", writingMode: "vertical-rl",
    textOrientation: "mixed", letterSpacing: "0.05em",
  },
  label: { color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  select: {
    padding: "10px", borderRadius: "6px", border: "1px solid #334155",
    backgroundColor: "#1e293b", color: "#f8fafc", fontSize: "0.95rem", cursor: "pointer",
  },
  suiteItem: {
    padding: "10px 12px", borderRadius: "6px", color: "#f8fafc",
    fontSize: "0.9rem", cursor: "pointer", marginBottom: "4px",
    display: "block", width: "100%", boxSizing: "border-box",
  },
  tree: { backgroundColor: "#0f172a" },
  sectionRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "8px 12px", cursor: "pointer", borderRadius: "6px",
    color: "#e2e8f0", fontSize: "0.95rem",
  },
  sectionIcon: { fontSize: "1rem" },
  sectionName: { fontWeight: "500" },
  caseRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "6px 12px", color: "#94a3b8", fontSize: "0.88rem",
  },
  caseIcon: { fontSize: "0.9rem" },
  caseName: {},
  loading: { color: "#94a3b8" },
  hint: { color: "#475569", fontSize: "0.95rem", marginTop: "40px", textAlign: "center" },
  caseDetail: { display: "flex", flexDirection: "column", gap: "16px" },
  caseTitle: { color: "#f8fafc", fontSize: "1.1rem", marginBottom: "8px" },
  caseField: {
    display: "flex", flexDirection: "column", gap: "4px",
    padding: "10px", backgroundColor: "#1e293b", borderRadius: "6px",
  },
  caseBlock: {
    display: "flex", flexDirection: "column", gap: "8px",
    padding: "10px", backgroundColor: "#1e293b", borderRadius: "6px",
  },
  fieldLabel: { color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  fieldValue: { color: "#f8fafc", fontSize: "0.95rem" },
  blockText: { color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.6", whiteSpace: "pre-wrap" },
};