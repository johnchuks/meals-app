from rest_framework import serializers

from .models import DietType, Patient, PatientAllergy


class PatientAllergySerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAllergy
        fields = ["id", "allergen", "severity", "recorded_at"]


class PatientAllergyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAllergy
        fields = ["allergen", "severity"]


class PatientSerializer(serializers.ModelSerializer):
    allergies = PatientAllergySerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "date_of_birth",
            "mrn",
            "diet",
            "admitted_at",
            "current_clinical_state",
            "allergies",
        ]


class PatientWriteSerializer(serializers.ModelSerializer):
    admitted_at = serializers.DateTimeField(required=False)

    class Meta:
        model = Patient
        fields = [
            "first_name",
            "last_name",
            "date_of_birth",
            "mrn",
            "diet",
            "admitted_at",
        ]


class PatientDietUpdateSerializer(serializers.Serializer):
    diet = serializers.ChoiceField(choices=DietType.choices)
