import json
import re
from typing import Dict, List, Optional
import requests


class TestRailError(Exception):
    pass


class TestRailClient:
    def __init__(self, url: str, email: str, password: str):
        self.url = url.rstrip("/")
        self.session = requests.Session()
        self.session.auth = (email, password)
        self.session.headers.update({"Content-Type": "application/json"})
        self._case_fields_cache = None

    def authenticate(self) -> bool:
        email = self.session.auth[0]
        try:
            response = self.session.get(
                f"{self.url}/index.php?/api/v2/get_user_by_email&email={email}"
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False

    def get_projects(self) -> List[Dict]:
        response = self.session.get(f"{self.url}/index.php?/api/v2/get_projects")
        response.raise_for_status()
        data = response.json()
        return data["projects"] if isinstance(data, dict) and "projects" in data else data

    def get_suites(self, project_id: int) -> List[Dict]:
        try:
            response = self.session.get(f"{self.url}/index.php?/api/v2/get_suites/{project_id}")
            response.raise_for_status()
            data = response.json()
            return data["suites"] if isinstance(data, dict) and "suites" in data else data
        except requests.exceptions.HTTPError as exc:
            if exc.response.status_code == 400:
                return []
            raise

    def get_sections(self, project_id: int, suite_id: Optional[int] = None) -> List[Dict]:
        endpoint = f"{self.url}/index.php?/api/v2/get_sections/{project_id}"
        if suite_id:
            endpoint += f"&suite_id={suite_id}"
        try:
            response = self.session.get(endpoint, timeout=30)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict) and "sections" in data:
                return data["sections"]
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_cases(self, project_id: int, suite_id=None, section_id=None, offset=0, limit=250) -> Dict:
        params = [f"offset={offset}", f"limit={limit}"]
        if suite_id:
            params.append(f"suite_id={suite_id}")
        if section_id:
            params.append(f"section_id={section_id}")

        endpoint = f"{self.url}/index.php?/api/v2/get_cases/{project_id}&{'&'.join(params)}"

        try:
            response = self.session.get(endpoint, timeout=30)

            if response.status_code == 400 and section_id:
                fallback_params = [f"offset={offset}", f"limit={limit}"]
                if suite_id:
                    fallback_params.append(f"suite_id={suite_id}")
                fallback = f"{self.url}/index.php?/api/v2/get_cases/{project_id}&{'&'.join(fallback_params)}"
                response = self.session.get(fallback, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    all_cases = data["cases"] if isinstance(data, dict) and "cases" in data else data
                    filtered = [c for c in all_cases if c.get("section_id") == section_id]
                    return {"cases": filtered, "total": len(filtered), "offset": offset, "limit": limit}

            response.raise_for_status()
            data = response.json()

            if isinstance(data, dict) and "cases" in data:
                return {"cases": data["cases"], "total": data.get("size", 0), "offset": data.get("offset", 0), "limit": data.get("limit", limit)}

            cases_list = data if isinstance(data, list) else []
            return {"cases": cases_list, "total": len(cases_list), "offset": 0, "limit": limit}

        except requests.exceptions.HTTPError as exc:
            if exc.response.status_code == 400:
                return {"cases": [], "total": 0, "offset": offset, "limit": limit}
            raise

    def get_case(self, case_id: int) -> Dict:
        response = self.session.get(f"{self.url}/index.php?/api/v2/get_case/{case_id}")
        response.raise_for_status()
        return response.json()

    def create_case(self, section_id: int, data: Dict) -> Dict:
        response = self.session.post(
            f"{self.url}/index.php?/api/v2/add_case/{section_id}",
            data=json.dumps(data),
        )
        if not response.ok:
            try:
                err = response.json().get("error", response.reason)
            except Exception:
                err = response.reason
            raise TestRailError(f"Failed to create case: {err}")
        return response.json()

    def update_case(self, case_id: int, data: Dict) -> Dict:
        response = self.session.post(
            f"{self.url}/index.php?/api/v2/update_case/{case_id}",
            data=json.dumps(data),
        )
        if not response.ok:
            try:
                err = response.json().get("error", response.reason)
            except Exception:
                err = response.reason
            raise TestRailError(f"Failed to update case {case_id}: {err}")
        return response.json()

    def delete_case(self, case_id: int, permanent: bool = False) -> bool:
        if permanent:
            response = self.session.post(f"{self.url}/index.php?/api/v2/delete_case/{case_id}")
            if response.status_code == 403:
                self.update_case(case_id, {"is_deleted": True})
                return True
            response.raise_for_status()
            return True
        else:
            self.update_case(case_id, {"is_deleted": True})
            return True

    def get_case_fields(self) -> List[Dict]:
        if self._case_fields_cache is None:
            response = self.session.get(f"{self.url}/index.php?/api/v2/get_case_fields")
            response.raise_for_status()
            self._case_fields_cache = response.json()
        return self._case_fields_cache

    @staticmethod
    def strip_html(text: str) -> str:
        if not text:
            return ""
        text = re.sub(r"<[^>]+>", "", str(text))
        for entity, char in {"&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"'}.items():
            text = text.replace(entity, char)
        return re.sub(r"\s+", " ", text).strip()

    @staticmethod
    def make_safe_id(text: str) -> str:
        safe = text.replace(" ", "_").replace("-", "_")
        return "".join(c for c in safe if c.isalnum() or c == "_")