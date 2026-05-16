import uuid

from django.db import models

from .enum import TrayStatus


class Tray(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Cross-context reference. UNIQUE enforces 1:1 with a meal request.
    meal_request_id = models.UUIDField(unique=True)
    status = models.CharField(
        max_length=30, choices=TrayStatus.choices, default=TrayStatus.CREATED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    preparation_started_at = models.DateTimeField(null=True, blank=True)
    accuracy_validated_at = models.DateTimeField(null=True, blank=True)
    en_route_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    retrieved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "trays"
        indexes = [models.Index(fields=["status"], name="idx_trays_status")]


class TrayStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tray = models.ForeignKey(
        Tray, on_delete=models.CASCADE, related_name="status_history"
    )
    from_status = models.CharField(
        max_length=30, choices=TrayStatus.choices, null=True, blank=True
    )
    to_status = models.CharField(max_length=30, choices=TrayStatus.choices)
    transitioned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tray_status_history"
        indexes = [models.Index(fields=["tray"], name="idx_tray_history_tray")]
