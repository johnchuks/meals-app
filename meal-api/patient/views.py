from django.db import IntegrityError
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared import security
from shared.decorators import pre_authorize

from .models import Patient, PatientAllergy
from .serializers import (
    PatientAllergySerializer,
    PatientAllergyWriteSerializer,
    PatientDietUpdateSerializer,
    PatientSerializer,
    PatientWriteSerializer,
)
from .services import PatientService


class PatientListCreateView(APIView):
    @pre_authorize(security.IS_DIETARY_STAFF)
    def get(self, request):
        patients = Patient.objects.prefetch_related("allergies").order_by(
            "-admitted_at"
        )
        return Response(PatientSerializer(patients, many=True).data)

    @pre_authorize(security.IS_DIETARY_STAFF)
    def post(self, request):
        write = PatientWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        try:
            patient = PatientService().admit(**write.validated_data)
        except IntegrityError:
            return Response(
                {"detail": "patient with this MRN already exists"},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            PatientSerializer(patient).data, status=status.HTTP_201_CREATED
        )


class PatientDetailView(generics.RetrieveAPIView):
    queryset = Patient.objects.prefetch_related("allergies")
    serializer_class = PatientSerializer
    lookup_url_kwarg = "patient_id"

    @pre_authorize(security.IS_DIETARY_STAFF, security.IS_KITCHEN_STAFF)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class PatientDietView(APIView):
    @pre_authorize(security.IS_DIETARY_STAFF)
    def patch(self, request, patient_id):
        serializer = PatientDietUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            patient = PatientService().update_diet(
                patient_id=patient_id, diet=serializer.validated_data["diet"]
            )
        except Patient.DoesNotExist:
            return Response(
                {"detail": "patient not found"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(PatientSerializer(patient).data)


class PatientAllergyListCreateView(APIView):
    @pre_authorize(security.IS_DIETARY_STAFF)
    def post(self, request, patient_id):
        serializer = PatientAllergyWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            allergy = PatientService().add_allergy(
                patient_id=patient_id, **serializer.validated_data
            )
        except Patient.DoesNotExist:
            return Response(
                {"detail": "patient not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except IntegrityError:
            return Response(
                {"detail": "allergy already recorded for this patient"},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            PatientAllergySerializer(allergy).data, status=status.HTTP_201_CREATED
        )


class PatientAllergyDetailView(APIView):
    @pre_authorize(security.IS_DIETARY_STAFF)
    def delete(self, request, patient_id, allergy_id):
        try:
            PatientService().remove_allergy(
                patient_id=patient_id, allergy_id=allergy_id
            )
        except PatientAllergy.DoesNotExist:
            return Response(
                {"detail": "allergy not found"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
