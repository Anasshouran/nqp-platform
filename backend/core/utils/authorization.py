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

# ---------------------------------------------------------------------------
# مرادفات أسماء الصلاحيات
# ---------------------------------------------------------------------------
# نظام الصلاحيات في المنصة يقني بحكم `resource:action` (مثل `who_integration:view`).
# المتطلبات تُصاغ أحياناً بأسماء «تجارية» مفصولة بنقاط
# (`who.integration.view`). هذه الخريطة تربط الاسم المطلوب برمزه القائم
# بدل إنشاء أذونات موازية، فلا يتضاعف سطح الصلاحيات ولا تُكسر المنح القائمة.
#
# قيمة مفردة  = المرادف يقابل صلاحية واحدة.
# قيمة صف    = المرادف يقابل حزمة صلاحيات؛ يجب امتلاكها كاملة حتى تُصرَّح.
#
# ملاحظات المطابقة (أذونات مطلوبة بلا مورد/ميزة داعمة ⇒ أقرب مقابل قائم):
# - `who.ihr.integration.view` : لا يوجد مورد IHR تقني منفصل؛ سجل IHR
#   يُخزَّن ضمن `WHOIntegration` نفسه فيقع تحت `who_integration`.
# - `ihr.notifications.*`    : لا يوجد مورد `ihr_notification`؛ الإخطار إجراء
#   مخصّص على `ihr_event` باسم `notify`.
# - `ihr.communications.view`: لا يوجد مورد `ihr_communication`؛ المراسلات
#   تُحمل ضمن بيانات الحدث، فأقرب مواردها `ihr_event:view`.
# - `who.icd11.*`            : لا يوجد مورد `who_icd11`؛ موردا ICD هما
#   `who_diseases` (القراءة) و`who_mappings` (البحث).
# - `*.manage`               : لا يوجد إجراء `manage`؛ الحزمة add+edit+delete.
# - `audit_logs.view`        : المورد القائم مفرد وهو `audit_log`.
PERMISSION_CODE_ALIASES = {
    # ---- تكامل WHO ----
    'who.integration.view': 'who_integration:view',
    'who.integration.manage': 'who_integration:edit',
    'who.integration.test_connection': 'who_integration:test',
    'who.integration.sync': 'who_integration:sync',
    'who.integration.logs.view': 'who_logs:view',
    'who.icd11.search': 'who_mappings:search',
    'who.icd11.view': 'who_diseases:view',
    'who.ihr.integration.view': 'who_integration:view',
    # ---- الوظائف التشغيلية للوائح الصحية الدولية ----
    'ihr.events.view': 'ihr_event:view',
    'ihr.events.create': 'ihr_event:add',
    'ihr.events.update': 'ihr_event:edit',
    'ihr.events.submit': 'ihr_event:submit',
    'ihr.notifications.view': 'ihr_event:notify',
    'ihr.notifications.create': 'ihr_event:notify',
    'ihr.notifications.submit': 'ihr_event:notify',
    'ihr.communications.view': 'ihr_event:view',
    # ---- إدارة النظام ----
    'users.view': 'users:view',
    'users.manage': ('users:add', 'users:edit', 'users:delete'),
    'roles.view': 'roles:view',
    'roles.manage': ('roles:add', 'roles:edit', 'roles:delete'),
    'permissions.view': 'permissions:view',
    'audit_logs.view': 'audit_log:view',
}


def resolve_permission_codes(code):
    """يترجم اسم الصلاحية المطلوب إلى أكواد `resource:action` القائمة.

    الأكواد غير المُدرجة في `PERMISSION_CODE_ALIASES` تُعاد كما هي، فأي
    استدعاء بكود قائم يكمل بلا تغيير.
    """
    if not code:
        return ()
    target = PERMISSION_CODE_ALIASES.get(code, code)
    if isinstance(target, str):
        return (target,)
    return tuple(target)



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
    """هل الدور إداري (يحمل صلاحيات على موارد إدارة الهوية)؟

    الكشف قائم على القدرات (permission set) لا على اسم الدور ولا على حقل قاعدة
    بيانات: أي دور يتقاطع مع `ADMIN_RESOURCES` دور ذو سلطة إدارية، ويشمل ذلك
    `ADMIN` و`NATIONAL_IT_DIRECTOR` وأي دور يحمل `users:*` أو `roles:*`.
    """
    if role is None:
        return False
    return role.permissions.filter(resource__in=ADMIN_RESOURCES).exists()


