/**
 * SimulatePage.jsx — with live screenshot viewer
 * Changes:
 *  - Step overlay on live viewer showing step number, action type & selector
 *  - Delete recording button with confirmation dialog
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

const ENVS = [
  { label: "Local",      url: "http://localhost:3000" },
  { label: "Staging",    url: "https://staging.yourapp.com" },
  { label: "Production", url: "https://yourapp.com" },
];

const css = document.createElement("style");
css.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
`;
document.head.appendChild(css);

// ── Action type → human label + colour ────────────────────────────────────────
const ACTION_META = {
  navigate:      { label: "Navigate",      color: "#3b82f6", icon: "→" },
  click:         { label: "Click",         color: "#22c55e", icon: "⊙" },
  dblclick:      { label: "Dbl Click",     color: "#22c55e", icon: "⊙⊙" },
  fill:          { label: "Fill",          color: "#a78bfa", icon: "✎" },
  select:        { label: "Select",        color: "#f59e0b", icon: "▾" },
  check:         { label: "Check",         color: "#22c55e", icon: "✓" },
  uncheck:       { label: "Uncheck",       color: "#ef4444", icon: "✕" },
  press:         { label: "Key Press",     color: "#f59e0b", icon: "⌨" },
  hover:         { label: "Hover",         color: "#94a3b8", icon: "◎" },
  keyboard_press:{ label: "Keyboard",      color: "#f59e0b", icon: "⌨" },
  wait:          { label: "Wait",          color: "#64748b", icon: "⏳" },
  unknown:       { label: "Action",        color: "#94a3b8", icon: "•"  },
};

function getActionMeta(type) {
  return ACTION_META[type] || ACTION_META.unknown;
}

function truncate(str, max = 44) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function SimulatePage() {
  const { caseId } = useParams();
  const { credentials } = useAuth();
  const navigate = useNavigate();

  const [caseData,   setCaseData]   = useState(null);
  const [recording,  setRecording]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [envUrl,     setEnvUrl]     = useState(ENVS[0].url);
  const [customEnv,  setCustomEnv]  = useState(false);
  const [nudgeMode,  setNudgeMode]  = useState(true);

  const [op,         setOp]         = useState(null);
  const [opLoading,  setOpLoading]  = useState(false);
  const [opResult,   setOpResult]   = useState(null);
  const [opError,    setOpError]    = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const [showDetails,setShowDetails]= useState(false);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteStatus,  setDeleteStatus]  = useState(null); // null | "deleting" | "deleted" | "error"

  // ── Live viewer ────────────────────────────────────────────────────────────
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [screenMeta,    setScreenMeta]    = useState(null);
  const screenshotPollRef = useRef(null);

  // ── Scrubber ───────────────────────────────────────────────────────────────
  const [scrubberData,    setScrubberData]    = useState(null);   // {steps, total}
  const [scrubberStep,    setScrubberStep]    = useState(null);   // currently viewed step
  const [scrubberUrl,     setScrubberUrl]     = useState(null);   // img src for scrubber view
  const [scrubberActive,  setScrubberActive]  = useState(false);  // true = showing scrubber

  // ── Nudge ──────────────────────────────────────────────────────────────────
  const [nudgeState, setNudgeState] = useState(null);
  const nudgePollRef = useRef(null);

  // ── Resizable viewer ───────────────────────────────────────────────────────
  const [viewerWidth, setViewerWidth] = useState(480);
  const dragRef = useRef(null);

  const onDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = viewerWidth;
    const onMove = (me) => {
      const delta = me.clientX - startX;
      setViewerWidth(Math.max(280, Math.min(900, startW + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cr, rr] = await Promise.all([
          axios.post(`${BASE_URL}/api/cases/${caseId}`, { ...credentials, project_id: 0 }),
          axios.get(`${BASE_URL}/api/simulate/playwright/recordings/${caseId}`),
        ]);
        setCaseData(cr.data);
        setRecording(rr.data.exists ? rr.data : false);
      } catch { setRecording(false); }
      setLoading(false);
    })();
  }, [caseId]);

  useEffect(() => () => { stopScreenshotPoll(); stopNudgePoll(); }, []);

  // ── Screenshot polling ─────────────────────────────────────────────────────
  const startScreenshotPoll = () => {
    stopScreenshotPoll();
    screenshotPollRef.current = setInterval(async () => {
      try {
        const url = `${BASE_URL}/api/simulate/playwright/screenshot/${caseId}?t=${Date.now()}`;
        setScreenshotUrl(url);
        const meta = await axios.get(
          `${BASE_URL}/api/simulate/playwright/screenshot-meta/${caseId}`
        );
        setScreenMeta(meta.data);
        if (meta.data.status === "done" || meta.data.status === "error") {
          // Keep polling a little longer so the final rendered screenshot
          // (e.g. logged-in dashboard after last navigate) has time to arrive
          setTimeout(() => stopScreenshotPoll(), 2500);
        }
      } catch { /* no screenshot yet */ }
    }, 400);
  };

  const stopScreenshotPoll = () => {
    if (screenshotPollRef.current) {
      clearInterval(screenshotPollRef.current);
      screenshotPollRef.current = null;
    }
  };

  // ── Nudge polling ──────────────────────────────────────────────────────────
  const startNudgePoll = () => {
    stopNudgePoll();
    nudgePollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/simulate/playwright/nudge/by-case/${caseId}`
        );
        if (res.data.session_id) {
          setNudgeState({
            sessionId: res.data.session_id,
            state: res.data.state,
            failedStep: res.data.failed_step,
          });
        }
      } catch { /* ignore */ }
    }, 800);
  };

  const stopNudgePoll = () => {
    if (nudgePollRef.current) {
      clearInterval(nudgePollRef.current);
      nudgePollRef.current = null;
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRecord = async () => {
    setOp("record"); setOpLoading(true); setOpError(""); setOpResult(null); setSaveStatus(null);
    try {
      const url = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
      const res = await axios.post(
        `${BASE_URL}/api/simulate/playwright/record/${caseId}`,
        { ...credentials, case_id: +caseId, environment_url: url }
      );
      setOpResult(res.data);
      const rr = await axios.get(`${BASE_URL}/api/simulate/playwright/recordings/${caseId}`);
      setRecording(rr.data.exists ? rr.data : false);
    } catch (err) {
      setOpError(err.response?.data?.detail || err.message || "Recording failed.");
    }
    setOpLoading(false);
  };

  const handlePlayback = () => {
    setOp("playback"); setOpLoading(true); setOpError(""); setOpResult(null);
    setSaveStatus(null); setNudgeState(null); setScreenshotUrl(null); setScreenMeta(null);

    const url = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;

    axios.post(`${BASE_URL}/api/simulate/playwright/playback/${caseId}`, {
      case_id: +caseId,
      environment_url: url,
      nudge_mode: nudgeMode,
    })
      .then(res => {
        stopScreenshotPoll();
        stopNudgePoll();
        setOpResult(res.data);
        setNudgeState(null);
        if (res.data.corrected > 0) {
          axios.get(`${BASE_URL}/api/simulate/playwright/recordings/${caseId}`)
            .then(r => setRecording(r.data.exists ? r.data : false));
        }
        // Load scrubber metadata so user can replay step-by-step
        axios.get(`${BASE_URL}/api/simulate/playwright/scrubber/${caseId}`)
          .then(r => {
            if (r.data.available) {
              setScrubberData(r.data);
              // Default to last step so they see the final state immediately
              const lastStep = r.data.steps[r.data.steps.length - 1];
              setScrubberStep(lastStep);
              setScrubberUrl(`${BASE_URL}/api/simulate/playwright/scrubber/${caseId}/${lastStep}?t=${Date.now()}`);
              setScrubberActive(true);
            }
          })
          .catch(() => {});
      })
      .catch(err => {
        stopScreenshotPoll();
        stopNudgePoll();
        setOpError(err.response?.data?.detail || err.message || "Playback failed.");
        setNudgeState(null);
      })
      .finally(() => setOpLoading(false));

    startScreenshotPoll();
    if (nudgeMode) startNudgePoll();
  };

  const handleNudgeAccept = async () => {
    if (!nudgeState?.sessionId) return;
    await axios.post(`${BASE_URL}/api/simulate/playwright/nudge/respond`,
      { session_id: nudgeState.sessionId, accept: true });
    setNudgeState(p => ({ ...p, state: "nudging" }));
  };

  const handleNudgeSkip = async () => {
    if (!nudgeState?.sessionId) return;
    await axios.post(`${BASE_URL}/api/simulate/playwright/nudge/respond`,
      { session_id: nudgeState.sessionId, accept: false });
    setNudgeState(p => ({ ...p, state: "skip" }));
  };

  const handleNudgeDone = async () => {
    if (!nudgeState?.sessionId) return;
    await axios.post(`${BASE_URL}/api/simulate/playwright/nudge/complete`,
      { session_id: nudgeState.sessionId });
    setNudgeState(p => ({ ...p, state: "idle" }));
  };

  const handleStop = () =>
    axios.post(`${BASE_URL}/api/simulate/playwright/stop/${caseId}`).catch(() => {});

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await axios.post(`${BASE_URL}/api/simulate/playwright/save/${caseId}`,
        { ...credentials, case_id: +caseId });
      setSaveStatus("saved");
    } catch { setSaveStatus("error"); }
  };

  const handleDelete = async () => {
    setDeleteStatus("deleting");
    try {
      await axios.delete(`${BASE_URL}/api/simulate/playwright/recordings/${caseId}`);
      setDeleteStatus("deleted");
      setRecording(false);
      setDeleteConfirm(false);
      resetOp();
    } catch (err) {
      setDeleteStatus("error");
    }
  };

  const handleScrubberStep = (step) => {
    if (!scrubberData) return;
    setScrubberStep(step);
    setScrubberUrl(`${BASE_URL}/api/simulate/playwright/scrubber/${caseId}/${step}?t=${Date.now()}`);
  };

  const resetOp = () => {
    setOp(null); setOpResult(null); setOpError(""); setSaveStatus(null);
    setNudgeState(null); setScreenshotUrl(null); setScreenMeta(null);
    setScrubberData(null); setScrubberStep(null); setScrubberUrl(null); setScrubberActive(false);
    stopScreenshotPoll(); stopNudgePoll();
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const isWaiting  = nudgeState?.state === "waiting";
  const isNudging  = nudgeState?.state === "nudging";
  const showViewer = op === "playback" && (opLoading || screenshotUrl);

  // Current action from recording list (for overlay)
  const currentStepAction = (() => {
    if (!screenMeta || !recording?.actions) return null;
    const idx = (screenMeta.step || 1) - 1;
    return recording.actions[idx] || null;
  })();

  const statusColor = {
    running: "#3b82f6", error: "#ef4444", waiting: "#f59e0b",
    nudging: "#f59e0b", done: "#22c55e", idle: "#64748b",
  };
  const statusLabel = {
    running: "Running", error: "Error", waiting: "Waiting for nudge",
    nudging: "Nudge in progress", done: "Done", idle: "Idle",
  };

  if (loading) return <div style={s.page}><div style={s.loadingMsg}>Loading case...</div></div>;

  return (
    <div style={s.page}>

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div style={s.modalBackdrop} onClick={() => { setDeleteConfirm(false); setDeleteStatus(null); }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalIcon}>🗑</div>
            <div style={s.modalTitle}>Delete Recording?</div>
            <div style={s.modalBody}>
              This will permanently remove the recording for Case #{caseId} and all associated files
              (codegen scripts, nudge corrections, report). This cannot be undone.
            </div>
            {deleteStatus === "error" && (
              <div style={s.modalError}>Delete failed — check server logs.</div>
            )}
            <div style={s.modalBtns}>
              <button style={s.modalCancelBtn} onClick={() => { setDeleteConfirm(false); setDeleteStatus(null); }}>
                Cancel
              </button>
              <button
                style={s.modalDeleteBtn}
                onClick={handleDelete}
                disabled={deleteStatus === "deleting"}
              >
                {deleteStatus === "deleting" ? "Deleting…" : "Yes, Delete Recording"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
        <div style={s.headerMeta}>
          <span style={s.headerLabel}>Simulation for:</span>
          <h1 style={s.headerTitle}>
            {caseData?.custom_tc_test_case_id && (
              <span style={s.caseIdBadge}>{caseData.custom_tc_test_case_id}</span>
            )}
            {caseData?.title || `Case #${caseId}`}
          </h1>
        </div>
      </div>

      {/* ── Split layout when viewer is active ── */}
      <div style={showViewer ? s.splitLayout : s.singleLayout}>

        {/* ── Left / main column ── */}
        <div style={showViewer ? s.mainCol : s.singleCol}>

          {/* Recording status */}
          <div style={s.statusCard}>
            <div style={s.statusRow}>
              <div style={s.statusDot(recording)} />
              <div style={{ flex: 1 }}>
                <div style={s.statusTitle}>
                  {recording === false ? "No Recording Found"
                    : recording ? "Recording Available" : "Checking..."}
                </div>
                {recording && (
                  <div style={s.statusSub}>
                    {recording.actions_count} actions · {recording.environment_url}
                    {recording.last_corrected && (
                      <span style={{ color: "#f59e0b", marginLeft: 8 }}>
                        ✦ corrected {recording.last_corrected}
                      </span>
                    )}
                  </div>
                )}
                {recording === false && (
                  <div style={s.statusSub}>Record a session first to enable playback</div>
                )}
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                {recording && (
                  <>
                    <button style={s.detailsToggle} onClick={() => setShowDetails(v => !v)}>
                      {showDetails ? "▲ Hide" : "▼ Details"}
                    </button>
                    {/* ── Delete Button ── */}
                    <button
                      style={s.deleteBtn}
                      onClick={() => { setDeleteConfirm(true); setDeleteStatus(null); }}
                      title="Delete this recording"
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
            {recording && showDetails && (
              <div style={s.detailsPanel}>
                <div style={s.detailsMeta}>
                  <span style={s.detailsMetaItem}>Recorded: {recording.recorded_at}</span>
                  <span style={s.detailsMetaItem}>Env: {recording.environment_url}</span>
                  <span style={s.detailsMetaItem}>Actions: {recording.actions_count}</span>
                </div>
                <div style={s.detailsSteps}>
                  {recording.actions?.map((a, i) => (
                    <div key={i} style={s.detailsStep}>
                      <span style={s.detailsStepNum}>Step {i + 1}</span>
                      <span style={s.detailsStepAction}>{a.action}</span>
                      <span style={s.detailsStepDesc}>
                        {a.url || a.selector || ""}
                        {a.value ? ` = ${a.value}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Environment */}
          <div style={s.section}>
            <div style={s.sectionLabel}>Environment</div>
            <div style={s.envTabs}>
              {ENVS.map(e => (
                <button key={e.url}
                  style={s.envTab(envUrl === e.url && !customEnv)}
                  onClick={() => { setEnvUrl(e.url); setCustomEnv(false); }}>
                  {e.label}
                </button>
              ))}
              <button style={s.envTab(customEnv)} onClick={() => setCustomEnv(true)}>Custom</button>
            </div>
            {customEnv
              ? <input style={s.envInput} value={envUrl}
                  onChange={e => setEnvUrl(e.target.value)}
                  placeholder="https://your-environment.com" autoFocus />
              : <div style={s.envDisplay}>{envUrl}</div>}
          </div>

          {/* Nudge toggle */}
          <div style={s.nudgeToggleRow}>
            <div style={{ flex: 1 }}>
              <div style={s.nudgeToggleLabel}>Nudge Mode</div>
              <div style={s.nudgeToggleSub}>Pause on failure — manually correct and save steps</div>
            </div>
            <button style={s.toggle(nudgeMode)} onClick={() => setNudgeMode(v => !v)}>
              <span style={s.toggleKnob(nudgeMode)} />
            </button>
          </div>

          {/* Action buttons */}
          {!op && !opResult && (
            <div style={s.actions}>
              <button style={s.recordBtn} onClick={handleRecord}>
                <span style={s.btnIcon}>⏺</span>
                <div>
                  <div style={s.btnLabel}>Record Session</div>
                  <div style={s.btnSub}>Opens a browser — perform test manually then close</div>
                </div>
              </button>
              <button style={s.playBtn(!!recording)} onClick={handlePlayback} disabled={!recording}>
                <span style={s.btnIcon}>▶</span>
                <div>
                  <div style={s.btnLabel}>
                    Run Playback
                    {nudgeMode && <span style={s.nudgePill}>+ Nudge</span>}
                  </div>
                  <div style={s.btnSub}>
                    {recording ? "Replay recorded actions in live viewer"
                      : "No recording yet — record first"}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Record loading */}
          {opLoading && op === "record" && (
            <div style={s.opStatus}>
              <div style={s.spinner} />
              <div style={{ flex: 1 }}>
                <div style={s.opStatusText}>
                  Browser is open — perform your test, then close when done
                </div>
              </div>
              <button style={s.stopBtn} onClick={handleStop}>Stop Recording</button>
            </div>
          )}

          {/* Nudge waiting card */}
          {isWaiting && nudgeState?.failedStep && (
            <div style={s.nudgeCard}>
              <div style={s.nudgeCardHeader}>
                <span style={s.nudgeCardIcon}>⚠</span>
                <div>
                  <div style={s.nudgeCardTitle}>
                    Step {nudgeState.failedStep.step_number} failed
                  </div>
                  <div style={s.nudgeCardSub}>
                    {nudgeState.failedStep.action?.action} →{" "}
                    {nudgeState.failedStep.action?.url ||
                      nudgeState.failedStep.action?.selector || ""}
                  </div>
                </div>
              </div>
              <div style={s.nudgeCardError}>{nudgeState.failedStep.error}</div>
              <div style={s.nudgeCardMsg}>
                Want to manually perform this step? A browser will open at the current
                page — your actions will be recorded and replace the failing step.
              </div>
              <div style={s.nudgeCardBtns}>
                <button style={s.nudgeAcceptBtn} onClick={handleNudgeAccept}>
                  ✦ Nudge It — Open Browser
                </button>
                <button style={s.nudgeSkipBtn} onClick={handleNudgeSkip}>
                  Skip This Step
                </button>
              </div>
            </div>
          )}

          {/* Nudging in progress */}
          {isNudging && (
            <div style={s.nudgingCard}>
              <div style={s.spinner} />
              <div style={{ flex: 1 }}>
                <div style={s.nudgingTitle}>
                  Browser open — perform step {nudgeState?.failedStep?.step_number}
                </div>
                <div style={s.nudgingSubtitle}>
                  When finished, click <strong style={{ color: "#22c55e" }}>Done — Continue</strong>
                </div>
              </div>
              <button style={s.doneNudgeBtn} onClick={handleNudgeDone}>
                ✓ Done — Continue
              </button>
            </div>
          )}

          {/* Error */}
          {opError && (
            <div style={s.errorBox}>
              <div style={s.errorTitle}>Something went wrong</div>
              <div style={s.errorMsg}>{opError}</div>
              <button style={s.retryBtn} onClick={resetOp}>Try Again</button>
            </div>
          )}

          {/* Record result */}
          {opResult && op === "record" && (
            <div style={s.resultBox}>
              <div style={s.resultHeader}>
                <span style={s.resultSuccess}>Recording Saved</span>
              </div>
              <div style={s.resultRows}>
                <ResultRow label="Actions Captured" value={opResult.actions_recorded} />
                <ResultRow label="Saved To" value={opResult.saved_to} mono />
              </div>
              <div style={s.resultActions}>
                <button style={s.recordAgainBtn} onClick={resetOp}>⏺ Record Again</button>
                <button style={s.playBtnSmall} onClick={() => { resetOp(); setTimeout(handlePlayback, 50); }}>
                  ▶ Run Playback
                </button>
                <SaveBtn status={saveStatus} onClick={handleSave} />
              </div>
            </div>
          )}

          {/* Playback result */}
          {opResult && op === "playback" && (
            <div style={s.resultBox}>
              <div style={s.resultHeader}>
                <span style={opResult.failed > 0 ? s.resultFail : s.resultSuccess}>
                  {opResult.failed > 0 ? `${opResult.failed} step(s) failed` : "All Steps Passed"}
                </span>
                <span style={s.resultCount}>
                  {opResult.passed} passed · {opResult.failed} failed
                  {opResult.corrected > 0 && (
                    <span style={{ color: "#f59e0b" }}> · {opResult.corrected} nudged</span>
                  )}
                  {" "}· {opResult.total} total
                </span>
              </div>
              {opResult.corrected > 0 && (
                <div style={s.correctionBanner}>
                  ✦ {opResult.corrected} step{opResult.corrected > 1 ? "s" : ""} corrected
                  via nudge and saved automatically.
                </div>
              )}
              <div style={s.stepList}>
                {opResult.results?.map(r => (
                  <div key={r.step} style={s.stepRow(r.status)}>
                    <span style={s.stepStatus(r.status)}>
                      {r.status === "pass" ? "+" : r.status === "corrected" ? "✦"
                        : r.status === "skip" ? "—" : "x"}
                    </span>
                    <span style={s.stepNum}>Step {r.step}</span>
                    <span style={s.stepDesc}>
                      {r.action?.action}
                      {r.action?.url ? ` → ${r.action.url}` : ""}
                      {r.action?.selector ? ` → ${r.action.selector}` : ""}
                    </span>
                    {r.status === "corrected" && (
                      <span style={s.nudgedBadge}>NUDGED ({r.correction?.length} actions)</span>
                    )}
                    {r.error && r.status !== "corrected" && (
                      <span style={s.stepErr}>{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={s.resultRows}>
                <ResultRow label="Report File" value={opResult.report} mono />
              </div>
              <div style={s.resultActions}>
                <button style={s.runAgainBtn} onClick={resetOp}>↺ Run Again</button>
                <button style={s.recordAgainBtn} onClick={resetOp}>⏺ Record Again</button>
                <SaveBtn status={saveStatus} onClick={handleSave} />
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Live viewer ── */}
        {showViewer && (
          <>
            <div style={{ ...s.viewerCol, flex: `0 0 ${viewerWidth}px`, position: "relative" }}>
              {/* Drag handle */}
              <div
                style={s.dragHandle}
                onMouseDown={onDragStart}
                title="Drag to resize"
                onMouseEnter={e => { e.currentTarget.querySelector("span").style.backgroundColor = "#3b82f6"; e.currentTarget.style.backgroundColor = "rgba(59,130,246,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.querySelector("span").style.backgroundColor = "#334155"; e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={s.dragHandleInner} />
              </div>

              <div style={s.viewerCard}>
                {/* Viewer header — status + step counter merged */}
                <div style={s.viewerHeader}>
                  <div style={s.viewerTitle}>
                    {scrubberActive ? "Step Replay" : "Live Browser"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Scrubber toggle — shown once playback done */}
                    {scrubberData && !opLoading && (
                      <button
                        style={scb.toggleBtn(scrubberActive)}
                        onClick={() => setScrubberActive(v => !v)}
                      >
                        {scrubberActive ? "⏸ Live view" : "⏮ Replay steps"}
                      </button>
                    )}
                    {!scrubberActive && (
                      <div style={s.viewerStatus}>
                        <span style={{
                          ...s.viewerDot,
                          backgroundColor: statusColor[screenMeta?.status] || "#64748b",
                          animation: screenMeta?.status === "running" ? "pulse 1.2s infinite" : "none",
                        }} />
                        <span style={{ color: statusColor[screenMeta?.status] || "#64748b", fontSize: "0.78rem" }}>
                          {statusLabel[screenMeta?.status] || "Connecting..."}
                        </span>
                        {screenMeta && screenMeta.total > 0 && (
                          <span style={{ color: "#475569", fontSize: "0.72rem", marginLeft: "4px" }}>
                            · {screenMeta.step}/{screenMeta.total}
                          </span>
                        )}
                      </div>
                    )}
                    {scrubberActive && scrubberStep && scrubberData && (
                      <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                        Step {scrubberStep} of {scrubberData.total}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar — live mode only */}
                {!scrubberActive && screenMeta && screenMeta.total > 0 && (
                  <div style={s.progressOuter}>
                    <div style={{
                      ...s.progressInner,
                      width: `${Math.round((screenMeta.step / screenMeta.total) * 100)}%`,
                      backgroundColor: statusColor[screenMeta.status] || "#3b82f6",
                    }} />
                  </div>
                )}

                {/* Screenshot */}
                <div style={s.screenshotWrap}>
                  {/* ── Scrubber mode ── */}
                  {scrubberActive && scrubberUrl ? (
                    <img
                      key={scrubberUrl}
                      src={scrubberUrl}
                      alt={`Step ${scrubberStep}`}
                      style={s.screenshot}
                      onError={() => {}}
                    />
                  ) : !scrubberActive && screenshotUrl ? (
                    <img
                      key={screenshotUrl}
                      src={screenshotUrl}
                      alt="Live browser view"
                      style={s.screenshot}
                      onError={() => {}}
                    />
                  ) : (
                    <div style={s.screenshotPlaceholder}>
                      <div style={s.spinner} />
                      <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 12 }}>
                        Waiting for browser...
                      </div>
                    </div>
                  )}

                  {/* Step overlay — live mode only */}
                  {!scrubberActive && screenshotUrl && screenMeta?.status === "running" && currentStepAction && (
                    <StepOverlay
                      step={screenMeta.step}
                      total={screenMeta.total}
                      action={currentStepAction}
                    />
                  )}

                  {/* Scrubber step label overlay */}
                  {scrubberActive && scrubberStep && scrubberData && (() => {
                    const actions = recording?.actions || [];
                    const act = actions[(scrubberStep - 1)] || null;
                    return act ? (
                      <StepOverlay
                        step={scrubberStep}
                        total={scrubberData.total}
                        action={act}
                      />
                    ) : null;
                  })()}

                  {/* Live overlays — only in live mode */}
                  {!scrubberActive && isWaiting && (
                    <div style={s.screenshotOverlay("#f59e0b")}>
                      <div style={s.overlayIcon}>⚠</div>
                      <div style={s.overlayText}>Paused — step failed</div>
                      <div style={s.overlaySub}>Answer the nudge prompt to continue</div>
                    </div>
                  )}
                  {!scrubberActive && isNudging && (
                    <div style={s.screenshotOverlay("#3b82f6")}>
                      <div style={s.overlayIcon}>✦</div>
                      <div style={s.overlayText}>Mirroring correction browser</div>
                      <div style={s.overlaySub}>Perform the step, then click Done</div>
                    </div>
                  )}
                  {!scrubberActive && screenMeta?.status === "done" && !scrubberData && (
                    <div style={s.screenshotOverlay("#22c55e")}>
                      <div style={s.overlayIcon}>✓</div>
                      <div style={s.overlayText}>Playback complete</div>
                    </div>
                  )}
                </div>

                {/* ── Scrubber timeline ── */}
                {scrubberActive && scrubberData && (
                  <StepScrubber
                    steps={scrubberData.steps}
                    total={scrubberData.total}
                    currentStep={scrubberStep}
                    results={opResult?.results || []}
                    onStep={handleScrubberStep}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Step Scrubber Component ──────────────────────────────────────────────────
function StepScrubber({ steps, total, currentStep, results, onStep }) {
  const containerRef = useRef(null);

  // Build a status map from results for colouring the timeline dots
  const statusMap = {};
  (results || []).forEach(r => {
    statusMap[r.step] = r.status;
  });

  const dotColor = (step) => {
    const st = statusMap[step];
    if (st === "pass")      return "#22c55e";
    if (st === "fail")      return "#ef4444";
    if (st === "corrected") return "#f59e0b";
    if (st === "skip")      return "#64748b";
    return "#334155"; // no result yet (mid-run)
  };

  const currentIdx = steps.indexOf(currentStep);

  const go = (delta) => {
    const newIdx = Math.max(0, Math.min(steps.length - 1, currentIdx + delta));
    onStep(steps[newIdx]);
  };

  // Keyboard arrow navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft")  go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, steps]);

  // Auto-scroll the active dot into view
  useEffect(() => {
    if (!containerRef.current) return;
    const active = containerRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [currentStep]);

  return (
    <div style={scb.wrap}>
      {/* Prev / Next buttons */}
      <button style={scb.arrowBtn} onClick={() => go(-1)} disabled={currentIdx <= 0} title="Previous step (←)">
        ‹
      </button>

      {/* Scrollable dot track */}
      <div style={scb.trackOuter} ref={containerRef}>
        <div style={scb.track}>
          {steps.map((step, idx) => {
            const isActive = step === currentStep;
            const color = dotColor(step);
            return (
              <button
                key={step}
                data-active={isActive}
                style={scb.dot(isActive, color)}
                onClick={() => onStep(step)}
                title={`Step ${step}`}
              >
                {isActive && <span style={scb.dotLabel}>{step}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Next button */}
      <button style={scb.arrowBtn} onClick={() => go(1)} disabled={currentIdx >= steps.length - 1} title="Next step (→)">
        ›
      </button>

      {/* Jump to first / last */}
      <button style={scb.jumpBtn} onClick={() => onStep(steps[0])} title="First step">⏮</button>
      <button style={scb.jumpBtn} onClick={() => onStep(steps[steps.length - 1])} title="Last step">⏭</button>
    </div>
  );
}

// Scrubber styles
const scb = {
  toggleBtn: (active) => ({
    padding: "3px 10px",
    borderRadius: "5px",
    border: active ? "1px solid #3b82f6" : "1px solid #334155",
    backgroundColor: active ? "rgba(59,130,246,0.12)" : "transparent",
    color: active ? "#3b82f6" : "#94a3b8",
    fontSize: "0.72rem",
    cursor: "pointer",
    fontWeight: "600",
    whiteSpace: "nowrap",
  }),
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 0 2px",
    borderTop: "1px solid #1e293b",
    marginTop: "6px",
  },
  trackOuter: {
    flex: 1,
    overflowX: "auto",
    overflowY: "visible",
    paddingBottom: "4px",
    scrollbarWidth: "none",
  },
  track: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    minWidth: "max-content",
    padding: "4px 2px",
  },
  dot: (active, color) => ({
    width: active ? "auto" : "10px",
    minWidth: active ? "28px" : "10px",
    height: "10px",
    borderRadius: active ? "5px" : "50%",
    backgroundColor: active ? color : color + "88",
    border: active ? `2px solid ${color}` : "none",
    cursor: "pointer",
    padding: 0,
    position: "relative",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: active ? `0 0 8px ${color}66` : "none",
  }),
  dotLabel: {
    color: "#fff",
    fontSize: "0.6rem",
    fontWeight: "700",
    lineHeight: 1,
    pointerEvents: "none",
    padding: "0 4px",
  },
  arrowBtn: {
    width: "26px",
    height: "26px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#94a3b8",
    fontSize: "1.1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 1,
    padding: 0,
  },
  jumpBtn: {
    width: "22px",
    height: "22px",
    borderRadius: "5px",
    border: "1px solid #1e293b",
    backgroundColor: "transparent",
    color: "#475569",
    fontSize: "0.65rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  },
};


// ── Step Overlay Component ────────────────────────────────────────────────────
function StepOverlay({ step, total, action }) {
  const meta = getActionMeta(action?.action);
  const descriptor = action?.url || action?.selector || action?.key || "";
  const value = action?.value;

  return (
    <div style={so.wrap}>
      {/* Step counter pill */}
      <div style={so.pill}>
        <span style={so.pillStep}>STEP {step}</span>
        <span style={so.pillSep}>/</span>
        <span style={so.pillTotal}>{total}</span>
      </div>

      {/* Action chip */}
      <div style={so.chip(meta.color)}>
        <span style={so.chipIcon(meta.color)}>{meta.icon}</span>
        <span style={so.chipLabel}>{meta.label}</span>
        {descriptor && (
          <span style={so.chipDesc} title={descriptor}>
            {truncate(descriptor, 36)}
          </span>
        )}
        {value && (
          <span style={so.chipValue} title={value}>
            = {truncate(value, 20)}
          </span>
        )}
      </div>
    </div>
  );
}

// Step overlay styles
const so = {
  wrap: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    right: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    pointerEvents: "none",
    animation: "slideDown 0.2s ease",
    zIndex: 5,
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(15,23,42,0.88)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    padding: "5px 9px",
    backdropFilter: "blur(6px)",
    flexShrink: 0,
  },
  pillStep:  { color: "#f1f5f9", fontSize: "0.7rem", fontWeight: "700", letterSpacing: "0.08em" },
  pillSep:   { color: "#334155", fontSize: "0.65rem", margin: "0 1px" },
  pillTotal: { color: "#64748b", fontSize: "0.68rem" },
  chip: (color) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(15,23,42,0.88)",
    border: `1px solid ${color}44`,
    borderRadius: "6px",
    padding: "5px 10px",
    backdropFilter: "blur(6px)",
    overflow: "hidden",
    minWidth: 0,
    flex: 1,
  }),
  chipIcon:  (color) => ({ color, fontSize: "0.85rem", flexShrink: 0 }),
  chipLabel: { color: "#f1f5f9", fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", flexShrink: 0 },
  chipDesc:  { color: "#94a3b8", fontSize: "0.72rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
  chipValue: { color: "#a78bfa", fontSize: "0.7rem", fontFamily: "monospace", flexShrink: 0, marginLeft: "auto", paddingLeft: "6px" },
};

// ── Small components ──────────────────────────────────────────────────────────

function ResultRow({ label, value, mono }) {
  return (
    <div style={s.resultRow}>
      <span style={s.resultRowLabel}>{label}</span>
      <span style={{ ...s.resultRowValue, fontFamily: mono ? "monospace" : "inherit" }}>
        {value}
      </span>
    </div>
  );
}

function SaveBtn({ status, onClick }) {
  const bg = status === "saved" ? "#15803d" : status === "error" ? "#dc2626" : "#2563eb";
  return (
    <button
      style={{ ...s.playBtnSmall, backgroundColor: bg, opacity: status === "saving" ? 0.7 : 1 }}
      onClick={onClick}
      disabled={status === "saving" || status === "saved"}
    >
      {status === "saving" ? "Saving..." : status === "saved" ? "Saved!"
        : status === "error" ? "Save Failed" : "Save to TestRail"}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:        { minHeight: "100vh", height: "100vh", backgroundColor: "var(--bg,#0f172a)", fontFamily: "sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" },
  loadingMsg:  { color: "#94a3b8", padding: "40px", textAlign: "center" },

  header:      { borderBottom: "1px solid #1e293b", padding: "16px 32px", display: "flex", alignItems: "flex-start", gap: "20px", backgroundColor: "var(--bg,#0f172a)", position: "sticky", top: 0, zIndex: 10 },
  backBtn:     { background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontSize: "0.85rem", marginTop: "4px", flexShrink: 0 },
  headerMeta:  { display: "flex", flexDirection: "column", gap: "4px" },
  headerLabel: { color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em" },
  headerTitle: { color: "#f1f5f9", fontSize: "1.2rem", margin: 0, display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  caseIdBadge: { backgroundColor: "#3b82f6", color: "#fff", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" },

  // layouts
  singleLayout: { padding: "32px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", flex: 1, maxWidth: "620px", width: "100%" },
  splitLayout:  { display: "flex", flex: 1, overflow: "hidden", minWidth: 0 },
  dragHandle:   { position: "absolute", right: 0, top: 0, bottom: 0, width: "12px", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "transparent", userSelect: "none", zIndex: 10, borderLeft: "1px solid #1e293b" },
  dragHandleInner: { width: "3px", height: "48px", borderRadius: "3px", backgroundColor: "#334155", pointerEvents: "none" },
  mainCol:      { padding: "32px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", flex: "0 0 480px" },
  viewerCol:    { padding: "16px 24px 16px 16px", display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 },

  // viewer card
  viewerCard:   { display: "flex", flexDirection: "column", gap: "10px", flex: 1 },
  viewerHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  viewerTitle:  { color: "#f1f5f9", fontSize: "0.8rem", fontWeight: "700" },
  viewerStatus: { display: "flex", alignItems: "center", gap: "6px" },
  viewerDot:    { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },

  progressOuter: { height: "3px", backgroundColor: "#1e293b", borderRadius: "2px", overflow: "hidden" },
  progressInner: { height: "100%", borderRadius: "2px", transition: "width 0.4s ease" },
  progressLabel: { color: "#64748b", fontSize: "0.72rem", textAlign: "right" },

  screenshotWrap: { position: "relative", flex: 1, minHeight: "200px", backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  screenshot:     { width: "100%", height: "100%", objectFit: "contain", display: "block" },
  screenshotPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" },

  screenshotOverlay: (color) => ({
    position: "absolute", inset: 0,
    backgroundColor: `${color}18`,
    border: `2px solid ${color}55`,
    borderRadius: "10px",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: "6px",
    backdropFilter: "blur(1px)",
    animation: "fadeIn 0.2s ease",
  }),
  overlayIcon: { fontSize: "2rem" },
  overlayText: { color: "#f1f5f9", fontWeight: "700", fontSize: "0.95rem" },
  overlaySub:  { color: "#94a3b8", fontSize: "0.8rem" },

  // status card
  statusCard:   { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "16px 20px" },
  statusRow:    { display: "flex", alignItems: "center", gap: "14px" },
  statusDot:    (r) => ({ width: "12px", height: "12px", borderRadius: "50%", flexShrink: 0, backgroundColor: r === false ? "#ef4444" : r ? "#22c55e" : "#94a3b8", boxShadow: r ? "0 0 8px #22c55e88" : r === false ? "0 0 8px #ef444488" : "none" }),
  statusTitle:  { color: "#f1f5f9", fontSize: "0.95rem", fontWeight: "600" },
  statusSub:    { color: "#64748b", fontSize: "0.8rem", marginTop: "2px" },
  detailsToggle:{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "transparent", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer", flexShrink: 0 },

  // ── Delete button ──
  deleteBtn: {
    padding: "4px 9px",
    borderRadius: "6px",
    border: "1px solid #3f2323",
    backgroundColor: "rgba(239,68,68,0.07)",
    color: "#ef4444",
    fontSize: "0.82rem",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
    transition: "background 0.15s",
  },

  // ── Delete confirm modal ──
  modalBackdrop: {
    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, backdropFilter: "blur(4px)", animation: "fadeIn 0.15s ease",
  },
  modal: {
    backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px",
    padding: "32px", width: "min(420px, 90vw)", display: "flex", flexDirection: "column",
    gap: "14px", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", animation: "slideDown 0.2s ease",
  },
  modalIcon:  { fontSize: "2rem", textAlign: "center" },
  modalTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: "1.1rem", textAlign: "center" },
  modalBody:  { color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.65, textAlign: "center" },
  modalError: { backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: "6px", padding: "8px 12px", color: "#fca5a5", fontSize: "0.82rem", textAlign: "center" },
  modalBtns:  { display: "flex", gap: "10px", justifyContent: "center", marginTop: "6px" },
  modalCancelBtn: {
    padding: "9px 22px", borderRadius: "7px", border: "1px solid #334155",
    backgroundColor: "transparent", color: "#94a3b8", fontSize: "0.9rem", cursor: "pointer",
  },
  modalDeleteBtn: {
    padding: "9px 22px", borderRadius: "7px", border: "none",
    backgroundColor: "#dc2626", color: "#fff", fontSize: "0.9rem", cursor: "pointer", fontWeight: "700",
  },

  detailsPanel: { marginTop: "14px", borderTop: "1px solid #1e293b", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" },
  detailsMeta:  { display: "flex", flexWrap: "wrap", gap: "12px" },
  detailsMetaItem: { color: "#64748b", fontSize: "0.78rem", fontFamily: "monospace" },
  detailsSteps: { display: "flex", flexDirection: "column", gap: "4px" },
  detailsStep:  { display: "flex", gap: "10px", alignItems: "flex-start", padding: "6px 8px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.03)", fontSize: "0.8rem" },
  detailsStepNum:    { color: "#64748b", flexShrink: 0, minWidth: "48px" },
  detailsStepAction: { color: "#3b82f6", flexShrink: 0, minWidth: "64px", fontWeight: "600" },
  detailsStepDesc:   { color: "#f1f5f9", wordBreak: "break-all" },

  section:      { display: "flex", flexDirection: "column", gap: "10px" },
  sectionLabel: { color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em" },
  envTabs:      { display: "flex", gap: "6px", flexWrap: "wrap" },
  envTab:       (a) => ({ padding: "6px 14px", borderRadius: "6px", border: a ? "1px solid #3b82f6" : "1px solid #334155", backgroundColor: a ? "rgba(59,130,246,0.12)" : "transparent", color: a ? "#3b82f6" : "#94a3b8", fontSize: "0.85rem", cursor: "pointer", fontWeight: a ? "600" : "400" }),
  envInput:     { padding: "8px 12px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem", width: "100%", boxSizing: "border-box" },
  envDisplay:   { color: "#64748b", fontSize: "0.85rem", fontFamily: "monospace", padding: "4px 0" },

  nudgeToggleRow:  { display: "flex", alignItems: "center", gap: "16px", padding: "14px 16px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "10px" },
  nudgeToggleLabel:{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" },
  nudgeToggleSub:  { color: "#64748b", fontSize: "0.78rem", marginTop: "2px" },
  toggle:    (on) => ({ width: "44px", height: "24px", borderRadius: "12px", border: "none", backgroundColor: on ? "#3b82f6" : "#334155", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }),
  toggleKnob:(on) => ({ position: "absolute", top: "3px", left: on ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#fff", transition: "left 0.2s" }),
  nudgePill:  { backgroundColor: "rgba(59,130,246,0.2)", color: "#3b82f6", fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", marginLeft: "6px" },

  actions:    { display: "flex", flexDirection: "column", gap: "12px", width: "100%" },
  recordBtn:  { display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderRadius: "10px", border: "1px solid #dc2626", backgroundColor: "rgba(220,38,38,0.08)", color: "#f1f5f9", cursor: "pointer", textAlign: "left", width: "100%", boxSizing: "border-box" },
  playBtn:    (en) => ({ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderRadius: "10px", border: en ? "1px solid #16a34a" : "1px solid #334155", backgroundColor: en ? "rgba(22,163,74,0.08)" : "transparent", color: en ? "#f1f5f9" : "#64748b", cursor: en ? "pointer" : "not-allowed", textAlign: "left", width: "100%", opacity: en ? 1 : 0.5, boxSizing: "border-box" }),
  btnIcon:    { fontSize: "1.4rem", flexShrink: 0 },
  btnLabel:   { fontSize: "0.95rem", fontWeight: "600", marginBottom: "2px", display: "flex", alignItems: "center" },
  btnSub:     { fontSize: "0.8rem", color: "#94a3b8" },

  opStatus:    { display: "flex", alignItems: "center", gap: "14px", padding: "20px", backgroundColor: "#1e293b", borderRadius: "10px", border: "1px solid #334155" },
  spinner:     { width: "20px", height: "20px", border: "2px solid #334155", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
  opStatusText:{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 },
  stopBtn:     { padding: "7px 16px", borderRadius: "6px", border: "1px solid #ef4444", backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600", flexShrink: 0 },
  doneNudgeBtn:{ padding: "7px 16px", borderRadius: "6px", border: "none", backgroundColor: "#22c55e", color: "#fff", fontSize: "0.85rem", cursor: "pointer", fontWeight: "700", flexShrink: 0 },

  nudgeCard:       { backgroundColor: "rgba(245,158,11,0.07)", border: "1px solid #f59e0b", borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", animation: "fadeIn 0.2s ease" },
  nudgeCardHeader: { display: "flex", alignItems: "flex-start", gap: "12px" },
  nudgeCardIcon:   { fontSize: "1.3rem", color: "#f59e0b", flexShrink: 0 },
  nudgeCardTitle:  { color: "#f59e0b", fontWeight: "700", fontSize: "1rem" },
  nudgeCardSub:    { color: "#94a3b8", fontSize: "0.82rem", marginTop: "2px", fontFamily: "monospace" },
  nudgeCardError:  { backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "8px 12px", color: "#fca5a5", fontSize: "0.8rem", fontFamily: "monospace" },
  nudgeCardMsg:    { color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.6 },
  nudgeCardBtns:   { display: "flex", gap: "10px" },
  nudgeAcceptBtn:  { padding: "9px 20px", borderRadius: "7px", border: "none", backgroundColor: "#f59e0b", color: "#000", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer" },
  nudgeSkipBtn:    { padding: "9px 20px", borderRadius: "7px", border: "1px solid #334155", backgroundColor: "transparent", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer" },

  nudgingCard:     { display: "flex", alignItems: "center", gap: "14px", padding: "20px", backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid #f59e0b", borderRadius: "10px" },
  nudgingTitle:    { color: "#f59e0b", fontWeight: "600", fontSize: "0.9rem" },
  nudgingSubtitle: { color: "#94a3b8", fontSize: "0.8rem", marginTop: "3px" },

  errorBox:   { backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid #ef4444", borderRadius: "10px", padding: "20px" },
  errorTitle: { color: "#ef4444", fontWeight: "600", marginBottom: "6px" },
  errorMsg:   { color: "#94a3b8", fontSize: "0.85rem", marginBottom: "14px" },
  retryBtn:   { padding: "6px 16px", borderRadius: "6px", border: "1px solid #ef4444", backgroundColor: "transparent", color: "#ef4444", fontSize: "0.85rem", cursor: "pointer" },

  resultBox:    { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  resultHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" },
  resultSuccess:{ color: "#22c55e", fontWeight: "700", fontSize: "1rem" },
  resultFail:   { color: "#ef4444", fontWeight: "700", fontSize: "1rem" },
  resultCount:  { color: "#94a3b8", fontSize: "0.85rem" },
  correctionBanner: { backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "6px", padding: "10px 14px", color: "#f59e0b", fontSize: "0.85rem" },
  resultRows:   { display: "flex", flexDirection: "column", gap: "8px" },
  resultRow:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", padding: "8px 0", borderBottom: "1px solid #1e293b", fontSize: "0.85rem" },
  resultRowLabel:{ color: "#64748b", flexShrink: 0 },
  resultRowValue:{ color: "#f1f5f9", textAlign: "right", wordBreak: "break-all" },

  stepList: { display: "flex", flexDirection: "column", gap: "4px" },
  stepRow:  (status) => {
    const bg = status === "pass" ? "rgba(34,197,94,0.06)" : status === "corrected" ? "rgba(245,158,11,0.08)" : status === "skip" ? "rgba(100,116,139,0.08)" : "rgba(239,68,68,0.06)";
    return { display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 10px", borderRadius: "6px", backgroundColor: bg, fontSize: "0.82rem" };
  },
  stepStatus: (status) => {
    const c = status === "pass" ? "#22c55e" : status === "corrected" ? "#f59e0b" : status === "skip" ? "#64748b" : "#ef4444";
    return { color: c, fontWeight: "700", flexShrink: 0 };
  },
  stepNum:    { color: "#64748b", flexShrink: 0 },
  stepDesc:   { color: "#f1f5f9", flex: 1 },
  stepErr:    { color: "#ef4444", fontSize: "0.75rem" },
  nudgedBadge:{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", fontWeight: "600", flexShrink: 0 },

  resultActions:  { display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" },
  recordAgainBtn: { padding: "7px 16px", borderRadius: "6px", border: "1px solid #dc2626", backgroundColor: "rgba(220,38,38,0.1)", color: "#ef4444", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600" },
  runAgainBtn:    { padding: "7px 16px", borderRadius: "6px", border: "1px solid #d97706", backgroundColor: "rgba(217,119,6,0.1)", color: "#f59e0b", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600" },
  playBtnSmall:   { padding: "7px 16px", borderRadius: "6px", border: "none", backgroundColor: "#16a34a", color: "#fff", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600" },
};