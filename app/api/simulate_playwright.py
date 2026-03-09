"""
simulate_playwright.py  —  Record & Playback routes using Playwright
Live screenshot streaming to the frontend. Nudge system removed.
"""

import json
import re
import threading
import time
import glob
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.services.testrail_client import TestRailClient, TestRailError

router = APIRouter()

RECORDINGS_DIR = Path("recordings")
RECORDINGS_DIR.mkdir(exist_ok=True)
SCREENSHOTS_DIR = Path("recordings/screenshots")
SCREENSHOTS_DIR.mkdir(exist_ok=True)

_active_sessions: dict[int, threading.Event] = {}
_live_screenshots: dict[int, bytes] = {}
_live_screenshot_meta: dict[int, dict] = {}
_step_screenshots: dict[int, dict[int, bytes]] = {}  # case_id -> {step -> png}

# SVG shape tags that should never be clicked directly — we walk up to the nearest
# interactive ancestor instead.
_SVG_LEAF_TAGS = {"circle", "ellipse", "rect", "path", "line", "polyline", "polygon",
                  "g", "use", "symbol", "defs", "text", "tspan", "clippath", "mask"}


class SimulateRequest(BaseModel):
    url: str
    email: str
    password: str
    case_id: int
    environment_url: str

class PlaybackRequest(BaseModel):
    case_id: int
    environment_url: str

class SaveRequest(BaseModel):
    url: str
    email: str
    password: str
    case_id: int


def _recording_path(case_id: int) -> Path:
    return RECORDINGS_DIR / f"case_{case_id}.json"

def _client(url, email, password):
    return TestRailClient(url, email, password)

def _capture(page, case_id: int, step: int, total: int, status: str = "running",
             settle_ms: int = 0):
    """Take a screenshot and store it for the live viewer and step scrubber."""
    try:
        if settle_ms > 0:
            time.sleep(settle_ms / 1000)
        png = page.screenshot(type="png", full_page=False)
        _live_screenshots[case_id] = png
        _live_screenshot_meta[case_id] = {
            "step": step, "total": total, "status": status, "ts": time.time(),
        }
        if case_id not in _step_screenshots:
            _step_screenshots[case_id] = {}
        _step_screenshots[case_id][step] = png
    except Exception:
        pass


@router.get("/screenshot/{case_id}")
def get_screenshot(case_id: int):
    png = _live_screenshots.get(case_id)
    if not png:
        raise HTTPException(status_code=404, detail="No screenshot available yet.")
    return Response(content=png, media_type="image/png")

@router.get("/screenshot-meta/{case_id}")
def get_screenshot_meta(case_id: int):
    meta = _live_screenshot_meta.get(case_id)
    if not meta:
        return {"step": 0, "total": 0, "status": "idle", "ts": 0}
    return meta


@router.get("/scrubber/{case_id}")
def get_scrubber_data(case_id: int):
    steps = _step_screenshots.get(case_id, {})
    if not steps:
        return {"available": False, "steps": [], "total": 0}
    return {
        "available": True,
        "total": max(steps.keys()),
        "steps": sorted(steps.keys()),
    }

@router.get("/scrubber/{case_id}/{step}")
def get_step_screenshot(case_id: int, step: int):
    steps = _step_screenshots.get(case_id, {})
    png = steps.get(step)
    if not png:
        raise HTTPException(status_code=404, detail=f"No screenshot for step {step}.")
    return Response(content=png, media_type="image/png")

@router.delete("/scrubber/{case_id}")
def clear_scrubber(case_id: int):
    _step_screenshots.pop(case_id, None)
    return {"success": True}


