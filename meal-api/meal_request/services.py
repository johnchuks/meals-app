from uuid import UUID

from django.db import transaction
from django.utils import timezone

from kitchen.services import TrayService
from patient.ports import PatientClinicalReader, PatientNotFound
from recipe.ports import RecipeDataSnapshotProvider

from .models import MealRequest, MealRequestStatus
from .safety_validator import SafetyValidator


class InvalidMealRequestState(Exception):
    """Raised when an operation is attempted on a meal request in the wrong status."""


class MealRequestService:
    @transaction.atomic
    def create_draft(
        self, *, patient_id: UUID, recipe_ids: list[UUID]
    ) -> MealRequest:
        return MealRequest.objects.create(
            patient_id=patient_id,
            status=MealRequestStatus.DRAFT,
            recipe_ids=_dedupe(recipe_ids),
        )

    @transaction.atomic
    def set_recipes(
        self, *, meal_request_id: UUID, recipe_ids: list[UUID]
    ) -> MealRequest:
        meal_request = MealRequest.objects.select_for_update().get(pk=meal_request_id)
        if meal_request.status != MealRequestStatus.DRAFT:
            raise InvalidMealRequestState(
                f"cannot modify recipes on meal request in {meal_request.status} status"
            )
        meal_request.recipe_ids = _dedupe(recipe_ids)
        meal_request.save()
        return meal_request

    @transaction.atomic
    def finalize(self, *, meal_request_id: UUID) -> MealRequest:
        """Run safety check, then either finalize and create the tray, or reject."""
        meal_request = MealRequest.objects.select_for_update().get(pk=meal_request_id)

        if meal_request.status != MealRequestStatus.DRAFT:
            raise InvalidMealRequestState(
                f"meal request is in {meal_request.status} status; "
                "only DRAFT can be finalized"
            )

        try:
            patient = PatientClinicalReader().get_snapshot(meal_request.patient_id)
        except PatientNotFound:
            return self._reject(meal_request, reason="patient not found")

        recipe_safety_data = RecipeDataSnapshotProvider().get_recipe_safety_data(
            meal_request.recipe_ids
        )

        safety_result = SafetyValidator().validate(
            patient=patient,
            recipes=recipe_safety_data,
        )

        if not safety_result.is_safe:
            return self._reject(meal_request, reason=safety_result.reason)

        meal_request.status = MealRequestStatus.FINALIZED
        meal_request.finalized_at = timezone.now()
        meal_request.save()
        TrayService().create_for_meal_request(meal_request_id=meal_request.id)
        return meal_request

    def _reject(self, meal_request: MealRequest, *, reason: str) -> MealRequest:
        meal_request.status = MealRequestStatus.REJECTED
        meal_request.rejection_reason = reason
        meal_request.save()
        return meal_request


def _dedupe(recipe_ids: list[UUID]) -> list[UUID]:
    """Remove duplicates while preserving the input order."""
    return list(dict.fromkeys(recipe_ids))
