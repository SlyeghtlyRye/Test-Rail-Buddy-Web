import { useState, useRef, useEffect, useCallback } from "react";

const NODES = [
  { id: "browser", label: "Browser", sub: "User Interface", x: 500, y: 30, color: "#64748b", group: "external" },
  { id: "app", label: "App.jsx", sub: "Router + AuthProvider", x: 500, y: 130, color: "#3b82f6", group: "frontend" },
  { id: "login", label: "LoginPage.jsx", sub: "Login form", x: 260, y: 240, color: "#3b82f6", group: "frontend" },
  { id: "projects", label: "ProjectsPage.jsx", sub: "Main 3-panel layout", x: 500, y: 240, color: "#3b82f6", group: "frontend" },
  { id: "authctx", label: "AuthContext.jsx", sub: "Credentials + sessionStorage", x: 760, y: 240, color: "#8b5cf6", group: "frontend" },
  { id: "toolspanel", label: "ToolsPanel.jsx", sub: "Tools modal", x: 260, y: 370, color: "#14b8a6", group: "component" },
  { id: "createcase", label: "CreateCase.jsx", sub: "Create test case", x: 60, y: 500, color: "#f97316", group: "tool" },
  { id: "createsection", label: "CreateSection.jsx", sub: "Create section", x: 220, y: 500, color: "#f97316", group: "tool" },
  { id: "export", label: "ExportCases.jsx", sub: "Export CSV", x: 380, y: 500, color: "#f97316", group: "tool" },
  { id: "bulkids", label: "BulkEditIDs.jsx", sub: "Bulk assign IDs", x: 60, y: 600, color: "#f97316", group: "tool" },
  { id: "fixnames", label: "FixTestNames.jsx", sub: "Fix test names", x: 220, y: 600, color: "#f97316", group: "tool" },
  { id: "convert", label: "ConvertFormat.jsx", sub: "Convert format", x: 380, y: 600, color: "#f97316", group: "tool" },
  { id: "settings", label: "Settings.jsx", sub: "Theme, API Test, Docs", x: 60, y: 700, color: "#f97316", group: "tool" },
  { id: "appstructure", label: "AppStructure.jsx", sub: "Codebase map", x: 220, y: 700, color: "#f97316", group: "tool" },
  { id: "depmap", label: "DependencyMap.jsx", sub: "This map", x: 380, y: 700, color: "#f97316", group: "tool" },
  { id: "api", label: "api.js", sub: "All HTTP calls", x: 760, y: 370, color: "#eab308", group: "api" },
  { id: "indexcss", label: "index.css", sub: "Global styles + CSS vars", x: 560, y: 370, color: "#ec4899", group: "style" },
  { id: "fastapi", label: "FastAPI", sub: "app/main.py", x: 760, y: 490, color: "#22c55e", group: "backend" },
  { id: "authapi", label: "auth.py", sub: "/api/auth/verify", x: 620, y: 600, color: "#22c55e", group: "backend" },
  { id: "projectsapi", label: "projects.py", sub: "/api/projects/", x: 760, y: 600, color: "#22c55e", group: "backend" },
  { id: "casesapi", label: "cases.py", sub: "/api/cases/", x: 900, y: 600, color: "#22c55e", group: "backend" },
  { id: "toolsapi", label: "tools.py", sub: "/api/tools/", x: 760, y: 700, color: "#22c55e", group: "backend" },
  { id: "testrail", label: "TestRail", sub: "External API", x: 760, y: 800, color: "#64748b", group: "external" },
];

