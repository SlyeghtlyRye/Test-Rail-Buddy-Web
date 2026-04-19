import { useRef, useState, useEffect } from "react";
import axios from "axios";
import CaseForm from "./CaseForm";

const BASE_URL = "http://localhost:8000";

function DemoBanner({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", backgroundColor: "#3b82f611", border: "1px solid #3b82f630", marginBottom: "8px" }}>
      <span style={{ fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.1em", color: "#3b82f6", backgroundColor: "#3b82f615", border: "1px solid #3b82f640", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}>DEMO</span>
      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{children}</span>
    </div>
  );
}

export default function CreateCase({ credentials, selectedProject, selectedSuite, selectedSection, sections, onCaseCreated }) {
  const isDemo = !!credentials?.demo;

  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [targetSection, setTargetSection] = useState(selectedSection);
  const [success, setSuccess]             = useState("");
  const containerRef = useRef(null);

  useEffect(() => { setTargetSection(selectedSection); }, [selectedSection?.id]);

  const handleSubmit = async (fields, createAnother) => {
    if (!fields.title?.trim())                    { setError("Title is required."); return; }
    if (!fields.custom_tc_test_case_id?.trim())   { setError("Test Case ID is required."); return; }
    if (!targetSection)                           { setError("Please select a section."); return; }

    setSaving(true); setError(""); setSuccess("");

    if (isDemo) {
      // Simulate a successful save
      await new Promise(r => setTimeout(r, 400));
      if (createAnother) {
        setSuccess(`Demo: Case "${fields.title}" would be created.`);
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        if (onCaseCreated) onCaseCreated(targetSection.id, false, null);
      }
      setSaving(false);
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/cases/create`, {
        ...credentials,
        section_id: targetSection.id,
        suite_id:   selectedSuite?.id || null,
        title:      fields.title.trim(),
        fields: {
          custom_tc_test_case_id: fields.custom_tc_test_case_id,
          custom_tc_name:         fields.custom_tc_name,
          custom_tc_category:     fields.custom_tc_category,
          custom_tc_use_case:     fields.custom_tc_use_case,
          custom_tc_preconditions:fields.custom_preconds,
          custom_preconds:        fields.custom_preconds,
          custom_steps:           fields.custom_steps,
          custom_expected:        fields.custom_expected,
          custom_tc_test_data:    fields.custom_tc_test_data,
          custom_tc_figma_spec:   fields.custom_tc_figma_spec,
          ...Object.fromEntries(
            Object.entries(fields).filter(([k]) =>
              k.startsWith("custom_") && !["custom_tc_test_case_id","custom_tc_name","custom_tc_category","custom_tc_use_case","custom_preconds","custom_steps","custom_expected","custom_tc_test_data","custom_tc_figma_spec"].includes(k)
            )
          ),
        },
      });
      if (onCaseCreated) onCaseCreated(targetSection.id, createAnother, res.data?.id || null);
      if (createAnother) containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to create case.");
    }
    setSaving(false);
  };

  return (
    <div ref={containerRef}>
      <h3 style={{ color: "var(--text)", fontSize: "1rem", margin: "0 0 4px 0" }}>Create Case</h3>

      {isDemo && <DemoBanner>Case creation is simulated — nothing is saved in demo mode.</DemoBanner>}

      {!selectedProject && (
        <div style={styles.warning}>Please select a project from the left panel first.</div>
      )}

      {success && <p style={{ color: "#22c55e", fontSize: "0.85rem", margin: "0 0 8px" }}>{success}</p>}

      <CaseForm
        credentials={credentials}
        selectedProject={selectedProject}
        selectedSuite={selectedSuite}
        selectedSection={targetSection}
        sections={sections || []}
        onSectionChange={sec => setTargetSection(sec)}
        initialValues={null}
        onSubmit={handleSubmit}
        submitLabel="Save"
        showCreateAnother={true}
        error={error}
        saving={saving}
      />
    </div>
  );
}

const styles = {
  warning: { backgroundColor: "var(--bg-panel)", border: "1px solid #f97316", borderRadius: "6px", padding: "10px 14px", color: "#f97316", fontSize: "0.85rem", marginBottom: "14px" },
};