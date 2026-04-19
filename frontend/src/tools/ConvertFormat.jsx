import { useState, useEffect } from "react";
import axios from "axios";
import { DEMO_CASES, DEMO_SECTIONS } from "../demoData";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function flattenSections(sections, parentId = null, depth = 0) {
  return sections
    .filter(s => (s.parent_id ?? null) === parentId)
    .flatMap(s => [{ ...s, depth }, ...flattenSections(sections, s.id, depth + 1)]);
}

function DemoBanner({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", backgroundColor: "#3b82f611", border: "1px solid #3b82f630" }}>
      <span style={{ fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.1em", color: "#3b82f6", backgroundColor: "#3b82f615", border: "1px solid #3b82f640", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}>DEMO</span>
      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{children}</span>
    </div>
  );
}

export default function ConvertFormat({ credentials, selectedProject, selectedSuite, selectedSection, sections = [] }) {
  const isDemo = !!credentials?.demo;

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
      const suiteKeys = Object.keys(DEMO_SECTIONS).filter(k => k.startsWith(`${selectedProject.id}_`));
      setAllSections(suiteKeys.flatMap(k => DEMO_SECTIONS[k]));
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

  useEffect(() => { setPreviewCases([]); setResults(null); setError(""); }, [overrideSection, selectedSection]);

  const flatSections  = flattenSections(allSections);
  const activeSection = overrideSection ?? selectedSection;
  const missingSelection = !selectedProject || !activeSection;

  const needsConvert = c => !!(c.custom_steps && !c.custom_steps_separated?.length);

  const fetchPreview = async () => {
    if (missingSelection) return;
    setPreviewLoading(true); setError(""); setResults(null);
    if (isDemo) {
      await new Promise(r => setTimeout(r, 200));
      const cases = DEMO_CASES[activeSection.id] || [];
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

  const handleConvert = async () => {
    if (!previewCases.length) return;
    setLoading(true); setError("");
    if (isDemo) {
      await new Promise(r => setTimeout(r, 400));
      const toConvert = previewCases.filter(needsConvert);
      setResults({
        updated: toConvert.length,
        skipped: previewCases.length - toConvert.length,
        errors: 0,
        results: previewCases.map(c => ({
          case_id: c.id, title: c.title,
          ok: needsConvert(c), skipped: !needsConvert(c),
        })),
      });
      setPreviewCases([]);
      setLoading(false);
      return;
    }
    let updated = 0, skipped = 0, errors = 0;
    const resultList = [];
    for (const c of previewCases) {
      if (!needsConvert(c)) { skipped++; resultList.push({ case_id: c.id, title: c.title, skipped: true }); continue; }
      try {
        await axios.post(`${BASE_URL}/api/cases/${c.id}/update`, {
          ...credentials,
          fields: { custom_steps_separated: [{ content: c.custom_steps, expected: c.custom_expected || "" }] },
        });
        updated++; resultList.push({ case_id: c.id, title: c.title, ok: true });
      } catch { errors++; resultList.push({ case_id: c.id, title: c.title, ok: false, error: "Update failed" }); }
    }
    setResults({ updated, skipped, errors, results: resultList });
    setPreviewCases([]);
    setLoading(false);
  };

  const toConvert = previewCases.filter(needsConvert);
  const toSkip    = previewCases.filter(c => !needsConvert(c));

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Convert Format</h3>
      <p style={styles.description}>Converts cases from card format (AI Generated) to our standard separated steps format.</p>

      {isDemo && <DemoBanner>Conversions are simulated — nothing is saved in demo mode.</DemoBanner>}
      {!selectedProject && <div style={styles.warningBox}>Please select a project from the left panel first.</div>}

      <div style={styles.infoBox}>
        <p style={styles.infoText}><strong>Old format:</strong> Steps and expected results in a single text field.</p>
        <p style={styles.infoText}><strong>New format:</strong> Steps separated into individual step objects with expected results.</p>
      </div>

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
        {activeSection && <span style={styles.hint}>{selectedProject?.name}{selectedSuite ? ` › ${selectedSuite.name}` : ""}{` › ${activeSection.name}`}</span>}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {previewCases.length === 0 && !results && (
        <button style={{ ...styles.btn, opacity: missingSelection ? 0.4 : 1 }} onClick={fetchPreview} disabled={previewLoading || missingSelection}>
          {previewLoading ? "Loading preview…" : "Preview Changes"}
        </button>
      )}

      {previewCases.length > 0 && (
        <div style={styles.previewBox}>
          <p style={styles.previewHeader}>
            Preview — <span style={{ color: "#22c55e" }}>{toConvert.length} to convert</span>
            {toSkip.length > 0 && <span style={{ color: "var(--text-dim)", marginLeft: "8px" }}>{toSkip.length} already new format</span>}
          </p>
          <div style={styles.previewList}>
            {previewCases.map(c => {
              const skip  = !needsConvert(c);
              const title = c.title?.length > 45 ? c.title.slice(0, 42) + "…" : (c.title || "Untitled");
              return (
                <div key={c.id} style={{ ...styles.previewRow, opacity: skip ? 0.4 : 1 }}>
                  <span style={styles.previewId}>#{c.id}</span>
                  <span style={styles.arrow}>{skip ? "·" : "→"}</span>
                  <span style={skip ? styles.previewSkip : styles.previewNew}>{skip ? "already new" : "convert"}</span>
                  <span style={styles.previewTitle}>{title}</span>
                </div>
              );
            })}
          </div>
          <div style={styles.previewActions}>
            <button style={styles.btnSecondary} onClick={() => setPreviewCases([])} disabled={loading}>Cancel</button>
            <button style={{ ...styles.btn, opacity: toConvert.length === 0 ? 0.4 : 1 }} onClick={handleConvert} disabled={loading || toConvert.length === 0}>
              {loading ? "Converting…" : `Convert ${toConvert.length} Cases`}
            </button>
          </div>
        </div>
      )}

      {results && (
        <div style={styles.results}>
          <p style={styles.resultSummary}>
            ✓ Converted: {results.updated}
            {results.skipped > 0 && <span style={{ color: "var(--text-dim)" }}> | — Skipped: {results.skipped}</span>}
            {results.errors  > 0 && <span style={{ color: "#f87171" }}> | ✕ Errors: {results.errors}</span>}
          </p>
          <div style={styles.resultList}>
            {results.results.map((r, i) => (
              <div key={i} style={styles.resultRow}>
                <span style={{ color: r.skipped ? "#64748b" : r.ok ? "#22c55e" : "#f87171" }}>{r.skipped ? "—" : r.ok ? "✓" : "✕"}</span>
                <span style={styles.resultText}>{r.skipped ? `Case ${r.case_id} already new format` : `Case ${r.case_id} converted`}{r.error && <span style={{ color: "#f87171" }}> ({r.error})</span>}</span>
              </div>
            ))}
          </div>
          <button style={{ ...styles.btnSecondary, marginTop: 8 }} onClick={() => { setResults(null); fetchPreview(); }}>Refresh</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container:      { display: "flex", flexDirection: "column", gap: "14px" },
  heading:        { color: "var(--text)", fontSize: "1rem", margin: 0 },
  description:    { color: "var(--text-muted)", fontSize: "0.88rem" },
  field:          { display: "flex", flexDirection: "column", gap: "4px" },
  label:          { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  select:         { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer" },
  hint:           { color: "var(--text-dim)", fontSize: "0.78rem" },
  btn:            { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  btnSecondary:   { padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  error:          { color: "#f87171", fontSize: "0.85rem" },
  warningBox:     { backgroundColor: "var(--bg-panel)", border: "1px solid #f97316", borderRadius: "6px", padding: "10px 14px", color: "#f97316", fontSize: "0.85rem" },
  infoBox:        { backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "6px" },
  infoText:       { color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 },
  previewBox:     { backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" },
  previewHeader:  { color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  previewList:    { display: "flex", flexDirection: "column", gap: "3px", maxHeight: "220px", overflowY: "auto" },
  previewRow:     { display: "grid", gridTemplateColumns: "60px 20px 100px 1fr", alignItems: "center", gap: "8px", padding: "3px 4px", borderRadius: "4px", minWidth: 0 },
  previewId:      { color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  arrow:          { color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "center" },
  previewNew:     { color: "#22c55e", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewSkip:    { color: "var(--text-dim)", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewTitle:   { color: "var(--text-dim)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "4px", borderLeft: "1px solid var(--border)" },
  previewActions: { display: "flex", gap: "8px", marginTop: "4px" },
  results:        { backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" },
  resultSummary:  { color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  resultList:     { display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" },
  resultRow:      { display: "flex", alignItems: "center", gap: "8px" },
  resultText:     { color: "var(--text-muted)", fontSize: "0.82rem" },
};