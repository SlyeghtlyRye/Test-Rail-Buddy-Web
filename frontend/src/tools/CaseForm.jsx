import { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

const TYPE_TEXTAREA = 3;
const TYPE_CHECKBOX = 5;
const TYPE_DROPDOWN = 6;
const TYPE_MULTISELECT = 12;

const FIXED_FIELDS = [
  "custom_tc_test_case_id","custom_tc_name","custom_tc_category",
  "custom_tc_use_case","custom_steps","custom_expected",
  "custom_tc_preconditions","custom_tc_test_data","custom_tc_figma_spec",
  "custom_preconds","custom_expected_result","custom_steps_separated",
];

function parseOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.split("\n").filter(Boolean).map(line => {
    const [id, ...rest] = line.split(",");
    return { id: id.trim(), label: rest.join(",").trim() };
  });
}


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

export default function CaseForm({
  credentials,
  selectedProject,
  selectedSuite,
  selectedSection,
  initialValues = null,
  onSubmit,
  onCancel = null,
  onDelete = null,
  onSimulate = null,
  recordingExists = null,
  submitLabel = "Save",
  showCreateAnother = false,
  error = "",
  saving = false,
  sections = null,
  onSectionChange = null,
}) {
  const [fields, setFields] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [extraOpen, setExtraOpen] = useState(false);
  const [idLoading, setIdLoading] = useState(false);
  const [idApplied, setIdApplied] = useState(false);

  useEffect(() => {
    if (!credentials) return;
    axios.post(`${BASE_URL}/api/cases/fields`, credentials)
      .then(res => {
        const custom = res.data.filter(f =>
          f.system_name.startsWith("custom_") && f.is_active && !FIXED_FIELDS.includes(f.system_name)
        );
        setCustomFields(custom);
        const base = initialValues ? buildFromExisting(initialValues, custom) : buildDefaults(custom);
        setFields(base);
        setIdApplied(!!base.custom_tc_test_case_id);
      })
      .catch(err => console.error("Failed to load fields", err));
  }, []);

  useEffect(() => {
    if (initialValues || !selectedSection || !fields) return;
    autoAssignId(true);
  }, [selectedSection?.id]);

  const buildDefaults = (custom) => {
    const base = {
      title: "", custom_tc_test_case_id: "", custom_tc_name: "",
      custom_tc_category: "", custom_preconds: "", custom_tc_use_case: "",
      custom_steps: "", custom_expected: "", custom_tc_test_data: "",
      custom_tc_figma_spec: "",
    };
    custom.forEach(f => {
      if (f.type_id === TYPE_DROPDOWN || f.type_id === TYPE_MULTISELECT) {
        const opts = parseOptions(f.configs?.[0]?.options?.items);
        base[f.system_name] = opts[0]?.id ?? "";
      } else if (f.type_id === TYPE_CHECKBOX) {
        base[f.system_name] = false;
      } else {
        base[f.system_name] = "";
      }
    });
    return base;
  };

  const buildFromExisting = (existing, custom) => {
    const base = {
      title: existing.title || "",
      custom_tc_test_case_id: existing.custom_tc_test_case_id || "",
      custom_tc_name: existing.custom_tc_name || "",
      custom_tc_category: existing.custom_tc_category || "",
      custom_preconds: stripHtml(existing.custom_preconds || ""),
      custom_tc_use_case: stripHtml(existing.custom_tc_use_case || ""),
      custom_steps: stripHtml(existing.custom_steps || ""),
      custom_expected: stripHtml(existing.custom_expected || ""),
      custom_tc_test_data: stripHtml(existing.custom_tc_test_data || ""),
      custom_tc_figma_spec: existing.custom_tc_figma_spec || "",
    };
    custom.forEach(f => {
      const key = f.system_name;
      base[key] = existing[key] !== undefined ? existing[key]
        : f.type_id === TYPE_CHECKBOX ? false
        : (f.type_id === TYPE_DROPDOWN || f.type_id === TYPE_MULTISELECT)
          ? (parseOptions(f.configs?.[0]?.options?.items)[0]?.id ?? "")
          : "";
    });
    return base;
  };

  const set = (key, val) => setFields(p => ({ ...p, [key]: val }));

  const autoAssignId = async (silent = false) => {
    if (!selectedProject || !selectedSection) return;
    if (!silent) { setIdLoading(true); setIdApplied(false); }
    try {
      const res = await axios.post(`${BASE_URL}/api/cases/`, {
        ...credentials,
        project_id: selectedProject.id,
        suite_id: selectedSuite?.id || null,
        section_id: selectedSection.id,
        limit: 250,
      });
      const ids = (res.data.cases || []).map(c => c.custom_tc_test_case_id).filter(Boolean);
      const pattern = /^([A-Za-z_]+)_(\d+)$/;
      const matches = ids.map(id => id.match(pattern)).filter(Boolean);
      if (matches.length > 0) {
        const latest = matches.reduce((max, m) => parseInt(m[2]) > parseInt(max[2]) ? m : max);
        const nextNum = String(parseInt(latest[2]) + 1).padStart(latest[2].length, "0");
        setFields(p => ({ ...p, custom_tc_test_case_id: `${latest[1]}_${nextNum}` }));
        setIdApplied(true);
      } else {
        if (!silent) setFields(p => ({ ...p, custom_tc_test_case_id: "." }));
      }
    } catch {
      if (!silent) setFields(p => ({ ...p, custom_tc_test_case_id: "." }));
    }
    if (!silent) setIdLoading(false);
  };

  const renderDynamicField = (f) => {
    const key = f.system_name;
    const label = f.name.replace(/_/g, " ");
    const val = fields?.[key] ?? "";
    if (f.type_id === TYPE_DROPDOWN || f.type_id === TYPE_MULTISELECT) {
      const opts = parseOptions(f.configs?.[0]?.options?.items);
      return (
        <div key={key} style={styles.field}>
          <label style={styles.label}>{label}</label>
          <select style={styles.select} value={val} onChange={e => set(key, e.target.value)}>
            {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    if (f.type_id === TYPE_TEXTAREA)
      return <div key={key} style={styles.field}><label style={styles.label}>{label}</label><textarea style={styles.textarea} value={val} onChange={e => set(key, e.target.value)} /></div>;
    if (f.type_id === TYPE_CHECKBOX)
      return <div key={key} style={{ ...styles.field, flexDirection: "row", alignItems: "center", gap: "8px" }}><input type="checkbox" checked={!!val} onChange={e => set(key, e.target.checked)} /><label style={styles.label}>{label}</label></div>;
    return <div key={key} style={styles.field}><label style={styles.label}>{label}</label><input style={styles.input} type="text" value={val} onChange={e => set(key, e.target.value)} /></div>;
  };

  if (!fields) return <p style={{ color: "var(--text-muted)" }}>Loading fields...</p>;

  return (
    <div style={styles.container}>
      {/* Section selector — only in create mode */}
      {sections && (
        <div style={styles.field}>
          <label style={styles.label}>Section</label>
          {sections.length === 0
            ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No sections available — select a suite first.</p>
            : (
              <select
                style={styles.select}
                value={selectedSection?.id || ""}
                onChange={e => {
                  const sec = sections.find(sec => sec.id === parseInt(e.target.value));
                  if (onSectionChange) onSectionChange(sec || null);
                }}
              >
                <option value="" disabled>Select a section...</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </select>
            )
          }
        </div>
      )}

    <div style={styles.field}>
        <label style={styles.label}>Title *</label>
        <input style={styles.input} type="text" placeholder="Test case title" value={fields.title} onChange={e => set("title", e.target.value)} />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Test Name</label>
        <input style={styles.input} type="text" placeholder="e.g. verify_login_success" value={fields.custom_tc_name} onChange={e => set("custom_tc_name", e.target.value)} />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Test Case ID *</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            style={{ ...styles.input, flex: 1 }}
            type="text"
            placeholder="e.g. TC_0001"
            value={fields.custom_tc_test_case_id}
            onChange={e => { set("custom_tc_test_case_id", e.target.value); setIdApplied(false); }}
          />
          <button
            style={{ ...styles.btn, padding: "8px 12px", fontSize: "0.8rem", whiteSpace: "nowrap", minWidth: "64px", alignSelf: "stretch", backgroundColor: idApplied ? "#22c55e" : "var(--accent)" }}
            onClick={() => autoAssignId(false)}
            disabled={!selectedSection || idLoading}
            type="button"
          >
            {idLoading ? "..." : idApplied ? "↻ Auto" : "Auto"}
          </button>
        </div>
      </div>



      <div style={styles.collapseSection}>
        <div style={styles.collapseHeader} onClick={() => setExtraOpen(o => !o)}>
          <span style={styles.collapseIcon}>{extraOpen ? "▼" : "▶"}</span>
          <span style={styles.collapseLabel}>
            Additional Fields ({customFields.length + 1})
          </span>
        </div>
        {extraOpen && (
          <div style={styles.collapseBody}>
            <div style={styles.field}>
              <label style={styles.label}>Category</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. Smoke, Regression"
                value={fields.custom_tc_category}
                onChange={e => set("custom_tc_category", e.target.value)}
              />
            </div>
            {customFields.map(renderDynamicField)}
          </div>
        )}
      </div>

      {[
        ["custom_preconds",    "Preconditions",   "Any preconditions before running this test"],
        ["custom_tc_use_case", "Use Case",        "Describe the use case"],
        ["custom_steps",       "Test Steps",      "Step by step instructions"],
        ["custom_expected",    "Expected Result", "What should happen"],
        ["custom_tc_test_data","Test Data",       "Any test data needed"],
      ].map(([key, lbl, ph]) => (
        <div key={key} style={styles.field}>
          <label style={styles.label}>{lbl}</label>
          <textarea style={styles.textarea} placeholder={ph} value={fields[key]} onChange={e => set(key, e.target.value)} />
        </div>
      ))}

      <div style={styles.field}>
        <label style={styles.label}>Figma Spec</label>
        <input style={styles.input} type="text" placeholder="Figma link or spec reference" value={fields.custom_tc_figma_spec} onChange={e => set("custom_tc_figma_spec", e.target.value)} />
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {/* Sticky footer */}
      <div style={styles.stickyFooter}>
        <button
          style={{ ...styles.btn, opacity: (!selectedProject || !selectedSection) ? 0.4 : 1 }}
          onClick={() => onSubmit(fields, false)}
          disabled={saving || !selectedProject || !selectedSection}
          type="button"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        {showCreateAnother && (
          <button
            style={{ ...styles.btnSecondary, opacity: (!selectedProject || !selectedSection) ? 0.4 : 1 }}
            onClick={() => onSubmit(fields, true)}
            disabled={saving || !selectedProject || !selectedSection}
            type="button"
          >
            {saving ? "Saving..." : "Save & Create Another"}
          </button>
        )}
        {onCancel && (
          <button style={styles.btnCancel} onClick={onCancel} disabled={saving} type="button">
            Cancel
          </button>
        )}
        {onSimulate && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button style={styles.btnSimulate} onClick={onSimulate} type="button">
              ⏺ Simulation
            </button>
            <span style={{ fontSize: "0.8rem", color: recordingExists === true ? "#22c55e" : "#ef4444" }}>
              {recordingExists === true ? "Available" : "Missing"}
            </span>
          </div>
        )}
        {onDelete && (
          <button
            style={{ ...styles.btnDelete, marginLeft: "auto" }}
            onClick={() => { if (window.confirm("Delete this case? This cannot be undone.")) onDelete(); }}
            disabled={saving}
            type="button"
          >
            Delete
          </button>
        )}
      </div>

    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "72px" },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", outline: "none" },
  textarea: { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", outline: "none", minHeight: "80px", resize: "vertical", fontFamily: "sans-serif" },
  select: { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer" },
  btn: { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" },
  btnSecondary: { padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--accent)", backgroundColor: "transparent", color: "var(--accent)", fontSize: "0.9rem", cursor: "pointer" },
  btnCancel: { padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: "0.9rem", cursor: "pointer" },
  btnDelete: { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "#ef4444", color: "white", fontSize: "0.9rem", cursor: "pointer" },
  error: { color: "#f87171", fontSize: "0.85rem" },
  collapseSection: { border: "2px solid var(--accent)", borderRadius: "6px", overflow: "hidden", marginTop: "15px" },
  collapseHeader: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", cursor: "pointer", backgroundColor: "var(--bg)" },
  collapseIcon: { color: "var(--text-muted)", fontSize: "0.7rem" },
  collapseLabel: { color: "var(--text)", fontSize: "0.85rem" },
  collapseBody: { padding: "14px", display: "flex", flexDirection: "column", gap: "14px", borderTop: "1px solid var(--border)" },
  stickyFooter: { position: "sticky", bottom: 0, display: "flex", gap: "10px", alignItems: "center", padding: "12px 16px", backgroundColor: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "8px", zIndex: 10 },
  btnSimulate: { padding: "10px 20px", borderRadius: "6px", border: "1px solid #7c3aed", backgroundColor: "rgba(124,58,237,0.1)", color: "#a78bfa", fontSize: "0.9rem", cursor: "pointer", fontWeight: "600" },

};