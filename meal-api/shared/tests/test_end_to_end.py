"""End-to-end integration tests.

These walk full lifecycle flows through HTTP using DRF's APIClient,
crossing context boundaries (patient → recipe → meal_request → kitchen)
and role boundaries (dietary staff vs kitchen staff). They exist to
guard the contracts *between* contexts that per-endpoint tests don't
exercise as a single trace.
"""

from django.test import TestCase

from kitchen.enum import TrayStatus
from meal_request.models import MealRequestStatus
from patient.models import Allergen, DietType
from recipe.models import Recipe, RecipeAllergen, RecipeDietCompatibility
from user.enum import UserRole

from .api_client import authed_client


def _seed_recipe(
    *,
    name: str,
    allergens: list[str] | None = None,
    compatible_diets: list[str] | None = None,
) -> Recipe:
    """Inline recipe seeder — these tests need to assert behaviour against
    specific recipe shapes, so we build them up directly rather than
    relying on factory defaults."""
    recipe = Recipe.objects.create(name=name, active=True)
    for allergen in allergens or []:
        RecipeAllergen.objects.create(recipe=recipe, allergen=allergen)
    for diet in compatible_diets or [DietType.REGULAR]:
        RecipeDietCompatibility.objects.create(recipe=recipe, compatible_diet=diet)
    return recipe


class HappyPathEndToEndTests(TestCase):
    """Dietary admits a patient and creates a request; kitchen takes the
    resulting tray through the full delivery pipeline; dietary observes
    final tray status."""

    def test_admit_to_retrieval_walks_full_pipeline_through_http(self):
        dietary = authed_client(role=UserRole.DIETARY_STAFF, username="dietary-1")
        kitchen = authed_client(role=UserRole.KITCHEN_STAFF, username="kitchen-1")

        # 1. dietary seeds a recipe via DB (no public POST /recipes endpoint)
        safe_recipe = _seed_recipe(
            name="Vegan Bowl",
            allergens=[],
            compatible_diets=[DietType.VEGAN, DietType.REGULAR],
        )

        # 2. dietary admits a patient
        admit_response = dietary.post(
            "/patients",
            {
                "first_name": "Ada",
                "last_name": "Lovelace",
                "date_of_birth": "1990-01-01",
                "mrn": "E2E-001",
                "diet": DietType.VEGAN,
            },
            format="json",
        )
        self.assertEqual(admit_response.status_code, 201)
        patient_id = admit_response.json()["id"]

        # 3. dietary drafts and finalizes a meal request
        draft_response = dietary.post(
            "/meal-requests",
            {"patient_id": patient_id, "recipe_ids": [str(safe_recipe.id)]},
            format="json",
        )
        self.assertEqual(draft_response.status_code, 201)
        meal_request_id = draft_response.json()["id"]

        finalize_response = dietary.post(f"/meal-requests/{meal_request_id}/finalize")
        self.assertEqual(finalize_response.status_code, 200)
        self.assertEqual(
            finalize_response.json()["status"], MealRequestStatus.FINALIZED
        )

        # 4. kitchen now sees a CREATED tray for that meal request
        kitchen_tray_list = kitchen.get(f"/trays?meal_request_id={meal_request_id}")
        self.assertEqual(kitchen_tray_list.status_code, 200)
        listed_trays = kitchen_tray_list.json()
        self.assertEqual(len(listed_trays), 1)
        self.assertEqual(listed_trays[0]["status"], TrayStatus.CREATED)
        tray_id = listed_trays[0]["id"]

        # 5. kitchen walks the tray through the full pipeline
        pipeline_endpoints = [
            ("start-preparation", TrayStatus.PREPARATION_STARTED),
            ("validate-accuracy", TrayStatus.ACCURACY_VALIDATED),
            ("dispatch", TrayStatus.EN_ROUTE),
            ("deliver", TrayStatus.DELIVERED),
            ("retrieve", TrayStatus.RETRIEVED),
        ]
        for endpoint, expected_status in pipeline_endpoints:
            step_response = kitchen.post(f"/trays/{tray_id}/{endpoint}")
            self.assertEqual(step_response.status_code, 200, endpoint)
            self.assertEqual(step_response.json()["status"], expected_status)

        # 6. dietary can observe the final tray status (cross-context read)
        dietary_tray_view = dietary.get(f"/trays/{tray_id}")
        self.assertEqual(dietary_tray_view.status_code, 200)
        self.assertEqual(dietary_tray_view.json()["status"], TrayStatus.RETRIEVED)

        # 7. status history records every transition in order
        history_response = kitchen.get(f"/trays/{tray_id}/status-history")
        self.assertEqual(history_response.status_code, 200)
        history_rows = history_response.json()
        self.assertEqual(len(history_rows), 6)  # CREATED + 5 transitions
        emitted_statuses = [row["to_status"] for row in history_rows]
        self.assertEqual(
            emitted_statuses,
            [
                TrayStatus.CREATED,
                TrayStatus.PREPARATION_STARTED,
                TrayStatus.ACCURACY_VALIDATED,
                TrayStatus.EN_ROUTE,
                TrayStatus.DELIVERED,
                TrayStatus.RETRIEVED,
            ],
        )


