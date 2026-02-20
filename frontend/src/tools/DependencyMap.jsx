import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

const STATIC_EDGES = [
  { from: "browser",       to: "app" },
  { from: "app",           to: "login" },
  { from: "app",           to: "projects" },
  { from: "app",           to: "authctx" },
  { from: "projects",      to: "toolspanel" },
  { from: "projects",      to: "api" },
  { from: "projects",      to: "indexcss" },
  { from: "login",         to: "api" },
  { from: "toolspanel",    to: "createcase" },
  { from: "toolspanel",    to: "createsection" },
  { from: "toolspanel",    to: "export" },
  { from: "toolspanel",    to: "bulkids" },
  { from: "toolspanel",    to: "fixnames" },
  { from: "toolspanel",    to: "convert" },
  { from: "toolspanel",    to: "settings" },
  { from: "toolspanel",    to: "appstructure" },
  { from: "toolspanel",    to: "depmap" },
  { from: "createcase",    to: "api" },
  { from: "createsection", to: "api" },
  { from: "export",        to: "api" },
  { from: "bulkids",       to: "api" },
  { from: "fixnames",      to: "api" },
  { from: "convert",       to: "api" },
  { from: "authctx",       to: "api" },
  { from: "api",           to: "fastapi" },
  { from: "fastapi",       to: "authapi" },
  { from: "fastapi",       to: "projectsapi" },
  { from: "fastapi",       to: "casesapi" },
  { from: "fastapi",       to: "toolsapi" },
  { from: "fastapi",       to: "structureapi" },
  { from: "authapi",       to: "testrail" },
  { from: "projectsapi",   to: "testrail" },
  { from: "casesapi",      to: "testrail" },
  { from: "toolsapi",      to: "testrail" },
];

const KNOWN_NODES = {
  "browser":       { label: "Browser",          sub: "User Interface",               x: 500, y: 30,  color: "#64748b", group: "external" },
  "app":           { label: "App.jsx",           sub: "Router + AuthProvider",        x: 500, y: 130, color: "#3b82f6", group: "frontend" },
  "login":         { label: "LoginPage.jsx",     sub: "Login form",                   x: 260, y: 240, color: "#3b82f6", group: "frontend" },
  "projects":      { label: "ProjectsPage.jsx",  sub: "Main 3-panel layout",          x: 500, y: 240, color: "#3b82f6", group: "frontend" },
  "authctx":       { label: "AuthContext.jsx",   sub: "Credentials + sessionStorage", x: 760, y: 240, color: "#8b5cf6", group: "frontend" },
  "toolspanel":    { label: "ToolsPanel.jsx",    sub: "Tools modal",                  x: 260, y: 370, color: "#14b8a6", group: "component" },
  "createcase":    { label: "CreateCase.jsx",    sub: "Create test case",             x: 60,  y: 500, color: "#f97316", group: "tool" },
  "createsection": { label: "CreateSection.jsx", sub: "Create section",               x: 220, y: 500, color: "#f97316", group: "tool" },
  "export":        { label: "ExportCases.jsx",   sub: "Export CSV",                   x: 380, y: 500, color: "#f97316", group: "tool" },
  "bulkids":       { label: "BulkEditIDs.jsx",   sub: "Bulk assign IDs",              x: 60,  y: 600, color: "#f97316", group: "tool" },
  "fixnames":      { label: "FixTestNames.jsx",  sub: "Fix test names",               x: 220, y: 600, color: "#f97316", group: "tool" },
  "convert":       { label: "ConvertFormat.jsx", sub: "Convert format",               x: 380, y: 600, color: "#f97316", group: "tool" },
  "settings":      { label: "Settings.jsx",      sub: "Theme, API Test, Docs",        x: 60,  y: 700, color: "#f97316", group: "tool" },
  "appstructure":  { label: "AppStructure.jsx",  sub: "Codebase map",                 x: 220, y: 700, color: "#f97316", group: "tool" },
  "depmap":        { label: "DependencyMap.jsx", sub: "This map",                     x: 380, y: 700, color: "#f97316", group: "tool" },
  "api":           { label: "api.js",            sub: "All HTTP calls",               x: 760, y: 370, color: "#eab308", group: "api" },
  "indexcss":      { label: "index.css",         sub: "Global styles + CSS vars",     x: 560, y: 370, color: "#ec4899", group: "style" },
  "fastapi":       { label: "FastAPI",           sub: "app/main.py",                  x: 760, y: 490, color: "#22c55e", group: "backend" },
  "authapi":       { label: "auth.py",           sub: "/api/auth/verify",             x: 620, y: 600, color: "#22c55e", group: "backend" },
  "projectsapi":   { label: "projects.py",       sub: "/api/projects/",               x: 760, y: 600, color: "#22c55e", group: "backend" },
  "casesapi":      { label: "cases.py",          sub: "/api/cases/",                  x: 900, y: 600, color: "#22c55e", group: "backend" },
  "toolsapi":      { label: "tools.py",          sub: "/api/tools/",                  x: 760, y: 700, color: "#22c55e", group: "backend" },
  "structureapi":  { label: "structure.py",      sub: "/api/structure/",              x: 900, y: 700, color: "#22c55e", group: "backend" },
  "testrail":      { label: "TestRail",          sub: "External API",                 x: 760, y: 800, color: "#64748b", group: "external" },
};

