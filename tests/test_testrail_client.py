from unittest.mock import MagicMock, patch
import pytest
from app.services.testrail_client import TestRailClient, TestRailError


@pytest.fixture
def client():
    return TestRailClient("https://example.testrail.com", "user@example.com", "secret")


class TestAuthenticate:
    def test_returns_true_on_200(self, client):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch.object(client.session, "get", return_value=mock_resp):
            assert client.authenticate() is True

    def test_returns_false_on_401(self, client):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        with patch.object(client.session, "get", return_value=mock_resp):
            assert client.authenticate() is False

    def test_returns_false_on_connection_error(self, client):
        import requests
        with patch.object(client.session, "get", side_effect=requests.exceptions.ConnectionError):
            assert client.authenticate() is False


class TestGetProjects:
    def test_returns_list(self, client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = [{"id": 1, "name": "Project A"}]
        mock_resp.raise_for_status = MagicMock()
        with patch.object(client.session, "get", return_value=mock_resp):
            result = client.get_projects()
        assert result == [{"id": 1, "name": "Project A"}]

    def test_unwraps_projects_key(self, client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"projects": [{"id": 2, "name": "Project B"}]}
        mock_resp.raise_for_status = MagicMock()
        with patch.object(client.session, "get", return_value=mock_resp):
            result = client.get_projects()
        assert result == [{"id": 2, "name": "Project B"}]


class TestUpdateCase:
    def test_success(self, client):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {"id": 42, "title": "Updated"}
        mock_resp.raise_for_status = MagicMock()
        with patch.object(client.session, "post", return_value=mock_resp):
            result = client.update_case(42, {"title": "Updated"})
        assert result["id"] == 42

    def test_raises_on_failure(self, client):
        mock_resp = MagicMock()
        mock_resp.ok = False
        mock_resp.json.return_value = {"error": "Invalid field"}
        mock_resp.reason = "Bad Request"
        with patch.object(client.session, "post", return_value=mock_resp):
            with pytest.raises(TestRailError):
                client.update_case(42, {"bad_field": "oops"})


class TestDeleteCase:
    def test_soft_delete(self, client):
        with patch.object(client, "update_case", return_value={}) as mock_update:
            result = client.delete_case(case_id=1, permanent=False)
        mock_update.assert_called_once_with(1, {"is_deleted": True})
        assert result is True

    def test_permanent_delete_falls_back_on_403(self, client):
        perm_resp = MagicMock()
        perm_resp.status_code = 403
        with patch.object(client.session, "post", return_value=perm_resp):
            with patch.object(client, "update_case", return_value={}) as mock_update:
                result = client.delete_case(case_id=5, permanent=True)
        mock_update.assert_called_once_with(5, {"is_deleted": True})
        assert result is True


class TestHelpers:
    def test_strip_html_removes_tags(self):
        assert TestRailClient.strip_html("<b>Hello</b>") == "Hello"

    def test_strip_html_decodes_entities(self):
        assert TestRailClient.strip_html("&lt;tag&gt;") == "<tag>"

    def test_strip_html_handles_empty(self):
        assert TestRailClient.strip_html("") == ""

    def test_make_safe_id_replaces_spaces(self):
        assert TestRailClient.make_safe_id("My Section Name") == "My_Section_Name"

    def test_make_safe_id_replaces_dashes(self):
        assert TestRailClient.make_safe_id("login-flow") == "login_flow"