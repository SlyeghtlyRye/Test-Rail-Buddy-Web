import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.models.schemas import ConnectionBody
from app.services.testrail_client import TestRailClient

router = APIRouter()

@router.post("/")
def list_projects(body: ConnectionBody):
    client = TestRailClient(body.url, body.email, body.password)
    try:
        return client.get_projects()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

@router.post("/{project_id}/suites")
def list_suites(project_id: int, body: ConnectionBody):
    client = TestRailClient(body.url, body.email, body.password)
    try:
        return client.get_suites(project_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

@router.post("/{project_id}/sections")
def list_sections(project_id: int, body: ConnectionBody, suite_id: Optional[int] = None):
    client = TestRailClient(body.url, body.email, body.password)
    try:
        return client.get_sections(project_id, suite_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")
    
@router.post("/{project_id}/sections/create")
def create_section(project_id: int, body: ConnectionBody, suite_id: Optional[int] = None, parent_id: Optional[int] = None, name: str = ""):
    client = TestRailClient(body.url, body.email, body.password)
    try:
        data = {"name": name}
        if suite_id:
            data["suite_id"] = suite_id
        if parent_id:
            data["parent_id"] = parent_id
        response = client.session.post(
            f"{client.url}/index.php?/api/v2/add_section/{project_id}",
            data=json.dumps(data)
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")