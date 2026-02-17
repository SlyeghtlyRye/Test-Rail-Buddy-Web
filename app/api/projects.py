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
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/{project_id}/suites")
def list_suites(project_id: int, body: ConnectionBody):
    client = TestRailClient(body.url, body.email, body.password)
    try:
        return client.get_suites(project_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/{project_id}/sections")
def list_sections(project_id: int, body: ConnectionBody, suite_id: Optional[int] = None):
    client = TestRailClient(body.url, body.email, body.password)
    try:
        return client.get_sections(project_id, suite_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))