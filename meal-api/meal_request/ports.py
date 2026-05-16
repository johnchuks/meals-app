from dataclasses import dataclass
from uuid import UUID

from .models import MealRequest, MealRequestStatus


@dataclass(frozen=True)
class MealRequestSnapshot:
    meal_request_id: UUID
    status: str


class MealRequestNotFound(LookupError):
    pass


class MealRequestReader:
    """Read-only port other contexts use to inspect meal request state.

    Cross-context callers must depend on this port and not on
    meal_request.models.
    """

    def _get_snapshot(self, *, meal_request_id: UUID) -> MealRequestSnapshot:
        try:
            meal_request = MealRequest.objects.only("id", "status").get(pk=meal_request_id)
        except MealRequest.DoesNotExist as exc:
            raise MealRequestNotFound(str(meal_request_id)) from exc
        return MealRequestSnapshot(meal_request_id=meal_request.id, status=meal_request.status)

    def is_finalized(self, *, meal_request_id: UUID) -> bool:
        snapshot = self._get_snapshot(meal_request_id=meal_request_id)
        return snapshot.status == MealRequestStatus.FINALIZED
