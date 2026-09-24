"""مساعدات تفويض مركزية (RBAC).

مصدر الحقيقة للتفويض هو تعيينات الأدوار (RoleAssignment) النشطة ضمن النافذة
الزمنية فقط. الحقل القديم ``User.role`` يُحتفظ به كحقل توافق/عرض ولا يُستخدم في
قرارات التفويض.
"""
from django.db.models import Q
from django.utils import timezone

# الموارد الإدارية: منح أدوار تحمل صلاحيات على هذه الموارد محصور بالموظفين/المشرفين
ADMIN_RESOURCES = frozenset({'users', 'roles', 'permissions', 'role_assignments'})

# تسلسل تراتبي لأدوار المختبر (الأعلى = أقوى)
LAB_ROLE_TIERS = {
    'LAB_DIRECTOR': 3,
    'LAB_MANAGER': 2,
    'LAB_COORDINATOR': 1,
    'LAB_RECEPTIONIST': 1,
    'LAB_TECHNICIAN': 1,
}

# أدوار مراجعة تقارير التفتيش الغذائي (توجيه إيجابي لمراجعة التفتيش)
FOOD_REVIEW_ROLES = frozenset({
    'STATION_HEAD', 'SECTOR_HEAD', 'FOOD_DIRECTOR', 'FOOD_CONTROL_MANAGER',
    'FOOD_WINDOW_SUPERVISOR', 'SECTOR_MANAGER',
})


def _moment(now):
    return now if now is not None else timezone.now()


def _active_window(now):
    m = _moment(now)
    return Q(is_active=True, start_date__lte=m) & (
        Q(end_date__isnull=True) | Q(end_date__gt=m)
    )


def active_assignments(user, *, now=None):
    """تعيينات الدور النشطة ضمن النافذة الزمنية — مصدر الحقيقة الوحيد للتفويض."""
    from apps.accounts.models import RoleAssignment

    if user is None or getattr(user, 'is_anonymous', False):
        return RoleAssignment.objects.none()
    return user.role_assignments.filter(_active_window(now))


def has_active_role(user, code, *, now=None):
    """هل يحمل المستخدم الدور المدخول بتعيين نشط ضمن النافذة الزمنية؟"""
    if user is None or getattr(user, 'is_anonymous', False):
        return False
    return active_assignments(user, now=now).filter(role__code=code).exists()


def has_active_global_scope(user, *, now=None):
    """هل تمنح تعيينات المستخدم النشطة تغطية عامة (GLOBAL)؟"""
    if user is None or getattr(user, 'is_anonymous', False):
        return False
    if user.is_superuser:
        return True
    return active_assignments(user, now=now).filter(scope_type='GLOBAL').exists()


def effective_scope_pairs(user, *, now=None):
    """التغطية الفعالة للمستخدم: (هل نطاقه عام؟, مجموعة (type, id) غير العامة)."""
    scopes = set()
    for assignment in active_assignments(user, now=now).exclude(scope_type='GLOBAL'):
        scopes.add((assignment.scope_type, assignment.scope_id))
    return has_active_global_scope(user, now=now), scopes


def is_admin_power_role(role):
    """هل الدور إداري (يحمل صلاحيات على موارد إدارة الهوية)؟"""
    if role is None:
        return False
    return role.permissions.filter(resource__in=ADMIN_RESOURCES).exists()


def check_grant_capability(actor, role, *, scope_type, scope_id, now=None):
    """هل يملك الفاعل صلاحية منحُ هذا الدور في هذا النطاق؟

    يعيد (مَسموح, سببُ الرفض). القواعد:
    - المشرف أو الموظف (is_staff) يمنحان بأي شكل.
    - غير الموظفين لا يمنحون الأدوار الإدارية إطلاقاً.
    - منح GLOBAL يتطلب تغطية عامة نشطة.
    - المنح في نطاق محدد يتطلب أن يكون النطاق ضمن نطاق الفاعل الفعّال.
    - أدوار المختبر تمنح ضمن المستوى الوظيفي للفاعل (قاعدة المستوى).
    - الأدوار الأخرى تمنح فقط إذا كان الفاعل يحمل الدور نفسه بتعيين نشط.
    """
    if actor is None or getattr(actor, 'is_anonymous', False):
        return False, 'المنح يتطلب فاعلاً معتمداً'
    if actor.is_superuser or actor.is_staff:
        return True, ''
    if is_admin_power_role(role):
        return False, 'لا يمكن منح دور إداري (users/roles/permissions/role_assignments) لغير الموظفين'
    global_ok, scopes = effective_scope_pairs(actor, now=now)
    if scope_type == 'GLOBAL':
        if not global_ok:
            return False, 'لا يمكن منح نطاق عام (GLOBAL) بدون تغطية عامة'
    elif (scope_type, scope_id) not in scopes:
        return False, 'النطاق المطلوب خارج نطاق صلاحياتك'
    tier = LAB_ROLE_TIERS.get(role.code, 0)
    if tier:
        max_tier = max(
            (LAB_ROLE_TIERS.get(a.role.code, 0) for a in active_assignments(actor, now=now)),
            default=0,
        )
        if tier > max_tier:
            return False, 'الدور المعملي المطلوب أعلى من صلاحياتك في منح الأدوار'
        return True, ''
    if not has_active_role(actor, role.code, now=now):
        return False, 'ليست لديك صلاحية منح هذا الدور'
    return True, ''