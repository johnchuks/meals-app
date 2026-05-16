"""API tests for patient endpoints."""

from uuid import uuid4

from django.test import TestCase

from shared.tests.api_client import authed_client, unauthenticated_client
from shared.tests.factories import add_allergy_to_patient, make_patient
from user.enum import UserRole

from ..models import Allergen, DietType, Patient, PatientAllergy


class PatientListCreateViewTests(TestCase):
    def test_requires_authentication(self):
        response = unauthenticated_client().get("/patients")
        self.assertEqual(response.status_code, 401)

    def test_kitchen_staff_cannot_list_patients(self):
        client = authed_client(role=UserRole.KITCHEN_STAFF)
        response = client.get("/patients")
        self.assertEqual(response.status_code, 403)

    def test_dietary_staff_lists_patients_newest_admitted_first(self):
        first = make_patient(mrn="A", first_name="First")
        second = make_patient(mrn="B", first_name="Second")
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.get("/patients")

        self.assertEqual(response.status_code, 200)
        listed_ids = [row["id"] for row in response.json()]
        self.assertEqual(listed_ids[0], str(second.id))
        self.assertIn(str(first.id), listed_ids)

    def test_admit_patient_returns_201_and_persists_row(self):
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(
            "/patients",
            {
                "first_name": "Grace",
                "last_name": "Hopper",
                "date_of_birth": "1906-12-09",
                "mrn": "MRN-GRACE",
                "diet": DietType.REGULAR,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["first_name"], "Grace")
        self.assertEqual(body["current_clinical_state"], "ADMITTED")
        self.assertTrue(Patient.objects.filter(pk=body["id"]).exists())

    def test_admit_duplicate_mrn_returns_400_with_field_error(self):
        # DRF's ModelSerializer enforces the model's unique=True via a
        # UniqueValidator, so duplicates surface as a 400 validation error
        # rather than reaching the view's IntegrityError handler.
        make_patient(mrn="DUPE")
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(
            "/patients",
            {
                "first_name": "X",
                "last_name": "Y",
                "date_of_birth": "2000-01-01",
                "mrn": "DUPE",
                "diet": DietType.REGULAR,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("mrn", response.json())


class PatientDetailViewTests(TestCase):
    def test_dietary_staff_can_retrieve_patient_with_allergies(self):
        patient = make_patient()
        add_allergy_to_patient(patient, allergen=Allergen.PEANUTS, severity="SEVERE")
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.get(f"/patients/{patient.id}")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], str(patient.id))
        self.assertEqual(len(body["allergies"]), 1)
        self.assertEqual(body["allergies"][0]["allergen"], Allergen.PEANUTS)

    def test_kitchen_staff_can_also_retrieve_patient(self):
        patient = make_patient()
        client = authed_client(role=UserRole.KITCHEN_STAFF)
        response = client.get(f"/patients/{patient.id}")
        self.assertEqual(response.status_code, 200)

    def test_404_for_unknown_id(self):
        client = authed_client(role=UserRole.DIETARY_STAFF)
        response = client.get(f"/patients/{uuid4()}")
        self.assertEqual(response.status_code, 404)


class PatientDietViewTests(TestCase):
    def test_dietary_staff_can_change_diet(self):
        patient = make_patient(diet=DietType.REGULAR)
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.patch(
            f"/patients/{patient.id}/diet",
            {"diet": DietType.VEGAN},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["diet"], DietType.VEGAN)

    def test_returns_400_for_invalid_diet_value(self):
        patient = make_patient()
        client = authed_client(role=UserRole.DIETARY_STAFF)
        response = client.patch(
            f"/patients/{patient.id}/diet",
            {"diet": "NOT_A_DIET"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_returns_404_for_unknown_patient(self):
        client = authed_client(role=UserRole.DIETARY_STAFF)
        response = client.patch(
            f"/patients/{uuid4()}/diet",
            {"diet": DietType.VEGAN},
            format="json",
        )
        self.assertEqual(response.status_code, 404)


class PatientAllergyEndpointTests(TestCase):
    def test_add_allergy_returns_201(self):
        patient = make_patient()
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(
            f"/patients/{patient.id}/allergies",
            {"allergen": Allergen.MILK, "severity": "MILD"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["allergen"], Allergen.MILK)

    def test_add_duplicate_allergy_returns_409(self):
        patient = make_patient()
        add_allergy_to_patient(patient, allergen=Allergen.MILK)
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.post(
            f"/patients/{patient.id}/allergies",
            {"allergen": Allergen.MILK, "severity": None},
            format="json",
        )
        self.assertEqual(response.status_code, 409)

    def test_remove_allergy_returns_204_and_deletes_row(self):
        patient = make_patient()
        allergy = add_allergy_to_patient(patient, allergen=Allergen.MILK)
        client = authed_client(role=UserRole.DIETARY_STAFF)

        response = client.delete(f"/patients/{patient.id}/allergies/{allergy.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(PatientAllergy.objects.filter(pk=allergy.id).exists())

    def test_remove_unknown_allergy_returns_404(self):
        patient = make_patient()
        client = authed_client(role=UserRole.DIETARY_STAFF)
        response = client.delete(f"/patients/{patient.id}/allergies/{uuid4()}")
        self.assertEqual(response.status_code, 404)
