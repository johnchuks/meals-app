"""Pure-logic unit tests for the tray state machine."""

from django.test import SimpleTestCase

from ..enum import TrayStatus
from ..state_machine import (
    InvalidTransition,
    TIMESTAMP_FIELDS,
    TRANSITIONS,
    assert_can_transition,
    next_status,
)


class NextStatusTests(SimpleTestCase):
    def test_pipeline_advances_one_step_at_a_time(self):
        expected_pipeline = [
            (TrayStatus.CREATED, TrayStatus.PREPARATION_STARTED),
            (TrayStatus.PREPARATION_STARTED, TrayStatus.ACCURACY_VALIDATED),
            (TrayStatus.ACCURACY_VALIDATED, TrayStatus.EN_ROUTE),
            (TrayStatus.EN_ROUTE, TrayStatus.DELIVERED),
            (TrayStatus.DELIVERED, TrayStatus.RETRIEVED),
        ]
        for current, expected_next in expected_pipeline:
            self.assertEqual(next_status(current), expected_next)

    def test_terminal_status_has_no_next(self):
        self.assertIsNone(next_status(TrayStatus.RETRIEVED))


class AssertCanTransitionTests(SimpleTestCase):
    def test_allows_legal_next_status(self):
        assert_can_transition(TrayStatus.CREATED, TrayStatus.PREPARATION_STARTED)

    def test_rejects_skipping_a_step(self):
        with self.assertRaises(InvalidTransition) as ctx:
            assert_can_transition(TrayStatus.CREATED, TrayStatus.EN_ROUTE)
        self.assertEqual(ctx.exception.current, TrayStatus.CREATED)
        self.assertEqual(ctx.exception.attempted, TrayStatus.EN_ROUTE)

    def test_rejects_going_backwards(self):
        with self.assertRaises(InvalidTransition):
            assert_can_transition(TrayStatus.EN_ROUTE, TrayStatus.PREPARATION_STARTED)

    def test_rejects_self_transition(self):
        with self.assertRaises(InvalidTransition):
            assert_can_transition(TrayStatus.CREATED, TrayStatus.CREATED)

    def test_rejects_any_transition_from_terminal_status(self):
        with self.assertRaises(InvalidTransition):
            assert_can_transition(TrayStatus.RETRIEVED, TrayStatus.DELIVERED)


class TransitionTableShapeTests(SimpleTestCase):
    def test_every_non_terminal_status_has_a_timestamp_field(self):
        for resulting_status in TRANSITIONS.values():
            self.assertIn(resulting_status, TIMESTAMP_FIELDS)

    def test_created_has_no_timestamp_field_because_it_is_the_origin(self):
        self.assertNotIn(TrayStatus.CREATED, TIMESTAMP_FIELDS)
