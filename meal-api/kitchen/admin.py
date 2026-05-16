from django.contrib import admin

from .models import Tray, TrayStatusHistory


class TrayStatusHistoryInline(admin.TabularInline):
    model = TrayStatusHistory
    extra = 0
    readonly_fields = ("from_status", "to_status", "transitioned_at")
    can_delete = False


@admin.register(Tray)
class TrayAdmin(admin.ModelAdmin):
    list_display = ("id", "meal_request_id", "status", "created_at")
    list_filter = ("status",)
    inlines = [TrayStatusHistoryInline]
