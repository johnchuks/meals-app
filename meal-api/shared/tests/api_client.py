"""Authenticated API client wrapper for view tests."""

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from user.enum import UserRole

from .factories import make_user


def authed_client(*, role: str = UserRole.DIETARY_STAFF, username: str | None = None) -> APIClient:
    """Returns an APIClient already carrying a JWT for a freshly-made user."""
    user = make_user(role=role, username=username or f"user_{role.lower()}")
    client = APIClient()
    access_token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    return client


def unauthenticated_client() -> APIClient:
    return APIClient()
