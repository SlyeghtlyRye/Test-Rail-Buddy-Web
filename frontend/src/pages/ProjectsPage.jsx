import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects, getSuites, getSections, getCases, getCase } from "../api";
import { useAuth } from "../AuthContext";
import ToolsPanel from "../components/ToolsPanel";
import CaseForm from "../tools/CaseForm";
import axios from "axios";

const BASE_URL = "http://localhost:8000";



function stripHtml(text) {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")           // line breaks
    .replace(/<\/p>/gi, "\n")                // paragraph ends
    .replace(/<\/h[1-6]>/gi, "\n")           // heading ends
    .replace(/<\/tr>/gi, "\n")               // table row ends
    .replace(/<\/td>/gi, "\t")               // table cells → tab-separated
    .replace(/<\/li>/gi, "\n")               // list item ends
    .replace(/<li>/gi, "• ")                 // list item starts → bullet
    .replace(/<[^>]+>/g, "")                 // strip remaining tags
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")                  // apostrophe entity
    .replace(/\n{3,}/g, "\n\n")             // collapse excessive blank lines
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
  const [cases, setCases] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(260);
  const [middleWidth, setMiddleWidth] = useState(500);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [middleCollapsed, setMiddleCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loadingSections, setLoadingSections] = useState({});
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const isResizing = useRef(false);
  const isResizingMiddle = useRef(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!credentials) { navigate("/"); return; }
    loadProjects();
  }, []);

  useEffect(() => {
    setEditMode(false);
    setEditError("");
  }, [selectedCaseId]);

  const handleDeleteCase = async () => {
    if (!window.confirm(`Delete "${selectedCase.title}"? This cannot be undone.`)) return;
    try {
      await axios.post(`${BASE_URL}/api/cases/${selectedCase.id}/delete`, credentials);
      if (selectedSection) {
        const casesRes = await getCases(credentials, selectedProject.id, selectedSuite?.id, selectedSection.id);
        setCases(prev => ({ ...prev, [selectedSection.id]: casesRes.data.cases || [] }));
      }
      setSelectedCase(null);
      setSelectedCaseId(null);
    } catch (err) {
      console.error("Failed to delete case", err);
    }
  };

  const handleEditSave = async (fields) => {
    if (!fields.title?.trim()) { setEditError("Title is required."); return; }
    setEditSaving(true);
    setEditError("");
    try {
      await axios.post(`${BASE_URL}/api/cases/${selectedCase.id}/update`, {
        ...credentials,
        title: fields.title.trim(),
        fields: {
          custom_tc_test_case_id: fields.custom_tc_test_case_id,
          custom_tc_name: fields.custom_tc_name,
          custom_tc_category: fields.custom_tc_category,
          custom_preconds: fields.custom_preconds,
          custom_tc_use_case: fields.custom_tc_use_case,
          custom_steps: fields.custom_steps,
          custom_expected: fields.custom_expected,
          custom_tc_test_data: fields.custom_tc_test_data,
          custom_tc_figma_spec: fields.custom_tc_figma_spec,
          ...Object.fromEntries(
            Object.entries(fields).filter(([k]) =>
              k.startsWith("custom_") && ![
                "custom_tc_test_case_id","custom_tc_name","custom_tc_category",
                "custom_tc_use_case","custom_preconds","custom_steps",
                "custom_expected","custom_tc_test_data","custom_tc_figma_spec",
              ].includes(k)
            )
          ),
        },
      });
      const res = await getCase(credentials, selectedCase.id);
      setSelectedCase(res.data);
      if (selectedSection) {
        const casesRes = await getCases(credentials, selectedProject.id, selectedSuite?.id, selectedSection.id);
        setCases(prev => ({ ...prev, [selectedSection.id]: casesRes.data.cases || [] }));
      }
      setEditMode(false);
    } catch (err) {
      setEditError(err.response?.data?.detail || "Failed to save. Please try again.");
    }
    setEditSaving(false);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.userSelect = "none";
    const onMouseMove = (e) => { if (!isResizing.current) return; setPanelWidth(Math.min(600, Math.max(150, e.clientX))); };
    const onMouseUp = () => { isResizing.current = false; document.body.style.userSelect = ""; document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleMiddleMouseDown = (e) => {
    e.preventDefault();
    isResizingMiddle.current = true;
    document.body.style.userSelect = "none";
    const startX = e.clientX, startWidth = middleWidth;
    const onMouseMove = (e) => { if (!isResizingMiddle.current) return; setMiddleWidth(Math.min(900, Math.max(200, startWidth + e.clientX - startX))); };
    const onMouseUp = () => { isResizingMiddle.current = false; document.body.style.userSelect = ""; document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const loadProjects = async () => {
    setLoading(true);
    try { const res = await getProjects(credentials); setProjects(res.data); }
    catch (err) { console.error("Failed to load projects", err); }
    setLoading(false);
  };

  const handleProjectChange = async (e) => {
    const projectId = parseInt(e.target.value);
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project); setSelectedSuite(null); setSections([]); setCases({});
    setExpandedSections({}); setSelectedCase(null);
    if (!project) return;
    setLoading(true);
    try {
      const res = await getSuites(credentials, projectId);
      setSuites(res.data);
      if (!res.data || res.data.length === 0) {
        const sectionsRes = await getSections(credentials, projectId, null);
        setSections(sectionsRes.data);
      }
    } catch (err) { console.error("Failed to load suites", err); }
    setLoading(false);
  };

  const handleSuiteClick = async (suite) => {
    setSelectedSuite(suite); setCases({}); setExpandedSections({}); setSelectedCase(null);
    setLoading(true);
    try { const res = await getSections(credentials, selectedProject.id, suite.id); setSections(res.data); }
    catch (err) { console.error("Failed to load sections", err); }
    setLoading(false);
  };

  const toggleSection = async (section) => {
    const isExpanded = expandedSections[section.id];
    if (isExpanded) { setExpandedSections(prev => ({ ...prev, [section.id]: false })); setSelectedSection(section); return; }
    setExpandedSections(prev => ({ ...prev, [section.id]: true }));
    setSelectedSection(section);
    if (!cases[section.id]) {
      setLoadingSections(prev => ({ ...prev, [section.id]: true }));
      try {
        const res = await getCases(credentials, selectedProject.id, selectedSuite?.id, section.id);
        setCases(prev => ({ ...prev, [section.id]: res.data.cases }));
      } catch (err) { console.error("Failed to load cases", err); }
      setLoadingSections(prev => ({ ...prev, [section.id]: false }));
    }
  };

  const reloadSection = async (section, selectCaseId = null) => {
    setExpandedSections(prev => ({ ...prev, [section.id]: true }));
    setSelectedSection(section);
    setLoadingSections(prev => ({ ...prev, [section.id]: true }));
    try {
      const res = await getCases(credentials, selectedProject.id, selectedSuite?.id, section.id);
      setCases(prev => ({ ...prev, [section.id]: res.data.cases || [] }));
    } catch (err) { console.error("Failed to reload cases", err); }
    setLoadingSections(prev => ({ ...prev, [section.id]: false }));
    if (selectCaseId) {
      setSelectedCaseId(selectCaseId);
      setCaseLoading(true);
      setSelectedCase(null);
      try { const caseRes = await getCase(credentials, selectCaseId); setSelectedCase(caseRes.data); }
      catch (err) { console.error("Failed to load new case", err); }
      setCaseLoading(false);
    }
  };

  const handleCaseClick = async (c, section) => {
    setSelectedCaseId(c.id); setSelectedSection(section);
    setCaseLoading(true); setSelectedCase(null);
    try { const res = await getCase(credentials, c.id); setSelectedCase(res.data); }
    catch (err) { console.error("Failed to load case", err); }
    setCaseLoading(false);
  };

  const rootSections = sections.filter(s => !s.parent_id);
  const childSections = (parentId) => sections.filter(s => s.parent_id === parentId);

  const renderSection = (section, depth = 0) => (
    <div key={section.id}>
      <div
        style={{ ...styles.sectionRow, paddingLeft: `${20 + depth * 20}px`, backgroundColor: selectedSection?.id === section.id ? "var(--highlight)" : "transparent" }}
        onClick={() => toggleSection(section)}
      >
        <span style={styles.sectionIcon}>{expandedSections[section.id] ? "▼" : "▶"}</span>
        <span style={styles.sectionName}>{section.name}</span>
      </div>
      {expandedSections[section.id] && (
        <div>
          {childSections(section.id).map(child => renderSection(child, depth + 1))}
          {loadingSections[section.id] && <p style={{ ...styles.loading, paddingLeft: `${40 + depth * 20}px` }}>Loading cases...</p>}
          {(cases[section.id] || []).map(c => (
            <div
              key={c.id}
              style={{ ...styles.caseRow, paddingLeft: `${40 + depth * 20}px`, cursor: "pointer", backgroundColor: selectedCaseId === c.id ? "var(--highlight)" : "transparent" }}
              onClick={e => { e.stopPropagation(); handleCaseClick(c, section); }}
            >
              <span style={{ display: "inline-block", width: "10px", height: "12px", border: "1px solid #64748b", borderRadius: "1px", flexShrink: 0 }} />
              <span style={styles.caseName}>{c.custom_tc_test_case_id ? `[${c.custom_tc_test_case_id}] ` : ""}{c.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>TestRail Buddy</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={styles.toolsBtn} onClick={() => setToolsOpen(true)}>Tools</button>
          <button style={styles.logoutBtn} onClick={() => { logout(); navigate("/"); }}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Left panel */}
        {leftCollapsed && <div style={styles.collapsedTab} onClick={() => setLeftCollapsed(false)}><span style={styles.collapsedLabel}>▶ Nav</span></div>}
        {!leftCollapsed && (
          <div style={{ ...styles.panelOuter, width: `${panelWidth}px` }}>
            <div style={styles.panelInner}>
              <div style={styles.panelHeader}>
                <span style={styles.label}>Project</span>
                <button style={styles.collapseBtn} onClick={() => setLeftCollapsed(true)}>◀</button>
              </div>
              <select style={styles.select} onChange={handleProjectChange} value={selectedProject?.id || ""}>
                <option value="" disabled>Select a project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {suites.length > 0 && (
                <>
                  <label style={{ ...styles.label, marginTop: "20px" }}>Suites</label>
                  {suites.map(s => (
                    <div key={s.id} style={{ ...styles.suiteItem, backgroundColor: selectedSuite?.id === s.id ? "var(--accent)" : "var(--bg-panel)" }} onClick={() => handleSuiteClick(s)}>{s.name}</div>
                  ))}
                </>
              )}
            </div>
            <div style={styles.resizeHandle} onMouseDown={handleMouseDown} />
          </div>
        )}

        {/* Middle panel */}
        {middleCollapsed && <div style={styles.collapsedTab} onClick={() => setMiddleCollapsed(false)}><span style={styles.collapsedLabel}>▶ Cases</span></div>}
        {!middleCollapsed && (
          <div style={{ ...styles.panelOuter, width: `${middleWidth}px` }}>
            <div style={styles.panelInner}>
              <div style={styles.panelHeader}>
                <span style={styles.label}>{selectedSuite ? selectedSuite.name : selectedProject?.name || "Cases"}</span>
                <button style={styles.collapseBtn} onClick={() => setMiddleCollapsed(true)}>◀</button>
              </div>
              {loading && <p style={styles.loading}>Loading...</p>}
              {!loading && sections.length === 0 && selectedProject && <p style={styles.hint}>{suites.length > 0 ? "Select a suite to see sections" : "No sections found"}</p>}
              {!loading && sections.length > 0 && <div style={styles.tree}>{rootSections.map(s => renderSection(s))}</div>}
              {!selectedProject && !loading && <p style={styles.hint}>Select a project to get started</p>}
            </div>
            <div style={styles.resizeHandle} onMouseDown={handleMiddleMouseDown} />
          </div>
        )}

        {/* Right panel */}
        {rightCollapsed && <div style={styles.collapsedTab} onClick={() => setRightCollapsed(false)}><span style={styles.collapsedLabel}>▶ Detail</span></div>}
        {!rightCollapsed && (
          <div style={styles.rightPanel}>
            <div style={styles.panelHeader}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
                <span style={styles.label}>{editMode ? "Edit Case" : "Case Detail"}</span>
                {selectedCase && (
                  <span style={styles.caseHeaderTitle}>{selectedCase.title}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                {selectedCase && !editMode && (
                  <button style={styles.editBtn} onClick={() => { setEditMode(true); setEditError(""); }}>Edit</button>
                )}
                {editMode && (
                  <button style={styles.cancelBtn} onClick={() => { setEditMode(false); setEditError(""); }} disabled={editSaving}>
                    Cancel
                  </button>
                )}
                <button style={styles.collapseBtn} onClick={() => setRightCollapsed(true)}>◀</button>
              </div>
            </div>

            {caseLoading && <p style={styles.loading}>Loading case...</p>}
            {!caseLoading && !selectedCase && <p style={styles.hint}>Select a test case to view details</p>}

            {/* View mode */}
            {!caseLoading && selectedCase && !editMode && (
              <div style={styles.caseDetail}>
                <div style={styles.caseField}><span style={styles.fieldLabel}>Test Case ID</span><span style={styles.fieldValue}>{selectedCase.custom_tc_test_case_id || "-"}</span></div>
                <div style={styles.caseField}><span style={styles.fieldLabel}>Test Name</span><span style={styles.fieldValue}>{selectedCase.custom_tc_name || "-"}</span></div>
                <div style={styles.caseField}><span style={styles.fieldLabel}>Category</span><span style={styles.fieldValue}>{selectedCase.custom_tc_category || "-"}</span></div>
                {selectedCase.custom_preconds && <div style={styles.caseBlock}><span style={styles.fieldLabel}>Preconditions</span><p style={styles.blockText}>{stripHtml(selectedCase.custom_preconds)}</p></div>}
                {selectedCase.custom_tc_use_case && <div style={styles.caseBlock}><span style={styles.fieldLabel}>Use Case</span><p style={styles.blockText}>{stripHtml(selectedCase.custom_tc_use_case)}</p></div>}
                {selectedCase.custom_steps && <div style={styles.caseBlock}><span style={styles.fieldLabel}>Test Steps</span><p style={styles.blockText}>{stripHtml(selectedCase.custom_steps)}</p></div>}
                {selectedCase.custom_expected && <div style={styles.caseBlock}><span style={styles.fieldLabel}>Expected Result</span><p style={styles.blockText}>{stripHtml(selectedCase.custom_expected)}</p></div>}
                {selectedCase.custom_tc_test_data && <div style={styles.caseBlock}><span style={styles.fieldLabel}>Test Data</span><p style={styles.blockText}>{stripHtml(selectedCase.custom_tc_test_data)}</p></div>}
                {selectedCase.custom_tc_figma_spec && <div style={styles.caseField}><span style={styles.fieldLabel}>Figma Spec</span><span style={styles.fieldValue}>{selectedCase.custom_tc_figma_spec}</span></div>}
              </div>
            )}

            {/* Edit mode — reuses the same CaseForm as CreateCase */}
            {!caseLoading && selectedCase && editMode && (
              <CaseForm
                credentials={credentials}
                selectedProject={selectedProject}
                selectedSuite={selectedSuite}
                selectedSection={selectedSection}
                initialValues={selectedCase}
                onSubmit={handleEditSave}
                onCancel={() => { setEditMode(false); setEditError(""); }}
                onDelete={handleDeleteCase}
                submitLabel="Save Changes"
                showCreateAnother={false}
                error={editError}
                saving={editSaving}
              />
            )}
          </div>
        )}
      </div>

      {toolsOpen && (
        <ToolsPanel
          onClose={() => setToolsOpen(false)}
          credentials={credentials}
          selectedProject={selectedProject}
          selectedSuite={selectedSuite}
          selectedSection={selectedSection}
          sections={sections}
          onCaseCreated={(sectionId, createAnother, newCaseId) => {
            const section = sections.find(s => s.id === sectionId);
            if (section) reloadSection(section, createAnother ? null : newCaseId);
            if (!createAnother) setToolsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const styles = {
  container: { height: "100vh", backgroundColor: "var(--bg)", fontFamily: "sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" },
  title: { color: "var(--text)", fontSize: "1.5rem", margin: 0 },
  logoutBtn: { padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "var(--bg-panel)", color: "var(--text)", cursor: "pointer", fontSize: "0.9rem" },
  toolsBtn: { padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: "0.9rem" },
  content: { display: "flex", flex: 1, overflow: "hidden", width: "100%" },
  panelOuter: { position: "relative", display: "flex", flexShrink: 0, borderRight: "1px solid var(--border)", minWidth: 0, backgroundColor: "var(--bg)" },
  panelInner: { flex: 1, overflowY: "auto", padding: "0 20px 20px 20px", display: "flex", flexDirection: "column" },
  rightPanel: { flex: 1, padding: "0 20px 20px 20px", overflowY: "auto", overflowX: "hidden", backgroundColor: "var(--bg)", position: "relative", minWidth: 0, maxWidth: "100%", borderLeft: "1px solid var(--border)" },
  resizeHandle: { position: "absolute", right: 0, top: 0, bottom: 0, width: "4px", cursor: "col-resize", backgroundColor: "var(--border)", zIndex: 10 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", position: "sticky", top: 0, backgroundColor: "var(--bg)", zIndex: 10, padding: "20px 0 12px 0", borderBottom: "1px solid var(--border)" },  collapseBtn: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", padding: "2px 6px" },
  editBtn: { padding: "4px 12px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "#fff", fontSize: "0.8rem", cursor: "pointer" },
  cancelBtn: { padding: "4px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer" },
  collapsedTab: { width: "28px", backgroundColor: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  collapsedLabel: { color: "var(--text-muted)", fontSize: "0.7rem", writingMode: "vertical-rl", textOrientation: "mixed", letterSpacing: "0.05em" },
  label: { color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  select: { padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.95rem", cursor: "pointer" },
  suiteItem: { padding: "10px 12px", borderRadius: "6px", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer", marginBottom: "4px", display: "block", width: "100%", boxSizing: "border-box" },
  tree: { backgroundColor: "var(--bg)" },
  sectionRow: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", cursor: "pointer", borderRadius: "6px", color: "var(--text)", fontSize: "0.95rem" },
  sectionIcon: { fontSize: "1rem" },
  sectionName: { fontWeight: "500" },
  caseRow: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", color: "var(--text-muted)", fontSize: "0.88rem" },
  caseName: {},
  loading: { color: "var(--text-muted)" },
  hint: { color: "var(--text-dim)", fontSize: "0.95rem", marginTop: "40px", textAlign: "center" },
  caseDetail: { display: "flex", flexDirection: "column", gap: "16px" },
  caseTitle: { color: "var(--text)", fontSize: "1.1rem", marginBottom: "8px" },
  caseField: { display: "flex", flexDirection: "column", gap: "4px", padding: "10px", backgroundColor: "var(--bg-panel)", borderRadius: "6px" },
  caseBlock: { display: "flex", flexDirection: "column", gap: "8px", padding: "10px", backgroundColor: "var(--bg-panel)", borderRadius: "6px" },
  fieldLabel: { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  fieldValue: { color: "var(--text)", fontSize: "0.95rem" },
  blockText: { color: "var(--text)", fontSize: "0.9rem", lineHeight: "1.6", whiteSpace: "pre-wrap" },
  caseHeaderTitle: { color: "var(--text)", fontSize: "0.95rem", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" },
};