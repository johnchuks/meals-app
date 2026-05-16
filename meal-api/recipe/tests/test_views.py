"""API tests for recipe endpoints."""

from uuid import uuid4

from django.test import TestCase

from patient.models import Allergen, DietType
from shared.tests.api_client import authed_client, unauthenticated_client
from shared.tests.factories import make_recipe
from user.enum import UserRole


class RecipeListViewTests(TestCase):
    def test_requires_authentication(self):
        response = unauthenticated_client().get("/recipes")
        self.assertEqual(response.status_code, 401)

    def test_lists_active_recipes_with_allergens_and_compatible_diets(self):
        make_recipe(
            name="Stew",
            allergens=[Allergen.MILK],
            compatible_diets=[DietType.REGULAR, DietType.LOW_SODIUM],
        )
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.get("/recipes")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["name"], "Stew")
        self.assertIn(Allergen.MILK, body[0]["allergens"])
        self.assertIn(DietType.LOW_SODIUM, body[0]["compatible_diets"])

    def test_active_filter_excludes_inactive_recipes(self):
        make_recipe(name="ActiveOne", active=True)
        make_recipe(name="InactiveOne", active=False)
        client = authed_client(role=UserRole.KITCHEN_STAFF)

        response = client.get("/recipes?active=true")

        names = [row["name"] for row in response.json()]
        self.assertIn("ActiveOne", names)
        self.assertNotIn("InactiveOne", names)

    def test_404_for_unknown_recipe(self):
        client = authed_client(role=UserRole.DIETARY_STAFF)
        response = client.get(f"/recipes/{uuid4()}")
        self.assertEqual(response.status_code, 404)