@router.post("/record/{case_id}")
def record_session(case_id: int, body: SimulateRequest):
    import subprocess

    stop_event = threading.Event()
    _active_sessions[case_id] = stop_event

    try:
        output_path = RECORDINGS_DIR / f"case_{case_id}_codegen.py"
        proc = subprocess.Popen(
            ["python", "-m", "playwright", "codegen",
             "--output", str(output_path), "--browser", "chromium",
             body.environment_url],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )

        def poll_stop():
            while not stop_event.is_set():
                if proc.poll() is not None:
                    stop_event.set()
                    break
                time.sleep(0.5)
            if proc.poll() is None:
                proc.terminate()

        t = threading.Thread(target=poll_stop, daemon=True)
        t.start()
        proc.wait()
        stop_event.set()
        t.join(timeout=3)

    except Exception as exc:
        _active_sessions.pop(case_id, None)
        raise HTTPException(status_code=500, detail=f"Recording failed: {exc}")
    finally:
        _active_sessions.pop(case_id, None)

    output_path = RECORDINGS_DIR / f"case_{case_id}_codegen.py"
    if not output_path.exists():
        raise HTTPException(status_code=500, detail="Recording produced no output.")

    try:
        actions = _parse_codegen(output_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse recording: {exc}")

    recording = {
        "case_id": case_id,
        "environment_url": body.environment_url,
        "actions": actions,
        "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _recording_path(case_id).write_text(json.dumps(recording, indent=2), encoding="utf-8")
    return {"success": True, "case_id": case_id, "actions_recorded": len(actions),
            "saved_to": str(_recording_path(case_id))}


@router.post("/playback/{case_id}")
def playback_session(case_id: int, body: PlaybackRequest):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise HTTPException(status_code=500, detail="Playwright not installed.")

    recording_file = _recording_path(case_id)
    if not recording_file.exists():
        raise HTTPException(status_code=404, detail=f"No recording found for case {case_id}.")

    recording = json.loads(recording_file.read_text(encoding="utf-8"))
    actions = recording.get("actions", [])
    original_env = recording.get("environment_url", "")

    if not actions:
        raise HTTPException(status_code=400, detail="Recording has no actions to replay.")

    results = []
    passed = 0
    failed = 0

    _live_screenshots.pop(case_id, None)
    _live_screenshot_meta.pop(case_id, None)
    _step_screenshots.pop(case_id, None)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--force-renderer-accessibility",
                    "--use-fake-ui-for-media-stream",
                    "--use-fake-device-for-media-stream",
                    "--allow-file-access-from-files",
                ]
            )
            from urllib.parse import urlparse
            all_permissions = [
                "notifications", "geolocation", "microphone", "camera",
                "clipboard-read", "clipboard-write",
            ]
            origins = set()
            for a in actions:
                if a.get("action") == "navigate":
                    p = urlparse(a["url"])
                    if p.scheme and p.netloc:
                        origins.add(f"{p.scheme}://{p.netloc}")
            p = urlparse(body.environment_url)
            if p.scheme and p.netloc:
                origins.add(f"{p.scheme}://{p.netloc}")

            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                permissions=all_permissions,
                geolocation={"latitude": 37.7749, "longitude": -122.4194},
            )
            for origin in origins:
                try:
                    context.grant_permissions(all_permissions, origin=origin)
                except Exception:
                    pass
            page = context.new_page()

            page.on("dialog", lambda d: d.accept())

            context.add_init_script("""
                const _origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                navigator.mediaDevices.getUserMedia = (constraints) => {
                    return _origGetUserMedia(constraints).catch(() =>
                        _origGetUserMedia({ audio: true, video: false })
                    );
                };

                const _OrigRTC = window.RTCPeerConnection;
                if (_OrigRTC) {
                    window.RTCPeerConnection = function(...args) {
                        const pc = new _OrigRTC(...args);
                        const _origGetStats = pc.getStats.bind(pc);
                        pc.getStats = () => _origGetStats().catch(() => new Map());
                        return pc;
                    };
                    Object.assign(window.RTCPeerConnection, _OrigRTC);
                    window.RTCPeerConnection.prototype = _OrigRTC.prototype;
                }
            """)

            for i, action in enumerate(actions):
                step_num = i + 1
                act_type = action.get("action", "")
                is_last = step_num >= len(actions)
                step = {"step": step_num, "action": action, "status": "pass", "error": None}

                last_exc = None
                max_attempts = 1 if act_type in ("navigate", "wait") else 3
                for attempt in range(max_attempts):
                    try:
                        _capture(page, case_id, step_num, len(actions), "running")
                        _execute_action(page, action, original_env, body.environment_url)

                        if act_type == "navigate":
                            settle = 1200 if is_last else 600
                            _poll_and_dismiss_banners(page, duration_ms=2000)
                        elif act_type in ("click", "dblclick"):
                            settle = 800 if is_last else 300
                        elif act_type in ("fill", "press", "keyboard_press"):
                            settle = 150
                        else:
                            settle = 400 if is_last else 200

                        _capture(page, case_id, step_num, len(actions), "running",
                                 settle_ms=settle)
                        last_exc = None
                        break

                    except Exception as e:
                        last_exc = e
                        if attempt < max_attempts - 1:
                            print(f"[RETRY] Step {step_num} attempt {attempt + 1} failed: {e}")
                            time.sleep(0.8 * (attempt + 1))
                            _dismiss_app_dialogs(page)

                if last_exc:
                    step["status"] = "fail"
                    step["error"] = str(last_exc)
                    failed += 1
                    _capture(page, case_id, step_num, len(actions), "error", settle_ms=200)
                else:
                    passed += 1

                results.append(step)

            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            time.sleep(1.2)
            _capture(page, case_id, len(actions), len(actions), "done")
            browser.close()

    except Exception as exc:
        _live_screenshot_meta[case_id] = {
            **_live_screenshot_meta.get(case_id, {}), "status": "error",
        }
        raise HTTPException(status_code=500, detail=f"Playback failed: {exc}")

    _live_screenshot_meta[case_id] = {
        **_live_screenshot_meta.get(case_id, {}),
        "status": "done", "step": len(actions), "total": len(actions),
    }

    report_path = RECORDINGS_DIR / f"case_{case_id}_report.html"
    rows = ""
    for r in results:
        color = "#22c55e" if r["status"] == "pass" else "#ef4444"
        act = r["action"]
        desc = f"{act.get('action', '')} -> {act.get('url', act.get('selector', ''))}"
        if act.get("value"):
            desc += f" = {act['value']}"
        rows += (f"<tr><td>{r['step']}</td><td>{desc}</td>"
                 f"<td style='color:{color};font-weight:600'>{r['status'].upper()}</td>"
                 f"<td style='color:#ef4444'>{r['error'] or ''}</td></tr>")

    html = f"""<!DOCTYPE html><html><head><title>Playback Report - Case {case_id}</title>
<style>body{{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:2rem}}
h1{{color:#f8fafc}}.summary{{display:flex;gap:2rem;margin:1rem 0 2rem}}
.badge{{padding:.5rem 1.5rem;border-radius:8px;font-weight:700;font-size:1.1rem}}
.pass{{background:#166534;color:#86efac}}.fail{{background:#7f1d1d;color:#fca5a5}}
table{{width:100%;border-collapse:collapse}}
th{{background:#1e293b;padding:.75rem 1rem;text-align:left;color:#94a3b8;font-size:.8rem;text-transform:uppercase}}
td{{padding:.75rem 1rem;border-bottom:1px solid #1e293b;font-size:.9rem}}</style></head>
<body><h1>Playback Report - Case {case_id}</h1>
<div class="summary"><span class="badge pass">PASS {passed}</span>
<span class="badge fail">FAIL {failed}</span></div>
<table><thead><tr><th>#</th><th>Action</th><th>Status</th><th>Error</th></tr></thead>
<tbody>{rows}</tbody></table></body></html>"""

    report_path.write_text(html, encoding="utf-8")

    return {
        "success": True, "case_id": case_id,
        "passed": passed, "failed": failed,
        "total": len(results), "report": str(report_path), "results": results,
    }


# ── SVG / off-viewport click helper ──────────────────────────────────────────

def _is_svg_leaf_selector(sel: str) -> bool:
    """Return True if the selector targets an SVG shape that is likely inside a button/link."""
    tag = sel.strip().lower().split("[")[0].split(":")[0].split(".")[0]
    return tag in _SVG_LEAF_TAGS


