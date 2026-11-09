"""Permissions — السجل التنظيمي (M2).

يستخدم RBAC الموجود: `resource:action` codes.
كل ViewSet يورث من RegistryPermissionMixin ويُعلن permission_resource.
"""

from rest_framework.permissions import BasePermission

from core.utils.scoping import has_global_scope

# أسماء الصلاحيات (resource:action)
REGISTRY_VIEW = "registry:view"
REGISTRY_ADD = "registry:add"
REGISTRY_EDIT = "registry:edit"
MINISTRY_VIEW = "ministry:view"
FACILITY_VIEW = "facility:view"


class RegistryPermissionMixin:
    """يُسنَد إلى ViewSets، يقيِّم permission_resource + action (view/add/edit)."""

    permission_resource = None
    permission_action = None

    def get_permissions(self):
        from core.permissions import PermissionAction

        if self.permission_action is None:
            self.permission_action = {
                "list": "view",
                "retrieve": "view",
                "create": "add",
                "update": "edit",
                "partial_update": "edit",
                "destroy": "delete",
            }.get(self.action, "view")
        return [PermissionAction()]


class IsRegistryGlobal(BasePermission):
    """فقط المستخدم GLOBAL (أو superuser) يملك حق الكتابة."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        return has_global_scope(user)
