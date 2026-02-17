from fastapi import APIRouter
from app.models.schemas import AuthRequest, AuthResponse
from app.services.testrail_client import TestRailClient

router = APIRouter()

@router.post("/verify", response_model=AuthResponse)
def verify_credentials(body: AuthRequest):
    client = TestRailClient(body.url, body.email, body.password)
    success = client.authenticate()
    if success:
        return AuthResponse(success=True, message="Connected successfully")
    return AuthResponse(success=False, message="Authentication failed")