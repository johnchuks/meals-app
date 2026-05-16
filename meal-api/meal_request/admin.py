from django.contrib import admin

from .models import MealRequest


@admin.register(MealRequest)
class MealRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "patient_id", "status", "finalized_at")
    list_filter = ("status",)
    readonly_fields = ("recipe_ids",)
