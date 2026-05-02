# TestRail Buddy — v0.3.0

A web app for browsing and bulk-editing TestRail test cases. Ported from an internal Tkinter desktop tool into a deployable full-stack application.

**Stack:** React + Vite (frontend) · FastAPI + Python (backend) · Playwright (browser automation)

> **Final release** — fully deployed and feature-complete as of May 2026.

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
