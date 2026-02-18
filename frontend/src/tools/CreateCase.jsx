import { useState } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

export default function CreateCase({ credentials, selectedProject, selectedSuite, selectedSection }) {
  const [title, setTitle] = useState("");
  const [testCaseId, setTestCaseId] = useState("");
  const [testName, setTestName] = useState("");
  const [category, setCategory] = useState("");
  const [useCase, setUseCase] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.post(`${BASE_URL}/api/cases/create`, {
        ...credentials,
        section_id: selectedSection.id,
        suite_id: selectedSuite?.id || null,
        title: title.trim(),
        fields: {
          custom_tc_test_case_id: testCaseId,
          custom_tc_name: testName,
          custom_tc_category: category,
          custom_tc_use_case: useCase,
          custom_steps: steps,
          custom_expected: expectedResult,
        },
      });
      setSuccess("Case created successfully!");
      setTitle("");
      setTestCaseId("");
      setTestName("");
      setCategory("");
      setUseCase("");
      setSteps("");
      setExpectedResult("");
    } catch (err) {
      setError("Failed to create case. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Create Case</h3>
      <p style={styles.description}>
        {selectedSection
            ? `Creating in: ${selectedProject?.name || ""}${selectedSuite ? " > " + selectedSuite.name : ""} > ${selectedSection.name}`
            : "Select a section in the tree first."}
      </p>

      {(!selectedProject || !selectedSection) && (
        <div style={styles.warningBox}>
          {!selectedProject
            ? "Please select a project from the left panel first."
            : "Please select a section from the case tree first."}
        </div>
      )}

      <div style={styles.field}>
        <label style={styles.label}>Title *</label>
        <input
          style={styles.input}
          type="text"
          placeholder="Test case title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Test Case ID</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. TC_0001"
          value={testCaseId}
          onChange={(e) => setTestCaseId(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Test Name</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. verify_login_success"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Category</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. Smoke, Regression"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Use Case</label>
        <textarea
          style={styles.textarea}
          placeholder="Describe the use case"
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Test Steps</label>
        <textarea
          style={styles.textarea}
          placeholder="Step by step instructions"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Expected Result</label>
        <textarea
          style={styles.textarea}
          placeholder="What should happen"
          value={expectedResult}
          onChange={(e) => setExpectedResult(e.target.value)}
        />
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      <button
        style={{ ...styles.btn, opacity: (!selectedProject || !selectedSection) ? 0.4 : 1 }}
        onClick={handleCreate}
        disabled={loading || !selectedProject || !selectedSection}
      >
        {loading ? "Creating..." : "Create Case"}
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