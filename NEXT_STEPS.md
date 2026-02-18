# Next Steps

## Where we left off
- React frontend (Vite) running on port 5173
- FastAPI backend running on port 8000
- Login persists on refresh via sessionStorage
- Three resizable/collapsable panels working
- Left: Project dropdown + Suites list
- Middle: Section tree with expand/collapse, cases listed
- Right: Case detail view with HTML stripping

## To run locally
Run `.\start.ps1` from the repo root — opens both servers and browser automatically.
Or manually:
- Terminal 1 (backend): cd to repo root, activate .venv, then `python -m uvicorn app.main:app --reload --port 8000`
- Terminal 2 (frontend): cd frontend, then `npm run dev`

## Next feature to build — Tools Menu
Add a Tools button in the header that opens a modular tools panel. Tools to build:
- Create Case
- Export Cases
- Bulk Edit Case IDs
- Fix Test Names
- Convert Format
- Settings
- Themes

### Architecture notes for Tools
- Keep each tool as its own component file in `frontend/src/tools/`
- Tools panel should be modular so new tools can be added easily
- Backend endpoints already exist for all of these in `app/api/tools.py`
- Each tool will need to know the current project/suite/section context

## Repo
Private GitHub repo: SlyeghtlyRye/Test-Rail-Buddy-Web
Local path: C:\Users\rybut\source