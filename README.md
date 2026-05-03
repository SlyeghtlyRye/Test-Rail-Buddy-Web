# TestRail Buddy — v0.3.0

A web app for browsing and bulk-editing TestRail test cases. Ported from an internal Tkinter desktop tool into a deployable full-stack application.

**Stack:** React + Vite (frontend) · FastAPI + Python (backend) · Playwright (browser automation)

> Development closed Q2 2026.

---

## Features

- Browse TestRail projects, suites, sections, and test cases
- Bulk assign sequential Test Case IDs to a section
- Fix test names — replace spaces with underscores, fill blanks from title
- Find cases with missing or thin content
- Export cases to CSV
- Demo mode — explore the full UI with pre-loaded data, no credentials required
- Playwright simulation — record and replay browser sessions against a live environment *(experimental, unfinished)*

---

## Highlights

### Zero-credential demo mode
The app ships with a complete set of mock data — projects, suites, sections, and test cases — so every feature can be explored in the browser without a TestRail account. All write operations are gated by the demo flag at the UI level, so nothing can be accidentally submitted.

### One-command local start
Cloning and running the app locally requires no manual configuration. After the one-time dependency install, `start.ps1` boots the backend, starts the frontend dev server, and opens the browser — all in a single step. Intended to be hand-off friendly for anyone unfamiliar with full-stack tooling.

### Works with any TestRail instance
Custom fields, column layouts, and form sections are all discovered at runtime by querying the connected TestRail instance. There is no hardcoded schema to match — connecting to a different organisation just works, with fields appearing automatically.

### Playwright simulation
Test flows can be recorded as JSON against a live TestRail instance and replayed on demand. The simulation engine drives a real Chromium browser via Playwright, mapping recorded actions back to the current state of the case. Requires a local backend. *(Experimental — unfinished)*

### Live dependency map
The Settings panel includes a runtime-rendered graph of the entire frontend component tree. Each node is a source file; edges show which components import which. Built without a separate tooling step — the map is generated from the live module graph inside the running app.

### Self-auditing documentation
App Structure cross-references every file in `frontend/src/` against a maintained docs index. Any file present in the source tree but absent from the index is flagged directly in the UI — so adding a new component and forgetting to document it is immediately visible without leaving the app.

---

## Security notes

A few practices worth being aware of if you're running or sharing this:

- **Credentials are never stored.** TestRail URL, email, and password are held in `sessionStorage` for the life of the browser tab and passed directly to the TestRail API per-request. They are not written to a database, log, or file anywhere in the stack.
- **Read-only mode.** Set `READ_ONLY_MODE=true` on the backend to block all write operations at the API level. Useful if you want to demo against a real TestRail instance without any risk of edits.
- **Recordings are gitignored.** Any Playwright session recordings stay local and are excluded from version control. Never commit a recording file — it may contain credentials or test data.
- **CORS is explicit.** The backend will only accept requests from origins listed in `ALLOWED_ORIGINS`. Set this to your frontend URL; leaving it open is not recommended.

---

## Live Demo

**[https://testrail-buddy-web.onrender.com](https://testrail-buddy-web.onrender.com)**

> Frontend hosted on **Render.com** (static site) · Backend hosted on **Render.com**

The app opens in demo mode by default. To connect to a real TestRail instance, enter your TestRail URL, email, and Password on the login screen.

---

## Deploy Your Own

Both services run on [Render.com](https://render.com) — no other accounts needed.

### 1. Backend → Render Web Service

1. Fork this repo
2. In Render, create a **New Web Service** → connect your fork
3. Render will detect `render.yaml` and configure the service automatically
4. After the first deploy, note your service URL (e.g. `https://your-api.onrender.com`)

### 2. Frontend → Render Static Site

1. In Render, create a **New Static Site** → connect the same fork
2. Build settings:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add an environment variable:
   ```
   VITE_API_URL = https://your-api.onrender.com
   ```
4. Deploy — Render will rebuild on every push to `main`

### 3. Wire CORS

In your backend Web Service → **Environment**, add:
```
ALLOWED_ORIGINS = ["https://your-frontend.onrender.com"]
```
Render restarts the backend automatically.

---

## Run Locally

### Prerequisites
- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)

### First-time setup (run once)
```powershell
git clone https://github.com/SlyeghtlyRye/Test-Rail-Buddy-Web
cd Test-Rail-Buddy-Web
pip install -r requirements.txt
cd frontend
npm install
cd ..
```

### Start the app (run each time)
```powershell
.\start.ps1
```
Starts both the backend and frontend, then opens the browser automatically at `http://localhost:5173`.

### Manual start (if you prefer separate terminals)
```bash
# Terminal 1 — Backend (from project root)
uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

---

## Notes

- The Render free tier spins down after 15 min of inactivity — expect a ~30s cold start on first request
- Demo mode requires no backend; all data is local to the browser
- No credentials or secrets are stored server-side; all TestRail auth is passed per-request

## Field Mapping

Some tools target specific custom field names by default:

| Tool | Default field |
|---|---|
| Bulk Assign IDs | `custom_tc_test_case_id` |
| Fix Test Names | `custom_tc_name` |

These were chosen to suit a particular workflow but are not universal. If your TestRail instance uses different field names, update the references in `app/api/tools.py` to match. All other fields — including which columns appear in exports, which fields are checked for blank content, and which fields appear in the case form — are discovered dynamically from your connected instance at runtime and require no configuration.
