import { useState } from "react";
import ExportCases from "../tools/ExportCases";
import CreateCase from "../tools/CreateCase";
import BulkEditIDs from "../tools/BulkEditIDs";
import FixTestNames from "../tools/FixTestNames";
import ConvertFormat from "../tools/ConvertFormat";
import CreateSection from "../tools/CreateSection";
import Settings from "../tools/Settings";
const TOOLS = [
  { id: "create_case", label: "Create Case", component: CreateCase },
  { id: "create_section", label: "Create Section", component: CreateSection },
  { id: "export_cases", label: "Export Cases", component: ExportCases },
  { id: "bulk_edit_ids", label: "Bulk Edit Case IDs", component: BulkEditIDs },
  { id: "fix_test_names", label: "Fix Test Names", component: FixTestNames },
  { id: "convert_format", label: "Convert Format", component: ConvertFormat },
  { id: "settings", label: "Settings", component: Settings },
];

export default function ToolsPanel({ onClose, credentials, selectedProject, selectedSuite, selectedSection, sections }) {
  const [activeTool, setActiveTool] = useState(null);

  const ActiveComponent = activeTool ? TOOLS.find(t => t.id === activeTool)?.component : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>

        <div style={styles.header}>
          <h2 style={styles.title}>Tools</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {/* TOOL LIST */}
          <div style={styles.toolList}>
            {TOOLS.map((tool) => (
              <div
                key={tool.id}
                style={{
                  ...styles.toolItem,
                  backgroundColor: activeTool === tool.id ? "var(--accent)" : "var(--bg-panel)",

                }}
                onClick={() => setActiveTool(tool.id)}
              >
                {tool.label}
              </div>
            ))}
          </div>

          {/* TOOL CONTENT */}
          <div style={styles.toolContent}>
            {!activeTool && (
              <p style={styles.hint}>Select a tool from the list</p>
            )}
            {ActiveComponent && (
            <ActiveComponent
                credentials={credentials}
                selectedProject={selectedProject}
                selectedSuite={selectedSuite}
                selectedSection={selectedSection}
                sections={sections}
            />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  panel: {
    backgroundColor: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: "12px", width: "800px", maxWidth: "95vw",
    height: "600px", maxHeight: "90vh",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid var(--border)",
  },
  title: { color: "var(--text)", fontSize: "1.1rem", margin: 0 },
  closeBtn: {
    background: "none", border: "none", color: "var(--text-muted)",
    cursor: "pointer", fontSize: "1rem", padding: "4px 8px",
  },
  body: {
    display: "flex", flex: 1, overflow: "hidden",
  },
  toolList: {
    width: "200px", borderRight: "1px solid var(--border)",
    padding: "12px", display: "flex", flexDirection: "column", gap: "6px",
    overflowY: "auto",
  },
  toolItem: {
    padding: "10px 12px", borderRadius: "6px", color: "var(--text)",
    fontSize: "0.9rem", cursor: "pointer",
  },
  toolContent: {
    flex: 1, padding: "20px", overflowY: "auto",
  },
  hint: {
    color: "var(--text-dim)", fontSize: "0.95rem", marginTop: "40px", textAlign: "center",
  },
};