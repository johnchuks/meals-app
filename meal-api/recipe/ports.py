from dataclasses import dataclass
from uuid import UUID

from .models import Recipe


@dataclass(frozen=True)
class RecipeSafetyData:
    recipe_id: UUID
    name: str
    allergens: frozenset[str]
    compatible_diets: frozenset[str]


class RecipeDataSnapshotProvider:
    """Port for loading recipe data needed for safety validation."""

    def get_recipe_safety_data(
        self, recipe_ids: list[UUID]
    ) -> list[RecipeSafetyData]:
        """Returns safety data for the recipes that exist.

        Unknown recipe_ids are silently skipped — callers receive results
        only for the recipes that were found.
        """
        recipes = Recipe.objects.filter(pk__in=recipe_ids).prefetch_related(
            "allergens", "diet_compatibility"
        )
        return [
            RecipeSafetyData(
                recipe_id=recipe.id,
                name=recipe.name,
                allergens=frozenset(a.allergen for a in recipe.allergens.all()),
                compatible_diets=frozenset(
                    d.compatible_diet for d in recipe.diet_compatibility.all()
                ),
            )
            for recipe in recipes
        ]
