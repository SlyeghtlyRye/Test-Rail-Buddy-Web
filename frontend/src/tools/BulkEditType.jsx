import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

const CASE_TYPES = [
  { id: 1,  label: "Automated" },
  { id: 2,  label: "Functionality" },
  { id: 3,  label: "Other" },
  { id: 4,  label: "Performance" },
  { id: 5,  label: "Regression" },
  { id: 6,  label: "Security" },
  { id: 7,  label: "Smoke & Sanity" },
  { id: 8,  label: "Usability" },
  { id: 9,  label: "Acceptance" },
  { id: 10, label: "Accessibility" },
];

function typeLabel(id) {
  return CASE_TYPES.find(t => String(t.id) === String(id))?.label ?? `Type ${id}`;
}

function buildTree(sections, parentId = null) {
  return sections
    .filter(s => (s.parent_id ?? null) === parentId)
    .map(s => ({ ...s, children: buildTree(sections, s.id) }));
}

function collectSectionIds(node) {
  return [node.id, ...node.children.flatMap(collectSectionIds)];
}

function caseIdsUnderNode(node, casesBySection) {
  const direct = (casesBySection[node.id] ?? []).map(c => c.id);
  const nested = node.children.flatMap(child => caseIdsUnderNode(child, casesBySection));
  return [...direct, ...nested];
}

// ── Tri-state checkbox ────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange, disabled }) {
  const ref = useCallback(el => {
    if (el) el.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      style={{ cursor: disabled ? "default" : "pointer", width: 14, height: 14, flexShrink: 0 }}
    />
  );
}