class SafetyRejectionEndToEndTests(TestCase):
    """Finalize must hard-stop unsafe requests before a tray ever exists."""

    def test_allergy_added_after_drafting_blocks_finalize_and_creates_no_tray(self):
        dietary = authed_client(role=UserRole.DIETARY_STAFF, username="dietary-2")
        kitchen = authed_client(role=UserRole.KITCHEN_STAFF, username="kitchen-2")

        recipe_with_peanuts = _seed_recipe(
            name="Pad Thai",
            allergens=[Allergen.PEANUTS],
            compatible_diets=[DietType.REGULAR],
        )

        admit_response = dietary.post(
            "/patients",
            {
                "first_name": "Bob",
                "last_name": "Builder",
                "date_of_birth": "1985-05-05",
                "mrn": "E2E-002",
                "diet": DietType.REGULAR,
            },
            format="json",
        )
        patient_id = admit_response.json()["id"]

        # Draft is fine; allergy is recorded between draft and finalize.
        draft_response = dietary.post(
            "/meal-requests",
            {"patient_id": patient_id, "recipe_ids": [str(recipe_with_peanuts.id)]},
            format="json",
        )
        meal_request_id = draft_response.json()["id"]

        dietary.post(
            f"/patients/{patient_id}/allergies",
            {"allergen": Allergen.PEANUTS, "severity": "SEVERE"},
            format="json",
        )

        finalize_response = dietary.post(f"/meal-requests/{meal_request_id}/finalize")

        self.assertEqual(finalize_response.status_code, 422)
        rejected_body = finalize_response.json()
        self.assertEqual(rejected_body["status"], MealRequestStatus.REJECTED)
        self.assertIn("peanuts", rejected_body["rejection_reason"].lower())

        # Kitchen sees no tray, because the rejection happened before tray creation.
        kitchen_trays = kitchen.get(f"/trays?meal_request_id={meal_request_id}").json()
        self.assertEqual(kitchen_trays, [])

    def test_diet_incompatibility_blocks_finalize(self):
        dietary = authed_client(role=UserRole.DIETARY_STAFF, username="dietary-3")
        recipe_for_regulars = _seed_recipe(
            name="Beef Stew",
            allergens=[],
            compatible_diets=[DietType.REGULAR],
        )

        patient_id = dietary.post(
            "/patients",
            {
                "first_name": "Vee",
                "last_name": "Gan",
                "date_of_birth": "2000-01-01",
                "mrn": "E2E-003",
                "diet": DietType.VEGAN,
            },
            format="json",
        ).json()["id"]

        meal_request_id = dietary.post(
            "/meal-requests",
            {"patient_id": patient_id, "recipe_ids": [str(recipe_for_regulars.id)]},
            format="json",
        ).json()["id"]

        finalize_response = dietary.post(f"/meal-requests/{meal_request_id}/finalize")

        self.assertEqual(finalize_response.status_code, 422)
        self.assertEqual(
            finalize_response.json()["status"], MealRequestStatus.REJECTED
        )
        self.assertIn("VEGAN", finalize_response.json()["rejection_reason"])


