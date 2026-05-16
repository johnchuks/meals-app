from django.core.management.base import BaseCommand

from recipe.models import Recipe
from recipe.services import RecipeService

RECIPES = [
    {
        "name": "Grilled Chicken with Vegetables",
        "description": "Lean protein with steamed seasonal vegetables.",
        "allergens": ["NUTS"],
        "compatible_diets": ["REGULAR", "LOW_SODIUM", "LOW_FAT", "DIABETIC"],
    },
    {
        "name": "Shrimp Stir Fry",
        "description": "Shrimp with vegetables over rice.",
        "allergens": ["SHELLFISH"],
        "compatible_diets": ["REGULAR"],
    },
    {
        "name": "Pureed Vegetable Soup",
        "description": "Smooth pureed mixed vegetables.",
        "allergens": [],
        "compatible_diets": ["REGULAR", "PUREED", "LOW_SODIUM", "FULL_LIQUID"],
    },
    {
        "name": "Pasta Primavera",
        "description": "Pasta with seasonal vegetables in a light cream sauce.",
        "allergens": ["GLUTEN", "DAIRY"],
        "compatible_diets": ["REGULAR"],
    },
    {
        "name": "Chicken Broth",
        "description": "Clear chicken broth.",
        "allergens": [],
        "compatible_diets": [
            "REGULAR",
            "CLEAR_LIQUID",
            "FULL_LIQUID",
            "LOW_SODIUM",
            "LOW_FAT",
        ],
    },
    {
        "name": "Garden Salad with Grilled Chicken",
        "description": "Mixed greens with grilled chicken.",
        "allergens": ["NUTS"],
        "compatible_diets": ["REGULAR", "DIABETIC", "LOW_FAT"],
    },
]


class Command(BaseCommand):
    help = "Idempotently seed the recipe catalog with demo data."

    def handle(self, *args, **options) -> None:
        service = RecipeService()
        for r in RECIPES:
            if Recipe.objects.filter(name=r["name"]).exists():
                self.stdout.write(f"skip (exists): {r['name']}")
                continue
            service.create(**r)
            self.stdout.write(self.style.SUCCESS(f"created: {r['name']}"))
