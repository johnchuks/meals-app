from dataclasses import dataclass

from patient.ports import PatientClinicalSnapshot
from recipe.ports import RecipeSafetyData


@dataclass(frozen=True)
class SafetyResult:
    is_safe: bool
    reason: str | None = None


class SafetyValidator:
    """Encapsulates the allergen + diet checks run before finalizing a request."""

    def validate(
        self,
        *,
        patient: PatientClinicalSnapshot,
        recipes: list[RecipeSafetyData],
    ) -> SafetyResult:
        """Returns whether the meal request is safe, and if not, why."""
        for recipe in recipes:
            if patient.allergens.intersection(recipe.allergens):
                return SafetyResult(
                    is_safe=False,
                    reason=f"Patient allergic to {patient.allergens.intersection(recipe.allergens)} in recipe {recipe.name}",
                )
            if patient.diet not in recipe.compatible_diets:
                return SafetyResult(
                    is_safe=False,
                    reason=f"Patient diet {patient.diet} incompatible with recipe {recipe.name}",
                )
        return SafetyResult(is_safe=True)
