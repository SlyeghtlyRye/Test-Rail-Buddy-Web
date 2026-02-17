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
ACCOUNT_TYPE_MAP = {1: "Classic", 2: "Next", 3: "Both"}
USER_TYPE_MAP = {1: "User", 2: "Admin/Owner", 3: "CSR"}
AUTOMATION_MAP = {1: "Not Automated", 2: "Automated", 3: "Partial"}

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
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    headers = ["Test Case ID", "Test Name", "Title", "Priority", "Category",
               "Account Type", "User Type", "Use Case", "Test Steps",
               "Expected Result", "References", "Automation Status"]
    if body.include_links:
        headers += ["TestRail ID", "Link to Case"]

    def process(value):
        if not value:
            return ""
        return TestRailClient.strip_html(str(value)) if body.strip_html else str(value)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for case in cases:
        row = [
            case.get("custom_tc_test_case_id", ""),
            case.get("custom_tc_name", ""),
            case.get("title", ""),
            PRIORITY_MAP.get(case.get("priority_id"), ""),
            case.get("custom_tc_category", ""),
            ACCOUNT_TYPE_MAP.get(case.get("custom_user_type_classic_or_next"), ""),
            USER_TYPE_MAP.get(case.get("custom_tc_user_type"), ""),
            process(case.get("custom_tc_use_case")),
            process(case.get("custom_steps")),
            process(case.get("custom_expected")),
            case.get("refs", ""),
            AUTOMATION_MAP.get(case.get("custom_tc_automation_status"), ""),
        ]
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