from typing import Any, Dict, List, Optional
from pydantic import BaseModel, field_validator


class TestRailBase(BaseModel):
    url: str
    email: str
    password: str

    @field_validator("url")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not v.lower().startswith(("http://", "https://")):
            raise ValueError("URL must use http or https")
        return v


class AuthRequest(TestRailBase):
    pass

class AuthResponse(BaseModel):
    success: bool
    message: str

class ConnectionBody(TestRailBase):
    pass

class CasesQuery(TestRailBase):
    project_id: int
    suite_id: Optional[int] = None
    section_id: Optional[int] = None
    offset: int = 0
    limit: int = 250

class CaseUpdateRequest(TestRailBase):
    title: Optional[str] = None
    fields: Dict[str, Any] = {}

class CaseCreateRequest(TestRailBase):
    section_id: int
    suite_id: Optional[int] = None
    title: str
    fields: Dict[str, Any] = {}

class BulkIDRequest(TestRailBase):
    case_ids: List[int]
    base_id: str

class BulkIDResult(BaseModel):
    updated: int
    errors: int
    results: List[Dict[str, Any]]

class FixNamesRequest(TestRailBase):
    case_ids: List[int]
    reset_all: bool = False

class ExportRequest(TestRailBase):
    project_id: int
    suite_id: Optional[int] = None
    section_id: Optional[int] = None
    strip_html: bool = True
    include_links: bool = True
    columns: Optional[List[str]] = None
