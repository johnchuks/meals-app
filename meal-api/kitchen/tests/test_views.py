"""API tests for tray (kitchen) endpoints."""

from uuid import uuid4

from django.test import TestCase
from django.utils import timezone

from meal_request.models import MealRequestStatus
from shared.tests.api_client import authed_client, unauthenticated_client
from shared.tests.factories import (
    make_draft_meal_request,
    make_patient,
    make_recipe,
    make_tray_at_status,
)
from user.enum import UserRole

from ..enum import TrayStatus


def _finalized_meal_request_id():
    patient = make_patient(mrn=f"MRN-{uuid4().hex[:6]}")
    recipe = make_recipe()
    request = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])
    request.status = MealRequestStatus.FINALIZED
    request.finalized_at = timezone.now()
    request.save()
    return request.id


class TrayListViewTests(TestCase):
    def test_requires_authentication(self):
        response = unauthenticated_client().get("/trays")
        self.assertEqual(response.status_code, 401)

    def test_list_returns_all_trays_for_authorized_role(self):
        make_tray_at_status(meal_request_id=_finalized_meal_request_id())
        make_tray_at_status(meal_request_id=_finalized_meal_request_id())
        client = authed_client(role=UserRole.KITCHEN_STAFF)

        response = client.get("/trays")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_status_filter_restricts_results(self):
        make_tray_at_status(
            meal_request_id=_finalized_meal_request_id(),
            status=TrayStatus.CREATED,
        )
        make_tray_at_status(
            meal_request_id=_finalized_meal_request_id(),
            status=TrayStatus.DELIVERED,
        )
        client = authed_client(role=UserRole.KITCHEN_STAFF)

        response = client.get(f"/trays?status={TrayStatus.DELIVERED}")

        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["status"], TrayStatus.DELIVERED)

    def test_meal_request_id_filter_restricts_results(self):
        target_meal_request_id = _finalized_meal_request_id()
        make_tray_at_status(meal_request_id=target_meal_request_id)
        make_tray_at_status(meal_request_id=_finalized_meal_request_id())
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.get(f"/trays?meal_request_id={target_meal_request_id}")

        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["meal_request_id"], str(target_meal_request_id))


class TrayStatusHistoryViewTests(TestCase):
    def test_returns_history_entries_ordered_oldest_first(self):
        tray = make_tray_at_status(meal_request_id=_finalized_meal_request_id())
        client = authed_client(role=UserRole.KITCHEN_STAFF)

        response = client.get(f"/trays/{tray.id}/status-history")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["to_status"], TrayStatus.CREATED)
        self.assertIsNone(body[0]["from_status"])

    def test_returns_404_for_unknown_tray(self):
        client = authed_client(role=UserRole.KITCHEN_STAFF)
        response = client.get(f"/trays/{uuid4()}/status-history")
        self.assertEqual(response.status_code, 404)


class TrayTransitionEndpointsTests(TestCase):
    def test_dietary_staff_cannot_transition_trays(self):
        tray = make_tray_at_status(meal_request_id=_finalized_meal_request_id())
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(f"/trays/{tray.id}/start-preparation")
        self.assertEqual(response.status_code, 403)

    def test_kitchen_staff_can_advance_one_step(self):
        tray = make_tray_at_status(meal_request_id=_finalized_meal_request_id())
        client = authed_client(role=UserRole.KITCHEN_STAFF)

        response = client.post(f"/trays/{tray.id}/start-preparation")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], TrayStatus.PREPARATION_STARTED)

    def test_illegal_transition_returns_409_with_context(self):
        tray = make_tray_at_status(
            meal_request_id=_finalized_meal_request_id(),
            status=TrayStatus.CREATED,
        )
        client = authed_client(role=UserRole.KITCHEN_STAFF)

        response = client.post(f"/trays/{tray.id}/deliver")

        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["current_status"], TrayStatus.CREATED)
        self.assertEqual(body["attempted_status"], TrayStatus.DELIVERED)

    def test_unknown_tray_returns_404(self):
        client = authed_client(role=UserRole.KITCHEN_STAFF)
        response = client.post(f"/trays/{uuid4()}/start-preparation")
        self.assertEqual(response.status_code, 404)

    def test_full_pipeline_via_api(self):
        tray = make_tray_at_status(meal_request_id=_finalized_meal_request_id())
        client = authed_client(role=UserRole.KITCHEN_STAFF)

        endpoint_pipeline = [
            ("start-preparation", TrayStatus.PREPARATION_STARTED),
            ("validate-accuracy", TrayStatus.ACCURACY_VALIDATED),
            ("dispatch", TrayStatus.EN_ROUTE),
            ("deliver", TrayStatus.DELIVERED),
            ("retrieve", TrayStatus.RETRIEVED),
        ]
        for endpoint, expected_status in endpoint_pipeline:
            response = client.post(f"/trays/{tray.id}/{endpoint}")
            self.assertEqual(response.status_code, 200, endpoint)
            self.assertEqual(response.json()["status"], expected_status)
