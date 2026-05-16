"""Service-layer tests for kitchen/services.py."""

from uuid import uuid4

from django.test import TestCase

from meal_request.models import MealRequestStatus
from shared.tests.factories import (
    make_draft_meal_request,
    make_patient,
    make_recipe,
    make_tray_at_status,
)

from ..enum import TrayStatus
from ..models import Tray, TrayStatusHistory
from ..services import MealRequestNotFinalized, TrayService
from ..state_machine import InvalidTransition


def _finalized_meal_request_id() -> "UUID":
    patient = make_patient(mrn=f"MRN-{uuid4().hex[:6]}")
    recipe = make_recipe()
    request = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])
    request.status = MealRequestStatus.FINALIZED
    from django.utils import timezone
    request.finalized_at = timezone.now()
    request.save()
    return request.id


class CreateForMealRequestTests(TestCase):
    def test_creates_tray_in_CREATED_with_initial_history_entry(self):
        meal_request_id = _finalized_meal_request_id()

        tray = TrayService().create_for_meal_request(meal_request_id=meal_request_id)

        self.assertEqual(tray.status, TrayStatus.CREATED)
        history = TrayStatusHistory.objects.filter(tray=tray).order_by("transitioned_at")
        self.assertEqual(len(history), 1)
        self.assertIsNone(history[0].from_status)
        self.assertEqual(history[0].to_status, TrayStatus.CREATED)

    def test_is_idempotent_when_called_twice_for_same_meal_request(self):
        meal_request_id = _finalized_meal_request_id()
        first_call = TrayService().create_for_meal_request(meal_request_id=meal_request_id)
        second_call = TrayService().create_for_meal_request(meal_request_id=meal_request_id)
        self.assertEqual(first_call.id, second_call.id)
        self.assertEqual(Tray.objects.filter(meal_request_id=meal_request_id).count(), 1)

    def test_refuses_when_meal_request_is_not_finalized(self):
        patient = make_patient()
        recipe = make_recipe()
        draft = make_draft_meal_request(patient_id=patient.id, recipe_ids=[recipe.id])

        with self.assertRaises(MealRequestNotFinalized):
            TrayService().create_for_meal_request(meal_request_id=draft.id)

    def test_refuses_when_meal_request_does_not_exist(self):
        with self.assertRaises(MealRequestNotFinalized):
            TrayService().create_for_meal_request(meal_request_id=uuid4())


class TransitionTests(TestCase):
    def test_advances_tray_one_step_and_stamps_timestamp(self):
        meal_request_id = _finalized_meal_request_id()
        tray = make_tray_at_status(meal_request_id=meal_request_id)

        updated = TrayService().transition(
            tray_id=tray.id, target_status=TrayStatus.PREPARATION_STARTED
        )

        self.assertEqual(updated.status, TrayStatus.PREPARATION_STARTED)
        self.assertIsNotNone(updated.preparation_started_at)

    def test_appends_history_entry_with_prior_and_new_status(self):
        meal_request_id = _finalized_meal_request_id()
        tray = make_tray_at_status(meal_request_id=meal_request_id)

        TrayService().transition(
            tray_id=tray.id, target_status=TrayStatus.PREPARATION_STARTED
        )

        history = list(
            TrayStatusHistory.objects.filter(tray=tray).order_by("transitioned_at")
        )
        self.assertEqual(len(history), 2)
        self.assertIsNone(history[0].from_status)
        self.assertEqual(history[1].from_status, TrayStatus.CREATED)
        self.assertEqual(history[1].to_status, TrayStatus.PREPARATION_STARTED)

    def test_rejects_illegal_transition(self):
        meal_request_id = _finalized_meal_request_id()
        tray = make_tray_at_status(meal_request_id=meal_request_id)

        with self.assertRaises(InvalidTransition):
            TrayService().transition(
                tray_id=tray.id, target_status=TrayStatus.DELIVERED
            )

    def test_full_pipeline_walks_through_every_status(self):
        meal_request_id = _finalized_meal_request_id()
        tray = make_tray_at_status(meal_request_id=meal_request_id)

        pipeline = [
            TrayStatus.PREPARATION_STARTED,
            TrayStatus.ACCURACY_VALIDATED,
            TrayStatus.EN_ROUTE,
            TrayStatus.DELIVERED,
            TrayStatus.RETRIEVED,
        ]
        for target in pipeline:
            tray = TrayService().transition(tray_id=tray.id, target_status=target)

        self.assertEqual(tray.status, TrayStatus.RETRIEVED)
        for field in (
            "preparation_started_at",
            "accuracy_validated_at",
            "en_route_at",
            "delivered_at",
            "retrieved_at",
        ):
            self.assertIsNotNone(getattr(tray, field), f"{field} should be set")

    def test_raises_when_tray_missing(self):
        with self.assertRaises(Tray.DoesNotExist):
            TrayService().transition(
                tray_id=uuid4(), target_status=TrayStatus.PREPARATION_STARTED
            )
