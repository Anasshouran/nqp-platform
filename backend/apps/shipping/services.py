"""Pre-arrival notification workflow.

Every state change goes through this service so that:

* the transition is validated against ``PreArrivalNotification.TRANSITIONS``;
* the acting user is authorised (company scope for filing, EntryPoint scope
  for reviewing);
* timestamps and actors are recorded;
* an audit row is written;
* subscribers are notified on SUBMITTED / ACCEPTED / REJECTED.

Status is deliberately **not** editable through the serializer: a bare
``PATCH {"status": ...}`` is rejected.
"""
from django.db import transaction
from django.http import Http404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.shipping.models import (
    PortClearanceDecision,
    PreArrivalNotification,
    ShippingAuditLog,
    VesselCompanyRelationship,
    VesselCompanyRole,
)

#: Roles considered "port health reviewers" for the review transitions.
REVIEWER_PERMISSION = 'port_health:edit'


class TransitionError(ValidationError):
    """Raised when a workflow transition is not legal from the current state."""


def _company_for(obj, object_type=None):
    """Resolve the ShippingCompany that *owns* the audited object.

    Deliberately derived from the audited object, never from the actor: a port
    officer performing a departure on another company's vessel must attribute
    the audit row to the vessel's company, not to the officer's own company.

    Returns ``None`` when the object has no company association (e.g. an audit
    row about a carrier's own profile), which is a legitimate NULL.
    """
    # Pre-arrival / clearance -> via the port call's vessel.
    visit = getattr(obj, 'vessel_visit', None) or (
        obj if object_type == 'VesselVisit' else None
    )
    if visit is not None:
        return getattr(visit.vessel, 'company', None)

    # Vessel itself.
    if hasattr(obj, 'company_id') and hasattr(obj, 'vessel_name'):
        return obj.company

    # ShippingAgent -> its company.
    if hasattr(obj, 'agent_type'):
        return getattr(obj, 'company', None)

    # VesselCompanyRelationship -> its company.
    if hasattr(obj, 'role') and hasattr(obj, 'company_id'):
        return getattr(obj, 'company', None)

    return None


def _audit(notification, action, actor=None, detail=None, object_type=None):
    ShippingAuditLog.objects.create(
        user=actor if getattr(actor, 'pk', None) else None,
        company=_company_for(notification, object_type),
        action=action,
        object_type=object_type or 'PreArrivalNotification',
        object_id=str(notification.pk),
        object_label=str(notification)[:255],
        detail=detail or {},
    )


def _assert_transition(notification, target):
    if not notification.can_transition_to(target):
        raise TransitionError({
            'status': (
                f'انتقال غير مسموح من «{notification.get_status_display()}» '
                f'إلى «{dict(PreArrivalNotification.Status.choices).get(target, target)}».'
            ),
        })


