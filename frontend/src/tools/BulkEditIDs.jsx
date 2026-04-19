import { useState, useEffect } from "react";
import axios from "axios";
import { DEMO_CASES, DEMO_SECTIONS } from "../demoData";

const BASE_URL = "http://localhost:8000";

function flattenSections(sections, parentId = null, depth = 0) {
  return sections
    .filter(s => (s.parent_id ?? null) === parentId)
    .flatMap(s => [{ ...s, depth }, ...flattenSections(sections, s.id, depth + 1)]);
}

// ── Demo helpers ──────────────────────────────────────────────────────────────
function getDemoSections(credentials, projectId) {
  const suiteKeys = Object.keys(DEMO_SECTIONS).filter(k => k.startsWith(`${projectId}_`));
  return suiteKeys.flatMap(k => DEMO_SECTIONS[k]);
}
function getDemoCases(sectionId) {
  return DEMO_CASES[sectionId] || [];
}

export default function BulkEditIDs({ credentials, selectedProject, selectedSuite, selectedSection, sections = [] }) {
  const isDemo = !!credentials?.demo;

  const [baseId, setBaseId]                   = useState("");
  const [loading, setLoading]                 = useState(false);
  const [previewLoading, setPreviewLoading]   = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError]                     = useState("");
  const [results, setResults]                 = useState(null);
  const [previewCases, setPreviewCases]       = useState([]);
  const [overrideSection, setOverrideSection] = useState(null);
  const [allSections, setAllSections]         = useState(sections);

  useEffect(() => { setAllSections(sections); }, [sections]);

  useEffect(() => {
    if (!selectedProject || allSections.length > 0) return;
    if (isDemo) {
      setAllSections(getDemoSections(credentials, selectedProject.id));
      return;
    }
    setSectionsLoading(true);
    axios.post(`${BASE_URL}/api/projects/${selectedProject.id}/sections`, credentials, {
      params: { suite_id: selectedSuite?.id || undefined }
    })
      .then(res => setAllSections(Array.isArray(res.data) ? res.data : (res.data.sections ?? [])))
      .catch(() => {})
      .finally(() => setSectionsLoading(false));
  }, [selectedProject, selectedSuite]);

  const flatSections  = flattenSections(allSections);
  const activeSection = overrideSection ?? selectedSection;

  const cleanBase = baseId.trim().replace(/[\s-]+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

  useEffect(() => { setPreviewCases([]); setResults(null); setError(""); }, [activeSection, baseId]);

  const fetchPreview = async () => {
    if (!cleanBase)                            { setError("Base ID is required."); return; }
    if (!selectedProject || !activeSection)    { setError("Select a project and section first."); return; }
    setPreviewLoading(true); setError(""); setResults(null);
    if (isDemo) {
      await new Promise(r => setTimeout(r, 200));
      const cases = getDemoCases(activeSection.id);
      if (!cases.length) { setError("No cases found in this section."); setPreviewLoading(false); return; }
      setPreviewCases(cases);
      setPreviewLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${BASE_URL}/api/cases/`, {
        ...credentials, project_id: selectedProject.id,
        suite_id: selectedSuite?.id || null, section_id: activeSection.id,
      });
      const cases = res.data.cases ?? [];
      if (!cases.length) { setError("No cases found in this section."); setPreviewLoading(false); return; }
      setPreviewCases(cases);
    } catch { setError("Failed to fetch cases for preview."); }
    setPreviewLoading(false);
  };

  const handleBulkEdit = async () => {
    if (!previewCases.length) return;
    setLoading(true); setError("");
    if (isDemo) {
      await new Promise(r => setTimeout(r, 400));
      setResults({
        updated: previewCases.length, errors: 0,
        results: previewCases.map((c, i) => ({
          case_id: c.id, ok: true,
          new_id: `${cleanBase}_${String(i + 1).padStart(4, "0")}`,
        })),
      });
      setPreviewCases([]);
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${BASE_URL}/api/cases/bulk-ids`, {
        ...credentials, case_ids: previewCases.map(c => c.id), base_id: cleanBase,
      });
      setResults(res.data); setPreviewCases([]);
    } catch { setError("Bulk edit failed. Please try again."); }
    setLoading(false);
  };

  const missingSelection = !selectedProject || !activeSection;

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Bulk Edit Case IDs</h3>
      <p style={styles.description}>Assigns sequential IDs to all cases in the selected section.</p>

      {isDemo && <DemoBanner>ID changes are simulated — nothing is saved in demo mode.</DemoBanner>}
      {!selectedProject && <div style={styles.warningBox}>Please select a project from the left panel first.</div>}

      <div style={styles.field}>
        <label style={styles.label}>Section</label>
        <select style={styles.select}
          value={overrideSection?.id ?? selectedSection?.id ?? ""}
          onChange={e => {
            const found = flatSections.find(s => s.id === parseInt(e.target.value, 10)) || null;
            setOverrideSection(found?.id === selectedSection?.id ? null : found);
          }}
          disabled={!selectedProject || sectionsLoading}
        >
          {!activeSection && <option value="">— Select a section —</option>}
          {sectionsLoading && <option disabled>Loading sections…</option>}
          {flatSections.map(s => (
            <option key={s.id} value={s.id}>{"  ".repeat(s.depth)}{s.depth > 0 ? "↳ " : ""}{s.name}</option>
          ))}
        </select>
        {activeSection && (
          <span style={styles.hint}>{selectedProject?.name}{selectedSuite ? ` › ${selectedSuite.name}` : ""}{` › ${activeSection.name}`}</span>
        )}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Base ID</label>
        <input style={styles.input} type="text" placeholder="e.g. LOGIN or MESSAGES" value={baseId} onChange={e => setBaseId(e.target.value)} />
        {cleanBase && (
          <span style={styles.hint}>Preview format: <strong style={{ color: "var(--text)" }}>{cleanBase}_0001</strong>, <strong style={{ color: "var(--text)" }}>{cleanBase}_0002</strong>, …</span>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {previewCases.length === 0 && !results && (
        <button style={{ ...styles.btn, opacity: missingSelection || !cleanBase ? 0.4 : 1 }} onClick={fetchPreview} disabled={previewLoading || missingSelection || !cleanBase}>
          {previewLoading ? "Loading preview…" : "Preview Changes"}
        </button>
      )}

      {previewCases.length > 0 && (
        <div style={styles.previewBox}>
          <p style={styles.previewHeader}>Preview — <span style={{ color: "var(--text-muted)" }}>{previewCases.length} cases</span></p>
          <div style={styles.previewList}>
            {previewCases.map((c, i) => {
              const newId = `${cleanBase}_${String(i + 1).padStart(4, "0")}`;
              const title = c.title?.length > 40 ? c.title.slice(0, 37) + "…" : (c.title || "Untitled");
              return (
                <div key={c.id} style={styles.previewRow}>
                  <span style={styles.previewOld}>{c.custom_tc_test_case_id || "(empty)"}</span>
                  <span style={styles.arrow}>→</span>
                  <span style={styles.previewNew}>{newId}</span>
                  <span style={styles.previewTitle}>{title}</span>
                </div>
              );
            })}
          </div>
          <div style={styles.previewActions}>
            <button style={styles.btnSecondary} onClick={() => setPreviewCases([])} disabled={loading}>Cancel</button>
            <button style={styles.btn} onClick={handleBulkEdit} disabled={loading}>
              {loading ? "Applying…" : `Apply to ${previewCases.length} Cases`}
            </button>
          </div>
        </div>
      )}

      {results && (
        <div style={styles.results}>
          <p style={styles.resultSummary}>✓ Updated: {results.updated}{results.errors > 0 && <span style={{ color: "#f87171" }}> | ✕ Errors: {results.errors}</span>}</p>
          <div style={styles.resultList}>
            {results.results.map(r => (
              <div key={r.case_id} style={styles.resultRow}>
                <span style={{ color: r.ok ? "#22c55e" : "#f87171" }}>{r.ok ? "✓" : "✕"}</span>
                <span style={styles.resultText}>Case {r.case_id} → {r.new_id}{r.error && <span style={{ color: "#f87171" }}> ({r.error})</span>}</span>
              </div>
            ))}
          </div>
          <button style={{ ...styles.btnSecondary, marginTop: 8 }} onClick={() => setResults(null)}>Reset</button>
        </div>
      )}
    </div>
  );
}

