from uuid import UUID

from django.db import transaction
from django.utils import timezone

from meal_request.ports import MealRequestNotFound, MealRequestReader

from .enum import TrayStatus
from .models import Tray, TrayStatusHistory
from .state_machine import TIMESTAMP_FIELDS, assert_can_transition


class MealRequestNotFinalized(Exception):
    """A tray cannot be created for a meal request that has not been
    finalized. Raised by TrayService.create_for_meal_request."""


class TrayService:
    @transaction.atomic
    def create_for_meal_request(self, *, meal_request_id: UUID) -> Tray:
        """
        Refuses to create a tray for a meal request that isn't FINALIZED.
        This guards the structural invariant (trays only link to finalized
        requests) at the service boundary, on top of the in-process flow
        guarantee from meal_request.services.finalize.
        """
        try:
            if not MealRequestReader().is_finalized(meal_request_id=meal_request_id):
                raise MealRequestNotFinalized(str(meal_request_id))
        except MealRequestNotFound as exc:
            raise MealRequestNotFinalized(str(meal_request_id)) from exc

        tray, created = Tray.objects.get_or_create(meal_request_id=meal_request_id)
        if created:
            TrayStatusHistory.objects.create(
                tray=tray,
                from_status=None,
                to_status=TrayStatus.CREATED,
            )
        return tray

    @transaction.atomic
    def transition(self, *, tray_id: UUID, target_status: TrayStatus) -> Tray:
        """Move a tray to the next state in the linear lifecycle.

        Raises:
            Tray.DoesNotExist: tray_id is unknown.
            InvalidTransition: target_status isn't the legal next state.
        """
        tray = Tray.objects.select_for_update().get(pk=tray_id)

        from_status = tray.status
        assert_can_transition(from_status, target_status)

        timestamp_field = TIMESTAMP_FIELDS[target_status]
        tray.status = target_status
        setattr(tray, timestamp_field, timezone.now())
        tray.save()

        TrayStatusHistory.objects.create(
            tray=tray,
            from_status=from_status,
            to_status=target_status,
        )
        return tray
