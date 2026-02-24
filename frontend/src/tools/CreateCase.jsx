import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CaseForm from "./CaseForm";

const BASE_URL = "http://localhost:8000";

export default function CreateCase({ credentials, selectedProject, selectedSuite, selectedSection, sections, onCaseCreated }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [targetSection, setTargetSection] = useState(selectedSection);
  const containerRef = useRef(null);
  const [createdCaseId, setCreatedCaseId] = useState(null);
  // Keep targetSection in sync if selectedSection changes externally
  useEffect(() => {
    setTargetSection(selectedSection);
  }, [selectedSection?.id]);

  const handleSubmit = async (fields, createAnother) => {
    if (!fields.title?.trim()) { setError("Title is required."); return; }
    if (!fields.custom_tc_test_case_id?.trim()) { setError("Test Case ID is required."); return; }
    if (!targetSection) { setError("Please select a section."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await axios.post(`${BASE_URL}/api/cases/create`, {
        ...credentials,
        section_id: targetSection.id,
        suite_id: selectedSuite?.id || null,
        title: fields.title.trim(),
        fields: {
          custom_tc_test_case_id: fields.custom_tc_test_case_id,
          custom_tc_name: fields.custom_tc_name,
          custom_tc_category: fields.custom_tc_category,
          custom_tc_use_case: fields.custom_tc_use_case,
          custom_tc_preconditions: fields.custom_preconds,
          custom_preconds: fields.custom_preconds,
          custom_steps: fields.custom_steps,
          custom_expected: fields.custom_expected,
          custom_tc_test_data: fields.custom_tc_test_data,
          custom_tc_figma_spec: fields.custom_tc_figma_spec,
          ...Object.fromEntries(
            Object.entries(fields).filter(([k]) =>
              k.startsWith("custom_") && ![
                "custom_tc_test_case_id","custom_tc_name","custom_tc_category",
                "custom_tc_use_case","custom_preconds","custom_steps",
                "custom_expected","custom_tc_test_data","custom_tc_figma_spec",
              ].includes(k)
            )
          ),
        },
      });
      if (onCaseCreated) onCaseCreated(targetSection.id, createAnother, res.data?.id || null);
      setCreatedCaseId(res.data?.id || null);
      if (createAnother) containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to create case.");
    }
    setSaving(false);
  };

  // Flat sorted list of all sections for the dropdown
  const sectionOptions = sections || [];
  console.log("sections:", sections, "sectionOptions:", sectionOptions);

  return (
    <div ref={containerRef}>
      <h3 style={{ color: "var(--text)", fontSize: "1rem", margin: "0 0 4px 0" }}>Create Case</h3>

      {!selectedProject && (
        <div style={styles.warning}>Please select a project from the left panel first.</div>
      )}

      <CaseForm
        credentials={credentials}
        selectedProject={selectedProject}
        selectedSuite={selectedSuite}
        selectedSection={targetSection}
        sections={sectionOptions}
        onSectionChange={sec => setTargetSection(sec)}
        initialValues={null}
        onSubmit={handleSubmit}
        submitLabel="Save"
        showCreateAnother={true}
        error={error}
        saving={saving}
        onSimulate={createdCaseId ? () => navigate(`/simulate/${createdCaseId}`) : null}
      />
    </div>
  );
}

const styles = {
  label: { color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  select: { padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-panel)", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer" },
  warning: { backgroundColor: "var(--bg-panel)", border: "1px solid #f97316", borderRadius: "6px", padding: "10px 14px", color: "#f97316", fontSize: "0.85rem", marginBottom: "14px" },
  simulateBtn: { padding: "4px 12px", borderRadius: "6px", border: "1px solid #7c3aed", backgroundColor: "rgba(124,58,237,0.1)", color: "#a78bfa", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" },

};