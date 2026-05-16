"""API tests for meal request endpoints, including end-to-end finalize flow."""

from uuid import uuid4

from django.test import TestCase

from kitchen.models import Tray
from patient.models import Allergen, DietType
from shared.tests.api_client import authed_client, unauthenticated_client
from shared.tests.factories import (
    add_allergy_to_patient,
    make_draft_meal_request,
    make_patient,
    make_recipe,
)
from user.enum import UserRole

from ..models import MealRequest, MealRequestStatus


class MealRequestCreateViewTests(TestCase):
    def test_requires_authentication(self):
        response = unauthenticated_client().post("/meal-requests", {})
        self.assertEqual(response.status_code, 401)

    def test_kitchen_staff_cannot_create(self):
        client = authed_client(role=UserRole.KITCHEN_STAFF)
        response = client.post(
            "/meal-requests",
            {"patient_id": str(uuid4()), "recipe_ids": [str(uuid4())]},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_dietary_staff_creates_draft(self):
        patient = make_patient()
        recipe = make_recipe()
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(
            "/meal-requests",
            {"patient_id": str(patient.id), "recipe_ids": [str(recipe.id)]},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], MealRequestStatus.DRAFT)
        self.assertEqual(body["recipe_ids"], [str(recipe.id)])

    def test_rejects_empty_recipe_list(self):
        patient = make_patient()
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(
            "/meal-requests",
            {"patient_id": str(patient.id), "recipe_ids": []},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_list_filters_by_patient_id(self):
        owning_patient = make_patient(mrn="OWN")
        unrelated_patient = make_patient(mrn="OTHER")
        recipe = make_recipe()
        owned_request = make_draft_meal_request(
            patient_id=owning_patient.id, recipe_ids=[recipe.id]
        )
        make_draft_meal_request(
            patient_id=unrelated_patient.id, recipe_ids=[recipe.id]
        )
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.get(f"/meal-requests?patient_id={owning_patient.id}")

        self.assertEqual(response.status_code, 200)
        listed_ids = [row["id"] for row in response.json()]
        self.assertEqual(listed_ids, [str(owned_request.id)])


class MealRequestPatchViewTests(TestCase):
    def test_dietary_staff_can_replace_recipe_list_on_draft(self):
        patient = make_patient()
        original_recipe = make_recipe(name="Original")
        replacement_recipe = make_recipe(name="Replacement")
        draft = make_draft_meal_request(
            patient_id=patient.id, recipe_ids=[original_recipe.id]
        )
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.patch(
            f"/meal-requests/{draft.id}",
            {"recipe_ids": [str(replacement_recipe.id)]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["recipe_ids"], [str(replacement_recipe.id)])

    def test_returns_409_when_request_not_in_draft(self):
        patient = make_patient()
        recipe = make_recipe()
        request = make_draft_meal_request(
            patient_id=patient.id, recipe_ids=[recipe.id]
        )
        request.status = MealRequestStatus.REJECTED
        request.save()
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.patch(
            f"/meal-requests/{request.id}",
            {"recipe_ids": [str(recipe.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, 409)


class MealRequestFinalizeViewTests(TestCase):
    def _safe_draft(self):
        patient = make_patient(diet=DietType.REGULAR)
        recipe = make_recipe(
            name="Safe", allergens=[], compatible_diets=[DietType.REGULAR]
        )
        return make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])

    def test_finalize_safe_request_returns_200_and_creates_tray(self):
        draft = self._safe_draft()
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(f"/meal-requests/{draft.id}/finalize")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], MealRequestStatus.FINALIZED)
        self.assertIsNotNone(body["finalized_at"])
        self.assertTrue(Tray.objects.filter(meal_request_id=draft.id).exists())

    def test_finalize_unsafe_request_returns_422_with_rejection_reason(self):
        patient = make_patient(diet=DietType.REGULAR)
        add_allergy_to_patient(patient, allergen=Allergen.PEANUTS)
        recipe = make_recipe(
            name="Peanut Sauce",
            allergens=[Allergen.PEANUTS],
            compatible_diets=[DietType.REGULAR],
        )
        draft = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(f"/meal-requests/{draft.id}/finalize")

        self.assertEqual(response.status_code, 422)
        body = response.json()
        self.assertEqual(body["status"], MealRequestStatus.REJECTED)
        self.assertIn("peanuts", body["rejection_reason"].lower())

    def test_finalize_twice_returns_409(self):
        draft = self._safe_draft()
        client = authed_client(role=UserRole.DIETARY_STAFF)

        client.post(f"/meal-requests/{draft.id}/finalize")
        response = client.post(f"/meal-requests/{draft.id}/finalize")

        self.assertEqual(response.status_code, 409)

    def test_finalize_returns_404_for_unknown_meal_request(self):
        client = authed_client(role=UserRole.DIETARY_STAFF)
        response = client.post(f"/meal-requests/{uuid4()}/finalize")
        self.assertEqual(response.status_code, 404)
