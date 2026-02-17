## Where we left off
- React frontend built with Vite, running on port 5173
- FastAPI backend running on port 8000
- Login page connects to TestRail and shows project list
- Both pushed to GitHub

## To run locally
Terminal 1 (backend):
cd to repo root, activate .venv, then:
    python -m uvicorn app.main:app --reload --port 8000

Terminal 2 (frontend):
cd frontend, then:
    npm run dev

## Next steps
- [ ] Add React Router for navigation
- [ ] Click project → show suites/sections
- [ ] Click section → show cases
- [ ] Case edit page
- [ ] Bulk tools pages