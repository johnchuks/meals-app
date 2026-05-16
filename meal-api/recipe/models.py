import uuid

from django.db import models

from patient.models import Allergen, DietType


class Recipe(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recipes"


class RecipeAllergen(models.Model):
    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name="allergens"
    )
    allergen = models.CharField(max_length=20, choices=Allergen.choices)

    class Meta:
        db_table = "recipe_allergens"
        unique_together = [("recipe", "allergen")]


class RecipeDietCompatibility(models.Model):
    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name="diet_compatibility"
    )
    compatible_diet = models.CharField(max_length=20, choices=DietType.choices)

    class Meta:
        db_table = "recipe_diet_compatibility"
        unique_together = [("recipe", "compatible_diet")]
