from django.urls import path

from . import views

urlpatterns = [
    path("meal-requests", views.MealRequestCreateView.as_view()),
    path(
        "meal-requests/<uuid:meal_request_id>",
        views.MealRequestDetailView.as_view(),
    ),
    path(
        "meal-requests/<uuid:meal_request_id>/finalize",
        views.MealRequestFinalizeView.as_view(),
    ),
]
