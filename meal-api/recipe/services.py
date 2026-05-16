from django.db import transaction

from patient.models import DietType

from .models import Recipe, RecipeAllergen, RecipeDietCompatibility


class RecipeService:
    @transaction.atomic
    def create(
        self,
        *,
        name: str,
        description: str,
        allergens: list[str],
        compatible_diets: list[DietType],
    ) -> Recipe:
        recipe = Recipe.objects.create(name=name, description=description)
        if allergens:
            RecipeAllergen.objects.bulk_create(
                [RecipeAllergen(recipe=recipe, allergen=a) for a in set(allergens)]
            )
        if compatible_diets:
            RecipeDietCompatibility.objects.bulk_create(
                [
                    RecipeDietCompatibility(recipe=recipe, compatible_diet=d)
                    for d in set(compatible_diets)
                ]
            )
        return recipe
