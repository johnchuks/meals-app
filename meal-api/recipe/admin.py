from django.contrib import admin, messages

from .models import Recipe, RecipeAllergen, RecipeDietCompatibility


class RecipeAllergenInline(admin.TabularInline):
    model = RecipeAllergen
    extra = 0


class RecipeDietCompatibilityInline(admin.TabularInline):
    model = RecipeDietCompatibility
    extra = 0


@admin.action(description="Deactivate selected recipes")
def deactivate_recipes(modeladmin, request, queryset):
    updated = queryset.update(active=False)
    messages.success(request, f"Deactivated {updated} recipe(s).")

@admin.action(description="Activate selected recipes")
def activate_recipes(modeladmin, request, queryset):
    updated = queryset.update(active=True)
    messages.success(request, f"Activated {updated} recipe(s).")


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("name", "active", "created_at")
    inlines = [RecipeAllergenInline, RecipeDietCompatibilityInline]
    actions = [deactivate_recipes, activate_recipes]

    # Hard-deletion is unsafe: MealRequest.recipe_ids is a UUID array with no
    # FK, so deleting a Recipe leaves dangling references that get silently
    # skipped by safety validation. Soft-deactivate via `active=False` instead.
    def has_delete_permission(self, request, obj=None):
        return False

    def get_actions(self, request):
        actions = super().get_actions(request)
        actions.pop("delete_selected", None)
        return actions
