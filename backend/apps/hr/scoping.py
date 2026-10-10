"""تقييد نطاق الوصول لوحدة شؤون الموظفين (HR).

مصدر الحقيقة للنطاق هو `organization.OrgAssignment` — وهو نفس المصدر الذي
تقرأه الموديولات التشغيلية عبر `core.utils.scoping` — وليس `User.role`
ولا `EmployeeProfile` ولا حقل قطاع مستقل داخل HR. أي نموذج HR جديد يجب أن
يرث من `EmployeeProfile` وأن يصل إلى `User` عبر مسار `employee_user_field`
كي يستفيد من هذا التقييد دون تكرار منطق النطاق.

قواعد الفشل الآمن (fail-safe):
  - الوطني (superuser أو نطاق GLOBAL نشط)  → لا تقييد.
  - مستخدم بلا أي نطاق قابل للتقييم       → `qs.none()` (يُحجب كل شيء).
  - خطأ في الحقل/الفلترة غير المتوقّع      → `qs.none()` مع تسجيل الاستثناء.

الكتابة محمية أيضاً عبر `HRWriteScopeMixin`، لأن تقييد القائمة وحده لا يمنع
إنشاء سجل لموظف خارج نطاق المستخدم.
"""

import logging

from django.core.exceptions import FieldError

from core.utils.authorization import active_assignments, has_active_global_scope

logger = logging.getLogger(__name__)

# نوع النطاق → مساراتOrgAssignment التي تنتمي إليه.
#
# المسارات هرمية وليست حقلاً واحداً: `OrgAssignment.sector` يبقى NULL في
# الواقع لمن يعيّنون موظفاً في قسم أو محطة داخل قطاع، لأن الإدخال
# يملأ المستوى الأعمق فقط. لو اكتفينا بـ `sector_id` لَلم يرَ مديرُ القطاع
# فريقَ قسمه. لذلك يُفكّ النطاق عبر السلسلة كاملة (أبسط إلى أعمق).
#
# `tests/test_scoping.py::TestScopeLookupsAreValid` يتحقق من صحّة كل مسار
# على مخطط `OrgAssignment`، لأن مساراً خاطئاً يُنتج FieldError فيتحوّل إلى
# حجب كامل صامت.
SCOPE_LOOKUPS = {
    'SECTOR': (
        'sector_id',
        'department__sector_id',
        'station__sector_id',
        'entry_point__sector_id',
        'position__department__sector_id',
    ),
    'DEPARTMENT': (
        'department_id',
        'station__department_id',
        'position__department_id',
    ),
    'STATION': ('station_id',),
    'POINT': ('entry_point_id',),
    'PORT': ('entry_point_id',),
    # `REGION` قطاع إداري لا نقطة دخول. التحقق في
    # `accounts.serializers.RoleAssignmentWriteSerializer._validate_scope_id`
    # يقبل `organization.Sector` لـ `REGION`، و`apps.hr.views` يجمع
    # `ids['SECTOR'] | ids['REGION']` معاً في `sector_ids`. وكان هذا الصف يقرأ
    # `('entry_point_id',)` — فضاء معرّفات مختلف — فلا يطابق أي صف
    # `OrgAssignment` أبداً، فينتهي HR بالحجب الصامت بنتيجة فارغة. لذلك يُحلّ
    # `REGION` تماماً مثل `SECTOR`.
    'REGION': (
        'sector_id',
        'department__sector_id',
        'station__sector_id',
        'entry_point__sector_id',
        'position__department__sector_id',
    ),
}


def is_national_scope(user):
    """هل المستخدم وطني (لا يُقيَّد)؟"""
    if not user or user.is_anonymous:
        return False
    return bool(user.is_superuser or has_active_global_scope(user))


def resolve_hr_scope_keys(user):
    """مفاتيح نطاق المستخدم الشؤوني: مجموعة `(scope_type, scope_id)`.

    تجمع نطاقات تعيينات الأدوار النشطة (`SECTOR`/`DEPARTMENT`/`STATION`/
    `POINT`/`PORT`) مع نطاقات تعييناته الهيكلية نفسها في `OrgAssignment`.

    يعيد:
        `None`  → وطني: بلا تقييد.
        `set()` → بلا أي نطاق: يجب الحجب الكامل.
        مجموعة  → مفاتيح النطاق الفعلية.
    """
    if not user or user.is_anonymous:
        return set()
    if is_national_scope(user):
        return None

    keys = set()
    for a in active_assignments(user).filter(
        scope_type__in=SCOPE_LOOKUPS, scope_id__isnull=False,
    ):
        keys.add((a.scope_type, a.scope_id))

    keys |= resolve_own_org_scope_keys(user)
    return keys


