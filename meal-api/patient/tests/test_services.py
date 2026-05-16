"""Service-layer tests for patient/services.py."""

from datetime import date

from django.db import IntegrityError
from django.test import TestCase

from shared.tests.factories import add_allergy_to_patient, make_patient

from ..models import Allergen, DietType, Patient, PatientAllergy
from ..services import PatientService


class PatientServiceAdmitTests(TestCase):
    def test_admit_creates_patient_with_admitted_clinical_state(self):
        patient = PatientService().admit(
            first_name="Ada",
            last_name="Lovelace",
            date_of_birth=date(1815, 12, 10),
            mrn="MRN-100",
            diet=DietType.REGULAR,
        )
        self.assertEqual(patient.current_clinical_state, "ADMITTED")
        self.assertIsNotNone(patient.admitted_at)
        self.assertTrue(Patient.objects.filter(pk=patient.id).exists())

    def test_admit_rejects_duplicate_mrn(self):
        PatientService().admit(
            first_name="A",
            last_name="B",
            date_of_birth=date(2000, 1, 1),
            mrn="DUPE",
            diet=DietType.REGULAR,
        )
        with self.assertRaises(IntegrityError):
            PatientService().admit(
                first_name="C",
                last_name="D",
                date_of_birth=date(2000, 1, 1),
                mrn="DUPE",
                diet=DietType.REGULAR,
            )


class PatientServiceUpdateDietTests(TestCase):
    def test_update_diet_persists_new_diet(self):
        patient = make_patient(diet=DietType.REGULAR)
        updated = PatientService().update_diet(patient_id=patient.id, diet=DietType.VEGAN)
        self.assertEqual(updated.diet, DietType.VEGAN)
        patient.refresh_from_db()
        self.assertEqual(patient.diet, DietType.VEGAN)

    def test_update_diet_raises_when_patient_missing(self):
        from uuid import uuid4

        with self.assertRaises(Patient.DoesNotExist):
            PatientService().update_diet(patient_id=uuid4(), diet=DietType.VEGAN)


class PatientServiceAllergyTests(TestCase):
    def test_add_allergy_creates_record(self):
        patient = make_patient()
        allergy = PatientService().add_allergy(
            patient_id=patient.id, allergen=Allergen.PEANUTS, severity="SEVERE"
        )
        self.assertEqual(allergy.allergen, Allergen.PEANUTS)
        self.assertEqual(allergy.severity, "SEVERE")

    def test_add_allergy_rejects_duplicate_allergen_for_same_patient(self):
        patient = make_patient()
        PatientService().add_allergy(
            patient_id=patient.id, allergen=Allergen.PEANUTS, severity=None
        )
        with self.assertRaises(IntegrityError):
            PatientService().add_allergy(
                patient_id=patient.id, allergen=Allergen.PEANUTS, severity=None
            )

    def test_remove_allergy_deletes_only_target_allergy(self):
        patient = make_patient()
        kept = add_allergy_to_patient(patient, allergen=Allergen.MILK)
        targeted = add_allergy_to_patient(patient, allergen=Allergen.PEANUTS)

        PatientService().remove_allergy(patient_id=patient.id, allergy_id=targeted.id)

        self.assertFalse(PatientAllergy.objects.filter(pk=targeted.id).exists())
        self.assertTrue(PatientAllergy.objects.filter(pk=kept.id).exists())

    def test_remove_allergy_raises_when_target_belongs_to_different_patient(self):
        owning_patient = make_patient(mrn="OWN")
        other_patient = make_patient(mrn="OTHER")
        allergy_on_owner = add_allergy_to_patient(owning_patient, allergen=Allergen.MILK)

        with self.assertRaises(PatientAllergy.DoesNotExist):
            PatientService().remove_allergy(
                patient_id=other_patient.id, allergy_id=allergy_on_owner.id
            )
