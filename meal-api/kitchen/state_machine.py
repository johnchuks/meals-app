from .enum import TrayStatus

# Linear lifecycle: no skipping, no going backwards.
TRANSITIONS: dict[str, str] = {
    TrayStatus.CREATED: TrayStatus.PREPARATION_STARTED,
    TrayStatus.PREPARATION_STARTED: TrayStatus.ACCURACY_VALIDATED,
    TrayStatus.ACCURACY_VALIDATED: TrayStatus.EN_ROUTE,
    TrayStatus.EN_ROUTE: TrayStatus.DELIVERED,
    TrayStatus.DELIVERED: TrayStatus.RETRIEVED,
}

TIMESTAMP_FIELDS: dict[str, str] = {
    TrayStatus.PREPARATION_STARTED: "preparation_started_at",
    TrayStatus.ACCURACY_VALIDATED: "accuracy_validated_at",
    TrayStatus.EN_ROUTE: "en_route_at",
    TrayStatus.DELIVERED: "delivered_at",
    TrayStatus.RETRIEVED: "retrieved_at",
}


class InvalidTransition(Exception):
    def __init__(self, current: str, attempted: str) -> None:
        super().__init__(f"cannot transition from {current} to {attempted}")
        self.current = current
        self.attempted = attempted


def next_status(current: str) -> str | None:
    return TRANSITIONS.get(current)


def assert_can_transition(current: str, target: str) -> None:
    if next_status(current) != target:
        raise InvalidTransition(current, target)