const EDGES = [
  { from: "browser", to: "app" },
  { from: "app", to: "login" },
  { from: "app", to: "projects" },
  { from: "app", to: "authctx" },
  { from: "projects", to: "toolspanel" },
  { from: "projects", to: "api" },
  { from: "projects", to: "indexcss" },
  { from: "login", to: "api" },
  { from: "toolspanel", to: "createcase" },
  { from: "toolspanel", to: "createsection" },
  { from: "toolspanel", to: "export" },
  { from: "toolspanel", to: "bulkids" },
  { from: "toolspanel", to: "fixnames" },
  { from: "toolspanel", to: "convert" },
  { from: "toolspanel", to: "settings" },
  { from: "toolspanel", to: "appstructure" },
  { from: "toolspanel", to: "depmap" },
  { from: "createcase", to: "api" },
  { from: "createsection", to: "api" },
  { from: "export", to: "api" },
  { from: "bulkids", to: "api" },
  { from: "fixnames", to: "api" },
  { from: "convert", to: "api" },
  { from: "authctx", to: "api" },
  { from: "api", to: "fastapi" },
  { from: "fastapi", to: "authapi" },
  { from: "fastapi", to: "projectsapi" },
  { from: "fastapi", to: "casesapi" },
  { from: "fastapi", to: "toolsapi" },
  { from: "authapi", to: "testrail" },
  { from: "projectsapi", to: "testrail" },
  { from: "casesapi", to: "testrail" },
  { from: "toolsapi", to: "testrail" },
];

const GROUP_LABELS = [
  { label: "Frontend", color: "#3b82f6" },
  { label: "Component", color: "#14b8a6" },
  { label: "Tools", color: "#f97316" },
  { label: "API Layer", color: "#eab308" },
  { label: "Backend", color: "#22c55e" },
  { label: "Styles", color: "#ec4899" },
  { label: "External", color: "#64748b" },
];

const NODE_WIDTH = 150;
const NODE_HEIGHT = 50;