const FILE_TO_NODE = Object.fromEntries(
  Object.entries(KNOWN_NODES).map(([id, n]) => [n.label, id])
);

const GROUP_LABELS = [
  { label: "Frontend",             color: "#3b82f6" },
  { label: "Component",            color: "#14b8a6" },
  { label: "Tools",                color: "#f97316" },
  { label: "API Layer",            color: "#eab308" },
  { label: "Backend",              color: "#22c55e" },
  { label: "Styles",               color: "#ec4899" },
  { label: "External",             color: "#64748b" },
  { label: "Undocumented file(s)", color: "#ef4444" },
];

const NODE_W = 150, NODE_H = 50;

export default function DependencyMap() {
  const [nodes, setNodes]           = useState([]);
  const [undocumented, setUndocumented] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [hovered, setHovered]       = useState(null);
  const [transform, setTransform]   = useState({ x: 0, y: 0, scale: 0.8 });

  const isPanning   = useRef(false);
  const lastPos     = useRef({ x: 0, y: 0 });
  const startPos    = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/api/structure/`)
      .then(res => {
        const all = [
          ...(res.data.frontend ?? []),
          ...(res.data.backend  ?? []),
        ].map(f => ({ ...f, folder: f.folder.replace(/\\/g, "/") }));

        const knownList    = Object.entries(KNOWN_NODES).map(([id, n]) => ({ id, ...n }));
        const unknownFiles = all.filter(f => !f.documented && !FILE_TO_NODE[f.name]);
        const unknownNodes = unknownFiles.map((f, i) => ({
          id:    `unknown_${i}`,
          label: f.name,
          sub:   "⚠ undocumented file",
          x:     60 + (i % 5) * 170,
          y:     920,
          color: "#ef4444",
          group: "undocumented",
        }));

        setNodes([...knownList, ...unknownNodes]);
        setUndocumented(unknownFiles);
      })
      .catch(() => {
        setNodes(Object.entries(KNOWN_NODES).map(([id, n]) => ({ id, ...n })));
      })
      .finally(() => setLoading(false));
  }, []);

  const edges     = STATIC_EDGES;
  const svgWidth  = nodes.length ? Math.max(...nodes.map(n => n.x + NODE_W)) + 100 : 1100;
  const svgHeight = nodes.length ? Math.max(...nodes.map(n => n.y + NODE_H)) + 100 : 900;

  const getNode      = id => nodes.find(n => n.id === id);
  const nodeCenter   = n  => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 });
  const isConnected  = id => !selected || selected === id || edges.some(e => (e.from === selected && e.to === id) || (e.to === selected && e.from === id));
  const isEdgeActive = e  => { const a = selected || hovered; return !a || e.from === a || e.to === a; };

  const onMouseDown = useCallback(e => {
    if (e.target.closest(".node")) return;
    isPanning.current = true;
    lastPos.current   = { x: e.clientX, y: e.clientY };
    startPos.current  = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback(e => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  const onWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect  = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setTransform(t => {
      const s  = Math.min(3, Math.max(0.3, t.scale * delta));
      const sc = s / t.scale;
      return { x: mx - sc * (mx - t.x), y: my - sc * (my - t.y), scale: s };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  useEffect(() => {
    if (!containerRef.current || !nodes.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTransform({ x: (rect.width - svgWidth * 0.8) / 2, y: (rect.height - svgHeight * 0.8) / 2 + 25, scale: 0.8 });
  }, [nodes.length]);

  useEffect(() => {
    const up = e => {
      if (isPanning.current) {
        const dx = Math.abs(e.clientX - startPos.current.x);
        const dy = Math.abs(e.clientY - startPos.current.y);
        if (dx < 3 && dy < 3) setSelected(null);
      }
      isPanning.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const bg     = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()         || "#0a0f1e";
  const panel  = getComputedStyle(document.documentElement).getPropertyValue("--bg-panel").trim()   || "#0f172a";
  const border = getComputedStyle(document.documentElement).getPropertyValue("--border").trim()     || "#1e293b";
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()     || "#3b82f6";
  const text   = getComputedStyle(document.documentElement).getPropertyValue("--text").trim()       || "#f8fafc";
  const muted  = getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() || "#94a3b8";
  const dim    = getComputedStyle(document.documentElement).getPropertyValue("--text-dim").trim()   || "#475569";

  return (
    <div ref={containerRef}
      style={{ backgroundColor: "var(--bg)", width: "100%", height: "100%", overflow: "hidden", position: "relative", cursor: "grab", fontFamily: "'SF Mono','Fira Code',monospace", userSelect: "none" }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
    >
      {/* Legend */}
      <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, backgroundColor: panel + "cc", borderRadius: "8px", padding: "10px 14px", border: `1px solid ${border}`, display: "flex", gap: "14px", flexWrap: "wrap" }}>
        {GROUP_LABELS.map(g => (
          <div key={g.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: g.color }} />
            <span style={{ color: muted, fontSize: "0.7rem" }}>{g.label}</span>
          </div>
        ))}
        {undocumented.length > 0 && (
          <span style={{ color: "#ef4444", fontSize: "0.7rem" }}>⚠️ {undocumented.length} undocumented file(s)</span>
        )}
      </div>

      {/* Zoom controls */}
      <div style={{ position: "absolute", bottom: "20px", right: "20px", zIndex: 10, display: "flex", flexDirection: "column", gap: "4px" }}>
        {[
          { label: "+", fn: () => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) })) },
          { label: "−", fn: () => setTransform(t => ({ ...t, scale: Math.max(0.3, t.scale * 0.8) })) },
          { label: "↺", fn: () => { const r = containerRef.current.getBoundingClientRect(); setTransform({ x: (r.width - svgWidth * 0.8) / 2, y: (r.height - svgHeight * 0.8) / 2 + 25, scale: 0.8 }); }},
        ].map(b => (
          <button key={b.label} onClick={b.fn} style={{ width: "32px", height: "32px", borderRadius: "6px", border: `1px solid ${border}`, backgroundColor: panel, color: text, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {b.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: muted, fontSize: "0.9rem" }}>
          Loading structure…
        </div>
      )}

      <div style={{ position: "absolute", bottom: "20px", left: "12px", zIndex: 10, color: dim, fontSize: "0.72rem" }}>
        Scroll to zoom · Drag to pan · Click node to highlight
      </div>

      <svg width={svgWidth} height={svgHeight}
        style={{ display: "block", transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "0 0" }}
      >
        <defs>
          <marker id="arrow"        markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={border} /></marker>
          <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={accent} /></marker>
        </defs>

        {edges.map((edge, i) => {
          const from = getNode(edge.from), to = getNode(edge.to);
          if (!from || !to) return null;
          const fc = nodeCenter(from), tc = nodeCenter(to);
          const active = isEdgeActive(edge);
          return (
            <path key={i}
              d={`M ${fc.x} ${fc.y} Q ${(fc.x + tc.x) / 2} ${(fc.y + tc.y) / 2} ${tc.x} ${tc.y}`}
              fill="none" stroke={active ? accent : border}
              strokeWidth={active ? 1.5 : 1} strokeOpacity={active ? 0.8 : 0.4}
              markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
            />
          );
        })}

        {nodes.map(node => {
          const isUndoc   = node.group === "undocumented";
          const connected = isConnected(node.id);
          const isSel     = selected === node.id;
          const isHov     = hovered  === node.id;
          const nodeBg    = isUndoc
            ? (isSel ? "#ef444433" : isHov ? "#ef444422" : "#1a0a0a")
            : (isSel ? node.color + "33" : isHov ? node.color + "22" : panel);
          const nodeStroke = isUndoc
            ? "#ef4444"
            : (isSel || isHov ? node.color : connected ? border : bg);

          return (
            <g key={node.id} className="node" transform={`translate(${node.x}, ${node.y})`} style={{ cursor: "pointer" }}
              onClick={e => { e.stopPropagation(); setSelected(isSel ? null : node.id); }}
              onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)}
            >
              <rect width={NODE_W} height={NODE_H} rx={6}
                fill={nodeBg} stroke={nodeStroke}
                strokeWidth={isUndoc || isSel ? 2 : 1} opacity={connected ? 1 : 0.25}
              />
              {node.group === "undocumented" && (
                <text x={8} y={16} fill="#ef4444" fontSize="10">⚠</text>
              )}
              <text x={NODE_W / 2} y={20} textAnchor="middle"
                fill={isUndoc ? "#ef4444" : connected ? node.color : border}
                fontSize="11" fontWeight="700" fontFamily="'SF Mono',monospace"
              >
                {node.label}
              </text>
              <text x={NODE_W / 2} y={36} textAnchor="middle"
                fill={isUndoc ? "#ef444499" : connected ? muted : border}
                fontSize="9" fontFamily="'SF Mono',monospace"
              >
                {node.sub}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail panel */}
      {selected && (() => {
        const node = getNode(selected);
        if (!node) return null;
        const out = edges.filter(e => e.from === selected).map(e => getNode(e.to)).filter(Boolean);
        const inc = edges.filter(e => e.to === selected).map(e => getNode(e.from)).filter(Boolean);
        return (
          <div style={{ position: "absolute", bottom: "20px", right: "70px", backgroundColor: panel, border: `1px solid ${node.color}`, borderRadius: "10px", padding: "16px", width: "240px", boxShadow: `0 0 20px ${node.color}33`, zIndex: 20 }}>
            <div style={{ color: node.color, fontWeight: "700", fontSize: "0.9rem", marginBottom: "4px" }}>{node.label}</div>
            <div style={{ color: muted, fontSize: "0.75rem", marginBottom: "12px" }}>
              {node.sub}
              {node.group === "undocumented" && (
                <div style={{ color: "#ef4444", marginTop: "4px", fontSize: "0.72rem" }}>
                  Add to <code>app/api/structure.py</code> → KNOWN
                </div>
              )}
            </div>
            {inc.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <div style={{ color: dim, fontSize: "0.68rem", textTransform: "uppercase", marginBottom: "4px" }}>Receives from</div>
                {inc.map(n => <div key={n.id} style={{ color: n.color, fontSize: "0.78rem", marginBottom: "2px" }}>← {n.label}</div>)}
              </div>
            )}
            {out.length > 0 && (
              <div>
                <div style={{ color: dim, fontSize: "0.68rem", textTransform: "uppercase", marginBottom: "4px" }}>Sends to</div>
                {out.map(n => <div key={n.id} style={{ color: n.color, fontSize: "0.78rem", marginBottom: "2px" }}>→ {n.label}</div>)}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}