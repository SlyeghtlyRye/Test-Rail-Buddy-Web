import { useState } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

export default function ExportCases({ credentials, selectedProject, selectedSuite, selectedSection }) {
  const [stripHtml, setStripHtml] = useState(true);
  const [includeLinks, setIncludeLinks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${BASE_URL}/api/tools/export-csv`,
        {
          ...credentials,
          project_id: selectedProject.id,
          suite_id: selectedSuite?.id || null,
          section_id: selectedSection?.id || null,
          strip_html: stripHtml,
          include_links: includeLinks,
        },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "testrail_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Export failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Export Cases</h3>
      <p style={styles.description}>
        Export test cases to a CSV file.
        {selectedProject ? ` Exporting from: ${selectedProject.name}` : " No project selected."}
      </p>

      {!selectedProject && (
        <div style={styles.warningBox}>
          Please select a project from the left panel first.
        </div>
      )}

      <div style={styles.optionRow}>
        <label style={styles.optionLabel}>
          <input
            type="checkbox"
            checked={stripHtml}
            onChange={(e) => setStripHtml(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Strip HTML from fields
        </label>
      </div>

      <div style={styles.optionRow}>
        <label style={styles.optionLabel}>
          <input
            type="checkbox"
            checked={includeLinks}
            onChange={(e) => setIncludeLinks(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Include TestRail links
        </label>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        style={{ ...styles.btn, opacity: !selectedProject ? 0.4 : 1 }}
        onClick={handleExport}
        disabled={loading || !selectedProject}
      >
        {loading ? "Exporting..." : "Download CSV"}
      </button>
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