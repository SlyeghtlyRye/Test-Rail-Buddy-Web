from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AuthRequest(BaseModel):
    url: str
    email: str
    password: str

class AuthResponse(BaseModel):
    success: bool
    message: str

class ConnectionBody(BaseModel):
    url: str
    email: str
    password: str

class CasesQuery(BaseModel):
    url: str
    email: str
    password: str
    project_id: int
    suite_id: Optional[int] = None
    section_id: Optional[int] = None
    offset: int = 0
    limit: int = 250

class CaseUpdateRequest(BaseModel):
    url: str
    email: str
    password: str
    title: Optional[str] = None
    fields: Dict[str, Any] = {}

class CaseCreateRequest(BaseModel):
    url: str
    email: str
    password: str
    section_id: int
    suite_id: Optional[int] = None
    title: str
    fields: Dict[str, Any] = {}

class BulkIDRequest(BaseModel):
    url: str
    email: str
    password: str
    case_ids: List[int]
    base_id: str

class BulkIDResult(BaseModel):
    updated: int
    errors: int
    results: List[Dict[str, Any]]

class FixNamesRequest(BaseModel):
    url: str
    email: str
    password: str
    case_ids: List[int]
    reset_all: bool = False

class ExportRequest(BaseModel):
    url: str
    email: str
    password: str
    project_id: int
    suite_id: Optional[int] = None
    section_id: Optional[int] = None
    strip_html: bool = True
    include_links: bool = True