export default function DependencyMap() {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const svgWidth = Math.max(...NODES.map(n => n.x + NODE_WIDTH)) + 100;
  const svgHeight = Math.max(...NODES.map(n => n.y + NODE_HEIGHT)) + 100;

  const getNode = (id) => NODES.find((n) => n.id === id);

  const nodeCenter = (node) => ({
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  });

  const isConnected = (nodeId) => {
    if (!selected) return true;
    return selected === nodeId ||
      EDGES.some(e => (e.from === selected && e.to === nodeId) || (e.to === selected && e.from === nodeId));
  };

  const isEdgeActive = (edge) => {
    if (!selected && !hovered) return true;
    const active = selected || hovered;
    return edge.from === active || edge.to === active;
  };

  const onMouseDown = useCallback((e) => {
    if (e.target.closest(".node")) return;
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setTransform(t => {
      const newScale = Math.min(3, Math.max(0.3, t.scale * delta));
      const scaleChange = newScale / t.scale;
      return {
        x: mouseX - scaleChange * (mouseX - t.x),
        y: mouseY - scaleChange * (mouseY - t.y),
        scale: newScale,
      };
    });
  }, []);

  // Wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Center on load
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTransform({
      x: (rect.width - svgWidth * 0.8) / 2,
      y: (rect.height - svgHeight * 0.8) / 2 + 25,
      scale: 0.8,
    });
  }, []);

  // Global mouseup — fixes sticky pan
  useEffect(() => {
    const handleMouseUp = (e) => {
      if (isPanning.current) {
        const dx = Math.abs(e.clientX - startPos.current.x);
        const dy = Math.abs(e.clientY - startPos.current.y);
        if (dx < 3 && dy < 3) setSelected(null);
      }
      isPanning.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: "#0a0f1e", width: "100%", height: "100%",
        overflow: "hidden", position: "relative",
        cursor: "grab",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        userSelect: "none",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
    >
      {/* Legend */}
      <div style={{
        position: "absolute", top: "12px", left: "12px", zIndex: 10,
        backgroundColor: "#0f172acc", borderRadius: "8px", padding: "10px 14px",
        border: "1px solid #1e293b", display: "flex", gap: "14px", flexWrap: "wrap",
      }}>
        {GROUP_LABELS.map(g => (
          <div key={g.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: g.color }} />
            <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{g.label}</span>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div style={{
        position: "absolute", bottom: "20px", right: "20px", zIndex: 10,
        display: "flex", flexDirection: "column", gap: "4px",
      }}>
        {[
          { label: "+", action: () => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) })) },
          { label: "−", action: () => setTransform(t => ({ ...t, scale: Math.max(0.3, t.scale * 0.8) })) },
          { label: "↺", action: () => {
            const rect = containerRef.current.getBoundingClientRect();
            setTransform({
              x: (rect.width - svgWidth * 0.8) / 2,
              y: (rect.height - svgHeight * 0.8) / 2 + 25,
              scale: 0.8,
            });
          }},
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #334155",
              backgroundColor: "#1e293b", color: "#f8fafc", fontSize: "1rem",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >{btn.label}</button>
        ))}
      </div>

      {/* Hint */}
      <div style={{
        position: "absolute", bottom: "20px", left: "12px", zIndex: 10,
        color: "#334155", fontSize: "0.72rem",
      }}>
        Scroll to zoom · Drag to pan · Click node to highlight
      </div>

      {/* SVG */}
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{
          display: "block",
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#334155" />
          </marker>
          <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
          </marker>
        </defs>

        {EDGES.map((edge, i) => {
          const from = getNode(edge.from);
          const to = getNode(edge.to);
          if (!from || !to) return null;
          const fc = nodeCenter(from);
          const tc = nodeCenter(to);
          const active = isEdgeActive(edge);
          const mx = (fc.x + tc.x) / 2;
          const my = (fc.y + tc.y) / 2;
          return (
            <path
              key={i}
              d={`M ${fc.x} ${fc.y} Q ${mx} ${my} ${tc.x} ${tc.y}`}
              fill="none"
              stroke={active ? "#3b82f6" : "#1e293b"}
              strokeWidth={active ? 1.5 : 1}
              strokeOpacity={active ? 0.8 : 0.4}
              markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
            />
          );
        })}

        {NODES.map((node) => {
          const connected = isConnected(node.id);
          const isSelected = selected === node.id;
          const isHov = hovered === node.id;
          return (
            <g
              key={node.id}
              className="node"
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : node.id); }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                width={NODE_WIDTH} height={NODE_HEIGHT} rx={6}
                fill={isSelected ? node.color + "33" : isHov ? node.color + "22" : "#0f172a"}
                stroke={isSelected || isHov ? node.color : connected ? "#1e293b" : "#0a0f1e"}
                strokeWidth={isSelected ? 2 : 1}
                opacity={connected ? 1 : 0.25}
              />
              <text x={NODE_WIDTH / 2} y={20} textAnchor="middle"
                fill={connected ? node.color : "#1e293b"}
                fontSize="11" fontWeight="700" fontFamily="'SF Mono', monospace">
                {node.label}
              </text>
              <text x={NODE_WIDTH / 2} y={36} textAnchor="middle"
                fill={connected ? "#64748b" : "#1e293b"}
                fontSize="9" fontFamily="'SF Mono', monospace">
                {node.sub}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail panel */}
      {selected && (() => {
        const node = getNode(selected);
        const outgoing = EDGES.filter(e => e.from === selected).map(e => getNode(e.to)).filter(Boolean);
        const incoming = EDGES.filter(e => e.to === selected).map(e => getNode(e.from)).filter(Boolean);
        return (
          <div style={{
            position: "absolute", bottom: "20px", right: "70px",
            backgroundColor: "#0f172a", border: `1px solid ${node.color}`,
            borderRadius: "10px", padding: "16px", width: "240px",
            boxShadow: `0 0 20px ${node.color}33`, zIndex: 20,
          }}>
            <div style={{ color: node.color, fontWeight: "700", fontSize: "0.9rem", marginBottom: "4px" }}>{node.label}</div>
            <div style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "12px" }}>{node.sub}</div>
            {incoming.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <div style={{ color: "#475569", fontSize: "0.68rem", textTransform: "uppercase", marginBottom: "4px" }}>Receives from</div>
                {incoming.map(n => <div key={n.id} style={{ color: n.color, fontSize: "0.78rem", marginBottom: "2px" }}>← {n.label}</div>)}
              </div>
            )}
            {outgoing.length > 0 && (
              <div>
                <div style={{ color: "#475569", fontSize: "0.68rem", textTransform: "uppercase", marginBottom: "4px" }}>Sends to</div>
                {outgoing.map(n => <div key={n.id} style={{ color: n.color, fontSize: "0.78rem", marginBottom: "2px" }}>→ {n.label}</div>)}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}