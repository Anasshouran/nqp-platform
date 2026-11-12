"""مساعدات تقييد النطاق القطاعي/النقطي للموديولات التشغيلية.

نموذج البيانات: كل الموديولات (صحة الموانئ/المطارات، الفسح الغذائي، مكافحة
النواقل، العيادات) تربط بياناتها بنقاط الدخول عبر حقل `port` يشير إلى
`masterdata.EntryPoint`، وكل `EntryPoint` مرتبط بقطاع `organization.Sector`
عبر الحقل المباشر `EntryPoint.sector`.

المحلّ المعتمد الوحيد لتحويل نطاق المستخدم إلى نقاط دخول هو
:func:`resolve_authorized_entry_points`. كل الموديولات — بما فيها
``borders_health`` و ``ScopeFilter`` و ``MultiHopScopeFilter`` — تستدعيه
بدل تكرار منطق النطاق. الجسر التنظيمي المعتمد هو
``organization.OrgAssignment.entry_point``؛ لا يوجد أي جسر آخر من محطة
إلى نقطة دخول.

مصدر الحقيقة للتفويض: تعيينات الأدوار النشطة ضمن النافذة الزمنية فقط
(الحقل القديم ``User.role`` غير معتبر في القرارات).
"""
from django.conf import settings
from django.core.exceptions import FieldError
from django.db.models import Q

import logging

