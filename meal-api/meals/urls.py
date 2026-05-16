from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("user.urls")),
    path("", include("patient.urls")),
    path("", include("recipe.urls")),
    path("", include("meal_request.urls")),
    path("", include("kitchen.urls")),
]
