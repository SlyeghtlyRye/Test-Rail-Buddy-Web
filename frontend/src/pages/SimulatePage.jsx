/**
 * SimulatePage.jsx
 * Route: /simulate/:caseId
 *
 * Add to your router:
 *   import SimulatePage from "./pages/SimulatePage";
 *   <Route path="/simulate/:caseId" element={<SimulatePage />} />
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

const ENVS = [
  { label: "Local", url: "http://localhost:3000" },
  { label: "Staging", url: "https://staging.yourapp.com" },
  { label: "Production", url: "https://yourapp.com" },
];

const styleTag = document.createElement("style");
styleTag.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleTag);

export default function SimulatePage() {
  const { caseId } = useParams();
  const { credentials } = useAuth();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [envUrl, setEnvUrl] = useState(ENVS[0].url);
  const [customEnv, setCustomEnv] = useState(false);

  const [op, setOp] = useState(null);
  const [opLoading, setOpLoading] = useState(false);
  const [opResult, setOpResult] = useState(null);
  const [opError, setOpError] = useState("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [caseRes, recRes] = await Promise.all([
          axios.post(`${BASE_URL}/api/cases/${caseId}`, { ...credentials, project_id: 0 }),
          axios.get(`${BASE_URL}/api/simulate/playwright/recordings/${caseId}`),
        ]);
        setCaseData(caseRes.data);
        setRecording(recRes.data.exists ? recRes.data : false);
      } catch (err) {
        console.error("Failed to load simulate page data", err);
        setRecording(false);
      }
      setLoading(false);
    };
    init();
  }, [caseId]);

  const handleRecord = async () => {
    setOpLoading(true);
    setOpError("");
    setOpResult(null);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/simulate/playwright/record/${caseId}`,
        { ...credentials, case_id: parseInt(caseId), environment_url: envUrl }
      );
      setOpResult(res.data);
      const recRes = await axios.get(`${BASE_URL}/api/simulate/playwright/recordings/${caseId}`);
      setRecording(recRes.data.exists ? recRes.data : false);
    } catch (err) {
      setOpError(err.response?.data?.detail || err.message || "Recording failed.");
    }
    setOpLoading(false);
  };

  const handlePlayback = async () => {
    setOpLoading(true);
    setOpError("");
    setOpResult(null);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/simulate/playwright/playback/${caseId}`,
        { case_id: parseInt(caseId), environment_url: envUrl }
      );
      setOpResult(res.data);
    } catch (err) {
      setOpError(err.response?.data?.detail || err.message || "Playback failed.");
    }
    setOpLoading(false);
  };

  const resetOp = () => {
    setOp(null);
    setOpResult(null);
    setOpError("");
  };

  if (loading) return <div style={styles.page}><div style={styles.loadingMsg}>Loading case...</div></div>;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={styles.headerMeta}>
          <span style={styles.headerLabel}>Simulation for:</span>
          <h1 style={styles.headerTitle}>
            {caseData?.custom_tc_test_case_id && (
              <span style={styles.caseIdBadge}>{caseData.custom_tc_test_case_id}</span>
            )}
            {caseData?.title || `Case #${caseId}`}
          </h1>
        </div>
      </div>

      <div style={styles.body}>
        {/* Recording status card */}
        <div style={styles.statusCard}>
          <div style={styles.statusRow}>
            <div style={styles.statusDot(recording)} />
            <div>
              <div style={styles.statusTitle}>
                {recording === false
                  ? "No Recording Found"
                  : recording
                  ? "Recording Available"
                  : "Checking..."}
              </div>
              {recording && (
                <div style={styles.statusSub}>
                  {recording.actions_count} actions · recorded on {recording.environment_url}
                </div>
              )}
              {recording === false && (
                <div style={styles.statusSub}>
                  Record a session first to enable playback
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Environment selector */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Environment</div>
          <div style={styles.envTabs}>
            {ENVS.map(e => (
              <button
                key={e.url}
                style={styles.envTab(envUrl === e.url && !customEnv)}
                onClick={() => { setEnvUrl(e.url); setCustomEnv(false); }}
              >
                {e.label}
              </button>
            ))}
            <button
              style={styles.envTab(customEnv)}
              onClick={() => setCustomEnv(true)}
            >
              Custom
            </button>
          </div>
          {customEnv && (
            <input
              style={styles.envInput}
              value={envUrl}
              onChange={e => setEnvUrl(e.target.value)}
              placeholder="https://your-environment.com"
              autoFocus
            />
          )}
          {!customEnv && (
            <div style={styles.envDisplay}>{envUrl}</div>
          )}
        </div>

        {/* Action buttons — only show when no op is running */}
        {!op && !opResult && (
          <div style={styles.actions}>
            <button style={styles.recordBtn} onClick={() => { setOp("record"); handleRecord(); }}>
              <span style={styles.btnIcon}>⏺</span>
              <div>
                <div style={styles.btnLabel}>Record Session</div>
                <div style={styles.btnSub}>Opens a browser — perform test manually then close</div>
              </div>
            </button>

            <button
              style={styles.playBtn(!!recording)}
              onClick={() => { setOp("playback"); handlePlayback(); }}
              disabled={!recording}
            >
              <span style={styles.btnIcon}>▶</span>
              <div>
                <div style={styles.btnLabel}>Run Playback</div>
                <div style={styles.btnSub}>
                  {recording ? "Replay recorded actions headlessly" : "No recording yet — record first"}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Loading state */}
        {opLoading && (
          <div style={styles.opStatus}>
            <div style={styles.spinner} />
            <div style={styles.opStatusText}>
              {op === "record"
                ? "Browser is open — perform your test, then close the window to save"
                : "Running playback headlessly..."}
            </div>
          </div>
        )}

        {/* Error */}
        {opError && (
          <div style={styles.errorBox}>
            <div style={styles.errorTitle}>Something went wrong</div>
            <div style={styles.errorMsg}>{opError}</div>
            <button style={styles.retryBtn} onClick={resetOp}>Try Again</button>
          </div>
        )}

        {/* Record result */}
        {opResult && op === "record" && (
          <div style={styles.resultBox}>
            <div style={styles.resultHeader}>
              <span style={styles.resultSuccess}>✓ Recording Saved</span>
            </div>
            <div style={styles.resultRows}>
              <ResultRow label="Actions Captured" value={opResult.actions_recorded} />
              <ResultRow label="Saved To" value={opResult.saved_to} mono />
              <ResultRow label="TestRail" value="custom_steps + custom_tc_test_data updated" />
            </div>
            <div style={styles.resultActions}>
              <button style={styles.secondaryBtn} onClick={resetOp}>Record Again</button>
              <button
                style={styles.playBtnSmall}
                onClick={() => { setOp("playback"); setOpResult(null); handlePlayback(); }}
              >
                ▶ Run Playback Now
              </button>
            </div>
          </div>
        )}

        {/* Playback result */}
        {opResult && op === "playback" && (
          <div style={styles.resultBox}>
            <div style={styles.resultHeader}>
              <span style={opResult.failed > 0 ? styles.resultFail : styles.resultSuccess}>
                {opResult.failed > 0
                  ? `✗ ${opResult.failed} step(s) failed`
                  : "✓ All Steps Passed"}
              </span>
              <span style={styles.resultCount}>
                {opResult.passed} passed · {opResult.failed} failed · {opResult.total} total
              </span>
            </div>

            <div style={styles.stepList}>
              {opResult.results?.map(r => (
                <div key={r.step} style={styles.stepRow(r.status === "pass")}>
                  <span style={styles.stepStatus(r.status === "pass")}>
                    {r.status === "pass" ? "✓" : "✗"}
                  </span>
                  <span style={styles.stepNum}>Step {r.step}</span>
                  <span style={styles.stepDesc}>
                    {r.action?.action}
                    {r.action?.url ? ` → ${r.action.url}` : ""}
                    {r.action?.selector ? ` → ${r.action.selector}` : ""}
                  </span>
                  {r.error && <span style={styles.stepErr}>{r.error}</span>}
                </div>
              ))}
            </div>

            <div style={styles.resultRows}>
              <ResultRow label="Report File" value={opResult.report} mono />
            </div>

            <div style={styles.resultActions}>
              <button style={styles.secondaryBtn} onClick={resetOp}>Run Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value, mono }) {
  return (
    <div style={styles.resultRow}>
      <span style={styles.resultRowLabel}>{label}</span>
      <span style={{ ...styles.resultRowValue, fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "var(--bg, #0f172a)",
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  loadingMsg: {
    color: "var(--text-dim, #94a3b8)",
    padding: "40px",
    textAlign: "center",
  },
  header: {
    borderBottom: "1px solid var(--border, #1e293b)",
    padding: "16px 32px",
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
    backgroundColor: "var(--bg, #0f172a)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "1px solid var(--border, #334155)",
    color: "var(--text-dim, #94a3b8)",
    borderRadius: "6px",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: "0.85rem",
    marginTop: "4px",
    flexShrink: 0,
  },
  headerMeta: { display: "flex", flexDirection: "column", gap: "4px" },
  headerLabel: {
    color: "var(--text-dim, #64748b)",
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  headerTitle: {
    color: "var(--text, #f1f5f9)",
    fontSize: "1.2rem",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  caseIdBadge: {
    backgroundColor: "var(--accent, #3b82f6)",
    color: "#fff",
    fontSize: "0.75rem",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "600",
    letterSpacing: "0.03em",
  },
  body: {
    padding: "32px",
    maxWidth: "720px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  statusCard: {
    backgroundColor: "var(--bg-panel, #1e293b)",
    border: "1px solid var(--border, #334155)",
    borderRadius: "10px",
    padding: "16px 20px",
  },
  statusRow: { display: "flex", alignItems: "center", gap: "14px" },
  statusDot: (recording) => ({
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0,
    backgroundColor: recording === false ? "#ef4444" : recording ? "#22c55e" : "#94a3b8",
    boxShadow: recording ? "0 0 8px #22c55e88" : recording === false ? "0 0 8px #ef444488" : "none",
  }),
  statusTitle: { color: "var(--text, #f1f5f9)", fontSize: "0.95rem", fontWeight: "600" },
  statusSub: { color: "var(--text-dim, #64748b)", fontSize: "0.8rem", marginTop: "2px" },
  section: { display: "flex", flexDirection: "column", gap: "10px" },
  sectionLabel: {
    color: "var(--text-dim, #64748b)",
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  envTabs: { display: "flex", gap: "6px", flexWrap: "wrap" },
  envTab: (active) => ({
    padding: "6px 14px",
    borderRadius: "6px",
    border: active ? "1px solid var(--accent, #3b82f6)" : "1px solid var(--border, #334155)",
    backgroundColor: active ? "rgba(59,130,246,0.12)" : "transparent",
    color: active ? "var(--accent, #3b82f6)" : "var(--text-dim, #94a3b8)",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: active ? "600" : "400",
  }),
  envInput: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid var(--border, #334155)",
    backgroundColor: "var(--bg, #0f172a)",
    color: "var(--text, #f1f5f9)",
    fontSize: "0.9rem",
    width: "100%",
    boxSizing: "border-box",
  },
  envDisplay: {
    color: "var(--text-dim, #64748b)",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    padding: "4px 0",
  },
  actions: { display: "flex", flexDirection: "column", gap: "12px" },
  recordBtn: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    borderRadius: "10px",
    border: "1px solid #dc2626",
    backgroundColor: "rgba(220,38,38,0.08)",
    color: "var(--text, #f1f5f9)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  playBtn: (enabled) => ({
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    borderRadius: "10px",
    border: enabled ? "1px solid #16a34a" : "1px solid var(--border, #334155)",
    backgroundColor: enabled ? "rgba(22,163,74,0.08)" : "transparent",
    color: enabled ? "var(--text, #f1f5f9)" : "var(--text-dim, #64748b)",
    cursor: enabled ? "pointer" : "not-allowed",
    textAlign: "left",
    width: "100%",
    opacity: enabled ? 1 : 0.5,
  }),
  btnIcon: { fontSize: "1.4rem", flexShrink: 0 },
  btnLabel: { fontSize: "0.95rem", fontWeight: "600", marginBottom: "2px" },
  btnSub: { fontSize: "0.8rem", color: "var(--text-dim, #94a3b8)" },
  opStatus: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    backgroundColor: "var(--bg-panel, #1e293b)",
    borderRadius: "10px",
    border: "1px solid var(--border, #334155)",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid var(--border, #334155)",
    borderTop: "2px solid var(--accent, #3b82f6)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  opStatusText: { color: "var(--text-dim, #94a3b8)", fontSize: "0.9rem", lineHeight: 1.5 },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.08)",
    border: "1px solid #ef4444",
    borderRadius: "10px",
    padding: "20px",
  },
  errorTitle: { color: "#ef4444", fontWeight: "600", marginBottom: "6px" },
  errorMsg: { color: "var(--text-dim, #94a3b8)", fontSize: "0.85rem", marginBottom: "14px" },
  retryBtn: {
    padding: "6px 16px",
    borderRadius: "6px",
    border: "1px solid #ef4444",
    backgroundColor: "transparent",
    color: "#ef4444",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  resultBox: {
    backgroundColor: "var(--bg-panel, #1e293b)",
    border: "1px solid var(--border, #334155)",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  resultHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" },
  resultSuccess: { color: "#22c55e", fontWeight: "700", fontSize: "1rem" },
  resultFail: { color: "#ef4444", fontWeight: "700", fontSize: "1rem" },
  resultCount: { color: "var(--text-dim, #94a3b8)", fontSize: "0.85rem" },
  resultRows: { display: "flex", flexDirection: "column", gap: "8px" },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    padding: "8px 0",
    borderBottom: "1px solid var(--border, #1e293b)",
    fontSize: "0.85rem",
  },
  resultRowLabel: { color: "var(--text-dim, #64748b)", flexShrink: 0 },
  resultRowValue: { color: "var(--text, #f1f5f9)", textAlign: "right", wordBreak: "break-all" },
  stepList: { display: "flex", flexDirection: "column", gap: "4px" },
  stepRow: (pass) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "6px",
    backgroundColor: pass ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
    fontSize: "0.82rem",
  }),
  stepStatus: (pass) => ({ color: pass ? "#22c55e" : "#ef4444", fontWeight: "700", flexShrink: 0 }),
  stepNum: { color: "var(--text-dim, #64748b)", flexShrink: 0 },
  stepDesc: { color: "var(--text, #f1f5f9)", flex: 1 },
  stepErr: { color: "#ef4444", fontSize: "0.75rem" },
  resultActions: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  secondaryBtn: {
    padding: "7px 16px",
    borderRadius: "6px",
    border: "1px solid var(--border, #334155)",
    backgroundColor: "transparent",
    color: "var(--text-dim, #94a3b8)",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  playBtnSmall: {
    padding: "7px 16px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#16a34a",
    color: "#fff",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: "600",
  },
};