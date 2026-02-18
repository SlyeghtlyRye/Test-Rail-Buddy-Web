import { useState } from "react";
import { createSection } from "../api";

export default function CreateSection({ credentials, selectedProject, selectedSuite, selectedSection, sections }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Section name is required.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await createSection(
        credentials,
        selectedProject.id,
        name.trim(),
        selectedSuite?.id || null,
        parentId || null
      );
      setSuccess(`Section "${name}" created successfully!`);
      setName("");
      setParentId("");
    } catch (err) {
      setError("Failed to create section. Please try again.");
    }
    setLoading(false);
  };

  const buildTree = (sections, parentId = null, depth = 0) => {
    return sections
      .filter((s) => (s.parent_id || null) === parentId)
      .flatMap((s) => [
        <option key={s.id} value={s.id}>
          {"—".repeat(depth)} {s.name}
        </option>,
        ...buildTree(sections, s.id, depth + 1),
      ]);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Create Section</h3>
      <p style={styles.description}>
        {selectedProject
          ? `Project: ${selectedProject.name}${selectedSuite ? " > " + selectedSuite.name : ""}`
          : "Select a project first."}
      </p>

      {!selectedProject && (
        <div style={styles.warningBox}>
          Please select a project from the left panel first.
        </div>
      )}

      <div style={styles.field}>
        <label style={styles.label}>Section Name *</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. Login Tests"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Parent Section (optional)</label>
        <select
          style={styles.select}
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">None (top level)</option>
          {sections && buildTree(sections)}
        </select>
        <span style={styles.hint}>
          Choose a parent to nest this section inside an existing folder.
        </span>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      <button
        style={{ ...styles.btn, opacity: !selectedProject ? 0.4 : 1 }}
        onClick={handleCreate}
        disabled={loading || !selectedProject}
      >
        {loading ? "Creating..." : "Create Section"}
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