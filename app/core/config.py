from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    testrail_url: str = ""
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:8080", "http://localhost:5173"]
    read_only_mode: bool = False
    skip_auth_validation: bool = False
    enable_request_logging: bool = False
    default_page_size: int = 250

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()