def is_admin_permission_code(permission_code):
    """هل كود الصلاحية صلاحية إدارة هوية (users/roles/permissions/role_assignments)؟"""
    resource = str(permission_code or '').split(':', 1)[0].strip().lower()
    return resource in ADMIN_RESOURCES


# M8-S: القدرات التي تُعدّ تفويضاً بإدارة توزيع الأدوار. مَن لا يحمل واحدة منها
# لا يوزّع الأدوار إلا ما يحمله منها فعلاً (تفويض الحامل للدور).
ROLE_GRANT_PERMISSIONS = ('role_assignments:add', 'roles:edit', 'roles:add')


def has_role_grant_authority(user):
    """هل يملك المستخدم صلاحية إدارة توزيع الأدوار (سلطة RBAC صريحة)؟"""
    if user is None or getattr(user, 'is_anonymous', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    return any(user.can(code) for code in ROLE_GRANT_PERMISSIONS)


# ---------------------------------------------------------------------------
# سياسة موحّدة لتغيير الصلاحيات (M8-S)
# ---------------------------------------------------------------------------
# كل عملية تنتقل صلاحية بين مستخدم أو دور يجب أن تمر من هنا. `check_grant_capability`
# يبقى صالحاً لمسار الأدوار (RoleAssignment / `user.role`)، وهذا يغطي الصلاحيات
# المفردة على مستوى المستخدم والدور.
#
# العمليات:
# - GRANT     : إضافة صلاحية إلى extra_permissions أو حزمة دور ⇒ توسيع سلطة.
# - UNRESTRICT: إزالة صلاحية من blocked_permissions ⇒ استعادة سلطة محجوبة.
# - RESTRICT  : إضافة صلاحية إلى blocked_permissions ⇒ سحب سلطة (لا توسيع).
# - REVOKE    : إزالة صلاحية من extra_permissions ⇒ سحب سلطة (لا توسيع).
GRANT = 'grant'
UNRESTRICT = 'unrestrict'
RESTRICT = 'restrict'
REVOKE = 'revoke'


def check_permission_mutation(actor, target, codes, operation=GRANT):
    """هل يجوز للفاعل نقل هذه الصلاحيات إلى `target`؟ يعيد (مَسموح, سببُ الرفض).

    القواعد (A–E):
    - A) الفاعل لا يُفوَّض إلا لصلاحية يحملها فعلاً، أو يكون مشرفاً.
    - B) صلاحيات موارد إدارة الهوية لا تُمنح إلا لمن يحملها (لا راية `is_staff`).
    - C) لا self-grant ولا self-unrestrict: `actor == target` ممنوع في التوسيع.
    - D) لا توسّع قدرة: لا يُمنح ما لا يملكه الفاعل.
    - E) الإزالة والاستعادة لا تُجاوزان القواعد نفسها: كل توسيع للسلطة، سواء
      كان إضافة أو استعادة، يخضع لشرط حمل الفاعل للصلاحية.
    """
    codes = list(dict.fromkeys(codes or ()))
    if not codes:
        return True, ''
    if actor is None or getattr(actor, 'is_anonymous', False):
        return False, 'تغيير الصلاحيات يتطلب فاعلاً معتمداً'
    if getattr(actor, 'is_superuser', False):
        return True, ''
    # سحب الصلاحيات الممنوحة خفضٌ للسلطة فقط: تُحكمه بوابة الـ endpoint.
    if operation == REVOKE:
        return True, ''
    is_self = (
        target is not None
        and getattr(target, 'pk', None) is not None
        and target.pk == actor.pk
    )
    # منع المستخدم من تقييد صلاحياته بنفسه غير مؤذٍ، فلا يُمنع.
    if operation == RESTRICT and is_self:
        return True, ''
    if is_self:
        return False, 'لا يمكنك توسيع صلاحيات حسابك بنفسك'
    for code in codes:
        if actor.can(code):
            continue
        if is_admin_permission_code(code):
            return False, f'لا يمكنك منح صلاحية إدارية لا تحملها: {code}'
        return False, f'لا يمكنك منح صلاحية لا تحملها: {code}'
    return True, ''


def check_grant_capability(actor, role, *, scope_type, scope_id, now=None):
    """هل يملك الفاعل صلاحية منحُ هذا الدور في هذا النطاق؟

    يعيد (مَسموح, سببُ الرفض). القواعد:
    - المشرف (is_superuser) يمنح بأي شكل.
    - الأدوار الإدارية تتطلّب حملَ الفاعل لنفس الدور الإداري بتعيين نشط؛
      راية ``is_staff`` وحدها لا تكفي (تجاوزها سابقاً مكّن تصعيد الصلاحيات).
    - منح GLOBAL يتطلب تغطية عامة نشطة.
    - المنح في نطاق محدد يتطلب أن يكون النطاق ضمن نطاق الفاعل الفعّال.
    - أدوار المختبر تمنح ضمن المستوى الوظيفي للفاعل (قاعدة المستوى).
    - الأدوار الأخرى تمنح فقط إذا كان الفاعل يحمل الدور نفسه بتعيين نشط؛
      وسقط في M8-S اختصار ``is_staff`` الذي كان يمنح أي دور لأي موظف.
    """
    if actor is None or getattr(actor, 'is_anonymous', False):
        return False, 'المنح يتطلب فاعلاً معتمداً'
    if actor.is_superuser:
        return True, ''
    if is_admin_power_role(role):
        # راية is_staff راية "دخول لوحة الإدارة" لا راية "إدارة الهوية".
        # تجاوزها سابقاً سمح لأي حساب موظف بمنح نفسه دور ADMIN عام
        # (حوادث clinic.doctor و national.it في بيانات 2026-09/10).
        # الأدوار الإدارية تتطلّب حمل الدور نفسه بتعيين نشط.
        if not has_active_role(actor, role.code, now=now):
            return False, (
                'لا يمكن منح دور إداري (users/roles/permissions/role_assignments) '
                'إلا لمن يحمل هذا الدور بتعيين نشط'
            )
        global_ok, scopes = effective_scope_pairs(actor, now=now)
        if scope_type == 'GLOBAL':
            if not global_ok:
                return False, 'لا يمكن منح نطاق عام (GLOBAL) بدون تغطية عامة'
        elif (scope_type, scope_id) not in scopes:
            return False, 'النطاق المطلوب خارج نطاق صلاحياتك'
        return True, ''
    # M8-S: سقط اختصار `is_staff ⇒ منح أي دور`. كان أي حساب موظف (بلا أدوار
    # ولا تغطية) يمنح نفسه دوراً إدارياً بالطريق غير الإداري أو يمنح غيره
    # دوراً لا يحمله. البدل قاعدة قدرات: من يملك صلاحية إدارة توزيع الأدوار
    # (`role_assignments:add` / `roles:*`) يبقى مخوّلاً بسلطته الإدارية.
    global_ok, scopes = effective_scope_pairs(actor, now=now)
    if has_role_grant_authority(actor):
        if scope_type == 'GLOBAL':
            if not global_ok:
                return False, 'لا يمكن منح نطاق عام (GLOBAL) بدون تغطية عامة'
        elif (scope_type, scope_id) not in scopes:
            return False, 'النطاق المطلوب خارج نطاق صلاحياتك'
        return True, ''
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