// ── Section node ──────────────────────────────────────────────────────────────
function SectionNode({
  node, depth, casesBySection, fetchedIds, loadingIds,
  selectedIds, onToggleSection, onToggleCase,
  collapsed, onToggleCollapse,
}) {
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
      <div style={{ ...styles.sectionRow, paddingLeft: 8 + depth * 18 }}>
        <Checkbox
          checked={allChecked}
          indeterminate={indeterminate}
          disabled={isLoading}
          onChange={() => onToggleSection(node, allChecked || indeterminate)}
        />
        <span style={styles.chevron} onClick={() => onToggleCollapse(node.id)}>
          {isCollapsed ? "▶" : "▼"}
        </span>
        <span
          style={{ ...styles.sectionLabel, cursor: "pointer" }}
          onClick={() => onToggleCollapse(node.id)}
        >
          {node.name}
        </span>
        {isLoading ? (
          <span style={styles.pill}>loading…</span>
        ) : isFetched ? (
          <span style={styles.pill}>
            {selectedCount > 0 ? `${selectedCount}/` : ""}
            {allIds.length} case{allIds.length !== 1 ? "s" : ""}
          </span>
        ) : (
          <span style={{ ...styles.pill, fontStyle: "italic" }}>click to load</span>
        )}
      </div>

      {!isCollapsed && (
        <div>
          {cases.map(c => {
            const sel   = selectedIds.has(c.id);
            const title = c.title?.length > 55 ? c.title.slice(0, 52) + "…" : (c.title || "Untitled");
            return (
              <div
                key={c.id}
                style={{
                  ...styles.caseRow,
                  paddingLeft: 8 + (depth + 1) * 18,
                  backgroundColor: sel ? "var(--accent)11" : "transparent",
                }}
                onClick={() => onToggleCase(c.id)}
              >
                <Checkbox
                  checked={sel}
                  indeterminate={false}
                  onChange={() => onToggleCase(c.id)}
                />
                <span style={styles.caseTitle}>{title}</span>
                <span style={styles.caseType}>{typeLabel(c.type_id)}</span>
              </div>
            );
          })}
          {isFetched && cases.length === 0 && node.children.length === 0 && (
            <div style={{ ...styles.caseRow, paddingLeft: 8 + (depth + 1) * 18, cursor: "default" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "0.78rem", fontStyle: "italic" }}>
                No cases in this section
              </span>
            </div>
          )}
          {node.children.map(child => (
            <SectionNode
              key={child.id}
              node={child}
              depth={depth + 1}
              casesBySection={casesBySection}
              fetchedIds={fetchedIds}
              loadingIds={loadingIds}
              selectedIds={selectedIds}
              onToggleSection={onToggleSection}
              onToggleCase={onToggleCase}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BulkEditType({
  credentials, selectedProject, selectedSuite, sections = [],
}) {
  // ── Suite state ────────────────────────────────────────────────────────
  const [suites, setSuites]               = useState([]);
  const [suitesLoading, setSuitesLoading] = useState(false);
  const [activeSuite, setActiveSuite]     = useState(selectedSuite ?? null);

  // ── Section state ──────────────────────────────────────────────────────
  const [allSections, setAllSections]         = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // Refs — always current, no stale closures
  const casesBySectionRef = useRef({});
  const fetchedIdsRef     = useRef(new Set());
  const loadingIdsRef     = useRef(new Set());

  // State mirrors of refs for rendering
  const [casesBySection, setCasesBySection] = useState({});
  const [fetchedIds, setFetchedIds]         = useState(new Set());
  const [loadingIds, setLoadingIds]         = useState(new Set());

  // All sections collapsed by default
  const [collapsed, setCollapsed]     = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Preview / confirm
  const [targetType, setTargetType]   = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [results, setResults]         = useState(null);
  const [error, setError]             = useState("");

  // ── Fetch suites when project changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedProject) return;
    setSuitesLoading(true);
    axios.post(`${BASE_URL}/api/projects/${selectedProject.id}/suites`, {
    ...credentials,
    })
      .then(res => {
        const data = res.data.suites ?? res.data ?? [];
        setSuites(data);
        // Default to the passed-in suite, or first available
        if (selectedSuite) {
          setActiveSuite(selectedSuite);
        } else if (data.length > 0) {
          setActiveSuite(data[0]);
        }
      })
      .catch(() => setSuites([]))
      .finally(() => setSuitesLoading(false));
  }, [selectedProject?.id]);

  // ── Full tree reset helper ─────────────────────────────────────────────
  const resetTree = useCallback(() => {
    casesBySectionRef.current = {};
    fetchedIdsRef.current     = new Set();
    loadingIdsRef.current     = new Set();
    setCasesBySection({});
    setFetchedIds(new Set());
    setLoadingIds(new Set());
    setSelectedIds(new Set());
    setCollapsed(new Set());   // sections will be set to collapsed after sections load
    setShowPreview(false);
    setResults(null);
    setError("");
  }, []);

  // ── Fetch sections when suite changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedProject || !activeSuite) return;
    resetTree();
    setSectionsLoading(true);
    axios.post(
    `${BASE_URL}/api/projects/${selectedProject.id}/sections${activeSuite?.id ? `?suite_id=${activeSuite.id}` : ""}`,
    { ...credentials }
    )
      .then(res => {
        const fetched = res.data.sections ?? res.data ?? [];
        setAllSections(fetched);
        // Collapse ALL sections — nothing auto-loads
        setCollapsed(new Set(fetched.map(s => s.id)));
      })
      .catch(() => setAllSections([]))
      .finally(() => setSectionsLoading(false));
  }, [selectedProject?.id, activeSuite?.id]);

  // Also use sections prop as a fallback if no suite-based fetch needed
  useEffect(() => {
    if (activeSuite || sections.length === 0) return;
    setAllSections(sections);
    setCollapsed(new Set(sections.map(s => s.id)));
  }, [sections]);

  const sectionTree = buildTree(allSections);

  // ── Core fetch ─────────────────────────────────────────────────────────
  const fetchCases = useCallback(async (sectionId) => {
    if (fetchedIdsRef.current.has(sectionId) || loadingIdsRef.current.has(sectionId)) return;
    if (!selectedProject) return;

    loadingIdsRef.current = new Set([...loadingIdsRef.current, sectionId]);
    setLoadingIds(new Set(loadingIdsRef.current));

    try {
      const res = await axios.post(`${BASE_URL}/api/cases/`, {
        ...credentials,
        project_id: selectedProject.id,
        suite_id:   activeSuite?.id ?? null,
        section_id: sectionId,
      });
      casesBySectionRef.current = { ...casesBySectionRef.current, [sectionId]: res.data.cases ?? [] };
    } catch {
      casesBySectionRef.current = { ...casesBySectionRef.current, [sectionId]: [] };
    }

    fetchedIdsRef.current = new Set([...fetchedIdsRef.current, sectionId]);
    loadingIdsRef.current = new Set([...loadingIdsRef.current].filter(id => id !== sectionId));

    setCasesBySection({ ...casesBySectionRef.current });
    setFetchedIds(new Set(fetchedIdsRef.current));
    setLoadingIds(new Set(loadingIdsRef.current));
  }, [credentials, selectedProject, activeSuite]);

  // ── Collapse toggle — ONLY fetches on expand, never auto-opens ─────────
  const handleToggleCollapse = useCallback((sectionId) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId); // expanding → fetch if needed
        fetchCases(sectionId);
      } else {
        next.add(sectionId);    // collapsing
      }
      return next;
    });
  }, [fetchCases]);

  // ── Toggle individual case ─────────────────────────────────────────────
  const handleToggleCase = useCallback((caseId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(caseId) ? next.delete(caseId) : next.add(caseId);
      return next;
    });
    setShowPreview(false);
    setResults(null);
    setError("");
  }, []);

  // ── Toggle section — fetch all descendants then bulk select/deselect ───
  const handleToggleSection = useCallback(async (node, deselect) => {
    const sectionIds = collectSectionIds(node);
    const unloaded   = sectionIds.filter(id => !fetchedIdsRef.current.has(id));
    if (unloaded.length > 0) {
      await Promise.all(unloaded.map(id => fetchCases(id)));
    }
    const allCaseIds = sectionIds.flatMap(id => (casesBySectionRef.current[id] ?? []).map(c => c.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      allCaseIds.forEach(id => deselect ? next.delete(id) : next.add(id));
      return next;
    });
    setShowPreview(false);
    setResults(null);
    setError("");
  }, [fetchCases]);

  // ── Select all / none ──────────────────────────────────────────────────
  const allCaseIds  = Object.values(casesBySection).flat().map(c => c.id);
  const allSelected = allCaseIds.length > 0 && allCaseIds.every(id => selectedIds.has(id));

  const handleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(allCaseIds));
    setShowPreview(false);
    setResults(null);
    setError("");
  };

  // ── Preview list ───────────────────────────────────────────────────────
  const selectedCases = Object.values(casesBySection)
    .flat()
    .filter(c => selectedIds.has(c.id));

  // ── Apply ──────────────────────────────────────────────────────────────
    const handleApply = async () => {
    if (selectedIds.size === 0 || !targetType) return;
    setLoading(true);
    setError("");
    try {
        const caseIds = [...selectedIds];
        const settled = await Promise.allSettled(
        caseIds.map(id =>
            axios.post(`${BASE_URL}/api/cases/${id}/update`, {
            ...credentials,
            fields: { type_id: Number(targetType) },
            })
        )
        );
        const results = settled.map((r, i) => ({
        case_id: caseIds[i],
        ok:      r.status === "fulfilled",
        error:   r.status === "rejected" ? r.reason?.message : null,
        }));
        setResults({
        updated: results.filter(r => r.ok).length,
        errors:  results.filter(r => !r.ok).length,
        results,
        });
        setShowPreview(false);
        setSelectedIds(new Set());
    } catch {
        setError("Bulk update failed. Please try again.");
    }
    setLoading(false);
    };

  const canPreview = selectedIds.size > 0 && !!targetType;
  const newType    = typeLabel(targetType);

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Bulk Edit Case Type</h3>
      <p style={styles.description}>
        Select cases from the tree below, pick a target type, then preview and apply.
      </p>

      {!selectedProject && (
        <div style={styles.warningBox}>Please select a project from the left panel first.</div>
      )}

      {/* ── Suite selector ───────────────────────────────────────────────── */}
      {selectedProject && (
        <div style={styles.field}>
          <label style={styles.label}>Suite</label>
          <select
            style={styles.select}
            value={activeSuite?.id ?? ""}
            onChange={e => {
              const id    = parseInt(e.target.value, 10);
              const found = suites.find(s => s.id === id) ?? null;
              setActiveSuite(found);
            }}
            disabled={suitesLoading}
          >
            {suitesLoading && <option disabled>Loading suites…</option>}
            {!activeSuite && !suitesLoading && <option value="">— Select a suite —</option>}
            {suites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Target type ──────────────────────────────────────────────────── */}
      <div style={styles.field}>
        <label style={styles.label}>Set Type To</label>
        <select
          style={styles.select}
          value={targetType}
          onChange={e => { setTargetType(e.target.value); setShowPreview(false); setResults(null); }}
          disabled={!selectedProject}
        >
          <option value="">— Choose target type —</option>
          {CASE_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* ── Case tree ────────────────────────────────────────────────────── */}
      <div style={styles.field}>
        <div style={styles.treeHeader}>
          <label style={styles.label}>Cases & Sections</label>
          {allCaseIds.length > 0 && (
            <div style={styles.treeActions}>
              <span style={styles.selectedCount}>{selectedIds.size} selected</span>
              <button style={styles.linkBtn} onClick={handleSelectAll}>
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
          )}
        </div>

        <div style={styles.treeBox}>
          {!selectedProject && (
            <p style={styles.placeholder}>Select a project to load cases.</p>
          )}
          {sectionsLoading && (
            <p style={styles.placeholder}>Loading sections…</p>
          )}
          {selectedProject && !sectionsLoading && !activeSuite && (
            <p style={styles.placeholder}>Select a suite above to load sections.</p>
          )}
          {selectedProject && !sectionsLoading && activeSuite && sectionTree.length === 0 && (
            <p style={styles.placeholder}>No sections found.</p>
          )}
          {sectionTree.map(node => (
            <SectionNode
              key={node.id}
              node={node}
              depth={0}
              casesBySection={casesBySection}
              fetchedIds={fetchedIds}
              loadingIds={loadingIds}
              selectedIds={selectedIds}
              onToggleSection={handleToggleSection}
              onToggleCase={handleToggleCase}
              collapsed={collapsed}
              onToggleCollapse={handleToggleCollapse}
            />
          ))}
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {/* ── Preview button ────────────────────────────────────────────────── */}
      {!showPreview && !results && (
        <button
          style={{ ...styles.btn, opacity: canPreview ? 1 : 0.4 }}
          onClick={() => setShowPreview(true)}
          disabled={!canPreview}
        >
          Preview Changes
        </button>
      )}

      {/* ── Preview table ─────────────────────────────────────────────────── */}
      {showPreview && !results && (
        <div style={styles.previewBox}>
          <p style={styles.previewHeader}>
            Preview —{" "}
            <span style={{ color: "var(--text-muted)" }}>{selectedCases.length} cases</span>
            {" "}→{" "}
            <span style={{ color: "#22c55e" }}>{newType}</span>
          </p>
          <div style={styles.previewList}>
            {selectedCases.map(c => {
              const oldType = typeLabel(c.type_id);
              const title   = c.title?.length > 38 ? c.title.slice(0, 35) + "…" : (c.title || "Untitled");
              const same    = String(c.type_id) === String(targetType);
              return (
                <div key={c.id} style={{ ...styles.previewRow, opacity: same ? 0.45 : 1 }}>
                  <span style={styles.previewOld}>{oldType}</span>
                  <span style={styles.arrow}>{same ? "·" : "→"}</span>
                  <span style={same ? styles.previewSkip : styles.previewNew}>
                    {same ? oldType : newType}
                  </span>
                  <span style={styles.previewTitle}>{title}</span>
                </div>
              );
            })}
          </div>
          <div style={styles.previewActions}>
            <button style={styles.btnSecondary} onClick={() => setShowPreview(false)} disabled={loading}>
              Cancel
            </button>
            <button style={styles.btn} onClick={handleApply} disabled={loading}>
              {loading ? "Applying…" : `Apply to ${selectedCases.length} Cases`}
            </button>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {results && (
        <div style={styles.results}>
          <p style={styles.resultSummary}>
            ✓ Updated: {results.updated}
            {results.results?.filter(r => r.skipped).length > 0 && (
              <span style={{ color: "var(--text-dim)" }}>
                {" "}&nbsp;|&nbsp; — Skipped: {results.results.filter(r => r.skipped).length}
              </span>
            )}
            {results.errors > 0 && (
              <span style={{ color: "#f87171" }}>
                {" "}&nbsp;|&nbsp; ✕ Errors: {results.errors}
              </span>
            )}
          </p>
          <div style={styles.resultList}>
            {results.results?.map((r, i) => (
              <div key={i} style={styles.resultRow}>
                <span style={{ color: r.skipped ? "#64748b" : r.ok ? "#22c55e" : "#f87171" }}>
                  {r.skipped ? "—" : r.ok ? "✓" : "✕"}
                </span>
                <span style={styles.resultText}>
                  {r.skipped
                    ? `Case ${r.case_id} skipped`
                    : `Case ${r.case_id} → ${newType}`}
                  {r.error && <span style={{ color: "#f87171" }}> ({r.error})</span>}
                </span>
              </div>
            ))}
          </div>
          <button style={{ ...styles.btnSecondary, marginTop: 8 }} onClick={() => setResults(null)}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container:   { display: "flex", flexDirection: "column", gap: "14px" },
  heading:     { color: "var(--text)", fontSize: "1rem", margin: 0 },
  description: { color: "var(--text-muted)", fontSize: "0.88rem" },
  field:       { display: "flex", flexDirection: "column", gap: "4px" },
  label:       { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  select: {
    padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)",
    backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer",
  },
  treeHeader:    { display: "flex", alignItems: "center", justifyContent: "space-between" },
  treeActions:   { display: "flex", alignItems: "center", gap: "10px" },
  selectedCount: { color: "var(--text-dim)", fontSize: "0.78rem" },
  linkBtn: {
    background: "none", border: "none", color: "var(--accent)",
    fontSize: "0.78rem", cursor: "pointer", padding: 0,
  },
  treeBox: {
    border: "1px solid var(--border)", borderRadius: "6px",
    backgroundColor: "var(--bg-panel)",
    minHeight: 100, maxHeight: 360, overflowY: "auto",
  },
  placeholder: {
    color: "var(--text-dim)", fontSize: "0.85rem",
    textAlign: "center", padding: "28px 0", margin: 0,
  },
  sectionRow: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "6px 8px", borderBottom: "1px solid var(--border)",
    backgroundColor: "var(--bg)", userSelect: "none",
    position: "sticky", top: 0, zIndex: 1,
  },
  chevron: {
    color: "var(--text-dim)", fontSize: "0.62rem",
    width: 12, textAlign: "center", cursor: "pointer", flexShrink: 0,
  },
  sectionLabel: {
    flex: 1, color: "var(--text)", fontWeight: 600, fontSize: "0.83rem",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  pill: {
    color: "var(--text-dim)", fontSize: "0.7rem",
    backgroundColor: "var(--bg-panel)", borderRadius: "10px",
    padding: "1px 7px", flexShrink: 0,
  },
  caseRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "4px 8px", borderBottom: "1px solid var(--border)",
    cursor: "pointer", userSelect: "none", transition: "background 0.1s",
  },
  caseTitle: {
    flex: 1, color: "var(--text-muted)", fontSize: "0.8rem",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  caseType: {
    color: "var(--text-dim)", fontSize: "0.7rem", fontFamily: "monospace", flexShrink: 0,
  },
  btn: {
    padding: "10px 20px", borderRadius: "6px", border: "none",
    backgroundColor: "var(--accent)", color: "white",
    fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start",
  },
  btnSecondary: {
    padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--border)",
    backgroundColor: "transparent", color: "var(--text-muted)",
    fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start",
  },
  error: { color: "#f87171", fontSize: "0.85rem" },
  warningBox: {
    backgroundColor: "var(--bg-panel)", border: "1px solid #f97316",
    borderRadius: "6px", padding: "10px 14px", color: "#f97316", fontSize: "0.85rem",
  },
  previewBox: {
    backgroundColor: "var(--bg-panel)", borderRadius: "6px",
    padding: "12px", display: "flex", flexDirection: "column", gap: "8px",
  },
  previewHeader:  { color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  previewList: {
    display: "flex", flexDirection: "column", gap: "3px",
    maxHeight: "220px", overflowY: "auto",
  },
  previewRow: {
    display: "grid", gridTemplateColumns: "140px 20px 140px 1fr",
    alignItems: "center", gap: "8px",
    padding: "3px 4px", borderRadius: "4px", minWidth: 0,
  },
  previewOld:     { color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  arrow:          { color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "center" },
  previewNew:     { color: "#22c55e", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewSkip:    { color: "var(--text-dim)", fontSize: "0.8rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewTitle:   { color: "var(--text-dim)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "4px", borderLeft: "1px solid var(--border)" },
  previewActions: { display: "flex", gap: "8px", marginTop: "4px" },
  results: {
    backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  resultSummary: { color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  resultList:    { display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" },
  resultRow:     { display: "flex", alignItems: "center", gap: "8px" },
  resultText:    { color: "var(--text-muted)", fontSize: "0.82rem" },
};