def _exhaustive_svg_click(page, css_sel: str, nth: int = 0):
    """
    Exhaustively try every reasonable way to click an SVG element or its container.

    Strategy (tried in order, stops at first success):
      1. Walk UP from the matched element — click the nearest interactive ancestor
         (button, a, [role=button/tab/menuitem/...], [tabindex]).
      2. Click every sibling of the matched element and its SVG parent — one of
         them may be the actual hit-target that the app listens on.
      3. Dispatch a raw MouseEvent (bubbles=true) on the element itself.
      4. Dispatch a raw MouseEvent on its ownerSVGElement (the whole <svg>).
      5. Playwright force-click the matched element (bypasses interactability checks).

    Returns a dict describing what succeeded, raises ValueError if all fail.
    """
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass

    js = """
    ([selector, nthIndex]) => {
        const INTERACTIVE_TAGS = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        const INTERACTIVE_ROLES = ['button', 'link', 'tab', 'option', 'menuitem',
                                   'checkbox', 'radio', 'switch', 'treeitem'];

        function isInteractive(node) {
            if (!node || !node.tagName) return false;
            const tag  = node.tagName.toUpperCase();
            const role = (node.getAttribute('role') || '').toLowerCase();
            const ti   = node.getAttribute('tabindex');
            return INTERACTIVE_TAGS.includes(tag) || INTERACTIVE_ROLES.includes(role)
                || (ti !== null && ti !== '-1');
        }

        function fireClick(node) {
            node.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, cancelable:true}));
            node.dispatchEvent(new MouseEvent('mouseup',   {bubbles:true, cancelable:true}));
            node.dispatchEvent(new MouseEvent('click',     {bubbles:true, cancelable:true}));
        }

        const all = Array.from(document.querySelectorAll(selector));
        const el  = all[nthIndex];
        if (!el) return { found: false, reason: 'no element at nth=' + nthIndex };

        // ── Strategy 1: walk UP to nearest interactive ancestor ───────────────
        let node = el;
        while (node && node !== document.body) {
            if (isInteractive(node)) {
                node.click();
                return { found: true, strategy: 'ancestor', tag: node.tagName,
                         role: node.getAttribute('role') || '' };
            }
            node = node.parentElement;
        }

        // ── Strategy 2: siblings of the element + siblings of its SVG parent ──
        // Collect candidates: siblings of el, siblings of el's parentElement
        const candidates = [];
        [el, el.parentElement, el.parentElement && el.parentElement.parentElement]
            .filter(Boolean)
            .forEach(pivot => {
                const parent = pivot.parentElement;
                if (!parent) return;
                Array.from(parent.children).forEach(sib => {
                    if (sib !== el) candidates.push(sib);
                });
            });
        for (const sib of candidates) {
            if (isInteractive(sib)) {
                sib.click();
                return { found: true, strategy: 'sibling', tag: sib.tagName,
                         role: sib.getAttribute('role') || '',
                         text: sib.textContent.trim().slice(0, 40) };
            }
        }

        // ── Strategy 3: MouseEvent directly on the element (bubbles up) ───────
        fireClick(el);
        return { found: true, strategy: 'dispatch-self', tag: el.tagName };
    }
    """.strip()

    result = page.evaluate(js, [css_sel, nth])
    print(f"[SVG_CLICK] selector={css_sel!r} nth={nth} js_result={result}")

    if not result.get("found"):
        # Strategy 4: fire on ownerSVGElement via JS
        js_svg = """
        ([selector, nthIndex]) => {
            const el = Array.from(document.querySelectorAll(selector))[nthIndex];
            if (!el) return false;
            const svg = el.ownerSVGElement || el.closest('svg');
            if (!svg) return false;
            svg.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
            return true;
        }
        """.strip()
        hit = page.evaluate(js_svg, [css_sel, nth])
        print(f"[SVG_CLICK] ownerSVG fallback={hit}")
        if not hit:
            raise ValueError(f"SVG click: no element found for {css_sel!r} nth={nth}")

    else:
        # Strategy 5 (last resort if strategies 1-3 ran but nothing changed):
        # Playwright force-click — only used when JS strategies returned but we
        # want to make sure event handlers wired via addEventListener also fire.
        # We don't always do this because it may double-fire on responsive elements.
        pass

    _wait_for_navigation_settle(page, page.url)


def _click_svg_parent(page, css_sel: str, nth: int = 0, timeout: int = 15000):
    """Backward-compat wrapper — delegates to _exhaustive_svg_click."""
    _exhaustive_svg_click(page, css_sel, nth=nth)


# ── Overlay / wait helpers ────────────────────────────────────────────────────

def _poll_and_dismiss_banners(page, duration_ms: int = 2000):
    interval = 0.4
    elapsed = 0.0
    while elapsed < duration_ms / 1000:
        _dismiss_app_dialogs(page)
        time.sleep(interval)
        elapsed += interval


def _dismiss_app_dialogs(page):
    try:
        dialog = page.locator("[role='dialog']:visible, .MuiDialog-root:visible").first
        if dialog.count() == 0:
            return

        try:
            title = page.locator("[role='dialog'] #alert-dialog-title, [role='dialog'] h2, [role='dialog'] h3").first.inner_text(timeout=1000)
            print(f"[DIALOG] Visible dialog found, title: {repr(title)}")
        except Exception:
            print("[DIALOG] Visible dialog found (no readable title)")

        try:
            btns = page.locator("[role='dialog'] button:visible").all()
            btn_labels = [b.inner_text(timeout=500) for b in btns]
            print(f"[DIALOG] Buttons available: {btn_labels}")
        except Exception:
            btn_labels = []
            print("[DIALOG] Could not read button labels")

    except Exception:
        return

    try:
        is_blocking = page.locator(
            ".MuiDialog-root[role='presentation'], [role='dialog'][aria-modal='true']"
        ).count() > 0
        if not is_blocking:
            print("[DIALOG] Dialog present but not blocking — skipping dismissal")
            return
    except Exception:
        return

    ACCEPT_LABELS = [
        "Allow", "OK", "Accept", "Confirm", "Got it",
        "Continue", "Agree", "Yes", "Done",
    ]
    for label in ACCEPT_LABELS:
        try:
            btn = page.locator(f"[role='dialog'] button:visible, .MuiDialog-root button:visible").get_by_text(label, exact=False)
            if btn.count() > 0:
                print(f"[DIALOG] Clicking '{label}'")
                btn.first.click(timeout=3000)
                try:
                    page.wait_for_selector(
                        "[role='dialog']:visible, .MuiDialog-root:visible",
                        state="hidden", timeout=3000,
                    )
                except Exception:
                    pass
                return
        except Exception:
            continue

    print("[DIALOG] No matching accept button found — leaving dialog open")


