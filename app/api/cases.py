from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    BulkIDRequest, CaseCreateRequest, CasesQuery,
    CaseUpdateRequest, ConnectionBody, FixNamesRequest,
)
from app.services.testrail_client import TestRailClient, TestRailError
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()

def _client(url, email, password):
    return TestRailClient(url, email, password)


# ── Static routes first (before wildcard /{case_id}) ────────────────────────

@router.post("/")
def list_cases(body: CasesQuery):
    c = _client(body.url, body.email, body.password)
    try:
        return c.get_cases(body.project_id, body.suite_id, body.section_id, body.offset, body.limit)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

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
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

@router.post("/fields")
def get_case_fields(body: ConnectionBody):
    c = _client(body.url, body.email, body.password)
    try:
        response = c.session.get(f"{c.url}/index.php?/api/v2/get_case_fields")
        response.raise_for_status()
        return response.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

@router.post("/bulk-ids")
def bulk_edit_ids(body: BulkIDRequest):
    if settings.read_only_mode:
        raise HTTPException(status_code=403, detail="API is in read-only mode")
    c = _client(body.url, body.email, body.password)
    updated, errors, results = 0, 0, []
    for i, case_id in enumerate(body.case_ids, start=1):
        new_id = f"{body.base_id}_{i:04d}"
        try:
            c.update_case(case_id, {"custom_tc_test_case_id": new_id})
            results.append({"case_id": case_id, "new_id": new_id, "ok": True})
            updated += 1
        except Exception as exc:
            results.append({"case_id": case_id, "new_id": new_id, "ok": False, "error": str(exc)})
            errors += 1
    return {"updated": updated, "errors": errors, "results": results}

@router.post("/fix-names")
def fix_test_names(body: FixNamesRequest):
    if settings.read_only_mode:
        raise HTTPException(status_code=403, detail="API is in read-only mode")
    c = _client(body.url, body.email, body.password)
    updated, errors, results = 0, 0, []
    for case_id in body.case_ids:
        try:
            case = c.get_case(case_id)
            new_name = (case.get("title") or "Untitled").replace(" ", "_")
            c.update_case(case_id, {"custom_tc_name": new_name})
            results.append({"case_id": case_id, "new_name": new_name, "ok": True})
            updated += 1
        except Exception as exc:
            results.append({"case_id": case_id, "ok": False, "error": str(exc)})
            errors += 1
    return {"updated": updated, "errors": errors, "results": results}


# ── Wildcard routes last ─────────────────────────────────────────────────────

@router.post("/{case_id}")
def get_case(case_id: int, body: CasesQuery):
    c = _client(body.url, body.email, body.password)
    try:
        return c.get_case(case_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

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
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

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
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")