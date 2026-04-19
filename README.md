# TestRail Buddy

A web app for browsing and bulk-editing TestRail test cases. Ported from an internal Tkinter desktop tool into a deployable full-stack application.

**Stack:** React + Vite (frontend) · FastAPI + Python (backend) · Playwright (browser automation)

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

> Frontend hosted on **Cloudflare Pages** · Backend hosted on **Render.com**

The app opens in demo mode by default. To connect to a real TestRail instance, enter your TestRail URL, email, and API key on the login screen.

---

## Deploy Your Own

### 1. Backend → Render.com

1. Fork this repo
2. In [Render](https://render.com), create a **New Web Service** → connect your fork
3. Render will detect `render.yaml` and configure the service automatically
4. After the first deploy, note your service URL (e.g. `https://testrail-buddy-api.onrender.com`)
5. Set the `ALLOWED_ORIGINS` environment variable in Render to your Cloudflare Pages URL:
   ```
   ["https://your-project.pages.dev"]
   ```

### 2. Frontend → Cloudflare Pages

1. In [Cloudflare Pages](https://pages.cloudflare.com), create a **New Project** → connect your fork
2. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
3. Add an environment variable:
   ```
   VITE_API_URL = https://your-render-service.onrender.com
   ```
4. Deploy — Cloudflare will rebuild on every push to `main`

---

## Run Locally

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` if needed.

---

## Notes

- The Render free tier spins down after 15 min of inactivity — expect a ~30s cold start on first request
- Demo mode requires no backend; all data is local to the browser
- No credentials or secrets are stored server-side; all TestRail auth is passed per-request
