from rest_framework import serializers

from .models import MealRequest


class MealRequestCreateSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    recipe_ids = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )


class MealRequestUpdateSerializer(serializers.Serializer):
    recipe_ids = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )


class MealRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealRequest
        fields = [
            "id",
            "patient_id",
            "status",
            "rejection_reason",
            "finalized_at",
            "created_at",
            "updated_at",
            "recipe_ids",
        ]
