from fastapi import APIRouter
from pathlib import Path

router = APIRouter()

# ── Known file descriptions ──────────────────────────────────────────────────
# Key = filename only (no path). Add new files here as the project grows.
KNOWN = {
    # Frontend pages
    "LoginPage.jsx":      "Login form — captures TestRail credentials and calls /api/auth/verify before redirecting. The entry gate; nothing works without valid creds here.",
    "ProjectsPage.jsx":   "Main app shell — three-panel layout (projects / suites+sections / cases) with all navigation state. Every user action flows through this component.",

    # Frontend components
    "ToolsPanel.jsx":     "Modal overlay that lists and renders all tool components. Acts as the single mount point so tools stay isolated from the main layout.",

    # Frontend tools
    "CreateCase.jsx":     "Form to create a new test case inside a chosen section. Calls POST /api/cases/ and refreshes the case list on success.",
    "CreateSection.jsx":  "Form to create a section with optional parent nesting. Keeps the TestRail hierarchy intact when building out new suites.",
    "ExportCases.jsx":    "Fetches all cases for a project/suite and triggers a CSV download. Useful for offline reviews or importing into other tools.",
    "BulkEditIDs.jsx":    "Assigns sequential custom IDs to every case in a section in one shot. Saves hours of manual ID entry on large suites.",
    "FixTestNames.jsx":   "Replaces spaces with underscores in test names across a section. Enforces naming conventions without editing cases one by one.",
    "ConvertFormat.jsx":  "Migrates cases from the old single-field step format to separated steps. Run once per legacy suite to unlock structured step editing.",
    "Settings.jsx":       "Settings panel for theme switching, live API connectivity test, and app info. Also the host panel that embeds AppStructure and DependencyMap.",
    "AppStructure.jsx":   "Interactive file tree showing every frontend/backend/infra file with its description and documented status. Lets devs onboard without digging through folders.",
    "DependencyMap.jsx":  "SVG dependency graph showing how every component connects to the backend. Click a node to see exactly what feeds it and what it feeds.",
    "CaseForm.jsx":       "Shared form used by both create and edit case flows. Centralises field validation so both tools stay in sync.",

    # Frontend root
    "api.js":             "Single source of truth for all HTTP calls — auth, projects, suites, sections, cases. Swap the base URL here and the whole app follows.",
    "AuthContext.jsx":    "React context that holds credentials and persists them to sessionStorage. Lets any component access auth state without prop drilling.",
    "App.jsx":            "Top-level router wrapped in AuthProvider. Defines which URL maps to which page and guards protected routes.",
    "App.css":            "Component-scoped styles for App.jsx layout. Keep global overrides in index.css instead.",
    "index.css":          "Global stylesheet — CSS variables, reset, scrollbar styling, full-height layout. The visual foundation everything else inherits from.",
    "main.jsx":           "React entry point — mounts <App /> into the DOM. Rarely needs editing but must exist for Vite to boot the app.",
    "theme.js":           "Defines light and dark colour tokens. Update palette here to retheme the entire app in one place.",

    # Backend API
    "auth.py":            "POST /api/auth/verify — proxies credentials to TestRail and returns success/failure. First call made on every login; blocks access if TestRail is unreachable.",
    "projects.py":        "GET endpoints for projects, suites, and sections, plus POST to create a section. The backbone of the left and middle panels in ProjectsPage.",
    "cases.py":           "Full CRUD for test cases plus bulk-ID assignment and name fixing. The most-called router — almost every tool touches it.",
    "tools.py":           "POST /api/tools/export-csv and other utility endpoints. Handles heavier operations that don't fit the standard CRUD pattern.",
    "structure.py":       "GET /api/structure/ — scans the filesystem and returns a documented/undocumented file tree. Powers both AppStructure and DependencyMap.",

    # Backend core
    "config.py":          "Loads environment variables and sets CORS origins. Change allowed origins here when deploying to a new domain.",
    "testrail_client.py": "Thin wrapper around the TestRail REST API handling auth headers and error normalisation. Every router goes through this — it's the bridge to the real data.",

    # Backend models / services
    "schemas.py":         "Pydantic models for all request bodies and responses. Keeps the API contract explicit and validates data before it hits any business logic.",

    # Backend root
    "main.py":            "FastAPI entry point — creates the app instance and registers all routers. The first file the server loads; misconfiguring it breaks everything.",
    "__init__.py":        "Marks the app directory as a Python package. Required for relative imports between modules to resolve correctly.",
}


# Folders to skip entirely
SKIP_DIRS = {
    "__pycache__", "node_modules", ".git", ".venv", "venv",
    "env", "dist", "build", ".next", "coverage",
}

# Files to skip in subfolders (keep only root-level __init__.py)
SKIP_SUBFOLDER_FILES = {"__init__.py"}

FRONTEND_EXTS = {".jsx", ".js", ".ts", ".tsx", ".css"}
BACKEND_EXTS  = {".py"}


def scan_dir(base: Path, allowed_exts: set) -> list[dict]:
    results = []
    if not base.exists():
        return results
    for path in sorted(base.rglob("*")):
        if any(skip in path.parts for skip in SKIP_DIRS):
            continue
        if not path.is_file():
            continue
        if path.suffix not in allowed_exts:
            continue
        rel = path.relative_to(base)
        # Skip __init__.py in subfolders, only keep root-level one
        if path.name in SKIP_SUBFOLDER_FILES and str(rel.parent) != ".":
            continue
        name = path.name
        desc = KNOWN.get(name)
        results.append({
            "name":        name,
            "path":        str(rel).replace("\\", "/"),
            "folder":      str(rel.parent).replace("\\", "/") if str(rel.parent) != "." else "",
            "documented":  desc is not None,
            "description": desc or "",
        })
    return results


@router.get("/")
def get_structure():
    root     = Path(__file__).resolve().parents[2]
    frontend = scan_dir(root / "frontend" / "src", FRONTEND_EXTS)
    backend  = scan_dir(root / "app",               BACKEND_EXTS)
    return {"frontend": frontend, "backend": backend}