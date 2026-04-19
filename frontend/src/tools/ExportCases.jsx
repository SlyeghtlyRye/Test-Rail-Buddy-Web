import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { DEMO_CASES, DEMO_SECTIONS } from "../demoData";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function DemoBanner({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", backgroundColor: "#3b82f611", border: "1px solid #3b82f630", marginBottom: "4px" }}>
      <span style={{ fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.1em", color: "#3b82f6", backgroundColor: "#3b82f615", border: "1px solid #3b82f640", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}>DEMO</span>
      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{children}</span>
    </div>
  );
}

function stripHtmlTags(text) {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
function countWords(text) {
  const clean = stripHtmlTags(text || "");
  return clean.trim() ? clean.trim().split(/\s+/).length : 0;
}

function SectionNode({ section, depth = 0, selectedIds, onToggle, childrenMap }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const children   = childrenMap[section.id] || [];
  const isSelected = selectedIds.has(section.id);
  return (
    <div>
      <div onClick={() => onToggle(section)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", paddingLeft: `${12 + depth * 18}px`, cursor: "pointer", borderRadius: "5px", userSelect: "none", backgroundColor: isSelected ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent", fontSize: "0.84rem", transition: "background 0.15s" }}>
        {children.length > 0 ? (
          <span onClick={e => { e.stopPropagation(); setExpanded(v => !v); }} style={{ fontSize: "0.65rem", opacity: 0.5, width: "12px", flexShrink: 0 }}>{expanded ? "v" : ">"}</span>
        ) : <span style={{ width: "12px", flexShrink: 0 }} />}
        <div style={{ width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0, border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, backgroundColor: isSelected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#fff", transition: "all 0.15s" }}>
          {isSelected ? "✓" : ""}
        </div>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{section.name}</span>
      </div>
      {expanded && children.map(c => <SectionNode key={c.id} section={c} depth={depth + 1} selectedIds={selectedIds} onToggle={onToggle} childrenMap={childrenMap} />)}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
      <div onClick={() => onChange(!checked)} style={{ width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0, marginTop: "2px", border: "1px solid", cursor: "pointer", position: "relative", transition: "background 0.2s", backgroundColor: checked ? "var(--accent)" : "var(--bg-inset)", borderColor: checked ? "var(--accent)" : "var(--border)" }}>
        <div style={{ position: "absolute", top: "2px", left: "2px", width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#fff", transition: "transform 0.2s", transform: checked ? "translateX(16px)" : "translateX(0)" }} />
      </div>
      <div>
        <div style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{hint}</div>}
      </div>
    </label>
  );
}

function FormatPill({ value, selected, onSelect, label }) {
  return (
    <button onClick={() => onSelect(value)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px", borderRadius: "8px", border: "1px solid", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", flex: 1, backgroundColor: selected ? "var(--accent)" : "var(--bg-panel)", color: selected ? "#fff" : "var(--text-muted)", borderColor: selected ? "var(--accent)" : "var(--border)", fontSize: "0.82rem", fontWeight: 600 }}>
      {label}
    </button>
  );
}

function SectionPicker({ sections, rootSections, childrenMap, selectedIds, onToggle, onSelectAll, onClearAll, loading, error }) {
  const count = selectedIds.size;
  return (
    <div style={s.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={s.cardTitle}>Filter by Section</div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button style={s.microBtn} onClick={onSelectAll}>All</button>
          <button style={s.microBtn} onClick={onClearAll}>None</button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>{count === 0 ? "Exporting all sections." : `${count} section${count !== 1 ? "s" : ""} selected.`}</p>
      {loading && <div style={s.dimText}>Loading sections...</div>}
      {error   && <div style={s.errorText}>{error}</div>}
      {!loading && sections.length > 0 && (
        <div style={s.sectionTree}>{rootSections.map(sec => <SectionNode key={sec.id} section={sec} depth={0} selectedIds={selectedIds} onToggle={onToggle} childrenMap={childrenMap} />)}</div>
      )}
      {!loading && sections.length === 0 && !error && <div style={s.dimText}>No sections found.</div>}
    </div>
  );
}

const ALL_COLUMNS = [
  { key: "custom_tc_test_case_id", label: "Test Case ID" },
  { key: "custom_tc_name",         label: "Test Name" },
  { key: "title",                  label: "Title" },
  { key: "custom_tc_category",     label: "Category" },
  { key: "custom_tc_use_case",     label: "Use Case" },
  { key: "custom_steps",           label: "Test Steps" },
  { key: "custom_expected",        label: "Expected Result" },
];

function ExportTab({ credentials, selectedProject, selectedSuite, sections, rootSections, childrenMap, loadingSections, sectionError }) {
  const isDemo = !!credentials?.demo;
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [stripHtml, setStripHtml]       = useState(true);
  const [includeLinks, setIncludeLinks] = useState(true);
  const [format, setFormat]             = useState("CSV");
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS.map(c => c.key));
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");

  function toggleSection(sec) { setSelectedIds(prev => { const next = new Set(prev); next.has(sec.id) ? next.delete(sec.id) : next.add(sec.id); return next; }); }
  function selectAll() { setSelectedIds(new Set(sections.map(s => s.id))); }
  function clearAll()  { setSelectedIds(new Set()); }
  function toggleCol(key) { setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]); }

  async function handleExport() {
    if (isDemo) {
      // Build a CSV from demo data
      setLoading(true); setError(""); setSuccess("");
      await new Promise(r => setTimeout(r, 300));
      const targets = selectedIds.size === 0
        ? Object.keys(DEMO_CASES).map(Number)
        : [...selectedIds];
      const allCases = targets.flatMap(id => DEMO_CASES[id] || []);
      const headers = selectedCols.map(k => ALL_COLUMNS.find(c => c.key === k)?.label || k);
      const rows = allCases.map(c => selectedCols.map(k => `"${String(c[k] || "").replace(/"/g, '""')}"`).join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob) });
      a.setAttribute("download", "demo_export.csv");
      document.body.appendChild(a); a.click(); a.remove();
      setSuccess("Downloaded demo_export.csv");
      setLoading(false);
      return;
    }
    setLoading(true); setError(""); setSuccess("");
    const targets = selectedIds.size === 0 ? [null] : [...selectedIds];
    try {
      const allRows = []; let headerLine = null;
      for (const secId of targets) {
        const res = await axios.post(`${BASE_URL}/api/tools/export-csv`, { ...credentials, project_id: selectedProject.id, suite_id: selectedSuite?.id || null, section_id: secId, strip_html: stripHtml, include_links: includeLinks }, { responseType: "blob" });
        const text  = await res.data.text();
        const lines = text.split("\n").filter(l => l.trim());
        if (!lines.length) continue;
        if (!headerLine) { headerLine = lines[0]; allRows.push(...lines); }
        else { allRows.push(...lines.slice(1)); }
      }
      if (!headerLine) { setError("No data returned."); setLoading(false); return; }
      const blob = new Blob([allRows.join("\n")], { type: "text/csv" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob) });
      a.setAttribute("download", "testrail_export.csv");
      document.body.appendChild(a); a.click(); a.remove();
      setSuccess("Downloaded testrail_export.csv");
    } catch (err) { setError(err?.response?.data?.detail || "Export failed."); }
    setLoading(false);
  }

  const canExport = !!selectedProject && selectedCols.length > 0;

  return (
    <div style={s.twoCol}>
      <div style={s.col}>
        {isDemo && <DemoBanner>Export uses demo data — a real CSV will still download.</DemoBanner>}
        <SectionPicker sections={sections} rootSections={rootSections} childrenMap={childrenMap} selectedIds={selectedIds} onToggle={toggleSection} onSelectAll={selectAll} onClearAll={clearAll} loading={loadingSections} error={sectionError} />
      </div>
      <div style={s.col}>
        <div style={s.card}>
          <div style={s.cardTitle}>Columns</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {ALL_COLUMNS.map(col => {
              const on = selectedCols.includes(col.key);
              return (
                <label key={col.key} style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.74rem", cursor: "pointer", userSelect: "none", transition: "all 0.15s", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, backgroundColor: on ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent", color: on ? "var(--accent)" : "var(--text-muted)", fontWeight: on ? 600 : 400 }}>
                  <input type="checkbox" checked={on} onChange={() => toggleCol(col.key)} style={{ display: "none" }} />{col.label}
                </label>
              );
            })}
          </div>
        </div>
        <div style={s.card}>
          {error   && <div style={s.errorBanner}>{error}</div>}
          {success && <div style={s.successBanner}>{success}</div>}
          <button style={{ ...s.actionBtn, opacity: canExport ? 1 : 0.4 }} onClick={handleExport} disabled={loading || !canExport}>
            {loading ? <><span style={s.spinner} /> Exporting...</> : `Download CSV`}
          </button>
        </div>
      </div>
    </div>
  );
}

