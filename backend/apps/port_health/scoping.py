"""Canonical EntryPoint resolution + create authorisation for Port Health.

Phase 1D-2 security hardening.

Why this module exists
----------------------
`port_health` objects reach an `EntryPoint` through *different* real
relationships, and `Vessel` has **no** `port` field at all. The authoritative
paths, read from the models themselves, are:

==============================  ==========================================
Object                          Canonical path to `masterdata.EntryPoint`
==============================  ==========================================
`SeaPort`, `PortEmergency`      ``port -> entry_point``
`VesselVisit`, `HealthDecl.`   ``visit -> port -> entry_point``
                                (declaration also: ``vessel -> visits -> port``)
every vessel-linked record      ``vessel -> visits -> port -> entry_point``
(`ShipInspection`, `SanitationCertificate`, `HealthCertificate`,
`CargoInspection`, `WasteInspection`, `FoodWaterInspection`,
`IsolationRecord`, `CrewMember`, `Passenger`, `SurveillanceCase`,
`VectorControl`)
==============================  ==========================================

`vessel -> visits -> port -> entry_point` is the only vessel→geography
relationship the models actually have, so it is the one used here. Nothing new
is introduced.

`VesselVisit` is the canonical Port Call: it is the only row that binds a
vessel to a `SeaPort`. A vessel with no visit therefore has **no** geographic
evidence, and every function here reports that as *unresolvable* — which the
callers must treat as DENY, never as "unrestricted".

Company attribution (audit)
---------------------------
`company` is resolved from the **audited object's** vessel
(``Vessel.company``), never from the actor's membership: a Port Health officer
acting on Company B's vessel produces ``actor=officer, company=B``.
"""

from django.db.models import Q

from rest_framework.exceptions import PermissionDenied, ValidationError

from core.utils.scoping import resolve_user_port_ids


# ---------------------------------------------------------------------------
# Canonical EntryPoint resolution
# ---------------------------------------------------------------------------

def port_entry_point_ids(port):
    """EntryPoint ids a `SeaPort` resolves to (usually exactly one)."""
    if port is None:
        return set()
    entry_point_id = getattr(port, 'entry_point_id', None)
    return {entry_point_id} if entry_point_id is not None else set()


def visit_entry_point_ids(visit):
    """EntryPoint ids a `VesselVisit` (the Port Call) resolves to."""
    if visit is None:
        return set()
    return port_entry_point_ids(getattr(visit, 'port', None))


def vessel_entry_point_ids(vessel):
    """EntryPoint ids a `Vessel` resolves to, via its port calls.

    The canonical relationship is ``VesselVisit`` (vessel → visits → port →
    entry_point). Only visits whose port has a canonical `EntryPoint` count.
    """
    if vessel is None:
        return set()
    from apps.port_health.models import VesselVisit

    qs = (
        VesselVisit.objects
        .filter(vessel=vessel)
        .exclude(port__entry_point_id=None)
        .values_list('port__entry_point_id', flat=True)
        .distinct()
    )
    return {ep for ep in qs if ep is not None}


#: Resolvers keyed by the serializer field a client may supply.
#: Each takes the *model instance* and returns a set of EntryPoint ids.
PARENT_RESOLVERS = {
    'vessel': vessel_entry_point_ids,
    'visit': visit_entry_point_ids,
    'port': port_entry_point_ids,
    # `inspection` is a `ShipInspection`; it resolves exactly like one.
    'inspection': lambda obj: vessel_entry_point_ids(getattr(obj, 'vessel', None)),
}


# ---------------------------------------------------------------------------
# Caller scope
# ---------------------------------------------------------------------------

def caller_entry_point_ids(user):
    """EntryPoint ids the caller may act on.

    ``None`` means unrestricted (superuser / active GLOBAL scope) and is
    returned as-is so callers can distinguish it from "restricted to nothing".
    This is `core.utils.scoping.resolve_authorized_entry_points` verbatim —
    the single canonical resolver — so SECTOR/REGION are expanded,
    DEPARTMENT/STATION resolve through `OrgAssignment`, `OrgAssignment.entry_point`
    is honoured, and a user with no scope gets ``[]`` (deny everything).
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return set()
    ids = resolve_user_port_ids(user)
    if ids is None:
        return None
    return set(ids)


def is_unrestricted(user):
    """True when the caller bypasses geographic scoping (superuser/GLOBAL)."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    from core.utils.authorization import has_active_global_scope

    return has_active_global_scope(user)


# ---------------------------------------------------------------------------
# Parent consistency
# ---------------------------------------------------------------------------

def _mismatch(field, expected, got):
    return {
        field: (
            f'الكائن المُ referenced لا يطابق باقي العلاقات المُرسلة '
            f'({expected} ≠ {got}). يجب أن تشير جميع الكائنات إلى السياق '
            f'التشغيلي نفسه (نفس السفينة/الزيارة/الميناء).'
        )
    }


