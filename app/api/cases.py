from fastapi import APIRouter, HTTPException
from app.models.schemas import CaseCreateRequest, CasesQuery, CaseUpdateRequest, ConnectionBody
from app.services.testrail_client import TestRailClient, TestRailError
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()

def _client(url, email, password):
    return TestRailClient(url, email, password)

@router.post("/")
def list_cases(body: CasesQuery):
    c = _client(body.url, body.email, body.password)
    try:
        return c.get_cases(body.project_id, body.suite_id, body.section_id, body.offset, body.limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/create")
def create_case(body: CaseCreateRequest):
    if settings.read_only_mode:
        raise HTTPException(status_code=403, detail="API is in read-only mode")
    c = _client(body.url, body.email, body.password)
    data = {"title": body.title, **body.fields}
    if body.suite_id:
        data["suite_id"] = body.suite_id
    try:
        return c.create_case(body.section_id, data)
    except TestRailError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/fields")
def get_case_fields(body: ConnectionBody):
    c = _client(body.url, body.email, body.password)
    try:
        response = c.session.get(f"{c.url}/index.php?/api/v2/get_case_fields")
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/{case_id}")
def get_case(case_id: int, body: CasesQuery):
    c = _client(body.url, body.email, body.password)
    try:
        return c.get_case(case_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/{case_id}/update")
def update_case(case_id: int, body: CaseUpdateRequest):
    if settings.read_only_mode:
        raise HTTPException(status_code=403, detail="API is in read-only mode")
    c = _client(body.url, body.email, body.password)
    data = {**body.fields}
    if body.title:
        data["title"] = body.title
    try:
        return c.update_case(case_id, data)
    except TestRailError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/{case_id}/delete")
def delete_case(case_id: int, body: CaseUpdateRequest, permanent: bool = False):
    if settings.read_only_mode:
        raise HTTPException(status_code=403, detail="API is in read-only mode")
    c = _client(body.url, body.email, body.password)
    try:
        c.delete_case(case_id, permanent=permanent)
        return {"success": True, "case_id": case_id}
    except TestRailError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    

@router.post("/{case_id}/delete")
def delete_case(case_id: int, body: ConnectionBody):
    client = TestRailClient(body.url, body.email, body.password)
    try:
        client.session.post(
            f"{client.url}/index.php?/api/v2/delete_case/{case_id}"
        )
        return {"success": True}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))