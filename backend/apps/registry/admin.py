from django.contrib import admin

from apps.registry.models import (
    HealthFacilityNodeAssignment,
    LocalityNodeAssignment,
    RegistryChangeLog,
    ReportingNode,
    StateMinistry,
    StateNodeAssignment,
)


@admin.register(ReportingNode)
class ReportingNodeAdmin(admin.ModelAdmin):
    list_display = ("code", "name_ar", "kind", "path", "depth", "parent", "is_active")
    list_filter = ("kind", "is_active")
    search_fields = ("code", "name_ar", "name_en")
    ordering = ("order", "code")
    readonly_fields = ("path", "depth", "created_at", "updated_at")


@admin.register(StateNodeAssignment)
class StateNodeAssignmentAdmin(admin.ModelAdmin):
    list_display = ("state", "node", "valid_from", "valid_to", "is_primary")
    list_filter = ("is_primary",)
    search_fields = ("state__code", "node__code")
    ordering = ("-valid_from",)


@admin.register(LocalityNodeAssignment)
class LocalityNodeAssignmentAdmin(admin.ModelAdmin):
    list_display = ("locality", "node", "valid_from", "valid_to", "is_primary")
    list_filter = ("is_primary",)
    search_fields = ("locality__code", "node__code")
    ordering = ("-valid_from",)


@admin.register(HealthFacilityNodeAssignment)
class HealthFacilityNodeAssignmentAdmin(admin.ModelAdmin):
    list_display = ("facility", "node", "valid_from", "valid_to", "is_primary")
    list_filter = ("is_primary",)
    search_fields = ("facility__code", "node__code")
    ordering = ("-valid_from",)


@admin.register(StateMinistry)
class StateMinistryAdmin(admin.ModelAdmin):
    list_display = ("ministry_name_ar", "state", "phone", "email", "is_active")
    list_filter = ("is_active",)
    search_fields = ("ministry_name_ar", "state__code")


@admin.register(RegistryChangeLog)
class RegistryChangeLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity_type", "entity_label", "user", "created_at")
    list_filter = ("action", "entity_type")
    search_fields = ("entity_label", "entity_type")
    ordering = ("-created_at",)
    readonly_fields = (
        "user", "action", "entity_type", "entity_id",
        "entity_label", "detail", "ip_address", "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
