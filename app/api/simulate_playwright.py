"""
simulate_playwright.py  —  Record & Playback routes using Playwright
Sits alongside cases.py in app/routes/
"""

import json
import tempfile
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.testrail_client import TestRailClient, TestRailError

router = APIRouter()

# ── Storage (local JSON file for now, swap for DB later) ─────────────────────
RECORDINGS_DIR = Path("recordings")
RECORDINGS_DIR.mkdir(exist_ok=True)


# ── Schemas ──────────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    url: str          # TestRail instance URL
    email: str
    password: str
    case_id: int
    environment_url: str   # The app URL to record against e.g. http://localhost:3000


class PlaybackRequest(BaseModel):
    case_id: int
    environment_url: str   # Can differ from where it was recorded


# ── Helpers ──────────────────────────────────────────────────────────────────

def _recording_path(case_id: int) -> Path:
    return RECORDINGS_DIR / f"case_{case_id}.json"


def _client(url, email, password):
    return TestRailClient(url, email, password)


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/record/{case_id}")
def record_session(case_id: int, body: SimulateRequest):
    """
    Opens a visible Playwright browser on the tester's machine.
    They perform their test manually. When they close the browser,
    the recorded actions are saved locally and patched back to TestRail.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise HTTPException(status_code=500, detail="Playwright not installed. Run: pip install playwright && playwright install chromium")

    recorded_actions = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()

            # Intercept all actions via CDP (Chrome DevTools Protocol)
            page = context.new_page()

            # Track navigation
            def on_navigation(response):
                recorded_actions.append({
                    "action": "navigate",
                    "url": response.url,
                    "status": response.status
                })

            page.on("response", on_navigation)

            # Go to the environment
            page.goto(body.environment_url)
            print(f"[Simulate] Browser opened at {body.environment_url}")
            print(f"[Simulate] Perform your test then CLOSE the browser window to save.")

            # Wait for the tester to close the browser
            # We capture via Playwright's built-in codegen storage state
            page.wait_for_event("close", timeout=0)  # no timeout — waits until closed
            browser.close()

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Recording failed: {str(exc)}")

    # ── Save recording locally ────────────────────────────────────────────────
    recording = {
        "case_id": case_id,
        "environment_url": body.environment_url,
        "actions": recorded_actions,
    }

    _recording_path(case_id).write_text(json.dumps(recording, indent=2))

    # ── Also save steps back to TestRail ─────────────────────────────────────
    try:
        c = _client(body.url, body.email, body.password)
        steps_text = "\n".join(
            [f"Step {i+1}: {a['action']} → {a.get('url', a.get('selector', ''))}"
             for i, a in enumerate(recorded_actions)]
        )
        c.update_case(case_id, {
            "custom_tc_test_data": json.dumps(recorded_actions),   # raw JSON for playback
            "custom_steps": steps_text,                             # human readable
        })
    except Exception as exc:
        # Don't fail the whole request if TestRail update fails
        print(f"[Simulate] Warning: could not update TestRail case: {exc}")

    return {
        "success": True,
        "case_id": case_id,
        "actions_recorded": len(recorded_actions),
        "saved_to": str(_recording_path(case_id)),
    }


@router.post("/playback/{case_id}")
def playback_session(case_id: int, body: PlaybackRequest):
    """
    Reads saved actions for a case and replays them using Playwright.
    Runs headless locally, generates an HTML report you can open in browser.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise HTTPException(status_code=500, detail="Playwright not installed.")

    # Load recording
    recording_file = _recording_path(case_id)
    if not recording_file.exists():
        raise HTTPException(status_code=404, detail=f"No recording found for case {case_id}. Record it first.")

    recording = json.loads(recording_file.read_text())
    actions = recording.get("actions", [])

    if not actions:
        raise HTTPException(status_code=400, detail="Recording exists but has no actions to replay.")

    results = []
    passed = 0
    failed = 0
    report_path = RECORDINGS_DIR / f"case_{case_id}_report.html"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)  # headless for playback
            context = browser.new_context()
            page = context.new_page()

            for i, action in enumerate(actions):
                step_result = {"step": i + 1, "action": action, "status": "pass", "error": None}
                try:
                    if action["action"] == "navigate":
                        # Swap original environment for target environment
                        target_url = action["url"].replace(
                            recording["environment_url"],
                            body.environment_url
                        )
                        page.goto(target_url, wait_until="networkidle")

                    elif action["action"] == "click":
                        page.click(action["selector"])

                    elif action["action"] == "fill":
                        page.fill(action["selector"], action.get("value", ""))

                    elif action["action"] == "select":
                        page.select_option(action["selector"], action.get("value", ""))

                    passed += 1

                except Exception as step_exc:
                    step_result["status"] = "fail"
                    step_result["error"] = str(step_exc)
                    failed += 1

                results.append(step_result)

            browser.close()

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Playback failed: {str(exc)}")

    # ── Generate simple HTML report ───────────────────────────────────────────
    rows = ""
    for r in results:
        color = "#22c55e" if r["status"] == "pass" else "#ef4444"
        action_desc = f"{r['action'].get('action', '')} → {r['action'].get('url', r['action'].get('selector', ''))}"
        error_cell = f"<td style='color:#ef4444'>{r['error'] or ''}</td>"
        rows += f"<tr><td>{r['step']}</td><td>{action_desc}</td><td style='color:{color};font-weight:600'>{r['status'].upper()}</td>{error_cell}</tr>"

    html = f"""<!DOCTYPE html>
<html>
<head>
  <title>Playback Report — Case {case_id}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }}
    h1 {{ color: #f8fafc; }} 
    .summary {{ display: flex; gap: 2rem; margin: 1rem 0 2rem; }}
    .badge {{ padding: 0.5rem 1.5rem; border-radius: 8px; font-weight: 700; font-size: 1.1rem; }}
    .pass {{ background: #166534; color: #86efac; }}
    .fail {{ background: #7f1d1d; color: #fca5a5; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th {{ background: #1e293b; padding: 0.75rem 1rem; text-align: left; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }}
    td {{ padding: 0.75rem 1rem; border-bottom: 1px solid #1e293b; font-size: 0.9rem; }}
  </style>
</head>
<body>
  <h1>Playback Report — Case {case_id}</h1>
  <div class="summary">
    <span class="badge pass">✓ {passed} Passed</span>
    <span class="badge fail">✗ {failed} Failed</span>
  </div>
  <table>
    <thead><tr><th>#</th><th>Action</th><th>Status</th><th>Error</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
</body>
</html>"""

    report_path.write_text(html)

    return {
        "success": True,
        "case_id": case_id,
        "passed": passed,
        "failed": failed,
        "total": len(results),
        "report": str(report_path),
        "results": results,
    }


@router.get("/recordings/{case_id}")
def get_recording(case_id: int):
    """Check if a recording exists for a case and return its metadata."""
    recording_file = _recording_path(case_id)
    if not recording_file.exists():
        return {"exists": False, "case_id": case_id}

    recording = json.loads(recording_file.read_text())
    return {
        "exists": True,
        "case_id": case_id,
        "environment_url": recording.get("environment_url"),
        "actions_count": len(recording.get("actions", [])),
    }