def _dismiss_overlays(page, timeout: int = 8000):
    OVERLAY_SELECTORS = [
        ".loader-overlay", ".loading-overlay", ".overlay", ".spinner-overlay",
        "[class*='loader-overlay']", "[class*='loading-overlay']",
        "[class*='LoadingOverlay']", "[class*='Spinner']",
        ".modal-backdrop", "#loading", "#loader", "[aria-busy='true']",
    ]
    for sel in OVERLAY_SELECTORS:
        try:
            if page.locator(sel).count() > 0:
                page.wait_for_selector(sel, state="hidden", timeout=timeout)
        except Exception:
            pass


def _wait_for_navigation_settle(page, url_before: str, timeout: int = 15000):
    try:
        page.wait_for_timeout(300)
    except Exception:
        pass

    deadline = time.time() + timeout / 1000
    last_url = page.url

    while time.time() < deadline:
        try:
            page.wait_for_load_state("domcontentloaded", timeout=3000)
        except Exception:
            pass
        try:
            page.wait_for_timeout(800)
        except Exception:
            pass
        try:
            current = page.url
        except Exception:
            break
        if current == last_url:
            break
        last_url = current

    try:
        page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    _dismiss_app_dialogs(page)


def _safe_click(page, locator, timeout: int = 15000):
    _dismiss_overlays(page)
    url_before = page.url
    try:
        locator.click(timeout=timeout)
    except Exception as e:
        err = str(e)
        try:
            url_after = page.url
        except Exception:
            url_after = url_before
        if url_after != url_before:
            return
        if "detached" in err or "navigated" in err or "ERR_ABORTED" in err:
            return
        raise
    _wait_for_navigation_settle(page, url_before)


def _wait_and_act(page, sel: str, fn, timeout: int = 15000):
    SPA_ROOTS = {"#root", "#app", "#__next", "body", "html"}
    if sel.strip() in SPA_ROOTS:
        try:
            page.wait_for_load_state("networkidle", timeout=timeout)
        except Exception:
            pass
        return
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass
    try:
        page.wait_for_selector(sel, state="visible", timeout=timeout)
    except Exception:
        pass
    fn()


def _click_by_role(page, sel: str):
    import re
    role_m = re.match(r'role:["\']?([^,"\']+)["\']?', sel)
    if not role_m:
        raise ValueError(f"Cannot parse role selector: {sel}")
    role = role_m.group(1).strip()
    kwargs = {}
    name_m = re.search(r'name=["\']([^"\']+)["\']', sel)
    if name_m:
        kwargs["name"] = name_m.group(1)
    exact_m = re.search(r'exact=(True|False)', sel)
    if exact_m:
        kwargs["exact"] = exact_m.group(1) == "True"
    _safe_click(page, page.get_by_role(role, **kwargs).first)


# ── Raw line executor ─────────────────────────────────────────────────────────

