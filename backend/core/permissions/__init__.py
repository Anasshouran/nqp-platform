import logging

from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class AdminOrPermissionAction(BasePermission):
    """بوابة إدارة موحّدة: هيئة إدارة (is_staff/superuser) أو صلاحية `resource:action` دقيقة.

    تحافظ على سلوك `IsAdmin` الحالي (لا انكسار لمسؤولي is_staff)، وتضيف بوابة
    دقيقة لأصحاب الأدوار غير الموظفين عبر خريطة إجراءات DRF:
    list/retrieve→`view`, create→`add`, update/partial_update→`edit`, destroy→`delete`.
    خريط إجراءات مخصصة عبر `action_permission_map` على الـ viewset،
    والمورد عبر `permission_resource`.
    """

    default_action_map = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'add',
        'update': 'edit',
        'partial_update': 'edit',
        'destroy': 'delete',
    }

    resource = None

    @staticmethod
    def _resolve_action(view, action):
        custom = getattr(view, 'action_permission_map', {})
        if action in custom:
            return custom[action]
        return AdminOrPermissionAction.default_action_map.get(action, 'view')

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        resource = self.resource or getattr(view, 'permission_resource', None)
        if not resource:
            return True
        action = self._resolve_action(view, view.action)
        return request.user.can(f'{resource}:{action}')

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        resource = self.resource or getattr(view, 'permission_resource', None)
        if not resource:
            return True
        action = self._resolve_action(view, view.action)
        return request.user.can(f'{resource}:{action}')


class ActionPermissionMixin:
    """يشتق `permission_action` تلقائياً من إجراء الـ viewset (CRUD أو إجراء مخصص)."""

    permission_resource = None
    action_permission_map = {}
    default_permission_action = 'view'

    def get_permissions(self):
        action = self.action_permission_map.get(self.action, self.default_permission_action)
        self.permission_action = action
        return super().get_permissions()


class PermissionAction(BasePermission):
    def __init__(self, resource=None, action=None):
        self.resource = resource
        self.action = action

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        resource = self.resource or getattr(view, 'permission_resource', None)
        action = self.action or getattr(view, 'permission_action', None)
        if not resource or not action:
            logger.warning(
                'PermissionAction used without resource/action on view %s (%s) - DENYING access',
                view.__class__.__name__, self.action,
            )
            return False
        perm_code = f'{resource}:{action}'
        return request.user.can(perm_code)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        resource = self.resource or getattr(view, 'permission_resource', None)
        action = self.action or getattr(view, 'permission_action', None)
        if not resource or not action:
            logger.warning(
                'PermissionAction used without resource/action (object check) on view %s - DENYING access',
                view.__class__.__name__,
            )
            return False
        perm_code = f'{resource}:{action}'
        if not request.user.can(perm_code):
            return False
        scope_type = getattr(view, 'scope_type', None)
        if scope_type and hasattr(obj, 'get_scoped_queryset'):
            qs = obj.get_scoped_queryset(request.user, resource)
            return qs.filter(pk=obj.pk).exists()
        return True


class ScopeFilter(BasePermission):
    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        resource = getattr(view, 'permission_resource', None)
        if not resource:
            return True
        scopes = request.user.active_scopes(resource)
        if not scopes:
            return True
        scope_field = getattr(view, 'scope_field', None)
        if not scope_field:
            return True
        obj_scope_id = getattr(obj, scope_field, None)
        if obj_scope_id is None:
            return True
        return any(
            s['scope_id'] == obj_scope_id
            for s in scopes
            if s['scope_id'] is not None
        )
