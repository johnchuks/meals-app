"""Auth integration tests for the JWT token endpoint."""

from django.test import TestCase

from shared.tests.api_client import unauthenticated_client
from shared.tests.factories import make_user
from user.enum import UserRole


class TokenObtainTests(TestCase):
    def test_returns_access_refresh_role_for_valid_credentials(self):
        make_user(username="kim", role=UserRole.KITCHEN_STAFF, password="pw-12345")
        client = unauthenticated_client()

        response = client.post(
            "/auth/token",
            {"username": "kim", "password": "pw-12345"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("access", body)
        self.assertIn("refresh", body)
        self.assertEqual(body["role"], UserRole.KITCHEN_STAFF)
        self.assertEqual(body["username"], "kim")
        self.assertFalse(body["is_superuser"])

    def test_rejects_wrong_password(self):
        make_user(username="kim", role=UserRole.KITCHEN_STAFF, password="correct")
        client = unauthenticated_client()

        response = client.post(
            "/auth/token",
            {"username": "kim", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
