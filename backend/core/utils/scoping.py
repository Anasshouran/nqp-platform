"""مساعدات تقييد النطاق القطاعي/النقطي للموديولات التشغيلية.

نموذج البيانات: كل الموديولات (صحة الموانئ/المطارات، الفسح الغذائي، مكافحة
النواقل، العيادات) تربط بياناتها بنقاط الدخول عبر حقل `port` يشير إلى
`masterdata.EntryPoint`، وكل `EntryPoint` مرتبط بقطاع `organization.Sector`
عبر الحقل المباشر `EntryPoint.sector`. لذلك يمكن تقييد أي queryset على
نطاق المستخدم (قطاع أو نقطة دخول أو محطة) بفلترة معرفات نقاط دخوله.
"""
from django.core.exceptions import FieldError

import logging

logger = logging.getLogger(__name__)


def resolve_user_sectors(user):
    """قطاعات المستخدم كقائمة Sector (user.sector + تعيينات الدور بنطاق SECTOR).

    للمستخدم القومي/الوطني (superuser أو GLOBAL scope أو NATIONAL_LAB_ADMIN)
    تُرجع كل القطاعات النشطة، وإلا قائمة قطاعاته الفعلية.
    """
    from apps.accounts.models import RoleAssignment
    from apps.organization.models import Sector

    if not user or user.is_anonymous:
        return []
    if user.is_superuser or has_global_scope(user) or has_role(user, 'NATIONAL_LAB_ADMIN'):
        return list(Sector.objects.filter(is_active=True))

    ids = set()
    if user.sector_id:
        ids.add(user.sector_id)
        qs = user.role_assignments.filter(
            scope_type=RoleAssignment.ScopeType.SECTOR,
            scope_id__isnull=False,
            is_active=True,
        )
        ids.update(qs.values_list('scope_id', flat=True))
    return list(Sector.objects.filter(pk__in=ids))


def has_global_scope(user):
    """هل للمستخدم نطاق GLOBAL نشط (عامل على كل القطاعات)؟"""
    from apps.accounts.models import RoleAssignment

    if not user or user.is_anonymous or user.is_superuser:
        return True
    return user.role_assignments.filter(
        is_active=True, scope_type=RoleAssignment.ScopeType.GLOBAL,
    ).exists()


def has_role(user, role_code):
    """هل للمستخدم دور معيّن (من تعيينات الأدوار النشطة)؟"""
    if not user or user.is_anonymous:
        return False
    return user.role_assignments.filter(
        role__code=role_code, is_active=True,
    ).exists()


def resolve_user_sector(user):
    """يرجع قطاع المستخدم الرئيسي من نطاقه الإداري (SECTOR scope) إن وُجد.

    (يحافظ على سلوك الموديولات القطاعية السابقة: يعتمد على تعيينات الدور
    بنطاق SECTOR فقط، ولا يجمع قطاعات متعددة.)
    """
    from apps.accounts.models import RoleAssignment
    from apps.organization.models import Sector

    if not user or user.is_anonymous or user.is_superuser:
        return None
    sector_id = next(
        (a.scope_id for a in user.role_assignments.filter(
            scope_type=RoleAssignment.ScopeType.SECTOR,
            scope_id__isnull=False,
            is_active=True,
        ).all()),
        None,
    )
    if sector_id is None:
        return None
    return Sector.objects.filter(pk=sector_id).first()


def _active_assignments(user):
    from apps.accounts.models import RoleAssignment

    return user.role_assignments.filter(
        is_active=True,
        scope_id__isnull=False,
    ).exclude(scope_type=RoleAssignment.ScopeType.GLOBAL)


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


def resolve_user_port_ids(user):
    """معرفات نقاط الدخول المسموح بها للمستخدم (فشل-آمن).

    يجمع:
      - SECTOR scopes → كل نقاط دخول القطاع.
      - POINT/PORT scopes → نقطة الدخول المعينة مباشرة.
      - التعيينات الهيكلية `OrgAssignment.entry_point` النشطة.

    يعيد:
      - `None` فقط للوطنيين (superuser / GLOBAL scope) → بلا تقييد.
      - `[]` عند غياب أي نطاق → يُحجب كل شيء (فشل آمن، بدل السلوك القديم غير المقيد).
      - قائمة معرفات للفلترة عند وجود نطاقات.
    """
    if not user or user.is_anonymous or user.is_superuser:
        return None
    from apps.accounts.models import RoleAssignment

    has_global = user.role_assignments.filter(
        is_active=True, scope_type=RoleAssignment.ScopeType.GLOBAL,
    ).exists()
    if has_global:
        return None

    assignments = _active_assignments(user)
    sector_ids = set()
    entry_point_ids = set()
    for a in assignments:
        if a.scope_type in (RoleAssignment.ScopeType.SECTOR, RoleAssignment.ScopeType.REGION):
            sector_ids.add(a.scope_id)
        elif a.scope_type in (RoleAssignment.ScopeType.POINT, RoleAssignment.ScopeType.PORT):
            entry_point_ids.add(a.scope_id)

    port_ids = set(_sector_port_ids(sector_ids))
    port_ids.update(entry_point_ids)
    port_ids.update(_assigned_entry_point_ids(user))

    scoped = bool(sector_ids) or bool(entry_point_ids) or _has_entry_point_assignment(user)
    if not scoped:
        return []
    return list(port_ids)


def _has_entry_point_assignment(user):
    from apps.organization.models import OrgAssignment

    try:
        return OrgAssignment.objects.filter(
            user=user, is_active=True, entry_point__isnull=False,
        ).exists()
    except (FieldError, AttributeError):
        return False


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

    يعيد الكل للوطني (superuser / GLOBAL scope / NATIONAL_LAB_ADMIN)،
    لا شيء (qs.none) لمن بلا قطاعات، ويقصر على قطاعاته للقطاعيين.
    """

    sector_field = 'sector'

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
        if not sectors:
            # مستخدم بلا أي نطاق قطاعي (لا تعيينات ولا قطاع) — لا يوجد تقييد.
            return qs
        try:
            filtered = qs.filter(**{f'{self.sector_field}__in': [s.pk for s in sectors]})
            if requested and requested in allowed_codes:
                filtered = filtered.filter(**{f'{self.sector_field}__code': requested})
            elif requested:
                return qs.none()
            return filtered
        except (FieldError, ValueError):
            logger.exception(
                'SectorFieldScopedMixin failed to scope queryset for %s (sector_field=%s) - DENYING access',
                user, self.sector_field,
            )
            return qs.none()
