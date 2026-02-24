from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, projects, cases, tools, structure
from app.core.config import get_settings
from app.api import auth, projects, cases, tools, structure, simulate_playwright  # add to existing import

settings = get_settings()

app = FastAPI(
    title="TestRail Buddy",
    description="Web interface for viewing and editing TestRail test cases",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/auth",      tags=["auth"])
app.include_router(projects.router,   prefix="/api/projects",  tags=["projects"])
app.include_router(cases.router,      prefix="/api/cases",     tags=["cases"])
app.include_router(tools.router,      prefix="/api/tools",     tags=["tools"])
app.include_router(structure.router,  prefix="/api/structure", tags=["structure"])
app.include_router(simulate_playwright.router, prefix="/api/simulate/playwright",  tags=["simulate"])


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}