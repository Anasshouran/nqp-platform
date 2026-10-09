import logging

from rest_framework.permissions import BasePermission

from core.utils.authorization import has_active_global_scope

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
        """خريطة أمان فاشلة (fail-closed): أي إجراء غير معروف لا يُصرّح به."""
        custom = getattr(view, 'action_permission_map', {})
        if action in custom:
            return custom[action]
        return AdminOrPermissionAction.default_action_map.get(action)

    def _enforce(self, request, view):
        """تقييم صريح (فاشل-آمن): عدم وجود مورد أو عدم تعيين إجراء يمنع الوصول."""
        if request.user.is_superuser or request.user.is_staff:
            return True
        resource = self.resource or getattr(view, 'permission_resource', None)
        if not resource:
            logger.warning(
                'AdminOrPermissionAction: view %s lacks permission_resource '
                '(and class resource) - DENYING access for %s',
                view.__class__.__name__, request.user,
            )
            return False
        action = self._resolve_action(view, view.action)
        if not action:
            logger.warning(
                'AdminOrPermissionAction: unmapped action %s on %s - DENYING access for %s',
                view.action, view.__class__.__name__, request.user,
            )
            return False
        return request.user.can(f'{resource}:{action}')

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return self._enforce(request, view)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return self._enforce(request, view)


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
    """يقيد الوصول على مستوى الكائن مقابل نطاقات المستخدم.

    فشل آمن: أي حالة غير قابلة للتقييم (مورد بلا إعداد، أو نطاق بلا حقل
    قابل للمقارنة، أو كائن بلا قيمة نطاق) **تمنع** الوصول بدل الموافقة.
    يُكمل `PermissionAction` الذي يتحقق من الصلاحية على مستوى الطلب.

    ملاحظة: تقييد *القوائم* لا يمكن تحقيقه هنا لأن `has_permission` لا يرى
    الكائنات؛ لذلك تعتمد الـ viewsets على تقييد queryset في `get_queryset`.
    """

    def has_permission(self, request, view):
        return True

    def _get_nested_attr(self, obj, attr_path):
        """الحصول على قيمة حقل علائقي متداخل (مثلاً 'port__entry_point_id').

        يعالج المسارات بالتنسيق Django ORM مع `__`.
        """
        current = obj
        parts = attr_path.split('__')
        for i, part in enumerate(parts):
            if current is None:
                return None
            is_last = (i == len(parts) - 1)
            if is_last:
                id_attr = f'{part}_id'
                val = getattr(current, id_attr, None)
                if val is not None:
                    return val
                return getattr(current, part, None)
            val = getattr(current, part, None)
            if val is None:
                return None
            current = val
        return current

    def _resolve_scope_values(self, obj, attr_path):
        """القيم التي يمكن أن يأخذها `attr_path` على الكائن، كـ set.

        يكمّل :meth:`_get_nested_attr` الذي يتوقف عند أول علاقة متعددة القيم
        (``vessel__visits__port__entry_point_id`` مثلاً: ``vessel.visits`` هي
        RelatedManager لا كائن واحد، فيعيد ``getattr`` قيمة لا معنى للمقارنة بها).

        هنا ننفّذ المسار مع **توزيع** على العلاقات متعددة القيم، فتصبح كل
        نقطة دخول ممكنة للكائن مجموعة قيم. ``set`` فارغة تعني أن النطاق غير
        قابل للحل، ويتعامل معها المستدعي كـ DENY (فشل آمن) لا كـ "غير مقيّد".

        المسارات نفسها لم تتغيّر — هذا يجعل *المسارات المُعلَنة فعلاً* قابلة
        للحل فقط، ولا يخترع مسارات جديدة.
        """
        parts = attr_path.split('__')
        current = [obj]
        for i, part in enumerate(parts):
            is_last = (i == len(parts) - 1)
            nxt = []
            for item in current:
                if item is None:
                    continue
                val = getattr(item, part, None)
                if val is None:
                    continue
                if is_last:
                    id_val = getattr(item, f'{part}_id', None)
                    nxt.append(id_val if id_val is not None else val)
                elif hasattr(val, 'all') and not hasattr(val, 'pk'):
                    # RelatedManager: علاقة متعددة القيم — وسّعها.
                    nxt.extend(val.all())
                else:
                    nxt.append(val)
            current = nxt
            if not current:
                return set()
        return {v for v in current if v is not None}

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        resource = getattr(view, 'permission_resource', None)
        if not resource:
            logger.warning(
                'ScopeFilter: no permission_resource on %s - DENYING object access',
                view.__class__.__name__,
            )
            return False
        # نطاق GLOBAL = غير مقيّد (وهو ما تُرجعه `active_scopes` فارغاً عمداً).
        if has_active_global_scope(user):
            return True
        scopes = user.active_scopes(resource)
        scope_ids = {s['scope_id'] for s in scopes if s['scope_id'] is not None}

        # A company-scoped actor is authorised by *ownership*, not geography.
        # Without this branch a shipping-company member would be denied every
        # object because its EntryPoint id is compared against a Carrier id —
        # two unrelated id spaces.
        company_field = getattr(view, 'company_field', None)
        if company_field:
            company_scope_ids = [
                s['scope_id'] for s in scopes
                if s['scope_type'] == 'COMPANY' and s['scope_id'] is not None
            ]
            if company_scope_ids:
                obj_company_id = self._get_nested_attr(obj, company_field)
                if obj_company_id is not None:
                    return obj_company_id in company_scope_ids
                # fall through to the geographic check below

        # The canonical EntryPoint resolver is the ONLY thing that translates a
        # scope into entry points. Comparing the object's entry point against the
        # *raw* scope ids alone used to deny every actor whose scope was not
        # literally `POINT`/`PORT` (a STATION or DEPARTMENT scope id never
        # equals an EntryPoint id), so the organisation bridge was unreachable
        # at object level.
        #
        # Raw scope ids are still accepted alongside it for views whose
        # `scope_field` is keyed to the assignment's *own* id space (the
        # `organization` viewsets filter by `sector`/`id`), which the canonical
        # resolver deliberately does not speak to.
        from core.utils.scoping import resolve_authorized_entry_points

        canonical_ids = set(resolve_authorized_entry_points(user) or ())

        if not scope_ids and not canonical_ids:
            logger.warning(
                'ScopeFilter: user %s has no scope for resource %s - DENYING object access',
                user, resource,
            )
            return False
        scope_field = getattr(view, 'scope_field', None) or 'port'
        # نحلّ المسار عبر كل خطواته، مع التوزيع على العلاقات متعددة القيم
        # (سفينة تصل إلى نقطة دخول عبر زياراتها). النتيجة الفارغة تعني نطاقاً
        # غير قابل للحل، فترفض تماماً كما كان فرع `None` السابق يرفض.
        obj_scope_values = self._resolve_scope_values(obj, scope_field)
        if not obj_scope_values:
            logger.warning(
                'ScopeFilter: object %s has no resolvable %s value - DENYING object access',
                obj, scope_field,
            )
            return False
        return bool(obj_scope_values & (canonical_ids | set(scope_ids)))