def resolve_own_org_scope_keys(user):
    """مفاتيح نطاق المستخدم نفسه من تعييناته الهيكلية النشطة."""
    from apps.organization.models import OrgAssignment

    try:
        assignments = OrgAssignment.objects.filter(user=user, is_active=True)
    except (FieldError, AttributeError):
        return set()

    keys = set()
    for a in assignments:
        if a.sector_id:
            keys.add(('SECTOR', a.sector_id))
        if a.department_id:
            keys.add(('DEPARTMENT', a.department_id))
        if a.station_id:
            keys.add(('STATION', a.station_id))
        if a.entry_point_id:
            keys.add(('POINT', a.entry_point_id))
    return keys


def _assignments_in_scope(scope_type, scope_id):
    """استعلام `OrgAssignment` لكل الموظفين الذين يقعون في نطاق معيّن.

    يجمع السلسلة الهرمية كاملة (انظر `SCOPE_LOOKUPS`).
    """
    from django.db.models import Q

    from apps.organization.models import OrgAssignment

    paths = SCOPE_LOOKUPS.get(scope_type, ())
    condition = Q(pk__in=[])
    for path in paths:
        condition |= Q(**{path: scope_id})
    return OrgAssignment.objects.filter(condition, is_active=True)


def resolve_visible_employee_user_ids(user):
    """معرّفات `User` للموظفين المرئيين للمستخدم داخل نطاقه.

    الموظف مرئي إذا كان له `OrgAssignment` نشط يطابق أحد مفاتيح نطاق
    المستخدم. النتيجة `None` للوطني (بلا تقييد) و`set()` للفشل الآمن.
    """
    keys = resolve_hr_scope_keys(user)
    if keys is None:
        return None
    if not keys:
        return set()

    visible = set()
    for scope_type, scope_id in keys:
        try:
            visible.update(
                _assignments_in_scope(scope_type, scope_id).values_list('user_id', flat=True)
            )
        except (FieldError, ValueError):
            logger.exception(
                'HR scoping failed to resolve %s=%s for %s - DENYING access',
                scope_type, scope_id, user,
            )
            return set()
    return visible


def user_within_hr_scope(target_user, actor):
    """هل `target_user` ضمن نطاق `actor`؟

    تُستخدم للكتابة: `True` للوطني، و`False` عند غياب أي نطاق (فشل آمن).
    """
    if not target_user or not actor or actor.is_anonymous:
        return False
    if is_national_scope(actor):
        return True
    if target_user.pk == actor.pk:
        return True
    visible = resolve_visible_employee_user_ids(actor)
    if visible is None:
        return True
    return target_user.pk in visible


class HRScopedMixin:
    """يقصّر queryset على الموظفين ضمن نطاق المستخدم الشؤوني.

    السمات:
        employee_user_field: مسار الوصول من النموذج إلى `User`
            (مثل `user` لنموذج `EmployeeProfile`، أو `employee__user`
            للنماذج الفرعية).
    """

    employee_user_field = 'employee__user'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous or user.is_superuser:
            return qs
        visible = resolve_visible_employee_user_ids(user)
        if visible is None:
            return qs
        if not visible:
            return qs.none()
        try:
            return qs.filter(**{f'{self.employee_user_field}__in': list(visible)}).distinct()
        except (FieldError, ValueError):
            logger.exception(
                'HRScopedMixin failed to scope queryset for %s (field=%s) - DENYING access',
                user, self.employee_user_field,
            )
            return qs.none()


class HRWriteScopeMixin:
    """يمنع الكتابة على موظف خارج نطاق المستخدم.

    يُستخدم مع `HRScopedMixin`: التقييد على مستوى القائمة لا يمنع `create`
    لسجل يشير إلى موظف آخر، ولا يمنع تعديل سجلٍّ عبر `retrieve/update`
    إذا تغيّر مرجعه. تستدعي الفئات الفرعية `assert_within_hr_scope(user)`.
    """

    employee_user_field = 'employee__user'

    def _resolve_target_user(self, obj):
        current = obj
        for part in self.employee_user_field.split('__'):
            if current is None:
                return None
            current = getattr(current, part, None)
            if hasattr(current, '_meta'):
                current = getattr(current, 'user', None)
        return current

    def assert_within_hr_scope(self, target_user):
        if user_within_hr_scope(target_user, self.request.user):
            return
        logger.warning(
            'HR write denied: %s attempted to write outside scope (%s)',
            self.request.user, target_user,
        )
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied('لا تملك صلاحية الكتابة خارج نطاقك الإداري')

    def perform_create(self, serializer):
        user = self._resolve_target_user(serializer.validated_data)
        if user is not None:
            self.assert_within_hr_scope(user)
        return super().perform_create(serializer)

class EmployeeProfileViewSetMixin(HRScopedMixin):
    """معزز لـ EmployeeProfileViewSet لالتقاط النفاذ حسب النطاق.

    يرث من HRScopedMixin؛ `employee_user_field` يحدد مسار الوصول إلى User
    من EmployeeProfile.
    """

    employee_user_field = 'user'

