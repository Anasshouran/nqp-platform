"""صلاحيات نظام صحة المعابر البرية.

`core.permissions.ScopeFilter` يقرأ النطاق من الكائن عبر
`getattr(obj, f'{scope_field}_id')`، أي مسار علائقي **بمستوى واحد فقط**
(مثل `port_id`). مسارات هذا الموديول متعدّدة المستويات:

    crossing__entry_point            → HealthDeclaration
    vehicle__crossing__entry_point   → VehicleInspection
    tracing_case__crossing__entry_point → Contact

بلا معالجة للمسار المتعدد، `getattr` يعيد `None` فيُرفض كل طلب على مستوى
الكائن (retrieve / update / delete) حتى لمستخدم داخل نطاقه. لذلك نضيف
`MultiHopScopeFilter` الذي يقطع المسار على `__`، ويحافظ على الفشل الآمن
نفسه: أي مسار غير قابل للحل ⇒ منع.

النطاق الجغرافي نفسه يأتي من `core.utils.scoping.resolve_authorized_entry_points`
— وهو المحلّ المعتمد الوحيد الذي تستخدمه queryset و`ScopeFilter` معاً — فلا
يوجد نظام تفويض خاص بهذا الموديول ولا استثناء له.
"""
import logging

from core.permissions import ScopeFilter

logger = logging.getLogger(__name__)


def resolve_scope_id(obj, path):
    """يحلّ `path` (مثل `crossing__entry_point`) إلى معرّف نقطة الدخول.

    يمشي على **الكائنات** في كل القفزات الوسيطة، ثم يقرأ `_id` في القفزة
    الأخيرة فقط. (البدء بـ `_id` ثم مواصلةWalking يوقف عند UUID، لأن
    القفزة التالية تحتاج كائناً لا معرّفاً.)

    يعيد `None` عند أي تعذّر — والفشل آمن في `MultiHopScopeFilter`.
    """
    if not path:
        return None

    parts = path.split('__')
    current = obj
    for index, part in enumerate(parts):
        if not hasattr(current, '_meta'):
            logger.warning(
                'resolve_scope_id: %r hit non-model %r while walking %r',
                part, type(current).__name__, path,
            )
            return None

        if part not in {f.name for f in current._meta.get_fields()} and not hasattr(
            current, part
        ):
            logger.warning(
                'resolve_scope_id: %r not resolvable on %s while walking %r',
                part, type(current).__name__, path,
            )
            return None

        value = getattr(current, part)
        if value is None:
            logger.warning(
                'resolve_scope_id: %r is None on %s while walking %r',
                part, type(current).__name__, path,
            )
            return None

        last = index == len(parts) - 1
        if last:
            # القفزة الأخيرة: أعد المعرّف لا الكائن.
            return getattr(current, f'{part}_id', value)
        current = value

    return None


class MultiHopScopeFilter(ScopeFilter):
    """نفس سياسة `ScopeFilter` مع دعم المسارات العلائقية متعددة المستويات.

    النطاق يقارن دائماً مع `core.utils.scoping.resolve_authorized_entry_points`
    — المحلّ المعتمد الوحيد — فلم يعد يقتصر على المعرّفات الخام للتعيينات
    المباشرة. عملياً كان الفرق حاسماً: معرّف `STATION` أو `DEPARTMENT` لا يمكن
    أن يساوي معرّف نقطة دخول، فكان ضابط مُعيَّن عبر
    `OrgAssignment.entry_point` يُرفض على مستوى الكائن رغم أنه مُدرج في
    القائمة.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        from core.utils.authorization import has_active_global_scope

        if has_active_global_scope(user):
            return True

        #PermissionAction يتحقق من `resource:action`؛ نحن نتحقق من النطاق فقط.
        from core.utils.scoping import resolve_authorized_entry_points

        canonical_ids = set(resolve_authorized_entry_points(user) or ())
        if not canonical_ids:
            logger.warning(
                'MultiHopScopeFilter: user %s has no resolvable entry-point scope '
                'for %s - DENYING object access',
                user, getattr(view, 'permission_resource', ''),
            )
            return False

        path = getattr(view, 'scope_field', None) or 'entry_point'
        obj_scope_id = resolve_scope_id(obj, path)
        if obj_scope_id is None:
            logger.warning(
                'MultiHopScopeFilter: %s has no resolvable %r - DENYING object access',
                type(obj).__name__, path,
            )
            return False
        return obj_scope_id in canonical_ids
