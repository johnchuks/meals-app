from django.urls import path

from . import views

urlpatterns = [
    path("trays", views.TrayListView.as_view()),
    path("trays/<uuid:tray_id>", views.TrayDetailView.as_view()),
    path("trays/<uuid:tray_id>/status-history", views.TrayStatusHistoryView.as_view()),
    path("trays/<uuid:tray_id>/start-preparation", views.StartPreparationView.as_view()),
    path("trays/<uuid:tray_id>/validate-accuracy", views.ValidateAccuracyView.as_view()),
    path("trays/<uuid:tray_id>/dispatch", views.DispatchView.as_view()),
    path("trays/<uuid:tray_id>/deliver", views.DeliverView.as_view()),
    path("trays/<uuid:tray_id>/retrieve", views.RetrieveView.as_view()),
]