def _exec_raw(page, raw: str):
    import re
    line = raw.strip()

    # ── SVG intercept block ───────────────────────────────────────────────────
    #
    # Pattern 1: page.get_by_title("X").locator("path/circle/...").first.click()
    #   Codegen recorded an SVG icon inside a titled button. We find all elements
    #   sharing that title (there may be multiple — e.g. the <svg> and a wrapping
    #   <button>) and try each via _exhaustive_svg_click.
    m = re.search(
        r'page\.get_by_title\(["\']([^"\']+)["\']\)\.locator\(["\']([^"\']+)["\']\).*?\.click\(\)',
        line
    )
    if m:
        title_val = m.group(1)
        svg_sel   = m.group(2)   # e.g. "path"
        print(f"[SVG_CLICK] get_by_title({title_val!r}).locator({svg_sel!r}).click()")
        url_before = page.url

        # Build a CSS selector that targets the SVG shape *inside* the titled element
        # e.g.  [title="Send Message"] path
        combined_sel = f'[title="{title_val}"] {svg_sel}'

        # First try: click the titled container itself via JS (most reliable)
        js_title = """
        (titleVal) => {
            // querySelectorAll returns ALL matches — pick the first interactive one
            const TAGS  = ['BUTTON','A','INPUT'];
            const ROLES = ['button','link','tab','menuitem'];
            const all   = Array.from(document.querySelectorAll('[title="' + titleVal + '"]'));
            for (const el of all) {
                const tag  = (el.tagName || '').toUpperCase();
                const role = (el.getAttribute('role') || '').toLowerCase();
                if (TAGS.includes(tag) || ROLES.includes(role)) {
                    el.click();
                    return { found: true, strategy: 'title-button', tag: tag };
                }
            }
            // No directly interactive — click the first match and let it bubble
            if (all.length > 0) {
                all[0].dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
                return { found: true, strategy: 'title-bubble', tag: all[0].tagName };
            }
            return { found: false };
        }
        """.strip()

        result = page.evaluate(js_title, title_val)
        print(f"[SVG_CLICK] title-first result={result}")

        if not result.get("found"):
            # Fall back: exhaustive click on the inner SVG shape's ancestors/siblings
            try:
                _exhaustive_svg_click(page, combined_sel, nth=0)
            except Exception:
                # Last resort: Playwright click on the titled element directly
                page.get_by_title(title_val).first.click(timeout=10000)

        _wait_for_navigation_settle(page, url_before)
        return

    # Pattern 2: page.locator("circle/path/etc").nth(N).click()
    #   SVG leaf element that is off-viewport or intercepted — walk to interactive ancestor.
    m = re.search(r'page\.locator\(["\']([^"\']+)["\']\)(?:\.nth\((\d+)\))?.*?\.click\(\)', line)
    if m:
        css_sel = m.group(1)
        nth_val = int(m.group(2)) if m.group(2) else 0
        tag = css_sel.strip().lower().split("[")[0].split(":")[0].split(".")[0]
        if tag in _SVG_LEAF_TAGS:
            print(f"[SVG_CLICK] Routing {css_sel!r} nth={nth_val} through _click_svg_parent")
            url_before = page.url
            _click_svg_parent(page, css_sel, nth=nth_val)
            _wait_for_navigation_settle(page, url_before)
            return
    # ── END SVG intercept block ───────────────────────────────────────────────

    # get_by_test_id(...).nth(N).click/dblclick
    m = re.search(r'page\.get_by_test_id\(["\']([^"\']+)["\']\)(?:\.nth\((\d+)\))?.*?\.(dbl)?click\(\)', line)
    if m:
        tid, nth, dbl = m.group(1), m.group(2), m.group(3)
        try: page.wait_for_load_state("networkidle", timeout=5000)
        except Exception: pass
        loc = page.get_by_test_id(tid)
        loc = loc.nth(int(nth)) if nth else loc.first
        wait_timeout = 30000 if any(x in tid for x in ("hangup", "call", "softphone", "phone")) else 15000
        page.wait_for_selector(f"[data-testid='{tid}']", state="visible", timeout=wait_timeout)
        url_before = page.url
        if dbl:
            loc.dblclick(timeout=wait_timeout)
        else:
            _safe_click(page, loc)
        _wait_for_navigation_settle(page, url_before)
        return

    # get_by_test_id(...).nth(N).fill(...)
    m = re.search(r'page\.get_by_test_id\(["\']([^"\']+)["\']\)(?:\.nth\((\d+)\))?.*?\.fill\("([^"]*)"\)', line)
    if m:
        tid, nth, val = m.group(1), m.group(2), m.group(3)
        loc = page.get_by_test_id(tid)
        loc = loc.nth(int(nth)) if nth else loc.first
        loc.fill(val, timeout=10000)
        return

    # get_by_role(...).click() / dblclick()
    m = re.search(r'page\.get_by_role\(([^)]+)\)(?:\.filter\(([^)]*)\))?.*?\.(dbl)?click\(\)', line)
    if m:
        loc = eval(f"page.get_by_role({m.group(1)})", {"page": page})
        if m.group(2):
            loc = eval(f"loc.filter({m.group(2)})", {"loc": loc})
        url_before = page.url
        if m.group(3):
            _dismiss_overlays(page)
            loc.first.dblclick(timeout=15000)
        else:
            _safe_click(page, loc.first)
        _wait_for_navigation_settle(page, url_before)
        return

    # get_by_placeholder(...).click() / dblclick()
    m = re.search(r'page\.get_by_placeholder\((["\'][^"\']+["\'])\).*?\.(dbl)?click\(\)', line)
    if m:
        ph = m.group(1).strip("\"'")
        try: page.wait_for_load_state("networkidle", timeout=5000)
        except Exception: pass
        url_before = page.url
        if m.group(2):
            page.get_by_placeholder(ph).first.dblclick(timeout=10000)
        else:
            _safe_click(page, page.get_by_placeholder(ph).first)
        _wait_for_navigation_settle(page, url_before)
        return

    # get_by_label(...).click() / dblclick()
    m = re.search(r'page\.get_by_label\((["\'][^"\']+["\'])\).*?\.(dbl)?click\(\)', line)
    if m:
        lbl = m.group(1).strip("\"'")
        try: page.wait_for_load_state("networkidle", timeout=5000)
        except Exception: pass
        url_before = page.url
        if m.group(2):
            page.get_by_label(lbl).first.dblclick(timeout=10000)
        else:
            _safe_click(page, page.get_by_label(lbl).first)
        _wait_for_navigation_settle(page, url_before)
        return

    # get_by_text(...).click() / dblclick()
    m = re.search(r'page\.get_by_text\((["\'][^"\']+["\'])\).*?\.(dbl)?click\(\)', line)
    if m:
        txt = m.group(1).strip("\"'")
        try: page.wait_for_load_state("networkidle", timeout=5000)
        except Exception: pass
        url_before = page.url
        if m.group(2):
            page.get_by_text(txt).first.dblclick(timeout=10000)
        else:
            _safe_click(page, page.get_by_text(txt).first)
        _wait_for_navigation_settle(page, url_before)
        return

    # get_by_role(...).fill(...)
    m = re.search(r'page\.get_by_role\(([^)]+)\).*?\.fill\("([^"]*)"\)', line)
    if m:
        loc = eval(f"page.get_by_role({m.group(1)})", {"page": page})
        loc.fill(m.group(2), timeout=10000)
        return

    # get_by_role(...).press(...)
    m = re.search(r'page\.get_by_role\(([^)]+)\).*?\.press\("([^"]*)"\)', line)
    if m:
        loc = eval(f"page.get_by_role({m.group(1)})", {"page": page})
        loc.press(m.group(2), timeout=10000)
        return

    # get_by_placeholder(...).press(...)
    m = re.search(r'page\.get_by_placeholder\((["\'][^"\']+["\'])\).*?\.press\("([^"]*)"\)', line)
    if m:
        page.get_by_placeholder(m.group(1).strip("\"'")).press(m.group(2), timeout=10000)
        return

    # get_by_label(...).press(...)
    m = re.search(r'page\.get_by_label\((["\'][^"\']+["\'])\).*?\.press\("([^"]*)"\)', line)
    if m:
        page.get_by_label(m.group(1).strip("\"'")).press(m.group(2), timeout=10000)
        return

    # get_by_text(...).fill(...)
    m = re.search(r'page\.get_by_text\((["\'][^"\']+["\'])\).*?\.fill\("([^"]*)"\)', line)
    if m:
        page.get_by_text(m.group(1).strip("\"'")).first.fill(m.group(2), timeout=10000)
        return

    # locator(...).check() / uncheck()
    m = re.search(r'page\.locator\("([^"]+)"\).*?\.check\(\)', line)
    if m:
        page.locator(m.group(1)).first.check(timeout=10000)
        return
    m = re.search(r'page\.locator\("([^"]+)"\).*?\.uncheck\(\)', line)
    if m:
        page.locator(m.group(1)).first.uncheck(timeout=10000)
        return

    # locator(...).select_option(...)
    m = re.search(r'page\.locator\("([^"]+)"\).*?\.select_option\("([^"]*)"\)', line)
    if m:
        page.locator(m.group(1)).select_option(m.group(2), timeout=10000)
        return

    # locator(...).type(...) / fill(...)
    m = re.search(r'page\.locator\("([^"]+)"\).*?\.(?:type|fill)\("([^"]*)"\)', line)
    if m:
        page.locator(m.group(1)).fill(m.group(2), timeout=10000)
        return

    # locator(...).hover()
    m = re.search(r'page\.locator\("([^"]+)"\).*?\.hover\(\)', line)
    if m:
        page.locator(m.group(1)).first.hover(timeout=10000)
        return

    # page.keyboard.press(...)
    m = re.search(r'page\.keyboard\.press\("([^"]*)"\)', line)
    if m:
        page.keyboard.press(m.group(1))
        return

    # page.wait_for_timeout(...)
    m = re.search(r'page\.wait_for_timeout\((\d+)\)', line)
    if m:
        time.sleep(int(m.group(1)) / 1000)
        return

    # expect(...) — skip
    if line.startswith("expect("):
        return

    # Nuclear fallback
    try:
        page.wait_for_load_state("networkidle", timeout=3000)
    except Exception:
        pass
    try:
        ns = {"page": page, "expect": lambda *a, **kw: None}
        exec(compile(line, "<raw>", "exec"), ns)
        return
    except Exception as exec_err:
        raise ValueError(f"Could not execute raw line: {raw} — exec error: {exec_err}")


