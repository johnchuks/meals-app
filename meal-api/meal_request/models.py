import uuid

from django.contrib.postgres.fields import ArrayField
from django.db import models


class MealRequestStatus(models.TextChoices):
    DRAFT = "DRAFT"
    FINALIZED = "FINALIZED"
    REJECTED = "REJECTED"


class MealRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Cross-context reference: stored as plain UUID, not FK. See ARCHITECTURE.md.
    patient_id = models.UUIDField()
    # Cross-context references: plain UUIDs in a Postgres array.
    recipe_ids = ArrayField(models.UUIDField(), default=list, blank=True)
    status = models.CharField(
        max_length=20,
        choices=MealRequestStatus.choices,
        default=MealRequestStatus.DRAFT,
    )
    rejection_reason = models.TextField(null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "meal_requests"
        indexes = [
            models.Index(fields=["patient_id"], name="idx_meal_requests_patient"),
            models.Index(fields=["status"], name="idx_meal_requests_status"),
        ]
        constraints = [
            models.CheckConstraint(
                name="meal_requests_finalized_has_timestamp",
                check=(
                    models.Q(status="FINALIZED", finalized_at__isnull=False)
                    | ~models.Q(status="FINALIZED")
                ),
            )
        ]
