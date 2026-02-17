import os
from unittest.mock import patch
from app.core.config import Settings


class TestSettings:
    def test_defaults_are_safe(self):
        s = Settings()
        assert s.read_only_mode is False
        assert s.skip_auth_validation is False
        assert s.enable_request_logging is False
        assert s.default_page_size == 250

    def test_read_only_mode_from_env(self):
        with patch.dict(os.environ, {"READ_ONLY_MODE": "true"}):
            s = Settings()
            assert s.read_only_mode is True

    def test_no_environment_name_fields(self):
        forbidden = {"environment", "env", "stage", "is_prod", "is_staging", "app_env"}
        field_names = set(Settings.model_fields.keys())
        assert not forbidden.intersection(field_names)