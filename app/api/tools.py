import csv
import io
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import BulkIDRequest, BulkIDResult, ExportRequest, FixNamesRequest
from app.services.testrail_client import TestRailClient, TestRailError
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()

PRIORITY_MAP = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}

def _client(url, email, password):
    return TestRailClient(url, email, password)

@router.post("/bulk-ids", response_model=BulkIDResult)
def bulk_assign_ids(body: BulkIDRequest):
    if settings.read_only_mode:
        raise HTTPException(status_code=403, detail="API is in read-only mode")
    c = _client(body.url, body.email, body.password)
    clean_base = TestRailClient.make_safe_id(body.base_id)
    results: List[Dict[str, Any]] = []
    success, errors = 0, 0
    for i, case_id in enumerate(body.case_ids, start=1):
        new_id = f"{clean_base}_{i:04d}"
        try:
            c.update_case(case_id, {"custom_tc_test_case_id": new_id})
            results.append({"case_id": case_id, "new_id": new_id, "ok": True})
            success += 1
        except TestRailError as exc:
            results.append({"case_id": case_id, "new_id": new_id, "ok": False, "error": str(exc)})
            errors += 1
    return BulkIDResult(updated=success, errors=errors, results=results)

@router.post("/fix-names")
def fix_test_names(body: FixNamesRequest):
    if settings.read_only_mode:
        raise HTTPException(status_code=403, detail="API is in read-only mode")
    c = _client(body.url, body.email, body.password)
    results: List[Dict[str, Any]] = []
    success, errors = 0, 0
    for case_id in body.case_ids:
        try:
            case = c.get_case(case_id)
            title = case.get("title", "")
            new_name = title.replace(" ", "_") if title else "Untitled"
            if not body.reset_all:
                existing = (case.get("custom_tc_name") or "").strip()
                if existing and " " not in existing:
                    results.append({"case_id": case_id, "skipped": True})
                    continue
            c.update_case(case_id, {"custom_tc_name": new_name})
            results.append({"case_id": case_id, "new_name": new_name, "ok": True})
            success += 1
        except TestRailError as exc:
            results.append({"case_id": case_id, "ok": False, "error": str(exc)})
            errors += 1
    return {"updated": success, "errors": errors, "results": results}

@router.post("/export-csv")
def export_cases_csv(body: ExportRequest):
    c = _client(body.url, body.email, body.password)
    try:
        result = c.get_cases(body.project_id, body.suite_id, body.section_id)
        cases = result["cases"]
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to communicate with TestRail")

    def make_label(key):
        if key == "priority_id": return "Priority"
        if key == "refs":        return "References"
        if key == "title":       return "Title"
        return key.replace("custom_", "").replace("_", " ").title()

    def process(key, value):
        if key == "priority_id":
            return PRIORITY_MAP.get(value, str(value) if value is not None else "")
        if not value:
            return ""
        return TestRailClient.strip_html(str(value)) if body.strip_html else str(value)

    if body.columns:
        col_keys = body.columns
    elif cases:
        col_keys = ["title"] + sorted(k for k in cases[0] if k.startswith("custom_"))
    else:
        col_keys = ["title"]

    headers = [make_label(k) for k in col_keys]
    if body.include_links:
        headers += ["TestRail ID", "Link to Case"]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for case in cases:
        row = [process(k, case.get(k)) for k in col_keys]
        if body.include_links:
            cid = case.get("id", "")
            row += [cid, f"{body.url}/index.php?/cases/view/{cid}" if cid else ""]
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=testrail_export.csv"},
    )