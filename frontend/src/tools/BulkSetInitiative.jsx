import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { DEMO_CASES, DEMO_SUITES, DEMO_SECTIONS } from "../demoData";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function buildTree(sections, parentId = null) {
  return sections.filter(s => (s.parent_id ?? null) === parentId).map(s => ({ ...s, children: buildTree(sections, s.id) }));
}
function collectSectionIds(node) { return [node.id, ...node.children.flatMap(collectSectionIds)]; }
function caseIdsUnderNode(node, casesBySection) {
  const direct = (casesBySection[node.id] ?? []).map(c => c.id);
  const nested = node.children.flatMap(child => caseIdsUnderNode(child, casesBySection));
  return [...direct, ...nested];
}

function DemoBanner({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", backgroundColor: "#3b82f611", border: "1px solid #3b82f630" }}>
      <span style={{ fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.1em", color: "#3b82f6", backgroundColor: "#3b82f615", border: "1px solid #3b82f640", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}>DEMO</span>
      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{children}</span>
    </div>
  );
}

function Checkbox({ checked, indeterminate, onChange, disabled }) {
  const ref = useCallback(el => { if (el) el.indeterminate = !!indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} onClick={e => e.stopPropagation()} style={{ cursor: disabled ? "default" : "pointer", width: 14, height: 14, flexShrink: 0 }} />;
}

function SectionNode({ node, depth, casesBySection, fetchedIds, loadingIds, selectedIds, onToggleSection, onToggleCase, collapsed, onToggleCollapse, initiativeLabel, initiativeFieldKey }) {
  const cases         = casesBySection[node.id] ?? [];
  const allIds        = caseIdsUnderNode(node, casesBySection);
  const selectedCount = allIds.filter(id => selectedIds.has(id)).length;
  const allChecked    = allIds.length > 0 && selectedCount === allIds.length;
  const indeterminate = selectedCount > 0 && selectedCount < allIds.length;
  const isCollapsed   = collapsed.has(node.id);
  const sectionIds    = collectSectionIds(node);
  const isLoading     = sectionIds.some(id => loadingIds.has(id));
  const isFetched     = fetchedIds.has(node.id);
  return (
    <div>
      <div style={{ ...s.sectionRow, paddingLeft: 8 + depth * 18 }}>
        <Checkbox checked={allChecked} indeterminate={indeterminate} disabled={isLoading} onChange={() => onToggleSection(node, allChecked || indeterminate)} />
        <span style={s.chevron} onClick={() => onToggleCollapse(node.id)}>{isCollapsed ? "▶" : "▼"}</span>
        <span style={{ ...s.sectionLabel, cursor: "pointer" }} onClick={() => onToggleCollapse(node.id)}>{node.name}</span>
        {isLoading ? <span style={s.pill}>loading…</span>
          : isFetched ? <span style={s.pill}>{selectedCount > 0 ? `${selectedCount}/` : ""}{allIds.length} case{allIds.length !== 1 ? "s" : ""}</span>
          : <span style={{ ...s.pill, fontStyle: "italic" }}>click to load</span>}
      </div>
      {!isCollapsed && (
        <div>
          {cases.map(c => {
            const sel   = selectedIds.has(c.id);
            const title = c.title?.length > 55 ? c.title.slice(0, 52) + "…" : (c.title || "Untitled");
            return (
              <div key={c.id} style={{ ...s.caseRow, paddingLeft: 8 + (depth + 1) * 18, backgroundColor: sel ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent" }} onClick={() => onToggleCase(c.id)}>
                <Checkbox checked={sel} indeterminate={false} onChange={() => onToggleCase(c.id)} />
                <span style={s.caseTitle}>{title}</span>
                <span style={s.caseMilestone}>{initiativeLabel(initiativeFieldKey ? c[initiativeFieldKey] : null)}</span>
              </div>
            );
          })}
          {isFetched && cases.length === 0 && node.children.length === 0 && (
            <div style={{ ...s.caseRow, paddingLeft: 8 + (depth + 1) * 18, cursor: "default" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "0.78rem", fontStyle: "italic" }}>No cases in this section</span>
            </div>
          )}
          {node.children.map(child => <SectionNode key={child.id} node={child} depth={depth + 1} casesBySection={casesBySection} fetchedIds={fetchedIds} loadingIds={loadingIds} selectedIds={selectedIds} onToggleSection={onToggleSection} onToggleCase={onToggleCase} collapsed={collapsed} onToggleCollapse={onToggleCollapse} initiativeLabel={initiativeLabel} initiativeFieldKey={initiativeFieldKey} />)}
        </div>
      )}
    </div>
  );
}

export default function BulkSetInitiative({ credentials, selectedProject, selectedSuite, sections = [] }) {
  const isDemo = !!credentials?.demo;

  const [initiativeField, setInitiativeField]     = useState(null);
  const [initiativeOptions, setInitiativeOptions] = useState([]);
  const [initiativesLoading, setInitiativesLoading] = useState(false);
  const [initiativesError, setInitiativesError]   = useState("");
  const [suites, setSuites]                   = useState([]);
  const [suitesLoading, setSuitesLoading]     = useState(false);
  const [activeSuite, setActiveSuite]         = useState(selectedSuite ?? null);
  const [allSections, setAllSections]         = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const casesBySectionRef = useRef({});
  const fetchedIdsRef     = useRef(new Set());
  const loadingIdsRef     = useRef(new Set());

  const [casesBySection, setCasesBySection] = useState({});
  const [fetchedIds, setFetchedIds]         = useState(new Set());
  const [loadingIds, setLoadingIds]         = useState(new Set());
  const [collapsed, setCollapsed]           = useState(new Set());
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [targetMilestone, setTargetMilestone] = useState("");
  const [showPreview, setShowPreview]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [results, setResults]               = useState(null);
  const [error, setError]                   = useState("");

  const initiativeLabel = useCallback((val) => {
    if (!val || (Array.isArray(val) && val.length === 0)) return "None";
    const ids = Array.isArray(val) ? val : [val];
    const labels = ids.map(id => initiativeOptions.find(o => String(o.id) === String(id))?.label ?? String(id));
    return labels.join(", ");
  }, [initiativeOptions]);

  // ── Load initiative field + options from case fields ───────────────────
  useEffect(() => {
    if (!selectedProject || isDemo) { setInitiativeField(null); setInitiativeOptions([]); return; }
    setInitiativesLoading(true);
    setInitiativesError("");
    axios.post(`${BASE_URL}/api/cases/fields`, { ...credentials })
      .then(res => {
        const fields = Array.isArray(res.data) ? res.data : [];
        console.log("[Initiative] all fields:", fields.map(f => ({ name: f.name, system_name: f.system_name, is_active: f.is_active })));
        const field  = fields.find(f => f.name?.toLowerCase().includes("initiative"));
        if (!field) {
          setInitiativesError(`No 'Initiative' field found. Available fields: ${fields.map(f => f.name).join(", ")}`);
          return;
        }
        console.log("[Initiative] matched field:", field);
        setInitiativeField(field);
        const raw  = field.configs?.[0]?.options?.items ?? "";
        const opts = Array.isArray(raw)
          ? raw
          : raw.split("\n").filter(Boolean).map(line => {
              const [id, ...rest] = line.split(",");
              return { id: id.trim(), label: rest.join(",").trim() };
            });
        setInitiativeOptions(opts);
      })
      .catch(err => {
        setInitiativesError(err?.response?.data?.detail || "Failed to load initiative options.");
      })
      .finally(() => setInitiativesLoading(false));
  }, [selectedProject?.id]);

  // ── Load suites ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedProject) return;
    if (isDemo) {
      const demoSuites = DEMO_SUITES[selectedProject.id] || [];
      setSuites(demoSuites);
      setActiveSuite(selectedSuite ?? demoSuites[0] ?? null);
      return;
    }
    setSuitesLoading(true);
    axios.post(`${BASE_URL}/api/projects/${selectedProject.id}/suites`, { ...credentials })
      .then(res => {
        const data = res.data.suites ?? res.data ?? [];
        setSuites(data);
        setActiveSuite(selectedSuite ?? (data.length > 0 ? data[0] : null));
      })
      .catch(() => setSuites([]))
      .finally(() => setSuitesLoading(false));
  }, [selectedProject?.id]);

  const resetTree = useCallback(() => {
    casesBySectionRef.current = {}; fetchedIdsRef.current = new Set(); loadingIdsRef.current = new Set();
    setCasesBySection({}); setFetchedIds(new Set()); setLoadingIds(new Set());
    setSelectedIds(new Set()); setCollapsed(new Set()); setShowPreview(false); setResults(null); setError("");
  }, []);

  // ── Load sections ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedProject || !activeSuite) return;
    resetTree(); setSectionsLoading(true);
    if (isDemo) {
      const key = `${selectedProject.id}_${activeSuite.id}`;
      const fetched = DEMO_SECTIONS[key] || [];
      setAllSections(fetched); setCollapsed(new Set(fetched.map(s => s.id)));
      setSectionsLoading(false);
      return;
    }
    axios.post(`${BASE_URL}/api/projects/${selectedProject.id}/sections${activeSuite?.id ? `?suite_id=${activeSuite.id}` : ""}`, { ...credentials })
      .then(res => {
        const fetched = res.data.sections ?? res.data ?? [];
        setAllSections(fetched); setCollapsed(new Set(fetched.map(s => s.id)));
      })
      .catch(() => setAllSections([]))
      .finally(() => setSectionsLoading(false));
  }, [selectedProject?.id, activeSuite?.id]);

  useEffect(() => {
    if (activeSuite || sections.length === 0) return;
    setAllSections(sections); setCollapsed(new Set(sections.map(s => s.id)));
  }, [sections]);

  const sectionTree = buildTree(allSections);

  const fetchCases = useCallback(async (sectionId) => {
    if (fetchedIdsRef.current.has(sectionId) || loadingIdsRef.current.has(sectionId)) return;
    if (!selectedProject) return;
    loadingIdsRef.current = new Set([...loadingIdsRef.current, sectionId]);
    setLoadingIds(new Set(loadingIdsRef.current));
    if (isDemo) {
      await new Promise(r => setTimeout(r, 150));
      casesBySectionRef.current = { ...casesBySectionRef.current, [sectionId]: DEMO_CASES[sectionId] || [] };
    } else {
      try {
        const res = await axios.post(`${BASE_URL}/api/cases/`, { ...credentials, project_id: selectedProject.id, suite_id: activeSuite?.id ?? null, section_id: sectionId });
        casesBySectionRef.current = { ...casesBySectionRef.current, [sectionId]: res.data.cases ?? [] };
      } catch { casesBySectionRef.current = { ...casesBySectionRef.current, [sectionId]: [] }; }
    }
    fetchedIdsRef.current = new Set([...fetchedIdsRef.current, sectionId]);
    loadingIdsRef.current = new Set([...loadingIdsRef.current].filter(id => id !== sectionId));
    setCasesBySection({ ...casesBySectionRef.current }); setFetchedIds(new Set(fetchedIdsRef.current)); setLoadingIds(new Set(loadingIdsRef.current));
  }, [credentials, selectedProject, activeSuite, isDemo]);

  const handleToggleCollapse = useCallback((sectionId) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) { next.delete(sectionId); fetchCases(sectionId); } else { next.add(sectionId); }
      return next;
    });
  }, [fetchCases]);

  const handleToggleCase = useCallback((caseId) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(caseId) ? next.delete(caseId) : next.add(caseId); return next; });
    setShowPreview(false); setResults(null); setError("");
  }, []);

  const handleToggleSection = useCallback(async (node, deselect) => {
    const sectionIds = collectSectionIds(node);
    const unloaded   = sectionIds.filter(id => !fetchedIdsRef.current.has(id));
    if (unloaded.length > 0) await Promise.all(unloaded.map(id => fetchCases(id)));
    const allCaseIds = sectionIds.flatMap(id => (casesBySectionRef.current[id] ?? []).map(c => c.id));
    setSelectedIds(prev => { const next = new Set(prev); allCaseIds.forEach(id => deselect ? next.delete(id) : next.add(id)); return next; });
    setShowPreview(false); setResults(null); setError("");
  }, [fetchCases]);

  const allCaseIds  = Object.values(casesBySection).flat().map(c => c.id);
  const allSelected = allCaseIds.length > 0 && allCaseIds.every(id => selectedIds.has(id));
  const handleSelectAll = () => { setSelectedIds(allSelected ? new Set() : new Set(allCaseIds)); setShowPreview(false); setResults(null); setError(""); };

  const selectedCases = Object.values(casesBySection).flat().filter(c => selectedIds.has(c.id));
  const targetName    = initiativeOptions.find(o => String(o.id) === String(targetMilestone))?.label ?? targetMilestone;

  const handleApply = async () => {
    if (!selectedIds.size || !targetMilestone) return;
    setLoading(true); setError("");
    if (isDemo) {
      await new Promise(r => setTimeout(r, 500));
      setResults({ updated: selectedIds.size, errors: 0, results: [...selectedIds].map(id => ({ case_id: id, ok: true })) });
      setShowPreview(false); setSelectedIds(new Set()); setLoading(false);
      return;
    }
    try {
      const fieldKey  = initiativeField.system_name;
      const targetStr = String(targetMilestone);
      const allCases  = Object.values(casesBySection).flat();

      const { toUpdate, alreadySet } = [...selectedIds].reduce((acc, id) => {
        const c       = allCases.find(c => c.id === id);
        const current = c ? (Array.isArray(c[fieldKey]) ? c[fieldKey] : (c[fieldKey] ? [c[fieldKey]] : [])) : [];
        current.map(String).includes(targetStr) ? acc.alreadySet.push(id) : acc.toUpdate.push(id);
        return acc;
      }, { toUpdate: [], alreadySet: [] });

      const BATCH    = 5;
      const DELAY_MS = 500;
      const allRes   = alreadySet.map(id => ({ case_id: id, ok: true, alreadySet: true }));
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const chunk = toUpdate.slice(i, i + BATCH);
        setError(`Updating ${Math.min(i + BATCH, toUpdate.length)} / ${toUpdate.length}…`);
        const settled = await Promise.allSettled(
          chunk.map(async id => {
            try {
              return await axios.post(`${BASE_URL}/api/cases/${id}/update`, { ...credentials, fields: { [initiativeField.system_name]: [Number(targetMilestone)] } });
            } catch (err) {
              if (err?.response?.status === 429) {
                await new Promise(r => setTimeout(r, 3000));
                return axios.post(`${BASE_URL}/api/cases/${id}/update`, { ...credentials, fields: { [initiativeField.system_name]: [Number(targetMilestone)] } });
              }
              throw err;
            }
          })
        );
        allRes.push(...settled.map((r, j) => {
          if (r.status === "fulfilled") return { case_id: chunk[j], ok: true };
          const status = r.reason?.response?.status ?? r.reason?.status;
          if (status === 422) return { case_id: chunk[j], ok: false, skipped: true, error: "Field not applicable to this case's template" };
          return { case_id: chunk[j], ok: false, error: r.reason?.message ?? "Update failed" };
        }));
        if (i + BATCH < toUpdate.length) await new Promise(r => setTimeout(r, DELAY_MS));
      }
      setError("");
      setResults({
        updated:    allRes.filter(r => r.ok && !r.alreadySet).length,
        alreadySet: allRes.filter(r => r.alreadySet).length,
        skipped:    allRes.filter(r => r.skipped).length,
        errors:     allRes.filter(r => !r.ok && !r.skipped).length,
        results:    allRes,
      });
      setShowPreview(false); setSelectedIds(new Set());
    } catch { setError("Bulk update failed. Please try again."); }
    setLoading(false);
  };

  const canPreview = selectedIds.size > 0 && !!targetMilestone;

  return (
    <div style={s.container}>
      <h3 style={s.heading}>Bulk Set Initiative</h3>
      <p style={s.description}>Select cases from the tree, pick an initiative, then preview and apply.</p>

      {isDemo && <DemoBanner>Initiative changes are simulated — nothing is saved in demo mode.</DemoBanner>}
      {!selectedProject && <div style={s.warningBox}>Please select a project from the left panel first.</div>}

      {selectedProject && (
        <>
          <div style={s.field}>
            <label style={s.label}>Suite</label>
            <select style={s.select} value={activeSuite?.id ?? ""} onChange={e => { const found = suites.find(su => su.id === parseInt(e.target.value, 10)) ?? null; setActiveSuite(found); }} disabled={suitesLoading}>
              {suitesLoading && <option disabled>Loading suites…</option>}
              {!activeSuite && !suitesLoading && <option value="">— Select a suite —</option>}
              {suites.map(su => <option key={su.id} value={su.id}>{su.name}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Set Initiative To</label>
            <select style={s.select} value={targetMilestone} onChange={e => { setTargetMilestone(e.target.value); setShowPreview(false); setResults(null); }} disabled={initiativesLoading || isDemo}>
              <option value="">— {initiativesLoading ? "Loading…" : isDemo ? "No initiatives in demo" : initiativeOptions.length === 0 ? "No options found" : "Choose an initiative"} —</option>
              {initiativeOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {initiativesError && <span style={{ fontSize: "0.78rem", color: "#f87171" }}>{initiativesError}</span>}
          </div>

          <div style={s.field}>
            <div style={s.treeHeader}>
              <label style={s.label}>Cases &amp; Sections</label>
              {allCaseIds.length > 0 && (
                <div style={s.treeActions}>
                  <span style={s.selectedCount}>{selectedIds.size} selected</span>
                  <button style={s.linkBtn} onClick={handleSelectAll}>{allSelected ? "Deselect all" : "Select all"}</button>
                </div>
              )}
            </div>
            <div style={s.treeBox}>
              {sectionsLoading && <p style={s.placeholder}>Loading sections…</p>}
              {!sectionsLoading && !activeSuite && <p style={s.placeholder}>Select a suite above to load sections.</p>}
              {!sectionsLoading && activeSuite && sectionTree.length === 0 && <p style={s.placeholder}>No sections found.</p>}
              {sectionTree.map(node => <SectionNode key={node.id} node={node} depth={0} casesBySection={casesBySection} fetchedIds={fetchedIds} loadingIds={loadingIds} selectedIds={selectedIds} onToggleSection={handleToggleSection} onToggleCase={handleToggleCase} collapsed={collapsed} onToggleCollapse={handleToggleCollapse} initiativeLabel={initiativeLabel} initiativeFieldKey={initiativeField?.system_name ?? null} />)}
            </div>
          </div>
        </>
      )}

      {error && <p style={s.error}>{error}</p>}

      {!showPreview && !results && (
        <button style={{ ...s.btn, opacity: canPreview ? 1 : 0.4 }} onClick={() => setShowPreview(true)} disabled={!canPreview}>Preview Changes</button>
      )}

      {showPreview && !results && (
        <div style={s.previewBox}>
          <p style={s.previewHeader}>Preview — <span style={{ color: "var(--text-muted)" }}>{selectedCases.length} cases</span> → <span style={{ color: "#22c55e" }}>{targetName}</span></p>
          <div style={s.previewList}>
            {selectedCases.map(c => {
              const raw     = initiativeField ? c[initiativeField.system_name] : null;
              const current = Array.isArray(raw) ? raw : (raw ? [raw] : []);
              const same    = current.map(String).includes(String(targetMilestone));
              const title = c.title?.length > 38 ? c.title.slice(0, 35) + "…" : (c.title || "Untitled");
              return (
                <div key={c.id} style={{ ...s.previewRow, opacity: same ? 0.45 : 1 }}>
                  <span style={s.previewOld}>{initiativeLabel(initiativeField ? c[initiativeField.system_name] : null)}</span>
                  <span style={s.arrow}>{same ? "·" : "→"}</span>
                  <span style={same ? s.previewSkip : s.previewNew}>{same ? initiativeLabel(c.milestone_id) : targetName}</span>
                  <span style={s.previewTitle}>{title}</span>
                </div>
              );
            })}
          </div>
          <div style={s.previewActions}>
            <button style={s.btnSecondary} onClick={() => setShowPreview(false)} disabled={loading}>Cancel</button>
            <button style={s.btn} onClick={handleApply} disabled={loading}>{loading ? "Applying…" : `Apply to ${selectedCases.length} Cases`}</button>
          </div>
        </div>
      )}

      {results && (
        <div style={s.results}>
          <p style={s.resultSummary}>
            ✓ Updated: {results.updated}
            {results.alreadySet > 0 && <span style={{ color: "#94a3b8" }}> | ⊘ Already set: {results.alreadySet}</span>}
            {results.skipped    > 0 && <span style={{ color: "#94a3b8" }}> | ⊘ Skipped: {results.skipped} (template mismatch)</span>}
            {results.errors     > 0 && <span style={{ color: "#f87171" }}> | ✕ Errors: {results.errors}</span>}
          </p>
          <div style={s.resultList}>
            {results.results?.filter(r => !r.skipped).map((r, i) => (
              <div key={i} style={s.resultRow}>
                <span style={{ color: r.ok ? "#22c55e" : "#f87171" }}>{r.ok ? "✓" : "✕"}</span>
                <span style={s.resultText}>Case {r.case_id} → {targetName}{r.error && <span style={{ color: "#f87171" }}> ({r.error})</span>}</span>
              </div>
            ))}
          </div>
          <button style={{ ...s.btnSecondary, marginTop: 8 }} onClick={() => setResults(null)}>Reset</button>
        </div>
      )}
    </div>
  );
}

const s = {
  container:    { display: "flex", flexDirection: "column", gap: "14px" },
  heading:      { color: "var(--text)", fontSize: "1rem", margin: 0 },
  description:  { color: "var(--text-muted)", fontSize: "0.88rem" },
  field:        { display: "flex", flexDirection: "column", gap: "4px" },
  label:        { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  select:       { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer" },
  treeHeader:   { display: "flex", alignItems: "center", justifyContent: "space-between" },
  treeActions:  { display: "flex", alignItems: "center", gap: "10px" },
  selectedCount:{ color: "var(--text-dim)", fontSize: "0.78rem" },
  linkBtn:      { background: "none", border: "none", color: "var(--accent)", fontSize: "0.78rem", cursor: "pointer", padding: 0 },
  treeBox:      { border: "1px solid var(--border)", borderRadius: "6px", backgroundColor: "var(--bg-panel)", minHeight: 100, maxHeight: 360, overflowY: "auto" },
  placeholder:  { color: "var(--text-dim)", fontSize: "0.85rem", textAlign: "center", padding: "28px 0", margin: 0 },
  sectionRow:   { display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)", userSelect: "none", position: "sticky", top: 0, zIndex: 1 },
  chevron:      { color: "var(--text-dim)", fontSize: "0.62rem", width: 12, textAlign: "center", cursor: "pointer", flexShrink: 0 },
  sectionLabel: { flex: 1, color: "var(--text)", fontWeight: 600, fontSize: "0.83rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pill:         { color: "var(--text-dim)", fontSize: "0.7rem", backgroundColor: "var(--bg-panel)", borderRadius: "10px", padding: "1px 7px", flexShrink: 0 },
  caseRow:      { display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", borderBottom: "1px solid var(--border)", cursor: "pointer", userSelect: "none", transition: "background 0.1s" },
  caseTitle:    { flex: 1, color: "var(--text-muted)", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  caseMilestone:{ color: "var(--text-dim)", fontSize: "0.7rem", fontFamily: "monospace", flexShrink: 0 },
  btn:          { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  btnSecondary: { padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  error:        { color: "#f87171", fontSize: "0.85rem" },
  warningBox:   { backgroundColor: "var(--bg-panel)", border: "1px solid #f97316", borderRadius: "6px", padding: "10px 14px", color: "#f97316", fontSize: "0.85rem" },
  previewBox:   { backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" },
  previewHeader:{ color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  previewList:  { display: "flex", flexDirection: "column", gap: "3px", maxHeight: "220px", overflowY: "auto" },
  previewRow:   { display: "grid", gridTemplateColumns: "140px 20px 140px 1fr", alignItems: "center", gap: "8px", padding: "3px 4px", borderRadius: "4px", minWidth: 0 },
  previewOld:   { color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  arrow:        { color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "center" },
  previewNew:   { color: "#22c55e", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewSkip:  { color: "var(--text-dim)", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewTitle: { color: "var(--text-dim)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "4px", borderLeft: "1px solid var(--border)" },
  previewActions:{ display: "flex", gap: "8px", marginTop: "4px" },
  results:      { backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" },
  resultSummary:{ color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  resultList:   { display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" },
  resultRow:    { display: "flex", alignItems: "center", gap: "8px" },
  resultText:   { color: "var(--text-muted)", fontSize: "0.82rem" },
};
