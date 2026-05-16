"""Factory helpers for building DB rows in tests.

Kept dependency-light: just direct ORM constructors. No third-party
factory libraries; the surface is small enough to read inline.
"""

from datetime import date
from uuid import UUID

from django.contrib.auth import get_user_model

from kitchen.enum import TrayStatus
from kitchen.models import Tray, TrayStatusHistory
from meal_request.models import MealRequest, MealRequestStatus
from patient.models import DietType, Patient, PatientAllergy
from recipe.models import Recipe, RecipeAllergen, RecipeDietCompatibility
from user.enum import UserRole

User = get_user_model()


def make_user(
    *,
    username: str = "alice",
    role: str = UserRole.DIETARY_STAFF,
    password: str = "password123",
    is_superuser: bool = False,
):
    user = User(username=username, role=role)
    user.set_password(password)
    if is_superuser:
        user.is_superuser = True
        user.is_staff = True
    user.save()
    return user


def make_patient(
    *,
    first_name: str = "Jane",
    last_name: str = "Doe",
    mrn: str = "MRN-0001",
    diet: str = DietType.REGULAR,
    date_of_birth: date = date(1990, 1, 1),
) -> Patient:
    return Patient.objects.create(
        first_name=first_name,
        last_name=last_name,
        mrn=mrn,
        diet=diet,
        date_of_birth=date_of_birth,
    )


def add_allergy_to_patient(
    patient: Patient, *, allergen: str, severity: str | None = None
) -> PatientAllergy:
    return PatientAllergy.objects.create(
        patient=patient, allergen=allergen, severity=severity
    )


def make_recipe(
    *,
    name: str = "Garden Salad",
    allergens: list[str] | None = None,
    compatible_diets: list[str] | None = None,
    active: bool = True,
) -> Recipe:
    recipe = Recipe.objects.create(name=name, active=active)
    for allergen in allergens or []:
        RecipeAllergen.objects.create(recipe=recipe, allergen=allergen)
    for diet in compatible_diets or [DietType.REGULAR]:
        RecipeDietCompatibility.objects.create(recipe=recipe, compatible_diet=diet)
    return recipe


def make_draft_meal_request(*, patient_id: UUID, recipe_ids: list[UUID]) -> MealRequest:
    return MealRequest.objects.create(
        patient_id=patient_id,
        recipe_ids=recipe_ids,
        status=MealRequestStatus.DRAFT,
    )


def make_tray_at_status(*, meal_request_id: UUID, status: str = TrayStatus.CREATED) -> Tray:
    tray = Tray.objects.create(meal_request_id=meal_request_id, status=status)
    TrayStatusHistory.objects.create(tray=tray, from_status=None, to_status=status)
    return tray
