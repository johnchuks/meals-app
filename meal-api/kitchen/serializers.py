from rest_framework import serializers

from .models import Tray, TrayStatusHistory


class TrayStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TrayStatusHistory
        fields = ["from_status", "to_status", "transitioned_at"]


class TraySerializer(serializers.ModelSerializer):
    class Meta:
        model = Tray
        fields = [
            "id",
            "meal_request_id",
            "status",
            "created_at",
            "preparation_started_at",
            "accuracy_validated_at",
            "en_route_at",
            "delivered_at",
            "retrieved_at",
        ]
