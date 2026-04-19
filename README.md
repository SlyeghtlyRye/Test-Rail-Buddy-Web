# TestRail Buddy — v0.3.0

A web app for browsing and bulk-editing TestRail test cases. Ported from an internal Tkinter desktop tool into a deployable full-stack application.

**Stack:** React + Vite (frontend) · FastAPI + Python (backend) · Playwright (browser automation)

> **Final release** — fully deployed and feature-complete as of April 2026.

---

## Features

- Browse TestRail projects, suites, sections, and test cases
- Bulk assign sequential Test Case IDs to a section
- Fix test names — replace spaces with underscores, fill blanks from title
- Find cases with missing or thin content
- Export cases to CSV
- Demo mode — explore the full UI with pre-loaded data, no credentials required

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

**First-time setup** (run once after cloning):
```powershell
git clone https://github.com/SlyeghtlyRye/Test-Rail-Buddy-Web
cd Test-Rail-Buddy-Web
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

**Start the app** (run each time):
```powershell
.\start.ps1
```
Starts both services and opens the browser automatically.

**Manual:**
```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` if needed. Frontend runs on `http://localhost:5173`.

---

## Notes

- The Render free tier spins down after 15 min of inactivity — expect a ~30s cold start on first request
- Demo mode requires no backend; all data is local to the browser
- No credentials or secrets are stored server-side; all TestRail auth is passed per-request