class RoleBoundaryEndToEndTests(TestCase):
    """Role separation must hold across the lifecycle: kitchen never
    writes patient/meal-request state, dietary never advances trays."""

    def test_kitchen_cannot_create_meal_request_and_dietary_cannot_transition_tray(self):
        dietary = authed_client(role=UserRole.DIETARY_STAFF, username="dietary-4")
        kitchen = authed_client(role=UserRole.KITCHEN_STAFF, username="kitchen-4")

        safe_recipe = _seed_recipe(
            name="Plain Rice",
            allergens=[],
            compatible_diets=[DietType.REGULAR, DietType.VEGAN],
        )

        # Dietary sets up patient and request.
        patient_id = dietary.post(
            "/patients",
            {
                "first_name": "Cher",
                "last_name": "Iot",
                "date_of_birth": "1970-01-01",
                "mrn": "E2E-004",
                "diet": DietType.REGULAR,
            },
            format="json",
        ).json()["id"]

        # Kitchen cannot create a meal request.
        forbidden_create = kitchen.post(
            "/meal-requests",
            {"patient_id": patient_id, "recipe_ids": [str(safe_recipe.id)]},
            format="json",
        )
        self.assertEqual(forbidden_create.status_code, 403)

        # Dietary creates and finalizes the request.
        meal_request_id = dietary.post(
            "/meal-requests",
            {"patient_id": patient_id, "recipe_ids": [str(safe_recipe.id)]},
            format="json",
        ).json()["id"]
        dietary.post(f"/meal-requests/{meal_request_id}/finalize")

        tray_id = kitchen.get(
            f"/trays?meal_request_id={meal_request_id}"
        ).json()[0]["id"]

        # Dietary cannot advance the tray.
        forbidden_transition = dietary.post(f"/trays/{tray_id}/start-preparation")
        self.assertEqual(forbidden_transition.status_code, 403)

        # Kitchen can.
        permitted_transition = kitchen.post(f"/trays/{tray_id}/start-preparation")
        self.assertEqual(permitted_transition.status_code, 200)


class DraftEditingEndToEndTests(TestCase):
    """A drafted request can be re-pointed at different recipes before
    finalize, and finalize then evaluates against the latest recipe set."""

    def test_swapping_recipes_on_draft_changes_safety_outcome(self):
        dietary = authed_client(role=UserRole.DIETARY_STAFF, username="dietary-5")
        unsafe_recipe = _seed_recipe(
            name="Peanut Stew",
            allergens=[Allergen.PEANUTS],
            compatible_diets=[DietType.REGULAR],
        )
        safe_recipe = _seed_recipe(
            name="Plain Toast",
            allergens=[],
            compatible_diets=[DietType.REGULAR],
        )

        patient_id = dietary.post(
            "/patients",
            {
                "first_name": "Pat",
                "last_name": "Allergic",
                "date_of_birth": "1990-01-01",
                "mrn": "E2E-005",
                "diet": DietType.REGULAR,
            },
            format="json",
        ).json()["id"]
        dietary.post(
            f"/patients/{patient_id}/allergies",
            {"allergen": Allergen.PEANUTS, "severity": "SEVERE"},
            format="json",
        )

        # First draft is unsafe — but we swap recipes before finalizing.
        meal_request_id = dietary.post(
            "/meal-requests",
            {"patient_id": patient_id, "recipe_ids": [str(unsafe_recipe.id)]},
            format="json",
        ).json()["id"]

        swap_response = dietary.patch(
            f"/meal-requests/{meal_request_id}",
            {"recipe_ids": [str(safe_recipe.id)]},
            format="json",
        )
        self.assertEqual(swap_response.status_code, 200)

        finalize_response = dietary.post(f"/meal-requests/{meal_request_id}/finalize")

        self.assertEqual(finalize_response.status_code, 200)
        self.assertEqual(
            finalize_response.json()["status"], MealRequestStatus.FINALIZED
        )