const BLANK_FIELDS = [
  { key: "custom_tc_use_case", label: "Use Case" },
  { key: "custom_steps",       label: "Test Steps" },
  { key: "custom_expected",    label: "Expected Result" },
];

function FindBlankTab({ credentials, selectedProject, selectedSuite, sections, rootSections, childrenMap, loadingSections, sectionError, onOpenCase }) {
  const isDemo = !!credentials?.demo;
  const [selectedIds, setSelectedIds]               = useState(new Set());
  const [checkedFields, setCheckedFields]           = useState(["custom_steps", "custom_expected"]);
  const [wordCountEnabled, setWordCountEnabled]     = useState(false);
  const [wordCountThreshold, setWordCountThreshold] = useState(10);
  const [cases, setCases]                           = useState([]);
  const [loadingCases, setLoadingCases]             = useState(false);
  const [casesError, setCasesError]                 = useState("");
  const [searched, setSearched]                     = useState(false);
  const [progress, setProgress]                     = useState("");

  function toggleSection(sec) { setSelectedIds(prev => { const next = new Set(prev); next.has(sec.id) ? next.delete(sec.id) : next.add(sec.id); return next; }); }
  function selectAll() { setSelectedIds(new Set(sections.map(s => s.id))); }
  function clearAll()  { setSelectedIds(new Set()); }
  function toggleField(key) { setCheckedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]); }

  const blankCases = useMemo(() => {
    if (!cases.length || !checkedFields.length) return [];
    return cases.filter(c => checkedFields.some(field => {
      const val = (c[field] || "").trim();
      if (!val) return true;
      if (wordCountEnabled && countWords(val) < wordCountThreshold) return true;
      return false;
    }));
  }, [cases, checkedFields, wordCountEnabled, wordCountThreshold]);

  async function handleSearch() {
    if (!selectedProject) return;
    setLoadingCases(true); setCasesError(""); setSearched(false); setProgress("");
    if (isDemo) {
      await new Promise(r => setTimeout(r, 300));
      const targets = selectedIds.size === 0 ? Object.keys(DEMO_CASES).map(Number) : [...selectedIds];
      const allCases = [], seen = new Set();
      targets.forEach(id => {
        (DEMO_CASES[id] || []).forEach(c => { if (!seen.has(c.id)) { seen.add(c.id); allCases.push(c); } });
      });
      setCases(allCases); setSearched(true); setLoadingCases(false); setProgress("");
      return;
    }
    const targets = selectedIds.size === 0 ? [null] : [...selectedIds];
    const allCases = [], seen = new Set();
    try {
      for (let i = 0; i < targets.length; i++) {
        const secId = targets[i];
        setProgress(`Fetching (${i + 1}/${targets.length})...`);
        const res = await axios.post(`${BASE_URL}/api/cases/`, { ...credentials, project_id: selectedProject.id, suite_id: selectedSuite?.id || null, section_id: secId, offset: 0, limit: 250 });
        const batch = res.data.cases || res.data || [];
        batch.forEach(c => { if (!seen.has(c.id)) { seen.add(c.id); allCases.push(c); } });
      }
      setCases(allCases); setSearched(true);
    } catch (err) { setCasesError(err?.response?.data?.detail || "Failed to load cases."); }
    setLoadingCases(false); setProgress("");
  }

  function getIssueLabel(c, fieldKey) {
    const val = (c[fieldKey] || "").trim();
    if (!val) return "blank";
    if (wordCountEnabled && countWords(val) < wordCountThreshold) return `${countWords(val)} words`;
    return null;
  }

  const sectionLabel = selectedIds.size === 0 ? "All" : selectedIds.size === 1 ? sections.find(s => s.id === [...selectedIds][0])?.name || "1 section" : `${selectedIds.size} sections`;

  return (
    <div style={s.twoCol}>
      <div style={s.col}>
        {isDemo && <DemoBanner>Searching demo data — no backend needed.</DemoBanner>}
        <SectionPicker sections={sections} rootSections={rootSections} childrenMap={childrenMap} selectedIds={selectedIds} onToggle={toggleSection} onSelectAll={selectAll} onClearAll={clearAll} loading={loadingSections} error={sectionError} />
        <div style={s.card}>
          <div style={s.cardTitle}>Fields to Check</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {BLANK_FIELDS.map(({ key, label }) => {
              const on = checkedFields.includes(key);
              return (
                <div key={key} onClick={() => toggleField(key)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "8px 10px", borderRadius: "7px", transition: "background 0.12s", backgroundColor: on ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: on ? "var(--accent)" : "transparent", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, fontSize: "0.7rem", color: "#fff" }}>{on ? "✓" : ""}</div>
                  <span style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: on ? 600 : 400 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
        {progress && <div style={s.dimText}>{progress}</div>}
        <button style={{ ...s.actionBtn, opacity: selectedProject ? 1 : 0.4 }} onClick={handleSearch} disabled={loadingCases || !selectedProject}>
          {loadingCases ? <><span style={s.spinner} /> Searching...</> : `Find Cases (${sectionLabel})`}
        </button>
      </div>
      <div style={s.col}>
        {!searched && !loadingCases && <div style={s.emptyState}><div style={{ fontSize: "0.9rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6 }}>Configure filters on the left, then click Find Cases.</div></div>}
        {casesError && <div style={s.errorBanner}>{casesError}</div>}
        {searched && !loadingCases && (
          <div style={s.card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: blankCases.length > 0 ? "#f97316" : "#22c55e" }}>{blankCases.length}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{blankCases.length === 1 ? "case" : "cases"} found{cases.length > 0 && ` out of ${cases.length} total`}</span>
            </div>
            {blankCases.length === 0 && <div style={{ fontSize: "0.88rem", color: "#22c55e" }}>All cases have the required fields filled in.</div>}
            {blankCases.map(c => {
              const issueFields = checkedFields.filter(f => getIssueLabel(c, f) !== null);
              return (
                <div key={c.id} style={s.caseRow}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: 400, marginRight: "6px", fontSize: "0.78rem" }}>[{c.custom_tc_test_case_id || `#${c.id}`}]</span>
                    {c.title || "Untitled"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {issueFields.map(f => {
                      const lbl  = BLANK_FIELDS.find(b => b.key === f)?.label || f;
                      const issue = getIssueLabel(c, f);
                      const isBlank = issue === "blank";
                      return <span key={f} style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "0.71rem", fontWeight: 600, backgroundColor: isBlank ? "rgba(239,68,68,0.12)" : "rgba(249,115,22,0.12)", color: isBlank ? "#ef4444" : "#f97316", border: `1px solid ${isBlank ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.3)"}` }}>{lbl}: {issue}</span>;
                    })}
                  </div>
                  {onOpenCase && <button onClick={() => onOpenCase(c)} style={{ marginTop: "6px", padding: "4px 10px", borderRadius: "6px", fontSize: "0.76rem", border: "1px solid var(--border)", color: "var(--text-muted)", backgroundColor: "var(--bg)", cursor: "pointer" }}>Open</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExportCases({ credentials, selectedProject, selectedSuite, onOpenCase }) {
  const isDemo = !!credentials?.demo;
  const [activeTab, setActiveTab]             = useState("export");
  const [sections, setSections]               = useState([]);
  const [childrenMap, setChildrenMap]         = useState({});
  const [rootSections, setRootSections]       = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [sectionError, setSectionError]       = useState("");

  useEffect(() => {
    if (!selectedProject) { setSections([]); setChildrenMap({}); setRootSections([]); return; }
    loadSections();
  }, [selectedProject?.id, selectedSuite?.id]);

  async function loadSections() {
    setLoadingSections(true); setSectionError("");
    if (isDemo) {
      const suiteKeys = Object.keys(DEMO_SECTIONS).filter(k => k.startsWith(`${selectedProject.id}_`));
      const raw = suiteKeys.flatMap(k => DEMO_SECTIONS[k]);
      setSections(raw);
      const byParent = {}, roots = [];
      raw.forEach(sec => { if (!sec.parent_id) roots.push(sec); else { (byParent[sec.parent_id] ??= []).push(sec); } });
      setChildrenMap(byParent); setRootSections(roots); setLoadingSections(false);
      return;
    }
    try {
      const params = selectedSuite?.id ? { suite_id: selectedSuite.id } : {};
      const res = await axios.post(`${BASE_URL}/api/projects/${selectedProject.id}/sections`, { ...credentials }, { params });
      const raw = res.data.sections || res.data || [];
      setSections(raw);
      const byParent = {}, roots = [];
      raw.forEach(sec => { if (!sec.parent_id) roots.push(sec); else { (byParent[sec.parent_id] ??= []).push(sec); } });
      setChildrenMap(byParent); setRootSections(roots);
    } catch (err) { setSectionError(err?.response?.data?.detail || "Failed to load sections."); }
    setLoadingSections(false);
  }

  const sharedProps = { credentials, selectedProject, selectedSuite, sections, rootSections, childrenMap, loadingSections, sectionError, onOpenCase };
  const TABS = [{ key: "export", label: "Export Cases" }, { key: "blank", label: "Find Blank Cases" }];

  return (
    <div style={s.root}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text)", fontWeight: 700 }}>Case Tools</h2>
        <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>{selectedProject ? `${selectedProject.name}${selectedSuite ? ` / ${selectedSuite.name}` : ""}` : "No project selected"}</p>
      </div>
      {!selectedProject && <div style={s.warning}>Please select a project from the left panel first.</div>}
      {selectedProject && (
        <>
          <div style={s.tabBar}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ ...s.tabBtn, backgroundColor: activeTab === tab.key ? "var(--accent)" : "transparent", color: activeTab === tab.key ? "#fff" : "var(--text-muted)", borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent" }}>{tab.label}</button>
            ))}
          </div>
          {activeTab === "export" && <ExportTab {...sharedProps} />}
          {activeTab === "blank"  && <FindBlankTab {...sharedProps} />}
        </>
      )}
    </div>
  );
}

const s = {
  root:          { display: "flex", flexDirection: "column", gap: "14px", padding: "4px", fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  warning:       { backgroundColor: "var(--bg-panel)", border: "1px solid #f97316", borderRadius: "8px", padding: "10px 14px", color: "#f97316", fontSize: "0.85rem" },
  tabBar:        { display: "flex", gap: "2px", borderBottom: "1px solid var(--border)" },
  tabBtn:        { display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 600, transition: "all 0.15s" },
  twoCol:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignItems: "start" },
  col:           { display: "flex", flexDirection: "column", gap: "12px" },
  card:          { backgroundColor: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" },
  cardTitle:     { fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)" },
  sectionTree:   { maxHeight: "230px", overflowY: "auto", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg)", padding: "4px" },
  dimText:       { fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" },
  errorText:     { fontSize: "0.82rem", color: "#f87171" },
  microBtn:      { padding: "3px 10px", fontSize: "0.76rem", borderRadius: "5px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" },
  actionBtn:     { width: "100%", padding: "10px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit" },
  errorBanner:   { backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid #f87171", borderRadius: "6px", padding: "8px 12px", color: "#f87171", fontSize: "0.82rem" },
  successBanner: { backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid #22c55e", borderRadius: "6px", padding: "8px 12px", color: "#22c55e", fontSize: "0.82rem" },
  spinner:       { display: "inline-block", width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  emptyState:    { display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", backgroundColor: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "10px" },
  caseRow:       { backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px" },
};