def _is_reviewer(user):
    """Port-health side: needs port_health edit rights, not company rights."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.can(REVIEWER_PERMISSION)


def _assert_independent_reviewer(notification, actor):
    """Enforce separation of duties on the review side.

    The filing company must not decide its own notification, even if the same
    account happens to hold ``port_health:edit``. This is a domain rule, not a
    permission accident, so it is enforced here rather than left to RBAC.
    """
    if not getattr(actor, 'pk', None):
        return
    owner_id = notification.vessel_visit.vessel.company_id
    if owner_id is None:
        return
    from apps.carriers.models import CarrierMember

    if CarrierMember.objects.filter(
        user=actor, carrier_id=owner_id, is_active=True,
    ).exists():
        raise PermissionDenied(
            'مراجعة الإخطار يجب أن تكون من جهة الميناء، لا من شركة الملاحة نفسها.'
        )


@transaction.atomic
def submit_pre_arrival(notification, *, actor):
    """DRAFT -> SUBMITTED, filed by the shipping company / agent."""
    _assert_transition(notification, PreArrivalNotification.Status.SUBMITTED)

    now = timezone.now()
    notification.status = PreArrivalNotification.Status.SUBMITTED
    notification.submitted_at = now
    # The actor is the authoritative submitter; ignore any client-supplied value.
    notification.submitted_by = actor if getattr(actor, 'pk', None) else None
    notification.save(update_fields=['status', 'submitted_at', 'submitted_by', 'updated_at'])

    _audit(notification, ShippingAuditLog.Action.STATUS_CHANGE, actor,
           detail={'transition': 'SUBMITTED'})
    _notify(notification, 'SUBMITTED')
    return notification


@transaction.atomic
def start_pre_arrival_review(notification, *, actor, notes=''):
    """SUBMITTED -> UNDER_REVIEW, by port health."""
    _assert_transition(notification, PreArrivalNotification.Status.UNDER_REVIEW)
    _assert_independent_reviewer(notification, actor)
    if not _is_reviewer(actor):
        raise PermissionDenied('مراجعة الإخطار تتطلب صلاحية `port_health:edit`.')

    now = timezone.now()
    notification.status = PreArrivalNotification.Status.UNDER_REVIEW
    notification.reviewed_by = actor if getattr(actor, 'pk', None) else None
    notification.reviewed_at = now
    if notes:
        notification.review_notes = notes
    notification.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes', 'updated_at'])

    _audit(notification, ShippingAuditLog.Action.STATUS_CHANGE, actor,
           detail={'transition': 'UNDER_REVIEW'})
    return notification


@transaction.atomic
def accept_pre_arrival(notification, *, actor, notes=''):
    """UNDER_REVIEW -> ACCEPTED, by port health."""
    _assert_transition(notification, PreArrivalNotification.Status.ACCEPTED)
    _assert_independent_reviewer(notification, actor)
    if not _is_reviewer(actor):
        raise PermissionDenied('قبول الإخطار يتطلب صلاحية `port_health:edit`.')

    if not notification.reviewed_at:
        notification.reviewed_at = timezone.now()
    notification.status = PreArrivalNotification.Status.ACCEPTED
    notification.reviewed_by = actor if getattr(actor, 'pk', None) else None
    if notes:
        notification.review_notes = notes
    notification.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes', 'updated_at'])

    _audit(notification, ShippingAuditLog.Action.STATUS_CHANGE, actor,
           detail={'transition': 'ACCEPTED'})
    _notify(notification, 'ACCEPTED')
    return notification


@transaction.atomic
def reject_pre_arrival(notification, *, actor, notes=''):
    """UNDER_REVIEW -> REJECTED, by port health."""
    _assert_transition(notification, PreArrivalNotification.Status.REJECTED)
    _assert_independent_reviewer(notification, actor)
    if not _is_reviewer(actor):
        raise PermissionDenied('رفض الإخطار يتطلب صلاحية `port_health:edit`.')

    if not notification.reviewed_at:
        notification.reviewed_at = timezone.now()
    notification.status = PreArrivalNotification.Status.REJECTED
    notification.reviewed_by = actor if getattr(actor, 'pk', None) else None
    if notes:
        notification.review_notes = notes
    notification.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes', 'updated_at'])

    _audit(notification, ShippingAuditLog.Action.STATUS_CHANGE, actor,
           detail={'transition': 'REJECTED'})
    _notify(notification, 'REJECTED')
    return notification


@transaction.atomic
def cancel_pre_arrival(notification, *, actor, notes=''):
    """Cancel before a decision is made, by the filing side."""
    _assert_transition(notification, PreArrivalNotification.Status.CANCELLED)

    notification.status = PreArrivalNotification.Status.CANCELLED
    if notes:
        notification.remarks = notes
    notification.save(update_fields=['status', 'remarks', 'updated_at'])

    _audit(notification, ShippingAuditLog.Action.STATUS_CHANGE, actor,
           detail={'transition': 'CANCELLED'})
    return notification


def _notify(notification, event):
    """Publish to the platform notification inbox.

    Uses the existing ``apps.notifications.models.NotificationLog`` convention
    (same as ``apps.emergency_eoc.services.notify_roles``). No new framework.
    """
    from apps.notifications.models import NotificationLog, NotificationTemplate

    templates = {
        'SUBMITTED': ('إخطار مسبق بانتظار المراجعة', 'وصل إخطار مسبق جديد لسفينة {vessel} في ميناء {port}.'),
        'ACCEPTED': ('قبول إخطار مسبق', 'قُبل الإخطار المسبق لسفينة {vessel} في ميناء {port}.'),
        'REJECTED': ('رفض إخطار مسبق', 'رُفض الإخطار المسبق لسفينة {vessel} في ميناء {port}.'),
    }
    subject_tpl, body_tpl = templates[event]
    fmt = {
        'vessel': notification.vessel_visit.vessel.vessel_name,
        'port': notification.vessel_visit.port.name_ar,
    }
    subject, body = subject_tpl.format(**fmt), body_tpl.format(**fmt)

    now = timezone.now()
    recipients = []

    # Port health side: reviewers holding port_health:edit, limited to the
    # operational entry point of this visit.
    entry_point_id = notification.entry_point.id if notification.entry_point else None

    from apps.accounts.models import User
    for user in User.objects.filter(is_active=True):
        if not user.can('port_health:edit'):
            continue
        scopes = user.active_scopes('port_health')
        if entry_point_id is not None:
            ids = {s['scope_id'] for s in scopes if s['scope_type'] in ('POINT', 'PORT')}
            sector_ids = {s['scope_id'] for s in scopes if s['scope_type'] in ('SECTOR', 'REGION')}
            from apps.organization.models import Sector
            from core.utils.ports import sector_entry_points
            for sid in sector_ids:
                ids.update(sector_entry_points(Sector.objects.filter(pk=sid).first()).values_list('id', flat=True))
            if ids and entry_point_id not in ids:
                continue
        recipients.append(user)

    # Company side: the submitter and active members of the owning carrier.
    if notification.submitted_by_id:
        recipients.append(notification.submitted_by)
    company = notification.company
    if company:
        from apps.carriers.models import CarrierMember
        for member in CarrierMember.objects.filter(carrier=company, is_active=True).select_related('user'):
            recipients.append(member.user)

    seen, sent = set(), 0
    for user in recipients:
        if not user or user.pk in seen:
            continue
        seen.add(user.pk)
        NotificationLog.objects.create(
            user=user,
            channel=NotificationTemplate.Channel.PUSH,
            recipient=user.email,
            subject=subject,
            body=body,
            status=NotificationLog.NotificationStatus.SENT,
            sent_at=now,
        )
        sent += 1
    return sent


# ===========================================================================
# Vessel ↔ company relationship (Part C)
# ===========================================================================

#: Roles only an administrative actor may grant.
PRIVILEGED_RELATIONSHIP_ROLES = {VesselCompanyRole.OWNER}

#: Roles a self-service company member may assert for its own vessel.
#: OWNER is excluded on purpose: legal ownership needs an external registry
#: workflow this platform does not have, and self-asserting it would let a
#: company claim any vessel it liked.
SELF_SERVICE_RELATIONSHIP_ROLES = {
    VesselCompanyRole.OPERATOR,
    VesselCompanyRole.MANAGER,
    VesselCompanyRole.CHARTERER,
}


class RelationshipPermissionError(PermissionDenied):
    pass


@transaction.atomic
def create_vessel_company_relationship(
    *, vessel, company, role, actor, is_primary=False,
    valid_from=None, valid_until=None, notes='',
):
    """Create a vessel↔company relationship through domain rules.

    Enforces, in order: authenticated actor, company scope, the company really
    owns the vessel, the role is grantable by this actor, date coherence, and the
    primary/duplicate constraints. Nothing here trusts a client-supplied
    company: the caller may only file for a company inside their own scope.
    """
    if not actor or not actor.is_authenticated:
        raise PermissionDenied('يتطلب إنشاء علاقة سفينة/شركة حساباً موثّقاً.')

    if not vessel or not company:
        raise ValidationError('السفينة والشركة مطلوبتان.')

    # --- authorisation ----------------------------------------------------
    is_admin = bool(actor.is_superuser or actor.is_staff)
    if not is_admin:
        from apps.carriers.models import CarrierMember

        member_of = CarrierMember.objects.filter(
            user=actor, carrier_id=company.id, is_active=True,
        ).exists()
        if not member_of:
            # Do not disclose whether the vessel exists for another company.
            raise Http404

        if role in PRIVILEGED_RELATIONSHIP_ROLES:
            label = dict(VesselCompanyRole.choices).get(role, role)
            raise RelationshipPermissionError(
                f'دور «{label}» لا تمنحته شركة الملاحة لنفسها؛ يتطلّب اعتماداً إدارياً.'
            )

    # --- the company must actually own the vessel ------------------------
    owns_vessel = (
        vessel.company_id == company.id
        or VesselCompanyRelationship.objects.filter(
            vessel=vessel, company=company, is_active=True,
        ).exists()
    )
    if not owns_vessel:
        raise ValidationError('الشركة غير مرتبطة بهذه السفينة.')

    # --- date coherence ----------------------------------------------------
    if valid_from and valid_until and valid_until < valid_from:
        raise ValidationError({'valid_until': 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية.'})

    # --- duplicate / primary rules ---------------------------------------
    if VesselCompanyRelationship.objects.filter(
        vessel=vessel, company=company, role=role, is_active=True,
    ).exists():
        raise ValidationError('توجد علاقة نشطة بنفس الشركة والدور لهذه السفينة.')

    if is_primary:
        if not is_admin and role not in SELF_SERVICE_RELATIONSHIP_ROLES:
            raise RelationshipPermissionError('لا يمكن إنشاء علاقة أساسية نشطة لهذا الدور.')
        clash = VesselCompanyRelationship.objects.filter(
            vessel=vessel, is_active=True, is_primary=True,
        ).exclude(company=company, role=role)
        if clash.exists():
            raise ValidationError(
                'توجد بالفعل علاقة أساسية نشطة لهذه السفينة؛ تُحدَّث العلاقة القائمة أو تُلغى أولاً.'
            )

    relationship = VesselCompanyRelationship.objects.create(
        vessel=vessel,
        company=company,
        role=role,
        is_primary=is_primary,
        # `valid_from` is NOT NULL with a model default; passing None explicitly
        # would violate the column, so only override when a value was supplied.
        **({'valid_from': valid_from} if valid_from else {}),
        valid_until=valid_until,
        notes=notes,
    )

    _audit(
        relationship,
        ShippingAuditLog.Action.STATUS_CHANGE,
        actor,
        detail={'vessel': vessel.imo_number, 'role': role, 'company': company.name},
        object_type='VesselCompanyRelationship',
    )
    return relationship


# ===========================================================================
# Vessel visit self-service request (Part D)
# ===========================================================================

class VisitRequestError(ValidationError):
    pass


def _agent_entry_point_ids(user):
    """EntryPoints the user may act on, derived from their agent profile.

    Returns ``None`` when the user holds no agent profile, i.e. is not
    agent-restricted. An empty set means "has a profile but authorised nowhere".
    """
    from apps.shipping.models import ShippingAgent

    agents = ShippingAgent.objects.filter(user=user, is_active=True).prefetch_related('ports')
    if not agents.exists():
        return None
    ids = set()
    for agent in agents:
        ids.update(agent.ports.values_list('id', flat=True))
    return ids


@transaction.atomic
def create_vessel_visit_request(
    *, vessel, entry_point, actor, eta=None, planned_departure=None,
    berth=None, remarks='',
):
    """Self-service *port call request* by a shipping company or agent.

    This is deliberately not CRUD over ``VesselVisit``: a request is filed in
    ``EXPECTED`` state and carries no operational authority. Arrival, clearance
    and departure remain sovereign port-side acts.

    Client may supply: vessel, entry point, berth, ETA, planned departure,
    remarks. Everything else — company, status, actual departure — is derived or
    refused.
    """
    from apps.port_health.models import SeaPort, VesselVisit

    if not actor or not actor.is_authenticated:
        raise PermissionDenied('طلب زيارة سفينة يتطلب حساباً موثّقاً.')

    if vessel is None:
        raise VisitRequestError({'vessel': 'السفينة مطلوبة.'})

    # --- the vessel must belong to the caller's company --------------------
    company_ids = None
    is_admin = bool(actor.is_superuser or actor.is_staff)
    if not is_admin:
        from apps.carriers.models import CarrierMember
        company_ids = list(
            CarrierMember.objects.filter(user=actor, is_active=True)
            .values_list('carrier_id', flat=True)
        )
        if not company_ids:
            raise Http404
        if vessel.company_id is None or vessel.company_id not in company_ids:
            # Do not confirm the vessel exists for another company.
            raise Http404

    # --- entry point must be canonical, active and mapped to a SeaPort -----
    if entry_point is None:
        raise VisitRequestError({'entry_point': 'منفذ الدخول مطلوب.'})
    if getattr(entry_point, 'kind', None) != 'SEAPORT':
        raise VisitRequestError({'entry_point': 'منفذ الدخول المحدد ليس ميناءً بحرياً.'})
    if not entry_point.is_active:
        raise VisitRequestError({'entry_point': 'منفذ الدخول غير نشط.'})

    sea_port = SeaPort.objects.filter(entry_point=entry_point, is_active=True).first()
    if sea_port is None:
        raise VisitRequestError({'entry_point': 'لا توجد محطة حجر صحي بحرية نشطة لهذا الميناء.'})

    # --- an agent is further limited to its authorised entry points --------
    agent_eps = _agent_entry_point_ids(actor)
    if agent_eps is not None and entry_point.id not in agent_eps:
        raise Http404

    # --- dates -------------------------------------------------------------
    if eta is None:
        raise VisitRequestError({'eta': 'تاريخ الوصول المتوقع مطلوب.'})
    if planned_departure and planned_departure < eta:
        raise VisitRequestError({'planned_departure': 'تاريخ المغادرة المتوقعة قبل تاريخ الوصول.'})

    # --- duplicate open visit ---------------------------------------------
    if VesselVisit.objects.filter(
        vessel=vessel, port=sea_port, status__in=['EXPECTED', 'ARRIVED'],
    ).exists():
        raise VisitRequestError(
            'يوجد بالفعل طلب/زيارة مفتوحة لنفس السفينة في هذا الميناء.'
        )

    visit = VesselVisit.objects.create(
        vessel=vessel,
        port=sea_port,
        berth=berth,
        arrival_date=eta,
        departure_date=None,          # actual departure is never client-set
        status='EXPECTED',            # not an operational arrival
        # `remarks` is not a VesselVisit field; the request trail lives in the
        # audit log so no new column is introduced.
    )

    _audit(
        visit,
        ShippingAuditLog.Action.STATUS_CHANGE,
        actor,
        detail={
            'vessel_visit': str(visit.id),
            'vessel': vessel.imo_number,
            'entry_point': str(entry_point.id),  # JSON-safe
            'eta': eta.isoformat() if hasattr(eta, 'isoformat') else str(eta),
            'planned_departure': (
                planned_departure.isoformat()
                if hasattr(planned_departure, 'isoformat') else planned_departure
            ),
            'remarks': remarks,
            'request': 'self_service_port_call',
        },
        object_type='VesselVisit',
    )
    return visit


# ===========================================================================
# Vessel departure
# ===========================================================================

#: Departure is a port-authority operation, same authority class as clearance.
DEPARTURE_PERMISSION = 'port_health:edit'


class DepartureBlocked(ValidationError):
    """Raised when a vessel may not depart."""


def _current_clearance(visit):
    """The clearance decision currently in force for this visit, if any.

    Only `is_current=True` counts: a superseded decision is history and must
    never authorise a departure.
    """
    return (
        PortClearanceDecision.objects
        .filter(vessel_visit=visit, is_current=True)
        .order_by('-decided_at')
        .first()
    )


def blocking_port_emergency_exists(visit):
    """Whether an OPEN ``PortEmergency`` blocks this visit (Phase 1D-5, PD-1).

    Two independent clauses, OR-ed:

    1. **Vessel-specific** — ``OPEN`` + ``vessel_restricted`` + the emergency
       names *this* vessel. Deliberately **not** constrained by
       ``emergency.port == visit.port``: the restriction is vessel-centric
       (``vessel_restricted`` = «حركة السفينة مقيدة»), so a vessel stays
       blocked after rerouting until the emergency is ``CLOSED``. Adding a port
       condition here would turn rerouting into a bypass.
    2. **Port-wide** — ``OPEN`` + the emergency names no vessel
       (``vessel IS NULL``) + it applies to *this* visit's port.

    Clause 2 intentionally does **not** require ``vessel_restricted``: that flag
    qualifies a restriction aimed at a named vessel, whereas an emergency with
    no vessel is a port-level event. The two clauses are independent, so a
    vessel may be blocked by either or both.

    This is a **read-time** predicate only: who may create or close an
    emergency is governed separately by ``PortHealthWriteScopeMixin``
    (EntryPoint scope) and is unaffected by this function.
    """
    from django.db.models import Q

    from apps.port_health.models import PortEmergency

    return PortEmergency.objects.filter(
        Q(
            vessel=visit.vessel,
            status=PortEmergency.EmergencyStatus.OPEN,
            vessel_restricted=True,
        )
        | Q(
            vessel__isnull=True,
            port=visit.port,
            status=PortEmergency.EmergencyStatus.OPEN,
        )
    ).exists()


def departure_preconditions(visit):
    """Evaluate every departure rule; returns `(ok, notes)`.

    Rules are ordered from domain to safety so the caller sees the most
    fundamental blocker first.
    """
    notes = []
    ok = True

    # --- visit state -------------------------------------------------------
    if visit.status == 'DEPARTED' or visit.departure_date:
        return False, ['سبق أن غادرت السفينة هذا الميناء.']
    if not visit.port.is_active:
        ok = False
        notes.append('الميناء غير نشط.')

    # --- clearance (Phase 1B-2) ------------------------------------------
    clearance = _current_clearance(visit)
    if clearance is None:
        ok = False
        notes.append('لا يوجد قرار إفراج صحي سارٍ لهذه الزيارة.')

        # A superseded decision must not be mistaken for authority.
        if PortClearanceDecision.objects.filter(vessel_visit=visit).exists():
            notes.append('قرار الإفراج الموجود مُلغى (تم تجاوزه بقرار أحدث).')
    elif clearance.decision == PortClearanceDecision.Decision.REFUSED:
        ok = False
        notes.append('قرار الإفراج الحالي هو «مرفوض» — المغادرة ممنوعة.')
    elif clearance.decision == PortClearanceDecision.Decision.CONDITIONAL:
        # No satisfaction-tracking mechanism exists in the system (audit §5), so
        # conditional clearance cannot be treated as satisfied. Inventing a
        # conditions ledger is out of scope for this phase.
        ok = False
        notes.append(
            'قرار الإفراج «مشروط» ولم يتم إثبات استيفاء الشروط — '
            'لا توجد آلية للتحقق من الشروط في النظام حاليًا.'
        )
    else:  # CLEARED
        notes.append('قرار الإفراج الساري: مُفرج عنها.')

    # --- safety: active isolation -----------------------------------------
    from apps.port_health.models import IsolationRecord
    if IsolationRecord.objects.filter(
        vessel=visit.vessel, status=IsolationRecord.IsolationStatus.ACTIVE,
    ).exists():
        ok = False
        notes.append('يوجد عزل/حجر نشط على السفينة.')

    # --- safety: vessel-restricting emergency (PD-1: vessel-specific OR port-wide)
    if blocking_port_emergency_exists(visit):
        ok = False
        notes.append('يوجد طارئ مفتوح يقيد حركة السفينة.')

    return ok, notes


@transaction.atomic
def record_vessel_departure(*, vessel_visit, actor, notes=''):
    """Record the vessel's departure from the port.

    The canonical path: a departure may only happen through here, which is what
    guarantees a current CLEARED decision, no active isolation, no
    vessel-restricting emergency, port-authority authorship and a server-side
    timestamp.
    """
    # Authorisation mirrors clearance: port authority only, never the shipping
    # company, and never outside the actor's EntryPoint scope.
    _assert_departure_authorizer(actor, vessel_visit)

    ok, reasons = departure_preconditions(vessel_visit)
    if not ok:
        raise DepartureBlocked({'preconditions': reasons})

    now = timezone.now()
    vessel_visit.departure_date = now.date()
    vessel_visit.status = 'DEPARTED'
    vessel_visit.save(update_fields=['departure_date', 'status', 'updated_at'])

    _audit(
        vessel_visit,
        ShippingAuditLog.Action.DEPARTURE_RECORDED,
        actor,
        detail={
            'vessel_visit': str(vessel_visit.id),
            'vessel': vessel_visit.vessel.imo_number,
            'port': vessel_visit.port.code,
            'entry_point': str(vessel_visit.port.entry_point_id),
            'departed_at': now.isoformat(),
            'notes': notes,
        },
        object_type='VesselVisit',
    )
    _notify_departure(vessel_visit, clearance=_current_clearance(vessel_visit))
    return vessel_visit


def _assert_departure_authorizer(user, visit):
    """Departure is an operational port-authority act.

    A shipping company or agent may never perform it, even if the account also
    carries `port_health:edit` — the domain rule is explicit, not incidental.
    """
    if not user or not user.is_authenticated:
        raise PermissionDenied('تسجيل المغادرة يتطلب حساباً موثّقاً.')
    if user.is_superuser:
        return

    if not user.can(DEPARTURE_PERMISSION):
        raise PermissionDenied('المغادرة إجراء تشغيلي يتطلب صلاحية `port_health:edit`.')

    from apps.carriers.models import CarrierMember
    owner = visit.vessel.company_id
    if owner and CarrierMember.objects.filter(user=user, carrier_id=owner, is_active=True).exists():
        raise PermissionDenied('المغادرة لا تُسجَّل من جهة شركة الملاحة نفسها.')

    from core.utils.scoping import resolve_combined_scope_ids

    info = resolve_combined_scope_ids(user)
    if info['has_port_scope']:
        port_ids = info['port_ids'] or []
        if visit.port.entry_point_id not in port_ids:
            raise Http404
    elif not user.can('port_health:add'):
        raise PermissionDenied('لا يوجد نطاق جغرافي صالح لعملية المغادرة.')


def _notify_departure(visit, *, clearance=None):
    """Notify the owning company and the port side that the vessel has sailed."""
    from apps.notifications.models import NotificationLog, NotificationTemplate
    from apps.carriers.models import CarrierMember

    subject = 'تسجيل مغادرة السفينة'
    body = (
        f'السفينة: {visit.vessel.vessel_name}\n'
        f'الميناء: {visit.port.name_ar}\n'
        f'تاريخ المغادرة: {visit.departure_date}'
    )
    if clearance is not None:
        body += f'\nقرار الإفراج: {clearance.get_decision_display()}'

    now = timezone.now()
    recipients = []
    if visit.vessel.company_id:
        for member in CarrierMember.objects.filter(
            carrier_id=visit.vessel.company_id, is_active=True,
        ).select_related('user'):
            recipients.append(member.user)
    if visit.port.entry_point_id:
        from apps.accounts.models import User
        for user in User.objects.filter(is_active=True):
            if not user.can('port_health:view'):
                continue
            ids = {s['scope_id'] for s in user.active_scopes('port_health')
                   if s['scope_type'] in ('POINT', 'PORT')}
            sector_ids = {s['scope_id'] for s in user.active_scopes('port_health')
                          if s['scope_type'] in ('SECTOR', 'REGION')}
            if sector_ids:
                from apps.organization.models import Sector
                from core.utils.ports import sector_entry_points
                for sid in sector_ids:
                    sector = Sector.objects.filter(pk=sid).first()
                    if sector:
                        ids.update(sector_entry_points(sector).values_list('id', flat=True))
            if not ids or visit.port.entry_point_id in ids:
                recipients.append(user)

    seen, sent = set(), 0
    for user in recipients:
        if not user or user.pk in seen:
            continue
        seen.add(user.pk)
        NotificationLog.objects.create(
            user=user,
            channel=NotificationTemplate.Channel.PUSH,
            recipient=user.email,
            subject=subject,
            body=body,
            status=NotificationLog.NotificationStatus.SENT,
            sent_at=now,
        )
        sent += 1
    return sent

#: Permission required to record a government clearance decision.
CLEARANCE_PERMISSION = 'port_health:edit'


class ClearancePreconditionError(ValidationError):
    """Raised when the visit is not in a state that can be decided."""


def _assert_clearance_authorizer(user, visit):
    """Only port-health may decide clearance, within their EntryPoint scope.

    Company/agent scope is *never* accepted here: a shipping relationship does
    not confer government decision authority.
    """
    if not user or not user.is_authenticated:
        raise PermissionDenied('تسجيل قرار الإفراج يتطلب حساباً موثّقاً.')
    if user.is_superuser:
        return

    if not user.can(CLEARANCE_PERMISSION):
        raise PermissionDenied('قرار الإفراج قرار حكومي يتطلب صلاحية `port_health:edit`.')

    # Explicitly refuse company/agent actors even if a role also carries the
    # permission (separation of duties).
    from apps.carriers.models import CarrierMember
    owner = visit.vessel.company_id
    if owner and CarrierMember.objects.filter(user=user, carrier_id=owner, is_active=True).exists():
        raise PermissionDenied(
            'قرار الإفراج لا يُتخذ من جهة شركة الملاحة نفسها.'
        )

    # Geographic control: the visit's operational entry point must be in scope.
    from core.utils.scoping import resolve_combined_scope_ids

    info = resolve_combined_scope_ids(user)
    if info['has_port_scope']:
        port_ids = info['port_ids'] or []
        if visit.port.entry_point_id not in port_ids:
            raise Http404
    elif not user.can('port_health:add'):
        # No geographic scope and no elevated rights: fail closed.
        raise PermissionDenied('لا يوجد نطاق جغرافي صالح لقرار الإفراج.')


def _assert_decision_fields(decision, reason, conditions):
    if decision in PortClearanceDecision.REQUIRE_REASON and not (reason or '').strip():
        raise ValidationError({'reason': 'قرار الرفض يتطلب مبرراً.'})
    if decision in PortClearanceDecision.REQUIRE_CONDITIONS and not (conditions or '').strip():
        raise ValidationError({'conditions': 'الإفراج المشروط يتطلب ذكر الشروط.'})


def clearance_preconditions(visit):
    """Return `(ok, notes)` for the preconditions this system can actually prove.

    Deliberately conservative — only conditions evidenced by existing records
    are enforced. Pre-arrival acceptance is *not* treated as clearance (§9):
    it is reported as context, never as a substitute.
    """
    notes = []
    ok = True

    if not visit.port.is_active:
        ok = False
        notes.append('الميناء غير نشط.')

    if visit.status == 'DEPARTED':
        ok = False
        notes.append('السفينة غادرت الميناء بالفعل.')

    # Outstanding quarantine/isolation on the vessel blocks clearance.
    from apps.port_health.models import IsolationRecord
    if IsolationRecord.objects.filter(
        vessel=visit.vessel, status=IsolationRecord.IsolationStatus.ACTIVE,
    ).exists():
        ok = False
        notes.append('يوجد عزل/حجر نشط على السفينة.')

    # An open port emergency blocks clearance: vessel-specific (Form A clause 1)
    # or port-wide (clause 2). See `blocking_port_emergency_exists`.
    if blocking_port_emergency_exists(visit):
        ok = False
        notes.append('يوجد طارئ مفتوح يقيد حركة السفينة.')

    # Context only — an accepted pre-arrival does NOT clear the vessel.
    pre = getattr(visit, 'pre_arrival_notification', None)
    if pre is None:
        notes.append('لا يوجد إخطار مسبق مسجل.')
    else:
        notes.append(f'حالة الإخطار المسبق: {pre.get_status_display()}.')
        if pre.status == 'REJECTED':
            notes.append('الإخطار المسبق مرفوض — يلزم قرار صريح Porto Health anyway.')

    # --- Phase 1D-6B: maritime health gates -------------------------------
    # Frozen policy:
    #   * a missing declaration/inspection is NOT a blocker (U-1 / U-2) and is
    #     surfaced as a note, never silently treated as "passed";
    #   * a REJECTED declaration blocks;
    #   * a FAILED **or CONDITIONAL** inspection blocks (U-4) — CONDITIONAL has
    #     no satisfaction mechanism yet, so it is treated as FAILED;
    #   * selection is visit-scoped only (U-9 Option A): a visit-less record
    #     never participates, and neither does another visit's record;
    #   * ordering is fully deterministic because `declaration_date` is
    #     client-supplied and ties are ordinary.
    from apps.port_health.models import HealthDeclaration, ShipInspection

    declaration = (
        HealthDeclaration.objects
        .filter(visit=visit)
        .order_by('-declaration_date', '-created_at', '-id')
        .first()
    )
    if declaration is None:
        notes.append('لا يوجد إقرار صحي مرتبط بالزيارة.')
    elif declaration.status == HealthDeclaration.DeclarationStatus.REJECTED:
        ok = False
        notes.append('الإقرار الصحي مرفوض.')

    inspection = (
        ShipInspection.objects
        .filter(visit=visit)
        .order_by('-inspection_date', '-created_at', '-id')
        .first()
    )
    if inspection is None:
        notes.append('لا يوجد تفتيش صحي مرتبط بالزيارة.')
    elif inspection.overall_status in (
        ShipInspection.OverallStatus.FAILED,
        ShipInspection.OverallStatus.CONDITIONAL,
    ):
        ok = False
        notes.append('نتيجة التفتيش لا تسمح بالإفراج.')

    return ok, notes


@transaction.atomic
def record_port_clearance_decision(
    *, vessel_visit, decision, reason='', conditions='', actor, enforce_preconditions=True,
):
    """Record a government Port Health clearance decision for a port call.

    Append-only: an existing current decision is superseded (never overwritten)
    so the full history of government acts is preserved.
    """
    valid = {c[0] for c in PortClearanceDecision.Decision.choices}
    if decision not in valid:
        raise ValidationError({'decision': f'قرار غير معروف: {decision}.'})

    _assert_clearance_authorizer(actor, vessel_visit)
    _assert_decision_fields(decision, reason, conditions)

    if enforce_preconditions:
        ok, notes = clearance_preconditions(vessel_visit)
        if not ok:
            raise ClearancePreconditionError({'preconditions': notes})

    previous = (
        PortClearanceDecision.objects
        .filter(vessel_visit=vessel_visit, is_current=True)
        .order_by('-decided_at')
        .first()
    )

    created = PortClearanceDecision.objects.create(
        vessel_visit=vessel_visit,
        decision=decision,
        reason=(reason or '').strip(),
        conditions=(conditions or '').strip(),
        decided_by=actor,
        decided_at=timezone.now(),
        is_current=True,
        supersedes=previous,
    )
    if previous is not None:
        PortClearanceDecision.objects.filter(pk=previous.pk).update(is_current=False)

    _audit(
        created,
        ShippingAuditLog.Action.CLEARANCE_DECISION_RECORDED,
        actor,
        detail={
            'vessel_visit': str(vessel_visit.id),
            'decision': decision,
            'reason': created.reason,
            'conditions': created.conditions,
            'supersedes': str(previous.id) if previous else None,
        },
        object_type='PortClearanceDecision',
    )
    _notify_clearance(created, supersedes=previous)
    return created


def _notify_clearance(decision_obj, *, supersedes=None):
    """Publish the clearance outcome to the owning company and port health.

    Reuses ``apps.notifications.models.NotificationLog``; no new channel.
    """
    from apps.notifications.models import NotificationLog, NotificationTemplate
    from apps.carriers.models import CarrierMember

    labels = {
        PortClearanceDecision.Decision.CLEARED: 'إفراج صحي',
        PortClearanceDecision.Decision.CONDITIONAL: 'إفراج مشروط',
        PortClearanceDecision.Decision.REFUSED: 'رفض الإفراج',
    }
    visit = decision_obj.vessel_visit
    subject = f'قرار الإفراج الصحي: {labels[decision_obj.decision]}'
    body = (
        f'السفينة: {visit.vessel.vessel_name}\n'
        f'الميناء: {visit.port.name_ar}\n'
        f'القرار: {labels[decision_obj.decision]}'
    )
    if decision_obj.conditions:
        body += f'\nالشروط: {decision_obj.conditions}'
    if decision_obj.reason:
        body += f'\nالمبرر: {decision_obj.reason}'
    if supersedes is not None:
        body += '\n(أُعيد النظر في قرار سابق)'

    now = timezone.now()
    recipients = []
    company = visit.vessel.company_id
    if company:
        for member in CarrierMember.objects.filter(carrier_id=company, is_active=True).select_related('user'):
            recipients.append(member.user)
    if visit.port.entry_point_id:
        from apps.accounts.models import User
        for user in User.objects.filter(is_active=True):
            scopes = user.active_scopes('port_health')
            ids = {s['scope_id'] for s in scopes if s['scope_type'] in ('POINT', 'PORT')}
            sector_ids = {s['scope_id'] for s in scopes if s['scope_type'] in ('SECTOR', 'REGION')}
            if sector_ids:
                from apps.organization.models import Sector
                from core.utils.ports import sector_entry_points
                for sid in sector_ids:
                    sec = Sector.objects.filter(pk=sid).first()
                    if sec:
                        ids.update(sector_entry_points(sec).values_list('id', flat=True))
            if not ids or visit.port.entry_point_id in ids:
                if user.can('port_health:view'):
                    recipients.append(user)

    seen, sent = set(), 0
    for user in recipients:
        if not user or user.pk in seen:
            continue
        seen.add(user.pk)
        NotificationLog.objects.create(
            user=user,
            channel=NotificationTemplate.Channel.PUSH,
            recipient=user.email,
            subject=subject,
            body=body,
            status=NotificationLog.NotificationStatus.SENT,
            sent_at=now,
        )
        sent += 1
    return sent