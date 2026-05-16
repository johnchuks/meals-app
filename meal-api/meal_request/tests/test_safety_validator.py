"""Pure-logic unit tests for the SafetyValidator.

No DB, no Django machinery — just the validator over hand-built ports.
"""

from uuid import uuid4

from django.test import SimpleTestCase

from patient.models import Allergen, DietType
from patient.ports import PatientClinicalSnapshot
from recipe.ports import RecipeSafetyData

from ..safety_validator import SafetyValidator


def _snapshot(*, diet: str = DietType.REGULAR, allergens: set[str] = None) -> PatientClinicalSnapshot:
    return PatientClinicalSnapshot(
        patient_id=uuid4(), diet=diet, allergens=frozenset(allergens or set())
    )


def _recipe(
    *, name: str = "Soup", allergens: set[str] = None, diets: set[str] = None
) -> RecipeSafetyData:
    return RecipeSafetyData(
        recipe_id=uuid4(),
        name=name,
        allergens=frozenset(allergens or set()),
        compatible_diets=frozenset(diets or {DietType.REGULAR}),
    )


class SafetyValidatorTests(SimpleTestCase):
    def test_safe_when_no_allergen_overlap_and_diet_matches(self):
        result = SafetyValidator().validate(
            patient=_snapshot(diet=DietType.REGULAR, allergens=set()),
            recipes=[_recipe(diets={DietType.REGULAR})],
        )
        self.assertTrue(result.is_safe)
        self.assertIsNone(result.reason)

    def test_rejects_when_recipe_contains_patient_allergen(self):
        result = SafetyValidator().validate(
            patient=_snapshot(allergens={Allergen.PEANUTS}),
            recipes=[
                _recipe(name="Pad Thai", allergens={Allergen.PEANUTS}, diets={DietType.REGULAR})
            ],
        )
        self.assertFalse(result.is_safe)
        self.assertIn("peanuts", result.reason.lower())
        self.assertIn("Pad Thai", result.reason)

    def test_rejects_when_patient_diet_not_in_compatible_diets(self):
        result = SafetyValidator().validate(
            patient=_snapshot(diet=DietType.VEGAN),
            recipes=[_recipe(name="Beef Stew", diets={DietType.REGULAR})],
        )
        self.assertFalse(result.is_safe)
        self.assertIn("VEGAN", result.reason)
        self.assertIn("Beef Stew", result.reason)

    def test_returns_first_failure_when_multiple_recipes_unsafe(self):
        result = SafetyValidator().validate(
            patient=_snapshot(allergens={Allergen.PEANUTS}),
            recipes=[
                _recipe(name="First Bad", allergens={Allergen.PEANUTS}),
                _recipe(name="Second Bad", allergens={Allergen.PEANUTS}),
            ],
        )
        self.assertFalse(result.is_safe)
        self.assertIn("First Bad", result.reason)

    def test_safe_when_recipes_list_is_empty(self):
        result = SafetyValidator().validate(
            patient=_snapshot(allergens={Allergen.PEANUTS}), recipes=[]
        )
        self.assertTrue(result.is_safe)

    def test_allergen_check_runs_before_diet_check(self):
        result = SafetyValidator().validate(
            patient=_snapshot(diet=DietType.VEGAN, allergens={Allergen.SOY}),
            recipes=[
                _recipe(name="Tofu Bowl", allergens={Allergen.SOY}, diets={DietType.REGULAR})
            ],
        )
        self.assertFalse(result.is_safe)
        self.assertIn("soy", result.reason.lower())
