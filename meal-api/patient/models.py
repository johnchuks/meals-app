import uuid

from django.db import models
from django.utils import timezone


class DietType(models.TextChoices):
    REGULAR = "REGULAR"
    LOW_SODIUM = "LOW_SODIUM"
    DIABETIC = "DIABETIC"
    LOW_FAT = "LOW_FAT"
    VEGAN = "VEGAN"


class ClinicalState(models.TextChoices):
    ADMITTED = "ADMITTED"
    IN_TREATMENT = "IN_TREATMENT"
    OBSERVATION = "OBSERVATION"
    DISCHARGED = "DISCHARGED"


class Allergen(models.TextChoices):
    """Controlled vocabulary for food allergens. Used by both patient
    allergy records and recipe ingredient flags so the safety validator
    can compare them as exact set members."""

    MILK = "MILK"
    EGGS = "EGGS"
    FISH = "FISH"
    SHELLFISH = "SHELLFISH"
    TREE_NUTS = "TREE_NUTS"
    PEANUTS = "PEANUTS"
    WHEAT = "WHEAT"
    SOY = "SOY"
    SESAME = "SESAME"
    DAIRY = "DAIRY"
    GLUTEN = "GLUTEN"
    NUTS = "NUTS"


class Patient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    mrn = models.CharField(max_length=50, unique=True)
    diet = models.CharField(
        max_length=20, choices=DietType.choices, default=DietType.REGULAR
    )
    admitted_at = models.DateTimeField(default=timezone.now)
    current_clinical_state = models.CharField(
        max_length=20,
        choices=ClinicalState.choices,
        default=ClinicalState.ADMITTED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patients"


class PatientAllergy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="allergies"
    )
    allergen = models.CharField(max_length=20, choices=Allergen.choices)
    severity = models.CharField(max_length=20, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "patient_allergies"
        unique_together = [("patient", "allergen")]
