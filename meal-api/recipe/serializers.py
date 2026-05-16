from rest_framework import serializers

from .models import Recipe


class RecipeSerializer(serializers.ModelSerializer):
    allergens = serializers.SerializerMethodField()
    compatible_diets = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            "id",
            "name",
            "description",
            "active",
            "created_at",
            "allergens",
            "compatible_diets",
        ]

    def get_allergens(self, obj: Recipe) -> list[str]:
        return [a.allergen for a in obj.allergens.all()]

    def get_compatible_diets(self, obj: Recipe) -> list[str]:
        return [d.compatible_diet for d in obj.diet_compatibility.all()]
