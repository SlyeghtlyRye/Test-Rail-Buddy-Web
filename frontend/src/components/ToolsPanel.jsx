import { useState, useCallback, useRef } from "react";
import ExportCases from "../tools/ExportCases";
import CreateCase from "../tools/CreateCase";
import BulkEditIDs from "../tools/BulkEditIDs";
import FixTestNames from "../tools/FixTestNames";
import ConvertFormat from "../tools/ConvertFormat";
import CreateSection from "../tools/CreateSection";
import Settings from "../tools/Settings";

const TOOLS = [
  { id: "create_case",    label: "Create Case",        component: CreateCase },
  { id: "create_section", label: "Create Section",     component: CreateSection },
  { id: "export_cases",   label: "Export Cases",       component: ExportCases },
  { id: "bulk_edit_ids",  label: "Bulk Edit Case IDs", component: BulkEditIDs },
  { id: "fix_test_names", label: "Fix Test Names",     component: FixTestNames },
  { id: "convert_format", label: "Convert Format",     component: ConvertFormat },
  { id: "settings",       label: "Settings",           component: Settings },
];

const MIN_W = 600;
const MIN_H = 400;
const MAX_W = window.innerWidth  * 0.98;
const MAX_H = window.innerHeight * 0.98;

export default function ToolsPanel({ onClose, credentials, selectedProject, selectedSuite, selectedSection, sections, onCaseCreated, onOpenCase }) {
  const [activeTool, setActiveTool] = useState(null);
  const [size, setSize] = useState({ w: 1100, h: 700 });
  const dragRef = useRef(null);
  const isResizing = useRef(false);

  const ActiveComponent = activeTool ? TOOLS.find(t => t.id === activeTool)?.component : null;

  // ── Resize logic ─────────────────────────────────────────────────────────────
  const startResize = useCallback((e, edge) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    dragRef.current = { edge, startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };

    function onMove(ev) {
      const { edge, startX, startY, startW, startH } = dragRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setSize(prev => {
        let w = prev.w, h = prev.h;
        if (edge.includes("e")) w = Math.min(MAX_W, Math.max(MIN_W, startW + dx));
        if (edge.includes("w")) w = Math.min(MAX_W, Math.max(MIN_W, startW - dx));
        if (edge.includes("s")) h = Math.min(MAX_H, Math.max(MIN_H, startH + dy));
        if (edge.includes("n")) h = Math.min(MAX_H, Math.max(MIN_H, startH - dy));
        return { w, h };
      });
    }

    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Delay reset so the overlay onClick check catches it
      setTimeout(() => { isResizing.current = false; }, 50);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size]);

  const handleOverlayClick = () => {
    if (isResizing.current) return;
    onClose();
  };

  // ── Handle styles ─────────────────────────────────────────────────────────────
  const handle = (edge, cursor, style) => (
    <div
      onMouseDown={e => startResize(e, edge)}
      style={{ position: "absolute", cursor, zIndex: 10, ...style }}
    />
  );

  const THICK = 6;
  const CORNER = 14;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div
        style={{ ...styles.panel, width: size.w, height: size.h }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Resize handles ── */}
        {handle("n",  "n-resize",  { top: 0,    left: CORNER, right: CORNER, height: THICK })}
        {handle("s",  "s-resize",  { bottom: 0, left: CORNER, right: CORNER, height: THICK })}
        {handle("e",  "e-resize",  { right: 0,  top: CORNER, bottom: CORNER, width: THICK })}
        {handle("w",  "w-resize",  { left: 0,   top: CORNER, bottom: CORNER, width: THICK })}
        {handle("nw", "nw-resize", { top: 0,    left: 0,   width: CORNER, height: CORNER })}
        {handle("ne", "ne-resize", { top: 0,    right: 0,  width: CORNER, height: CORNER })}
        {handle("sw", "sw-resize", { bottom: 0, left: 0,   width: CORNER, height: CORNER })}
        {handle("se", "se-resize", { bottom: 0, right: 0,  width: CORNER, height: CORNER })}

        {/* ── Corner resize handle (visual) ── */}
        <div
          onMouseDown={e => startResize(e, "se")}
          style={styles.resizeHandle}
          title="Drag to resize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M11 1L1 11M11 6L6 11" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* ── Header ── */}
        <div style={styles.header}>
          <h2 style={styles.title}>Tools</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={styles.body}>
          <div style={styles.toolList}>
            {TOOLS.map(tool => (
              <div
                key={tool.id}
                style={{
                  ...styles.toolItem,
                  backgroundColor: activeTool === tool.id ? "var(--accent)" : "var(--bg-panel)",
                  color: activeTool === tool.id ? "#fff" : "var(--text)",
                }}
                onClick={() => setActiveTool(tool.id)}
              >
                {tool.label}
              </div>
            ))}
          </div>

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
                onCaseCreated={onCaseCreated}
                onOpenCase={onOpenCase}
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
    position: "relative",
    backgroundColor: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: "12px",
    display: "flex", flexDirection: "column",
    userSelect: "none",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid var(--border)",
    flexShrink: 0,
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
    width: "200px", flexShrink: 0, borderRight: "1px solid var(--border)",
    padding: "12px", display: "flex", flexDirection: "column", gap: "6px",
    overflowY: "auto",
  },
  toolItem: {
    padding: "10px 12px", borderRadius: "6px",
    fontSize: "0.9rem", cursor: "pointer", transition: "background 0.15s",
  },
  toolContent: {
    flex: 1, padding: "20px", overflowY: "auto",
  },
  hint: {
    color: "var(--text-dim)", fontSize: "0.95rem", marginTop: "40px", textAlign: "center",
  },
  resizeHandle: {
    position: "absolute", bottom: "4px", right: "4px",
    cursor: "se-resize", padding: "4px", opacity: 0.5, lineHeight: 0, zIndex: 11,
  },
};