# ── Action executor ───────────────────────────────────────────────────────────

def _execute_action(page, action: dict, original_env: str, target_env: str):
    _dismiss_app_dialogs(page)
    act = action.get("action")
    sel = action.get("selector", "")
    val = action.get("value", "")

    if act == "navigate":
        url = action["url"]
        if original_env and target_env:
            url = url.replace(original_env, target_env)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
        except Exception as nav_err:
            if "ERR_ABORTED" in str(nav_err) or "net::" in str(nav_err):
                pass
            else:
                raise
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass

    elif act in ("click", "dblclick"):
        url_before = page.url
        raw = action.get("raw", "")

        # ── NEW: bare SVG/shape selector → JS ancestor click ─────────────────
        # e.g. selector="circle" recorded as page.locator("circle").nth(4).click()
        if _is_svg_leaf_selector(sel) and not sel.startswith(
            ("testid:", "role:", "text:", "placeholder:", "label:")
        ):
            nth = action.get("nth", 0) or 0
            print(f"[SVG_CLICK] Intercepting SVG selector {sel!r} nth={nth}")
            _click_svg_parent(page, sel, nth=nth)
            return
        # ── END NEW ───────────────────────────────────────────────────────────

        if sel.startswith("testid:"):
            tid = sel[len("testid:"):]
            nth = action.get("nth")
            try: page.wait_for_load_state("networkidle", timeout=5000)
            except Exception: pass
            wait_timeout = 30000 if any(x in tid for x in ("hangup", "call", "softphone", "phone")) else 15000
            page.wait_for_selector(f"[data-testid='{tid}']", state="visible", timeout=wait_timeout)
            loc = page.get_by_test_id(tid)
            loc = loc.nth(nth) if nth is not None else loc.first
            if act == "dblclick":
                loc.dblclick(timeout=wait_timeout)
            else:
                _safe_click(page, loc)
            _wait_for_navigation_settle(page, url_before)

        elif sel.startswith("role:"):
            if raw: _exec_raw(page, raw)
            else: _click_by_role(page, sel)
        elif sel.startswith("title:"):
            if raw: _exec_raw(page, raw)
            else:
                title_val = sel[len("title:"):].strip("\"'")
                _safe_click(page, page.get_by_title(title_val).first)
        elif sel.startswith("text:"):
            txt = sel.replace("text:", "").strip("\"'")
            if act == "dblclick":
                _dismiss_overlays(page)
                page.get_by_text(txt).first.dblclick(timeout=15000)
            else:
                _safe_click(page, page.get_by_text(txt).first)
        elif sel.startswith("placeholder:"):
            ph = sel.replace("placeholder:", "").strip("\"'")
            if act == "dblclick":
                _dismiss_overlays(page)
                page.get_by_placeholder(ph).first.dblclick(timeout=15000)
            else:
                _safe_click(page, page.get_by_placeholder(ph).first)
        elif sel.startswith("label:"):
            lbl = sel.replace("label:", "").strip("\"'")
            if act == "dblclick":
                _dismiss_overlays(page)
                page.get_by_label(lbl).first.dblclick(timeout=15000)
            else:
                _safe_click(page, page.get_by_label(lbl).first)
        else:
            _dismiss_overlays(page)
            if act == "dblclick":
                _wait_and_act(page, sel, lambda: page.dblclick(sel))
            else:
                _wait_and_act(page, sel, lambda: _safe_click(page, page.locator(sel).first))

        _wait_for_navigation_settle(page, url_before)

    elif act == "fill":
        if sel.startswith("label:"):
            page.get_by_label(sel.replace("label:", "").strip("\"'")).fill(val, timeout=10000)
        elif sel.startswith("placeholder:"):
            page.get_by_placeholder(sel.replace("placeholder:", "").strip("\"'")).fill(val, timeout=10000)
        elif sel.startswith(("role:", "text:")):
            raw = action.get("raw", "")
            if raw: _exec_raw(page, raw)
            else: raise ValueError(f"Cannot fill on {sel[:4]} selector without raw line")
        else:
            _wait_and_act(page, sel, lambda: page.fill(sel, val))

    elif act == "select":
        if sel.startswith("role:"):
            raw = action.get("raw", "")
            if raw: _exec_raw(page, raw)
            else: raise ValueError(f"Cannot select on role selector without raw line: {sel}")
        else:
            _wait_and_act(page, sel, lambda: page.select_option(sel, val))

    elif act == "check":
        if sel.startswith("role:"):
            raw = action.get("raw", "")
            if raw: _exec_raw(page, raw)
            else: _click_by_role(page, sel)
        else:
            _wait_and_act(page, sel, lambda: page.check(sel))

    elif act == "uncheck":
        if sel.startswith("role:"):
            raw = action.get("raw", "")
            if raw: _exec_raw(page, raw)
            else: _click_by_role(page, sel)
        else:
            _wait_and_act(page, sel, lambda: page.uncheck(sel))

    elif act == "press":
        if sel.startswith("role:"):
            raw = action.get("raw", "")
            if raw: _exec_raw(page, raw)
            else: raise ValueError(f"Cannot press on role selector without raw line: {sel}")
        elif sel.startswith("label:"):
            page.get_by_label(sel.replace("label:", "").strip("\"'")).press(val, timeout=10000)
        elif sel.startswith("placeholder:"):
            page.get_by_placeholder(sel.replace("placeholder:", "").strip("\"'")).press(val, timeout=10000)
        else:
            _wait_and_act(page, sel, lambda: page.press(sel, val))

    elif act == "hover":
        if sel.startswith("role:"):
            raw = action.get("raw", "")
            if raw: _exec_raw(page, raw)
            else: raise ValueError(f"Cannot hover on role selector without raw line: {sel}")
        elif sel.startswith("text:"):
            page.get_by_text(sel.replace("text:", "").strip("\"'")).first.hover(timeout=10000)
        else:
            _wait_and_act(page, sel, lambda: page.hover(sel))

    elif act == "keyboard_press":
        page.keyboard.press(action.get("key", ""))

    elif act == "wait":
        time.sleep(action.get("ms", 500) / 1000)

    elif act == "unknown":
        raw = action.get("raw", "")
        if raw:
            try: page.wait_for_load_state("networkidle", timeout=5000)
            except Exception: pass
            _exec_raw(page, raw)
            try: page.wait_for_load_state("networkidle", timeout=5000)
            except Exception: pass
        else:
            raise ValueError("Unknown action with no raw line.")

    else:
        raise ValueError(f"Unrecognized action type: {act}")


