from django.urls import path

from . import views

urlpatterns = [
    path("patients", views.PatientListCreateView.as_view()),
    path("patients/<uuid:patient_id>", views.PatientDetailView.as_view()),
    path("patients/<uuid:patient_id>/diet", views.PatientDietView.as_view()),
    path(
        "patients/<uuid:patient_id>/allergies",
        views.PatientAllergyListCreateView.as_view(),
    ),
    path(
        "patients/<uuid:patient_id>/allergies/<uuid:allergy_id>",
        views.PatientAllergyDetailView.as_view(),
    ),
]
