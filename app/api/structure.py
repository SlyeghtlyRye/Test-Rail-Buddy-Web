from fastapi import APIRouter
from pathlib import Path

router = APIRouter()

# ── Known file descriptions ──────────────────────────────────────────────────
# Key = filename only (no path). Add new files here as the project grows.
KNOWN = {
    # Frontend pages
    "LoginPage.jsx":      "Login form, verifies credentials, redirects to /projects",
    "ProjectsPage.jsx":   "Main app — three panel layout, all navigation logic, state management",
    # Frontend components
    "ToolsPanel.jsx":     "Modal overlay — lists all tools, renders active tool component",
    # Frontend tools
    "CreateCase.jsx":     "Form to create a new test case in a selected section",
    "CreateSection.jsx":  "Form to create a new section, supports nesting under parent",
    "ExportCases.jsx":    "Export all cases in project/suite to CSV download",
    "BulkEditIDs.jsx":    "Assign sequential IDs to all cases in a section",
    "FixTestNames.jsx":   "Replace spaces with underscores in test names",
    "ConvertFormat.jsx":  "Convert old single-field steps to separated steps format",
    "Settings.jsx":       "Settings panel — Theme, API Test, App Framework, Version",
    "AppStructure.jsx":   "Interactive codebase map — embedded in Settings",
    "DependencyMap.jsx":  "Interactive dependency graph — embedded in Settings",
    "CaseForm.jsx":       "Shared form component for creating and editing test cases",
    # Frontend root
    "api.js":             "All API calls — verifyAuth, getProjects, getSuites, getSections, getCases",
    "AuthContext.jsx":    "React context — stores credentials, persists to sessionStorage",
    "App.jsx":            "Router setup with AuthProvider wrapper, defines routes",
    "App.css":            "Component-scoped styles for App.jsx",
    "index.css":          "Global styles — reset, scrollbars, thin scrollbars, full height layout",
    "main.jsx":           "React entry point — mounts App into the DOM",
    "theme.js":           "Theme definitions — color tokens for light and dark mode",
    # Backend api
    "auth.py":            "POST /api/auth/verify — validates TestRail credentials",
    "projects.py":        "GET projects, suites, sections — also create section endpoint",
    "cases.py":           "GET cases, GET/create/update/delete single case, bulk-ids, fix-names",
    "tools.py":           "POST export-csv and other tool endpoints",
    "structure.py":       "GET /api/structure/ — scans filesystem and returns file tree",
    # Backend core
    "config.py":          "App settings — CORS origins, environment variables",
    "testrail_client.py": "TestRail API client wrapper — handles auth and requests",
    # Backend models / services
    "schemas.py":         "Pydantic request/response models for all endpoints",
    # Backend root
    "main.py":            "FastAPI app entry point — registers all routers",
    "__init__.py":        "Python package marker — required for app module imports",
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