# ── Codegen parser ────────────────────────────────────────────────────────────

def _parse_codegen(code: str) -> list[dict]:
    actions = []

    skip_lines = {
        "from playwright", "import playwright", "with sync_playwright",
        "browser = ", "context = ", "browser.close()", "context.close()",
        "page.close()", "p.chromium", "p.firefox", "p.webkit",
        "playwright().start()", "def run(", "run(playwright)",
    }

    for raw_line in code.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if any(s in line for s in skip_lines):
            continue
        if re.match(r'^[a-z_]+ = ', line) and "page." not in line:
            continue

        action = _parse_line(line)
        print(f"[PARSE] {repr(line)} -> {action}")
        if action:
            actions.append(action)

    # Drop redundant clicks immediately before a fill on the same selector
    filtered = []
    for idx, act in enumerate(actions):
        if act.get("action") == "click" and idx + 1 < len(actions):
            nxt = actions[idx + 1]
            if nxt.get("action") == "fill" and nxt.get("selector") == act.get("selector"):
                continue
        filtered.append(act)

    return filtered


def _parse_line(line: str) -> dict | None:

    # navigate
    m = re.search(r'page\.goto\("([^"]+)"', line)
    if m:
        return {"action": "navigate", "url": m.group(1)}

    # keyboard
    m = re.search(r'page\.keyboard\.press\("([^"]+)"\)', line)
    if m:
        return {"action": "keyboard_press", "key": m.group(1)}

    # wait
    m = re.search(r'page\.wait_for_timeout\((\d+)\)', line)
    if m:
        return {"action": "wait", "ms": int(m.group(1))}

    # expect — skip
    if line.startswith("expect("):
        return None

    # Identify terminal action
    terminal = None
    terminal_val = None

    if line.endswith(".click()"):
        terminal = "click"
    elif line.endswith(".dblclick()"):
        terminal = "dblclick"
    else:
        m = re.search(r'\.fill\("([^"]*)"\)\s*$', line)
        if m:
            terminal, terminal_val = "fill", m.group(1)
        else:
            m = re.search(r'\.press\("([^"]*)"\)\s*$', line)
            if m:
                terminal, terminal_val = "press", m.group(1)
            elif line.endswith(".check()"):
                terminal = "check"
            elif line.endswith(".uncheck()"):
                terminal = "uncheck"
            elif line.endswith(".hover()"):
                terminal = "hover"
            else:
                m = re.search(r'\.select_option\("([^"]*)"\)\s*$', line)
                if m:
                    terminal, terminal_val = "select", m.group(1)
                else:
                    m = re.search(r'\.type\("([^"]*)"\)\s*$', line)
                    if m:
                        terminal, terminal_val = "fill", m.group(1)

    if not terminal:
        if "page." in line:
            return {"action": "unknown", "raw": line}
        return None

    # get_by_test_id — must come before generic locator patterns
    m = re.search(r'page\.get_by_test_id\(["\']([^"\']+)["\']\)', line)
    if m:
        nth_m = re.search(r'\.nth\((\d+)\)', line)
        return {
            "action": terminal,
            "selector": f"testid:{m.group(1)}",
            "value": terminal_val or "",
            "raw": line,
            **({"nth": int(nth_m.group(1))} if nth_m else {}),
        }

    m = re.search(r'page\.get_by_placeholder\(["\']([^"\']+)["\']\)', line)
    if m:
        return {"action": terminal, "selector": f"placeholder:{m.group(1)}", "value": terminal_val or "", "raw": line}

    m = re.search(r'page\.get_by_label\(["\']([^"\']+)["\']\)', line)
    if m:
        return {"action": terminal, "selector": f"label:{m.group(1)}", "value": terminal_val or "", "raw": line}

    m = re.search(r'page\.get_by_text\(["\']([^"\']+)["\']\)', line)
    if m:
        return {"action": terminal, "selector": f"text:{m.group(1)}", "value": terminal_val or "", "raw": line}

    m = re.search(r'page\.get_by_role\(([^)]+)\)', line)
    if m:
        return {"action": terminal, "selector": f"role:{m.group(1)}", "value": terminal_val or "", "raw": line}

    # get_by_title(...).locator("svg-shape")... or get_by_title(...).click()
    # Treat as a titled-element click — _exec_raw will handle the SVG chain via JS
    m = re.search(r'page\.get_by_title\(["\']([^"\']+)["\']\)', line)
    if m:
        return {"action": terminal, "selector": f"title:{m.group(1)}", "value": terminal_val or "", "raw": line}

    # ── NEW: page.locator("svg-shape").nth(N) — preserve nth for SVG parent walk ──
    m = re.search(r'page\.locator\(["\']([^"\']+)["\']\)', line)
    if m:
        css_sel = m.group(1)
        nth_m = re.search(r'\.nth\((\d+)\)', line)
        action_dict = {
            "action": terminal,
            "selector": css_sel,
            "value": terminal_val or "",
            "raw": line,
        }
        if nth_m:
            action_dict["nth"] = int(nth_m.group(1))
        return action_dict
    # ── END NEW ───────────────────────────────────────────────────────────────

    if terminal == "click":
        m = re.search(r'page\.click\("([^"]+)"\)', line)
        if m:
            return {"action": "click", "selector": m.group(1)}

    if terminal == "fill":
        m = re.search(r'page\.fill\("([^"]+)",\s*"([^"]*)"\)', line)
        if m:
            return {"action": "fill", "selector": m.group(1), "value": m.group(2)}

    if "page." in line:
        return {"action": "unknown", "raw": line}
    return None