def assert_parents_consistent(obj, model):
    """Reject records whose supplied parents disagree with each other.

    Client data is never silently normalised: a mismatched pair is a 400 and
    nothing is written. Only combinations the models actually support are
    checked.
    """
    vessel = getattr(obj, 'vessel', None)
    visit = getattr(obj, 'visit', None)
    inspection = getattr(obj, 'inspection', None)
    port = getattr(obj, 'port', None)

    # vessel + visit  ->  the visit must belong to that very vessel.
    if vessel is not None and visit is not None and visit.vessel_id != vessel.id:
        raise ValidationError(_mismatch('visit', str(vessel.imo_number), str(visit.vessel.imo_number)))

    # vessel + inspection  ->  the inspection must belong to that very vessel.
    if vessel is not None and inspection is not None and inspection.vessel_id != vessel.id:
        raise ValidationError(_mismatch(
            'inspection', str(vessel.imo_number), str(inspection.vessel.imo_number),
        ))

    # port + vessel  ->  the vessel must actually call that port.
    if port is not None and vessel is not None:
        calls_port = getattr(vessel, 'visits', None)
        if calls_port is None or not calls_port.filter(port=port).exists():
            raise ValidationError(_mismatch(
                'vessel', str(port.code), str(vessel.imo_number),
            ))

    return True


# ---------------------------------------------------------------------------
# Create authorisation
# ---------------------------------------------------------------------------

def assert_parents_in_scope(user, instance, parent_fields):
    """Authorise a create/update whose parents were supplied by the client.

    For every field in `parent_fields` that carries a value, the referenced
    object's canonical EntryPoint set must intersect the caller's scope.

    * unrestricted caller (superuser / GLOBAL) -> allowed;
    * parent resolves to nothing (e.g. a vessel with no port call) -> DENY,
      because there is no geographic evidence to authorise against;
    * parent resolves outside the caller's scope -> DENY.

    Called from `perform_create` **before** `serializer.save()`, so nothing is
    persisted before authorisation passes.
    """
    if is_unrestricted(user):
        return True

    allowed = caller_entry_point_ids(user)

    for field in parent_fields:
        obj = getattr(instance, field, None)
        if obj is None:
            continue
        resolver = PARENT_RESOLVERS.get(field)
        if resolver is None:
            continue
        resolved = resolver(obj)
        if not resolved:
            raise PermissionDenied(
                f'لا يمكن تحديد نطاق جغرافي للعنصر المُرسل في «{field}»؛ '
                'التسجيل يتطلب ربطاً كافياً بمنفذ دخول معتمد.'
            )
        if not allowed:
            raise PermissionDenied('لا يوجد نطاق جغرافي معتمد لهذا الحساب.')
        if not (resolved & allowed):
            raise PermissionDenied(
                'العنصر المُرسل يقع خارج نطاق المنافذ المعتمدة لهذا الحساب.'
            )
    return True


# ---------------------------------------------------------------------------
# Audit (reuses ShippingAuditLog — no new audit model)
# ---------------------------------------------------------------------------

def _company_for_vessel(vessel):
    """The company that *owns* the audited object.

    Derived from ``Vessel.company`` (the canonical ownership link), never from
    the actor's own membership. Returns ``None`` when it genuinely cannot be
    resolved — NULL is preserved rather than guessed.
    """
    if vessel is None:
        return None
    return getattr(vessel, 'company', None)


def _ip_for_request(request):
    if request is None:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def audit_port_health(request, *, action, instance, object_type, detail=None):
    """Write a `ShippingAuditLog` row for a Port Health lifecycle action.

    Reuses the existing audit model and the existing
    ``ShippingAuditLog.Action`` vocabulary:

    * ``CREATE`` / ``UPDATE`` / ``DELETE`` already exist and are used as-is;
    * ``STATUS_CHANGE`` is used when the action is specifically a lifecycle
      state change (an isolation closed, an emergency closed).

    ``company`` is resolved from the audited object's vessel. No speculative
    backfill, no guessing.
    """
    from apps.shipping.models import ShippingAuditLog

    user = getattr(request, 'user', None)
    actor = user if getattr(user, 'pk', None) else None

    vessel = getattr(instance, 'vessel', None)
    if vessel is None:
        visit = getattr(instance, 'visit', None)
        vessel = getattr(visit, 'vessel', None)

    payload = {
        'user': actor,
        'company': _company_for_vessel(vessel),
        'action': action,
        'object_type': object_type,
        'object_id': str(instance.pk),
        'object_label': str(instance)[:255],
        'detail': detail or {},
        'ip_address': _ip_for_request(request),
    }
    if vessel is not None:
        payload['detail'] = {
            **payload['detail'],
            'vessel': str(vessel.imo_number),
            'vessel_id': str(vessel.pk),
        }
    return ShippingAuditLog.objects.create(**payload)