function DemoBanner({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", backgroundColor: "#3b82f611", border: "1px solid #3b82f630", marginBottom: "4px" }}>
      <span style={{ fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.1em", color: "#3b82f6", backgroundColor: "#3b82f615", border: "1px solid #3b82f640", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}>DEMO</span>
      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{children}</span>
    </div>
  );
}

const styles = {
  container:      { display: "flex", flexDirection: "column", gap: "14px" },
  heading:        { color: "var(--text)", fontSize: "1rem", margin: 0 },
  description:    { color: "var(--text-muted)", fontSize: "0.88rem" },
  field:          { display: "flex", flexDirection: "column", gap: "4px" },
  label:          { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  input:          { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", outline: "none" },
  select:         { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer" },
  hint:           { color: "var(--text-dim)", fontSize: "0.78rem" },
  btn:            { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  btnSecondary:   { padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  error:          { color: "#f87171", fontSize: "0.85rem" },
  warningBox:     { backgroundColor: "var(--bg-panel)", border: "1px solid #f97316", borderRadius: "6px", padding: "10px 14px", color: "#f97316", fontSize: "0.85rem" },
  previewBox:     { backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" },
  previewHeader:  { color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  previewList:    { display: "flex", flexDirection: "column", gap: "3px", maxHeight: "220px", overflowY: "auto" },
  previewRow:     { display: "grid", gridTemplateColumns: "160px 20px 200px 1fr", alignItems: "center", gap: "8px", padding: "3px 4px", borderRadius: "4px", minWidth: 0 },
  previewOld:     { color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  arrow:          { color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "center" },
  previewNew:     { color: "#22c55e", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewTitle:   { color: "var(--text-dim)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "4px", borderLeft: "1px solid var(--border)" },
  previewActions: { display: "flex", gap: "8px", marginTop: "4px" },
  results:        { backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" },
  resultSummary:  { color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  resultList:     { display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" },
  resultRow:      { display: "flex", alignItems: "center", gap: "8px" },
  resultText:     { color: "var(--text-muted)", fontSize: "0.82rem" },
};