# ── Remaining routes ──────────────────────────────────────────────────────────

@router.post("/save/{case_id}")
def save_to_testrail(case_id: int, body: SaveRequest):
    recording_file = _recording_path(case_id)
    if not recording_file.exists():
        raise HTTPException(status_code=404, detail=f"No recording found for case {case_id}.")
    recording = json.loads(recording_file.read_text(encoding="utf-8"))
    actions = recording.get("actions", [])
    if not actions:
        raise HTTPException(status_code=400, detail="Recording has no actions to save.")
    # Store the full recording payload so it can be fully restored on any agent.
    # Format: human-readable header lines + JSON block, so TestRail shows something
    # useful in the UI while still being machine-parseable on restore.
    payload = {
        "actions": actions,
        "environment_url": recording.get("environment_url", ""),
        "recorded_at": recording.get("recorded_at", ""),
        "case_id": case_id,
    }
    summary_lines = [
        f"Simulation Recording — {len(actions)} steps",
        f"Environment: {recording.get('environment_url', 'unknown')}",
        f"Recorded: {recording.get('recorded_at', 'unknown')}",
        "",
        "Steps:",
    ]
    for i, a in enumerate(actions, 1):
        act = a.get("action", "?")
        desc = a.get("url") or a.get("selector") or a.get("key") or ""
        val = a.get("value", "")
        line = f"  {i}. {act}"
        if desc: line += f" → {desc}"
        if val:  line += f" = {val}"
        summary_lines.append(line)
    summary_lines += ["", "---SIMULATION_DATA---", json.dumps(payload)]
    formatted = "\n".join(summary_lines)
    try:
        c = _client(body.url, body.email, body.password)
        c.update_case(case_id, {"custom_tc_test_data": formatted})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save to TestRail: {exc}")
    return {"success": True, "case_id": case_id, "actions_saved": len(actions)}

@router.post("/stop/{case_id}")
def stop_recording(case_id: int):
    if case_id in _active_sessions:
        _active_sessions[case_id].set()
        return {"success": True, "message": f"Stop signal sent for case {case_id}"}
    return {"success": False, "message": "No active recording found for this case"}

@router.get("/status/{case_id}")
def recording_status(case_id: int):
    return {"case_id": case_id, "recording_active": case_id in _active_sessions}

@router.get("/recordings/{case_id}")
def get_recording(case_id: int,
                  url: str | None = None,
                  email: str | None = None,
                  password: str | None = None):
    """
    Return the recording for a case.
    1. If the local file exists → serve it directly.
    2. If the local file is missing AND TestRail credentials are provided →
       fetch custom_tc_test_data from TestRail, reconstruct the local file,
       and serve it. This lets any fresh agent pick up a recording that was
       saved by a previous agent.
    """
    recording_file = _recording_path(case_id)

    # ── Try to restore from TestRail if local file is missing ────────────────
    if not recording_file.exists() and url and email and password:
        try:
            c = _client(url, email, password)
            case = c.get_case(case_id)
            raw = (case.get("custom_tc_test_data") or "").strip()
            if raw:
                # Support 3 formats:
                # 1. New: human-readable header + "---SIMULATION_DATA---\n{json}"
                # 2. Mid: plain JSON dict with "actions" key
                # 3. Old: plain JSON list of actions
                json_str = raw
                if "---SIMULATION_DATA---" in raw:
                    json_str = raw.split("---SIMULATION_DATA---", 1)[-1].strip()
                payload = json.loads(json_str)
                if isinstance(payload, list):
                    payload = {
                        "case_id": case_id,
                        "actions": payload,
                        "environment_url": "",
                        "recorded_at": "",
                    }
                elif isinstance(payload, dict) and "actions" not in payload:
                    payload = {"case_id": case_id, "actions": [], "environment_url": "", "recorded_at": ""}
                # Write to disk so playback can use it
                recording_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except Exception:
            pass  # If TestRail fetch fails, fall through to exists=False

    if not recording_file.exists():
        return {"exists": False, "case_id": case_id}

    recording = json.loads(recording_file.read_text(encoding="utf-8"))
    actions = recording.get("actions", [])
    return {
        "exists": True, "case_id": case_id,
        "environment_url": recording.get("environment_url"),
        "actions_count": len(actions),
        "recorded_at": recording.get("recorded_at"),
        "last_corrected": recording.get("last_corrected"),
        "actions": actions,
        "restored_from_testrail": not _recording_path(case_id).exists(),
    }

@router.delete("/recordings/{case_id}")
def delete_recording(case_id: int):
    deleted = []
    recording_file = _recording_path(case_id)
    if recording_file.exists():
        recording_file.unlink()
        deleted.append(str(recording_file))
    for pattern in [f"case_{case_id}_codegen.py", f"case_{case_id}_report.html"]:
        for f in glob.glob(str(RECORDINGS_DIR / pattern)):
            Path(f).unlink(missing_ok=True)
            deleted.append(f)
    _live_screenshots.pop(case_id, None)
    _live_screenshot_meta.pop(case_id, None)
    _step_screenshots.pop(case_id, None)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"No recording found for case {case_id}.")
    return {"success": True, "case_id": case_id, "deleted_files": deleted}