import { useState } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

export default function ConvertFormat({ credentials, selectedProject, selectedSuite, selectedSection }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  const handleConvert = async () => {
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const casesRes = await axios.post(`${BASE_URL}/api/cases/`, {
        ...credentials,
        project_id: selectedProject.id,
        suite_id: selectedSuite?.id || null,
        section_id: selectedSection.id,
      });
      const cases = casesRes.data.cases;
      if (cases.length === 0) {
        setError("No cases found in this section.");
        setLoading(false);
        return;
      }
      let updated = 0, skipped = 0, errors = 0;
      const resultList = [];
      for (const c of cases) {
        const hasOldFormat = c.custom_steps && !c.custom_steps_separated;
        if (!hasOldFormat) {
          skipped++;
          resultList.push({ case_id: c.id, title: c.title, skipped: true });
          continue;
        }
        try {
          await axios.post(`${BASE_URL}/api/cases/${c.id}/update`, {
            ...credentials,
            fields: {
              custom_steps_separated: [
                { content: c.custom_steps, expected: c.custom_expected || "" }
              ],
            },
          });
          updated++;
          resultList.push({ case_id: c.id, title: c.title, ok: true });
        } catch (err) {
          errors++;
          resultList.push({ case_id: c.id, title: c.title, ok: false, error: "Update failed" });
        }
      }
      setResults({ updated, skipped, errors, results: resultList });
    } catch (err) {
      setError("Convert failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Convert Format</h3>
      <p style={styles.description}>
        Converts cases from old text format to new separated steps format.
        {selectedSection
            ? ` ${selectedProject?.name || ""}${selectedSuite ? " > " + selectedSuite.name : ""} > ${selectedSection.name}`
            : " Select a section in the tree first."}
      </p>

      {(!selectedProject || !selectedSection) && (
        <div style={styles.warningBox}>
          {!selectedProject
            ? "Please select a project from the left panel first."
            : "Please select a section from the case tree first."}
        </div>
      )}

      <div style={styles.infoBox}>
        <p style={styles.infoText}><strong>Old format:</strong> Steps and expected results in a single text field.</p>
        <p style={styles.infoText}><strong>New format:</strong> Steps separated into individual step objects with expected results.</p>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        style={{ ...styles.btn, opacity: (!selectedProject || !selectedSection) ? 0.4 : 1 }}
        onClick={handleConvert}
        disabled={loading || !selectedProject || !selectedSection}
      >
        {loading ? "Converting..." : "Convert Cases"}
      </button>

      {results && (
        <div style={styles.results}>
          <p style={styles.resultSummary}>
            ✓ Updated: {results.updated} &nbsp;|&nbsp;
            Skipped: {results.skipped}
            {results.errors > 0 && <span style={{ color: "#f87171" }}> &nbsp;|&nbsp; ✕ Errors: {results.errors}</span>}
          </p>
          <div style={styles.resultList}>
            {results.results.map((r, i) => (
              <div key={i} style={styles.resultRow}>
                <span style={{ color: r.skipped ? "#64748b" : r.ok ? "#22c55e" : "#f87171" }}>
                  {r.skipped ? "—" : r.ok ? "✓" : "✕"}
                </span>
                <span style={styles.resultText}>
                  {r.skipped ? `Case ${r.case_id} already new format` : `Case ${r.case_id} converted`}
                  {r.error && <span style={{ color: "#f87171" }}> ({r.error})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "14px" },
  heading: { color: "var(--text)", fontSize: "1rem", margin: 0 },
  description: { color: "var(--text-muted)", fontSize: "0.88rem" },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  input: {
    padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)",
    backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", outline: "none",
  },
  textarea: {
    padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)",
    backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem",
    outline: "none", minHeight: "80px", resize: "vertical", fontFamily: "sans-serif",
  },
  select: {
    padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)",
    backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer",
  },
  optionRow: { display: "flex", alignItems: "center" },
  optionLabel: { color: "var(--text)", fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center" },
  hint: { color: "var(--text-dim)", fontSize: "0.78rem" },
  btn: {
    padding: "10px 20px", borderRadius: "6px", border: "none",
    backgroundColor: "var(--accent)", color: "white", fontSize: "0.9rem",
    cursor: "pointer", alignSelf: "flex-start",
  },
  error: { color: "#f87171", fontSize: "0.85rem" },
  success: { color: "#22c55e", fontSize: "0.85rem" },
  warningBox: {
    backgroundColor: "var(--bg-panel)", border: "1px solid #f97316",
    borderRadius: "6px", padding: "10px 14px",
    color: "#f97316", fontSize: "0.85rem",
  },
  infoBox: {
    backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px",
    display: "flex", flexDirection: "column", gap: "6px",
  },
  infoText: { color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 },
  results: {
    backgroundColor: "var(--bg-panel)", borderRadius: "6px", padding: "12px",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  resultSummary: { color: "var(--text)", fontSize: "0.88rem", margin: 0 },
  resultList: { display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" },
  resultRow: { display: "flex", alignItems: "center", gap: "8px" },
  resultText: { color: "var(--text-muted)", fontSize: "0.82rem" },
};