from core.utils.authorization import (
    active_assignments,
    has_active_global_scope,
    has_active_role,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# خيار «لا يوجد بُعد نطاق» — المركز الوحيد للاعتماد الصريح
# ---------------------------------------------------------------------------
#: السمة التي يجب أن يعلنها صراحةً أي viewset لا يملك بُعد نطاق جغرافي أو
#: قطاعي على الإطلاق (جدول مرجعي مشترك مثل المناصب، لا صف يملك قطاعاً).
#:
#: الافتراضي **فشل آمن**: أي مستخدم لا يُحلَّل نطاقه يُحجب عنه كل شيء. قبل
#: هذا المركز كان غياب النطاق يعني «بلا تقييد»، فتسريب كامل بين القطاعات:
#: مستخدم بنطاق `STATION` — وهو نطاق لا يفهمه `resolve_user_sectors` — كان
#: يرى كل صفوف المختبر والمكافحة النواقلة.
#:
#: تسمية السمة ثابتة ومعروفة، فيتحقق منها `scope_is_optional()` في كل مكان
#: بدل تكرار شرط خاص بكل viewset.
SCOPE_OPT_OUT_ATTR = 'scope_optional'


def scope_is_optional(view):
    """هل أعلن هذا الـ viewset صراحةً أنه بلا بُعد نطاق؟"""
    return bool(getattr(view, SCOPE_OPT_OUT_ATTR, False))


# M5-C-L: بوابة الإنتاج لنطاق LOCALITY (فشل آمن حتى يُتحقَّق من البيانات).
# في التطوير (DEBUG=True) تعمل LOCALITY دائماً. في الإنتاج (DEBUG=False)
# تحتاج `PROD_SCOPING_ENABLED=True` صراحةً — وإلا تُحجب كل مسارات LOCALITY
# (deny-all). تُضبط في `nqp_backend/settings.py` و`docs/m5-c-l.md`.
def locality_scope_enabled():
    """هل مسارات LOCALITY مفعّلة؟ (DEBUG أو PROD_SCOPING_ENABLED)."""
    if getattr(settings, 'DEBUG', False):
        return True
    return bool(getattr(settings, 'PROD_SCOPING_ENABLED', False))


# M5-C-F (D-F-5): FACILITY تشترك في نفس البوابة — لا مفتاح جديد.
facility_scope_enabled = locality_scope_enabled


def resolve_user_sectors(user):
    """قطاعات المستخدم كقائمة Sector (user.sector + تعيينات الدور بنطاق SECTOR).

    للمستخدم القومي/الوطني (superuser أو GLOBAL scope أو NATIONAL_LAB_ADMIN)
    تُرجع كل القطاعات النشطة، وإلا قائمة قطاعاته الفعلية (حقل القطاع +
    جميع نطاقات SECTOR من التعيينات النشطة ضمن النافذة الزمنية).
    """
    from apps.organization.models import Sector

    if not user or user.is_anonymous:
        return []
    if user.is_superuser or has_active_global_scope(user) or has_active_role(user, 'NATIONAL_LAB_ADMIN'):
        return list(Sector.objects.filter(is_active=True))

    ids = set()
    if user.sector_id:
        ids.add(user.sector_id)
    ids.update(
        active_assignments(user)
        .filter(scope_type='SECTOR', scope_id__isnull=False)
        .values_list('scope_id', flat=True)
    )
    return list(Sector.objects.filter(pk__in=ids))


def has_global_scope(user):
    """هل للمستخدم نطاق GLOBAL نشط (ضمن النافذة الزمنية)؟"""
    return has_active_global_scope(user)


# M4-2: activated — يستخدمهما RegistryScopedViewSet.get_queryset لبناء مسار
# STATE (state → StateNodeAssignment → ReportingNode.path subtree)، وهو المسار
# الذي يفتح D-M4-1-1 (ولاية بلا EntryPoints). `has_state_scope` يُستخدم كبوابة
# رخيصة قبل استدعاء `get_user_state_ids` لتفادي استعلام زائد لغير STATE.
def has_state_scope(user):
    """True إن كان للمستخدم تفويض STATE نشط واحد على الأقل (M4-1)."""
    if not user or getattr(user, 'is_anonymous', True):
        return False
    return _active_assignments(user).filter(scope_type='STATE').exists()


def get_user_state_ids(user):
    """يعيد set من State UUIDs التي للمستخدم نطاق STATE عليها (M4-1).
    
    None = GLOBAL (لا تقييد).
    set() = لا STATE scope.
    """
    if not user or getattr(user, 'is_anonymous', True):
        return set()
    if user.is_superuser or has_global_scope(user):
        return None  # GLOBAL
    return set(
        _active_assignments(user)
        .filter(scope_type='STATE')
        .values_list('scope_id', flat=True)
    )


def get_user_locality_ids(user):
    """يعيد set من Locality UUIDs التي للمستخدم نطاق LOCALITY عليها (M5-C-L).

    None = GLOBAL (لا تقييد).
    set() = لا LOCALITY scope — أو البوابة مغلقة في الإنتاج
            (`PROD_SCOPING_ENABLED=False` و`DEBUG=False`) ⇒ فشل آمن.
    """
    if not user or getattr(user, 'is_anonymous', True):
        return set()
    if user.is_superuser or has_global_scope(user):
        return None  # GLOBAL
    # M5-C-L gate: في الإنتاج بلا تحقّق من البيانات ⇒ نفي كامل (fail-safe).
    if not locality_scope_enabled():
        return set()
    return set(
        _active_assignments(user)
        .filter(scope_type='LOCALITY')
        .values_list('scope_id', flat=True)
    )


def get_user_facility_ids(user):
    """يعيد set من HealthFacility UUIDs التي للمستخدم نطاق FACILITY عليها (M5-C-F).

    None = GLOBAL (لا تقييد).
    set() = لا FACILITY scope — أو البوابة مغلقة (نفس بوابة LOCALITY — D-F-5).
    """
    if not user or getattr(user, 'is_anonymous', True):
        return set()
    if user.is_superuser or has_global_scope(user):
        return None  # GLOBAL
    if not facility_scope_enabled():
        return set()  # M5-C-F gate: fail-safe prod
    return set(
        _active_assignments(user)
        .filter(scope_type='FACILITY')
        .values_list('scope_id', flat=True)
    )


def has_role(user, role_code):
    """هل للمستخدم دور معيّن (تعيين نشط ضمن النافذة الزمنية)؟"""
    return has_active_role(user, role_code)


def resolve_user_sector(user):
    """يرجع قطاع المستخدم الرئيسي من نطاقه الإداري (SECTOR scope) إن وُجد.

    (يحافظ على سلوك الموديولات القطاعية السابقة: يعتمد على تعيينات الدور
    بنطاق SECTOR فقط، ولا يجمع قطاعات متعددة.)
    """
    from apps.organization.models import Sector

    if not user or user.is_anonymous or user.is_superuser:
        return None
    sector_id = next(
        (a.scope_id for a in active_assignments(user).filter(
            scope_type='SECTOR',
            scope_id__isnull=False,
        )),
        None,
    )
    if sector_id is None:
        return None
    return Sector.objects.filter(pk=sector_id).first()


def _active_assignments(user):
    return active_assignments(user).filter(
        scope_id__isnull=False,
    ).exclude(scope_type='GLOBAL')


def _assigned_entry_point_ids(user):
    """معرفات نقاط الدخول من التعيينات الهيكلية النشطة (OrgAssignment.entry_point)."""
    from apps.organization.models import OrgAssignment

    try:
        return list(
            OrgAssignment.objects.filter(
                user=user, is_active=True, entry_point__isnull=False,
            ).values_list('entry_point_id', flat=True)
        )
    except (FieldError, AttributeError):
        return []


def _sector_port_ids(sector_ids):
    """معرفات نقاط دخول جميع القطاعات المعطاة."""
    if not sector_ids:
        return []
    from core.utils.ports import sector_entry_points
    from apps.organization.models import Sector

    ids = set()
    for sector in Sector.objects.filter(pk__in=sector_ids):
        ids.update(sector_entry_points(sector).values_list('id', flat=True))
    return list(ids)


def _state_entry_point_ids(state_ids):
    """يحول STATE UUIDs إلى EntryPoint IDs (فقط النشطة) (M4-1).
    
    M4-1: STATE scope يفتح كل EntryPoints الموجودة في الولاية.
    ملاحظة: الولايات بدون EntryPoints تُعطي مجموعة فارغة (fail-safe).
    """
    if not state_ids:
        return set()
    from apps.masterdata.models import EntryPoint
    return set(
        EntryPoint.objects.filter(
            state_id__in=state_ids,
            is_active=True,
        ).values_list('id', flat=True)
    )


def _locality_entry_point_ids(locality_ids):
    """يحوّل LOCALITY UUIDs إلى EntryPoint IDs (النشطة فقط) (M5-C-L).

    M5-C-L: LOCALITY scope يفتح كل EntryPoints الموجودة في المحلية.
    fail-safe: محليات بلا EntryPoints ⇒ مجموعة فارغة (لا يتسرب من أخواتها).

    Gate (M5-C-L): إن لم تكن LOCALITY مفعّلة في البيئة
    (`DEBUG=True` أو `PROD_SCOPING_ENABLED=True`) ⇒ مجموعة فارغة.
    """
    if not locality_ids:
        return set()
    if not locality_scope_enabled():
        return set()
    from apps.masterdata.models import EntryPoint
    return set(
        EntryPoint.objects.filter(
            locality_id__in=locality_ids,
            is_active=True,
        ).values_list('id', flat=True)
    )


def _facility_entry_point_ids(facility_ids):
    """يحوّل FACILITY UUIDs إلى EntryPoint IDs (M5-C-F).

    الجسر الوحيد المتاح: `HealthFacility.entry_point` (SET_NULL).
    منشآت بلا `entry_point` تُتَجاهَل — لا مسار للانضمام (fail-safe).
    Gate (D-F-5): نفس بوابة LOCALITY (`facility_scope_enabled`).
    """
    if not facility_ids:
        return set()
    if not facility_scope_enabled():
        return set()
    from apps.masterdata.models import HealthFacility
    return set(
        HealthFacility.objects.filter(
            id__in=facility_ids,
            entry_point__isnull=False,  # مخصص بقصد: منشآت بلا EP لا تفتح شيئاً
            is_active=True,
        ).values_list('entry_point_id', flat=True)
    )


# ---------------------------------------------------------------------------
# المحلّ المعتمد: نطاق المستخدم → نقاط الدخول
# ---------------------------------------------------------------------------

#: أنواع النطاق التي تُسمّي `organization.Sector` مباشرة.
#:
#: `REGION` مقصود هنا semantically نفس `SECTOR`: التحقق في
#: `apps.accounts.serializers` يقبل `organization.Sector` لـ `REGION`،
#: و `apps.hr.views` يجمع `ids['SECTOR'] | ids['REGION']` معاً. لذلك يبقى
#: `REGION` قطاعاً إدارياً ولا يُعامل أبداً كـ `masterdata.EntryPoint`.
SECTOR_LIKE_SCOPES = ('SECTOR', 'REGION')

#: أنواع النطاق التي تُسمّي `masterdata.EntryPoint` مباشرة.
ENTRY_POINT_SCOPES = ('POINT', 'PORT')


def _org_entry_point_ids(user, *, sector_ids=(), department_ids=(), station_ids=()):
    """معرفات نقاط الدخول المستخرجة من تعيينات `OrgAssignment` النشطة.

    الجسر المعتمد: `OrgAssignment.entry_point`. المسارات تتبع السلسلة
    الهرمية نفسها التي يوثّقها `apps.hr.scoping.SCOPE_LOOKUPS` حتى لا
    يتكرر تعريف "ما يعنيه النطاق" في مكانين.

    `DEPARTMENT` يشمل تعيينات الإدارة نفسها وتعيينات محطاتها ومناصبها؛
    `STATION` يشمل تعيينات تلك المحطة حصراً. لا يُوسَّع أيٌّ منهما إلى
    القطاع ولا إلى حدود أخرى.
    """
    from django.db.models import Q

    from apps.organization.models import OrgAssignment

    sector_ids = list(sector_ids)
    department_ids = list(department_ids)
    station_ids = list(station_ids)

    condition = Q(pk__in=[])
    if station_ids:
        condition |= Q(station_id__in=station_ids)
    if department_ids:
        condition |= Q(department_id__in=department_ids)
        condition |= Q(station__department_id__in=department_ids)
        condition |= Q(position__department_id__in=department_ids)
    if sector_ids:
        condition |= Q(sector_id__in=sector_ids)
        condition |= Q(department__sector_id__in=sector_ids)
        condition |= Q(station__sector_id__in=sector_ids)
        condition |= Q(position__department__sector_id__in=sector_ids)
        condition |= Q(entry_point__sector_id__in=sector_ids)

    if not condition:
        return set()
    try:
        return set(
            OrgAssignment.objects
            .filter(condition, is_active=True, entry_point__isnull=False)
            .values_list('entry_point_id', flat=True)
        )
    except (FieldError, AttributeError):
        logger.exception(
            'OrgAssignment bridge failed to resolve entry points (sector=%s '
            'department=%s station=%s) - DENYING access',
            sector_ids, department_ids, station_ids,
        )
        return set()


def resolve_authorized_entry_points(user):
    """المحلّ المعتمد الوحيد: نقاط الدخول التي يجوز للمستخدم العمل عليها.

    يعيد:
      - `None` → تغطية عامة (superuser / نطاق `GLOBAL` نشط) ⇒ بلا تقييد.
      - قائمة معرّفات `masterdata.EntryPoint` عند وجود نطاق ⇒ للفلترة.
      - `[]` عند غياب أي نطاق ⇒ **فشل آمن**، يجب أن يحجب المستدعي كل شيء.

    دلالات كل نوع نطاق (Least privilege: لا يوجد توسيع):

    ==========  ==========================================================
    النطاق      الدلالة
    ==========  ==========================================================
    `GLOBAL`    `None` — بلا تقييد.
    `SECTOR`    كل نقاط الدخول النشطة التي `EntryPoint.sector` فيها هذا
                القطاع.
    `REGION`    نفس `SECTOR` تماماً (القطاع الإداري هو النموذج المرجعي
                في التحقق والواجهة).
    `PORT`      نقطة الدخول المشار إليها مباشرةً.
    `POINT`     نقطة الدخول المشار إليها مباشرةً.
    `DEPARTMENT` نقاط دخول تعيينات `OrgAssignment` التي تنتمي إلى الإدارة
                (أو محطة/منصب فيها).
    `STATION`   نقاط دخول تعيينات `OrgAssignment` التي تنتمي إلى المحطة.
    `LOCALITY`  نقاط دخول المحلية(ات) — بوابة الإنتاج
                (`PROD_SCOPING_ENABLED` أو `DEBUG`)؛ وإلا يُتجاهل (deny-safe).
    `FACILITY`  نقطة دخول المنشأة عبر `HealthFacility.entry_point` — نفس
                البوابة؛ منشآت بلا EP تُتجاهل (M5-C-F).
    ==========  ==========================================================

    `OrgAssignment.entry_point` النشط للمستخدم يدخل في الاتحاد دائماً،
    فهذا هو الجسر التنظيمي المعتمد ومعه يُحسم نطاق الضابط إلى معبره.

   ملاحظة: لا يوجد توسيع من محطة إلى قطاعها ولا من نقطة إلى ما يجاورها؛
    الاتحاد بين التعيينات المستقلة هو فقط ما يوسّع النطاق.
    """
    if not user or getattr(user, 'is_anonymous', True):
        return []
    if user.is_superuser or has_global_scope(user):
        return None

    sector_ids = set()
    department_ids = set()
    station_ids = set()
    state_ids = set()          # ← M4-1
    locality_ids = set()       # ← M5-C-L
    facility_ids = set()       # ← M5-C-F
    direct_ids = set()

    for a in _active_assignments(user):
        if a.scope_type in SECTOR_LIKE_SCOPES:
            sector_ids.add(a.scope_id)
        elif a.scope_type == 'STATE':              # ← M4-1
            state_ids.add(a.scope_id)
        elif a.scope_type == 'LOCALITY':           # ← M5-C-L
            locality_ids.add(a.scope_id)
        elif a.scope_type == 'FACILITY':           # ← M5-C-F
            facility_ids.add(a.scope_id)
        elif a.scope_type == 'DEPARTMENT':
            department_ids.add(a.scope_id)
        elif a.scope_type == 'STATION':
            station_ids.add(a.scope_id)
        elif a.scope_type in ENTRY_POINT_SCOPES:
            direct_ids.add(a.scope_id)
        else:
            # M4-1: كشف scope_types غير المعروفة — يُتجاهَل fail-safe
            # لكن يُسجَّل بصوت مسموع لتفادي الأخطاء الصامتة
            logger.warning(
                'resolve_authorized_entry_points: unknown scope_type=%r '
                'user=%r — ignored (deny-safe)',
                a.scope_type, getattr(user, 'id', None),
            )

    entry_point_ids = set(direct_ids)
    entry_point_ids.update(_assigned_entry_point_ids(user))
    entry_point_ids.update(_state_entry_point_ids(state_ids))  # ← M4-1
    entry_point_ids.update(_locality_entry_point_ids(locality_ids))  # ← M5-C-L
    entry_point_ids.update(_facility_entry_point_ids(facility_ids))  # ← M5-C-F
    entry_point_ids.update(_sector_port_ids(sector_ids))
    entry_point_ids.update(_org_entry_point_ids(
        user,
        sector_ids=sector_ids,
        department_ids=department_ids,
        station_ids=station_ids,
    ))
    return list(entry_point_ids)


def resolve_user_port_ids(user):
    """معرفات نقاط الدخول المسموح بها للمستخدم (فشل-آمن).

    وجه delegating رفيع إلى :func:`resolve_authorized_entry_points` كي لا
    يبقى هناك منطق نطاق مكرر. العقد محفوظ حرفياً:

      - `None` فقط للوطنيين (superuser / GLOBAL scope) → بلا تقييد.
      - `[]` عند غياب أي نطاق → يُحجب كل شيء (فشل آمن).
      - قائمة معرفات للفلترة عند وجود نطاقات.
    """
    return resolve_authorized_entry_points(user)


def _has_entry_point_assignment(user):
    from apps.organization.models import OrgAssignment

    try:
        return OrgAssignment.objects.filter(
            user=user, is_active=True, entry_point__isnull=False,
        ).exists()
    except (FieldError, AttributeError):
        return False


def asserts_geographic_scope(user):
    """هل فقد المستخدم بُعد النطاق الجغرافي عبر تعيين دور صريح؟

    يُستخدم لتمييز حالتين متمايزتين لا تميّزهما قائمة معرّفات بحد ذاتها:

      * «مُطالَب به»: نطاق جغرافي مُسند لكنه لم يُترجَم بعد إلى نقاط دخول ⇒
        البعد مُطالَب به ويجب حجب كل شيء لو بقي فارغاً (فشل آمن).
      * «غير مُطالَب به»: لا يوجد أي نطاق جغرافي أصلاً (مثل مستخدم
        ``COMPANY`` فقط) ⇒ لا يجوز معاملته كأنه مُقيَّد جغرافياً.
    """
    if not user or getattr(user, 'is_anonymous', True):
        return False
    if _active_assignments(user).filter(
        scope_type__in=SECTOR_LIKE_SCOPES + ENTRY_POINT_SCOPES + ('DEPARTMENT', 'STATION', 'STATE', 'LOCALITY'),
    ).exists():
        return True
    return _has_entry_point_assignment(user)


def resolve_user_company_ids(user):
    """معرفات الشركات (Carrier) المسموح بها للمستخدم بناءً على عضوية CarrierMember.

    يعيد:
      - `None` للسوبر유저/المسؤول العام → بلا تقييد.
      - `[]` عند عدم وجود عضوية نشطة → يُحجب كل شيء (فشل آمن).
      - قائمة معرفات `Carrier` للفلترة عند وجود عضوية نشطة.
    """
    if not user or user.is_anonymous or user.is_superuser:
        return None
    if has_global_scope(user):
        return None

    from apps.carriers.models import CarrierMember
    try:
        return list(
            CarrierMember.objects.filter(
                user=user, is_active=True,
            ).values_list('carrier_id', flat=True)
        )
    except (FieldError, AttributeError):
        return []


def resolve_combined_scope_ids(user):
    """Resolve the PORT (geographic) and COMPANY (ownership) scopes of a user.

    Returns a dict with:
      - ``port_ids``    : EntryPoint ids, or ``None`` when unrestricted / not asserted
      - ``company_ids`` : Carrier ids, or ``None`` when unrestricted / not asserted
      - ``has_port_scope`` / ``has_company_scope`` : whether the dimension applies

    Rules
    -----
    - superuser / active GLOBAL scope -> unrestricted on both dimensions.
    - The geographic dimension is produced by the single canonical resolver
      :func:`resolve_authorized_entry_points` (POINT/PORT/SECTOR/REGION/
      DEPARTMENT/STATION + ``OrgAssignment.entry_point``). It is *asserted*
      when the actor carries any of those scope types or an active
      ``OrgAssignment`` that names an entry point.
    - COMPANY scope is asserted ONLY by an explicit ``RoleAssignment`` with
      ``scope_type=COMPANY``. ``CarrierMember`` rows *widen* that set but never
      assert the dimension on their own, so existing aviation ``CARRIER`` users
      keep their previous access instead of being silently company-scoped out
      of Port Health data.
    - Neither asserted -> both empty, i.e. callers fail closed.
    """
    unrestricted = {'port_ids': None, 'company_ids': None,
                    'has_port_scope': False, 'has_company_scope': False}

    if not user or user.is_anonymous or user.is_superuser:
        return unrestricted
    if has_global_scope(user):
        return unrestricted

    has_port_scope = asserts_geographic_scope(user)
    entry_points = resolve_authorized_entry_points(user)
    port_ids = set(entry_points or ())

    company_ids = set()
    has_company_scope = False
    for a in _active_assignments(user):
        if a.scope_type == 'COMPANY':
            has_company_scope = True
            company_ids.add(a.scope_id)

    # An active membership widens an ALREADY-asserted company scope; it must not
    # by itself impose company scoping (that would change existing CARRIER users).
    if has_company_scope:
        try:
            from apps.carriers.models import CarrierMember
            company_ids.update(
                CarrierMember.objects.filter(user=user, is_active=True)
                .values_list('carrier_id', flat=True)
            )
        except (FieldError, AttributeError):
            pass

    return {
        'port_ids': list(port_ids) if has_port_scope else None,
        'company_ids': list(company_ids) if has_company_scope else None,
        'has_port_scope': has_port_scope,
        'has_company_scope': has_company_scope,
    }


class CompanyPortScopedMixin:
    """Combines PORT (geographic) and COMPANY (ownership) scoping.

    Used by view sets that must honour *both* kinds of scope. Unlike
    ``SectorScopedMixin``, a user carrying only a COMPANY scope is NOT denied:
    geographic and ownership scoping are independent dimensions, and an empty
    result on one dimension must not silently veto the other.

    Note: ``asserts_geographic_scope`` recognises ``LOCALITY`` unconditionally
    (M5-C-L) — independent of the ``PROD_SCOPING_ENABLED`` gate — so that in a
    gated-off production deployment a LOCALITY-only user fails *closed*
    (``has_port_scope=True`` with empty ``port_ids`` ⇒ ``qs.none()``) instead of
    being read as "no geographic dimension" (⇒ unrestricted).

    Semantics
    ---------
    - PORT scope only    -> filter on ``port_field`` (EntryPoint ids)
    - COMPANY scope only -> filter on ``company_field`` (Carrier ids)
    - both               -> intersection (AND)
    - superuser / GLOBAL -> unrestricted
    - neither            -> fail closed (``qs.none()``)
    """

    #: Query path from the row to the canonical ``masterdata.EntryPoint``.
    port_field = None
    #: Query path from the row to the canonical ``carriers.Carrier``.
    company_field = None

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not user or user.is_anonymous or user.is_superuser:
            return qs
        if has_global_scope(user):
            return qs

        from core.utils.scoping import resolve_combined_scope_ids

        info = resolve_combined_scope_ids(user)
        has_port = info['has_port_scope']
        has_company = info['has_company_scope']

        if not has_port and not has_company:
            logger.warning(
                'CompanyPortScopedMixin: user %s has neither PORT nor COMPANY '
                'scope on %s - DENYING all rows',
                user, self.__class__.__name__,
            )
            return qs.none()

        if has_port:
            port_ids = info['port_ids']
            if not port_ids:
                return qs.none()
            qs = qs.filter(**{f'{self.port_field}__in': port_ids})

        # Only apply company filtering when a COMPANY scope is actually asserted.
        # A port-health officer has no company scope at all, so their empty
        # membership list must never be read as "deny everything".
        if has_company and self.company_field:
            company_ids = info['company_ids']
            if not company_ids:
                return qs.none()
            qs = qs.filter(**{f'{self.company_field}__in': company_ids})

        # Multi-valued paths (e.g. vessel__visits__port) can duplicate rows.
        return qs.distinct() if getattr(self, 'scope_distinct', False) else qs


class SectorScopedMixin:
    """يقصّر queryset الموديول على منافذ دخول نطاقات المستخدم (قطاع/نقطة/محطة).

    السمات:
        port_field: اسم حقل الـ FK إلى `masterdata.EntryPoint` (الافتراضي `port`).
    """

    port_field = 'port'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous or user.is_superuser:
            return qs
        port_ids = resolve_user_port_ids(user)
        if port_ids is None:
            return qs
        if not port_ids:
            return qs.none()
        try:
            return qs.filter(**{f'{self.port_field}__in': port_ids})
        except (FieldError, ValueError):
            logger.exception(
                'SectorScopedMixin failed to scope queryset for %s (port_field=%s) - DENYING access',
                user, self.port_field,
            )
            return qs.none()


class SectorFieldScopedMixin:
    """يقصّر queryset على قطاعات المستخدم عبر حقل قطاع مباشر.

    السمات:
        sector_field: مسار الحقل إلى القطاع (الافتراضي `sector`)، يمكن أن يكون
            مساراً علائقياً مثل `sample__sector`.
        scope_optional: `True` فقط للجداول المرجعية المشتركة التي لا تملك
            قطاعاً أصلاً. الافتراضي `False` = **فشل آمن**.
        state_path: المسار العلائقي من النموذج إلى `masterdata.State.id`
            (مثال: `entry_point__state_id`). الافتراضي `None` = الولاية
            غير قابلة للاشتقاق → STATE يُحجب (فشل آمن). المُنحى القطاعي
            (قرار H1′) يبقى كما هو؛ القناة STATE تُضاف بالتوازي فقط.
        locality_path: المسار العلائقي من النموذج إلى `organization.Locality.id`
            (مثال: `entry_point__locality_id`). الافتراضي `None` = المحلية
            غير قابلة للاشتقاق → LOCALITY يُحجب (فشل آمن).
            تخضع لبوابة الإنتاج (`PROD_SCOPING_ENABLED` / `DEBUG`) — في
            الإنتاج بلا تفعيل تُعيد `get_user_locality_ids` مجموعة فارغة.

    يعيد الكل للوطني (superuser / GLOBAL scope / NATIONAL_LAB_ADMIN) — وهي
    تغطية عامة *مُتحقَّق منها* لا غياب نطاق.
    للمستخدم بلا قطاع (أو ولاية) قابل للحل يُعيد `qs.none()` (فشل آمن) إلا
    إذا أعلن الـ viewset `scope_optional = True` صراحةً.
    """

    sector_field = 'sector'
    state_path = None
    locality_path = None  # ← M5-C-L

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous or user.is_superuser:
            return qs
        requested = self.request.query_params.get('sector')
        sectors = resolve_user_sectors(user)
        allowed_codes = {s.code for s in sectors}
        if has_global_scope(user):
            if requested and requested in allowed_codes:
                try:
                    return qs.filter(**{f'{self.sector_field}__code': requested})
                except (FieldError, ValueError):
                    logger.exception(
                        'SectorFieldScopedMixin (global) failed to scope queryset for %s - DENYING access',
                        user,
                    )
                    return qs.none()
            if requested:
                return qs.none()
            return qs
        # M5-B-1: STATE grant (اتحاد مع قناة القطاع — H1′ بالخيار، ليس استبدالاً).
        # تُفعَّل فقط عندما يضبط الـ viewset `state_path` صراحةً (انظر docstring).
        state_ids = set()
        if self.state_path:
            try:
                resolved = get_user_state_ids(user)
                if resolved:
                    state_ids = set(resolved)
            except (FieldError, ValueError):
                logger.exception(
                    'SectorFieldScopedMixin: failed to resolve STATE for %s '
                    '(state_path=%s) - DENYING state branch',
                    user, self.state_path,
                )
                state_ids = set()
        # M5-C-L: LOCALITY grant (اتحاد مع القطاع/الولاية — لا استبدال).
        # يُفعَّل فقط عندما يضبط الـ viewset `locality_path` صراحةً.
        # البوابة داخل `get_user_locality_ids`: prod بلا `PROD_SCOPING_ENABLED`
        # ⇒ `set()` ⇒ الحجب الكامل (fail-safe).
        locality_ids = set()
        if self.locality_path:
            try:
                resolved = get_user_locality_ids(user)
                if resolved:
                    locality_ids = set(resolved)
            except (FieldError, ValueError):
                logger.exception(
                    'SectorFieldScopedMixin: failed to resolve LOCALITY for %s '
                    '(locality_path=%s) - DENYING locality branch',
                    user, self.locality_path,
                )
                locality_ids = set()
        if not sectors and not state_ids and not locality_ids:
            # لا قطاع/ولاية قابل للحل ≠ تغطية عامة. الافتراضي حجب كامل؛ الاستثناء
            # الوحيد تصريح صريح عبر `scope_optional` (انظر SCOPE_OPT_OUT_ATTR).
            if scope_is_optional(self):
                return qs
            logger.warning(
                'SectorFieldScopedMixin: user %s has no resolvable sector/state/locality scope on %s '
                '(sector_field=%s, state_path=%s, locality_path=%s) - DENYING all rows',
                user, self.__class__.__name__, self.sector_field, self.state_path, self.locality_path,
            )
            return qs.none()
        try:
            scope_q = Q()
            if sectors:
                scope_q |= Q(**{f'{self.sector_field}__in': [s.pk for s in sectors]})
            if state_ids and self.state_path:
                scope_q |= Q(**{f'{self.state_path}__in': list(state_ids)})
            if locality_ids and self.locality_path:
                scope_q |= Q(**{f'{self.locality_path}__in': list(locality_ids)})
            filtered = qs.filter(scope_q)
            if requested and requested in allowed_codes:
                filtered = filtered.filter(**{f'{self.sector_field}__code': requested})
            elif requested:
                return qs.none()
            return filtered.distinct()
        except (FieldError, ValueError):
            logger.exception(
                'SectorFieldScopedMixin failed to scope queryset for %s '
                '(sector_field=%s, state_path=%s, locality_path=%s) - DENYING access',
                user, self.sector_field, self.state_path, self.locality_path,
            )
            return qs.none()