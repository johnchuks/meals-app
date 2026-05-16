from dataclasses import dataclass
from uuid import UUID

from .models import Patient


@dataclass(frozen=True)
class PatientClinicalSnapshot:
    patient_id: UUID
    diet: str
    allergens: frozenset[str]


class PatientNotFound(LookupError):
    pass


class PatientClinicalReader:
    """Read-only port other contexts use to load patient state.

    Cross-context callers must depend on this port and not on patient.models.
    """

    def get_snapshot(self, patient_id: UUID) -> PatientClinicalSnapshot:
        try:
            patient = Patient.objects.prefetch_related("allergies").get(pk=patient_id)
        except Patient.DoesNotExist as exc:
            raise PatientNotFound(str(patient_id)) from exc

        return PatientClinicalSnapshot(
            patient_id=patient.id,
            diet=patient.diet,
            allergens=frozenset(a.allergen for a in patient.allergies.all()),
        )
