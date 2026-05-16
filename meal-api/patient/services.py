from datetime import date, datetime
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from .models import ClinicalState, DietType, Patient, PatientAllergy


class PatientService:
    @transaction.atomic
    def admit(
        self,
        *,
        first_name: str,
        last_name: str,
        date_of_birth: date,
        mrn: str,
        diet: DietType,
        admitted_at: datetime | None = None,
    ) -> Patient:
        """Create an admitted patient row.

        Clinical state is always seeded as ADMITTED — transitions happen
        through a separate update path, not on creation.

        Raises IntegrityError if `mrn` is already actively admitted —
        enforced by the partial unique index `idx_patients_active_mrn`.
        """
        return Patient.objects.create(
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            mrn=mrn,
            diet=diet,
            admitted_at=admitted_at or timezone.now(),
            current_clinical_state=ClinicalState.ADMITTED,
        )

    @transaction.atomic
    def update_diet(self, *, patient_id: UUID, diet: DietType) -> Patient:
        """Raises Patient.DoesNotExist if patient_id is unknown."""
        patient = Patient.objects.select_for_update().get(pk=patient_id)
        patient.diet = diet
        patient.save(update_fields=["diet", "updated_at"])
        return patient

    @transaction.atomic
    def add_allergy(
        self,
        *,
        patient_id: UUID,
        allergen: str,
        severity: str | None,
    ) -> PatientAllergy:
        """Raises Patient.DoesNotExist if patient is unknown,
        IntegrityError if the (patient, allergen) pair already exists."""
        patient = Patient.objects.get(pk=patient_id)
        return PatientAllergy.objects.create(
            patient=patient,
            allergen=allergen,
            severity=severity,
        )

    @transaction.atomic
    def remove_allergy(self, *, patient_id: UUID, allergy_id: UUID) -> None:
        """Raises PatientAllergy.DoesNotExist if no such allergy is recorded
        for this patient."""
        deleted, _ = PatientAllergy.objects.filter(
            patient_id=patient_id, id=allergy_id
        ).delete()
        if not deleted:
            raise PatientAllergy.DoesNotExist(str(allergy_id))
