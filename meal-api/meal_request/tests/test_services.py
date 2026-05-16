"""Service-layer tests for meal_request/services.py.

These exercise the real Patient/Recipe/Tray rows through the same code
the API uses — so they double as a safety check for the cross-context
ports (PatientClinicalReader, RecipeDataSnapshotProvider, TrayService).
"""

from uuid import uuid4

from django.test import TestCase

from kitchen.models import Tray
from patient.models import Allergen, DietType
from shared.tests.factories import (
    add_allergy_to_patient,
    make_draft_meal_request,
    make_patient,
    make_recipe,
)

from ..models import MealRequest, MealRequestStatus
from ..services import InvalidMealRequestState, MealRequestService


class CreateDraftTests(TestCase):
    def test_create_draft_persists_dedupe_recipe_ids_preserving_order(self):
        patient = make_patient()
        recipe_a = make_recipe(name="A")
        recipe_b = make_recipe(name="B")

        draft = MealRequestService().create_draft(
            patient_id=patient.id,
            recipe_ids=[recipe_a.id, recipe_b.id, recipe_a.id],
        )

        self.assertEqual(draft.status, MealRequestStatus.DRAFT)
        self.assertEqual(draft.recipe_ids, [recipe_a.id, recipe_b.id])


class SetRecipesTests(TestCase):
    def test_set_recipes_replaces_recipe_list_on_draft(self):
        patient = make_patient()
        original_recipe = make_recipe(name="Original")
        replacement_recipe = make_recipe(name="Replacement")
        draft = make_draft_meal_request(
            patient_id=patient.id, recipe_ids=[original_recipe.id]
        )

        updated = MealRequestService().set_recipes(
            meal_request_id=draft.id, recipe_ids=[replacement_recipe.id]
        )

        self.assertEqual(updated.recipe_ids, [replacement_recipe.id])

    def test_set_recipes_rejects_non_draft_request(self):
        patient = make_patient()
        recipe = make_recipe()
        draft = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])
        draft.status = MealRequestStatus.FINALIZED
        from django.utils import timezone
        draft.finalized_at = timezone.now()
        draft.save()

        with self.assertRaises(InvalidMealRequestState):
            MealRequestService().set_recipes(
                meal_request_id=draft.id, recipe_ids=[recipe.id]
            )


class FinalizeTests(TestCase):
    def _build_safe_draft(self):
        patient = make_patient(diet=DietType.REGULAR)
        recipe = make_recipe(
            name="Safe Recipe", allergens=[], compatible_diets=[DietType.REGULAR]
        )
        draft = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])
        return patient, recipe, draft

    def test_finalize_marks_request_finalized_and_creates_tray(self):
        _, _, draft = self._build_safe_draft()

        finalized = MealRequestService().finalize(meal_request_id=draft.id)

        self.assertEqual(finalized.status, MealRequestStatus.FINALIZED)
        self.assertIsNotNone(finalized.finalized_at)
        self.assertTrue(Tray.objects.filter(meal_request_id=draft.id).exists())

    def test_finalize_rejects_due_to_patient_allergen(self):
        patient = make_patient(diet=DietType.REGULAR)
        add_allergy_to_patient(patient, allergen=Allergen.PEANUTS)
        recipe = make_recipe(
            name="Peanut Sauce",
            allergens=[Allergen.PEANUTS],
            compatible_diets=[DietType.REGULAR],
        )
        draft = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])

        rejected = MealRequestService().finalize(meal_request_id=draft.id)

        self.assertEqual(rejected.status, MealRequestStatus.REJECTED)
        self.assertIn("peanuts", (rejected.rejection_reason or "").lower())
        self.assertFalse(Tray.objects.filter(meal_request_id=draft.id).exists())

    def test_finalize_rejects_due_to_diet_incompatibility(self):
        patient = make_patient(diet=DietType.VEGAN)
        recipe = make_recipe(
            name="Beef Stew", allergens=[], compatible_diets=[DietType.REGULAR]
        )
        draft = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])

        rejected = MealRequestService().finalize(meal_request_id=draft.id)

        self.assertEqual(rejected.status, MealRequestStatus.REJECTED)
        self.assertIn("VEGAN", rejected.rejection_reason or "")

    def test_finalize_rejects_when_patient_missing(self):
        recipe = make_recipe()
        draft = make_draft_meal_request(patient_id=uuid4(), recipe_ids=[recipe.id])

        rejected = MealRequestService().finalize(meal_request_id=draft.id)

        self.assertEqual(rejected.status, MealRequestStatus.REJECTED)
        self.assertEqual(rejected.rejection_reason, "patient not found")

    def test_finalize_rejects_non_draft_request(self):
        _, _, draft = self._build_safe_draft()
        MealRequestService().finalize(meal_request_id=draft.id)  # first call: FINALIZED

        with self.assertRaises(InvalidMealRequestState):
            MealRequestService().finalize(meal_request_id=draft.id)

    def test_finalize_raises_when_meal_request_missing(self):
        with self.assertRaises(MealRequest.DoesNotExist):
            MealRequestService().finalize(meal_request_id=uuid4())
