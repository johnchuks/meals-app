from django.contrib import admin

from .models import Patient, PatientAllergy


class PatientAllergyInline(admin.TabularInline):
    model = PatientAllergy
    extra = 0


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("mrn", "last_name", "first_name", "diet")
    search_fields = ("mrn", "last_name", "first_name")
    inlines = [PatientAllergyInline]
