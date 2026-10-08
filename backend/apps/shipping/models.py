from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


class ShippingAgentType(models.TextChoices):
    """نوع الوكيل الملاحي."""

    PORT_AGENT = 'PORT_AGENT', 'وكيل ميناء'
    SHIP_AGENT = 'SHIP_AGENT', 'وكيل سفينة'
    CARGO_AGENT = 'CARGO_AGENT', 'وكيل شحن'
    MANNING_AGENT = 'MANNING_AGENT', 'وكيل طاقم'
    PROTECTING_AGENT = 'PROTECTING_AGENT', 'وكيل حماية'


class ShippingAgentStatus(models.TextChoices):
    """حالة الوكيل الملاحي."""

    PENDING = 'PENDING', 'قيد المراجعة'
    ACTIVE = 'ACTIVE', 'نشط'
    SUSPENDED = 'SUSPENDED', 'موقوف'
    REVOKED = 'REVOKED', 'ملغى'
    EXPIRED = 'EXPIRED', 'منتهي'


class VesselCompanyRole(models.TextChoices):
    """دور الشركة بالنسبة للسفينة."""

    OWNER = 'OWNER', 'مالك'
    OPERATOR = 'OPERATOR', 'مشغل'
    MANAGER = 'MANAGER', 'مدير'
    CHARTERER = 'CHARTERER', 'مستأجر'


class ShippingAgent(BaseModel):
    """وكيل ملاحي — يمثل شركة أو فرداً مفوضاً بالتصرف نيابة عن شركة ملاحية."""

    company = models.ForeignKey(
        'carriers.Carrier',
        on_delete=models.CASCADE,
        related_name='shipping_agents',
        verbose_name='شركة الملاحة',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shipping_agent_profile',
        verbose_name='المستخدم المرتبط',
    )
    name = models.CharField(max_length=200, verbose_name='الاسم')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    agent_type = models.CharField(
        max_length=20,
        choices=ShippingAgentType.choices,
        default=ShippingAgentType.PORT_AGENT,
        verbose_name='نوع الوكيل',
    )
    license_number = models.CharField(max_length=100, blank=True, verbose_name='رقم الترخيص')
    contact_name = models.CharField(max_length=150, blank=True, verbose_name='جهة الاتصال')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    phone = models.CharField(max_length=30, blank=True, verbose_name='الهاتف')
    address = models.CharField(max_length=255, blank=True, verbose_name='العنوان')
    status = models.CharField(
        max_length=20,
        choices=ShippingAgentStatus.choices,
        default=ShippingAgentStatus.PENDING,
        verbose_name='الحالة',
    )
    valid_from = models.DateField(null=True, blank=True, verbose_name='ساري من')
    valid_until = models.DateField(null=True, blank=True, verbose_name='ساري حتى')
    ports = models.ManyToManyField(
        'masterdata.EntryPoint',
        blank=True,
        related_name='shipping_agents',
        verbose_name='المنافذ المصرح بها',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['company__name', 'name']
        verbose_name = 'وكيل ملاحي'
        verbose_name_plural = 'الوكلاء الملاحيون'
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'license_number'],
                name='uq_shipping_agent_company_license',
                condition=models.Q(license_number__gt=''),
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.company.name})'

    def is_valid(self):
        """تحقق من صلاحية الوكيل بناءً على الحالة والتواريخ."""
        if not self.is_active or self.status != ShippingAgentStatus.ACTIVE:
            return False
        if self.valid_from and self.valid_from > timezone.now().date():
            return False
        if self.valid_until and self.valid_until < timezone.now().date():
            return False
        return True


class VesselCompanyRelationship(BaseModel):
    """علاقة شركة بسفينة — تدعم أدواراً متعددة (مالك، مشغل، مدير، مستأجر)."""

    vessel = models.ForeignKey(
        'port_health.Vessel',
        on_delete=models.CASCADE,
        related_name='company_relationships',
        verbose_name='السفينة',
    )
    company = models.ForeignKey(
        'carriers.Carrier',
        on_delete=models.CASCADE,
        related_name='vessel_relationships',
        verbose_name='شركة الملاحة',
    )
    role = models.CharField(
        max_length=20,
        choices=VesselCompanyRole.choices,
        default=VesselCompanyRole.OPERATOR,
        verbose_name='الدور',
    )
    valid_from = models.DateField(default=timezone.now, verbose_name='ساري من')
    valid_until = models.DateField(null=True, blank=True, verbose_name='ساري حتى')
    is_primary = models.BooleanField(default=False, verbose_name='الدور الأساسي')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['vessel', '-is_primary', 'role']
        verbose_name = 'علاقة شركة بسفينة'
        verbose_name_plural = 'علاقات الشركات بالسفن'
        constraints = [
            models.UniqueConstraint(
                fields=['vessel', 'company', 'role'],
                name='uq_vessel_company_role',
                condition=models.Q(is_active=True),
            ),
            # Prevent duplicate active primary for same vessel+company+role
            models.UniqueConstraint(
                fields=['vessel', 'company', 'role'],
                name='uq_vessel_company_role_primary_active',
                condition=models.Q(is_active=True, is_primary=True),
            ),
            # Ensure valid_until >= valid_from
            models.CheckConstraint(
                check=models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=models.F('valid_from')),
                name='ck_vessel_company_valid_dates',
            ),
        ]

    def __str__(self):
        return f'{self.company.name} → {self.vessel.vessel_name} [{self.get_role_display()}]'


class PreArrivalNotification(BaseModel):
    """إخطار مسبق بوصول سفينة — Maritime Pre-Arrival Notification.

    Anchored on `port_health.VesselVisit` (the Port Call), which is the single
    source of truth for vessel, port, berth and arrival information. Nothing
    here duplicates those: they are resolved through

        PreArrivalNotification -> VesselVisit -> Vessel / SeaPort -> EntryPoint

    Company ownership is likewise derived (``vessel_visit.vessel.company``)
    and never accepted from the client, so a company can only file against
    its own fleet.

    This is the *logistical* pre-arrival step. It intentionally precedes — and
    does not replace — `port_health.HealthDeclaration` (the Maritime
    Declaration of Health), which remains the separate statutory declaration.
    """

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        SUBMITTED = 'SUBMITTED', 'مُقدَّم'
        UNDER_REVIEW = 'UNDER_REVIEW', 'قيد المراجعة'
        ACCEPTED = 'ACCEPTED', 'مقبول'
        REJECTED = 'REJECTED', 'مرفوض'
        CANCELLED = 'CANCELLED', 'ملغى'

    #: Legal transitions. Anything not listed here is rejected by the service.
    TRANSITIONS = {
        Status.DRAFT: {Status.SUBMITTED, Status.CANCELLED},
        Status.SUBMITTED: {Status.UNDER_REVIEW, Status.CANCELLED},
        Status.UNDER_REVIEW: {Status.ACCEPTED, Status.REJECTED, Status.CANCELLED},
        Status.ACCEPTED: set(),
        Status.REJECTED: set(),
        Status.CANCELLED: set(),
    }

    #: Only these states count as "the current active notification" for a visit.
    ACTIVE_STATUSES = {Status.DRAFT, Status.SUBMITTED, Status.UNDER_REVIEW}

    vessel_visit = models.OneToOneField(
        'port_health.VesselVisit',
        on_delete=models.CASCADE,
        related_name='pre_arrival_notification',
        verbose_name='زيارة السفينة (نداء الميناء)',
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
        verbose_name='حالة الإخطار',
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='pre_arrival_submissions',
        verbose_name='قدّم الإخطار',
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ التقديم')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pre_arrival_reviews',
        verbose_name='راجع الإخطار',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ المراجعة')
    review_notes = models.TextField(blank=True, verbose_name='ملاحظات المراجعة')
    remarks = models.TextField(blank=True, verbose_name='ملاحظات مقدّم الإخطار')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'إخطار مسبق بسفينة'
        verbose_name_plural = 'الإخطارات المسبقة للسفن'
        constraints = [
            # reviewed_at only makes sense once review started.
            models.CheckConstraint(
                check=models.Q(reviewed_at__isnull=True) | models.Q(status__in=['UNDER_REVIEW', 'ACCEPTED', 'REJECTED']),
                name='ck_pre_arrival_reviewed_at_requires_review',
            ),
        ]

    def __str__(self):
        return f'{self.vessel_visit.vessel.vessel_name} @ {self.vessel_visit.port.code}'

    # -- resolved, read-only projections -------------------------------------
    @property
    def vessel(self):
        return self.vessel_visit.vessel

    @property
    def company(self):
        """ShippingCompany that owns the vessel (never client-supplied)."""
        return self.vessel_visit.vessel.company

    @property
    def entry_point(self):
        return self.vessel_visit.port.entry_point

    def can_transition_to(self, target):
        return target in self.TRANSITIONS.get(self.status, set())


class PortClearanceDecision(BaseModel):
    """قرار الإفراج الصحي البحري — Port Health clearance decision.

    A **government Port Health determination** about a `VesselVisit` (the port
    call). It is deliberately NOT:

    * pre-arrival acceptance (a separate, earlier decision — see
      ``PreArrivalNotification``);
    * a certificate (see ``SanitationCertificate`` / ``HealthCertificate``,
      which are the *documents*; a decision is the determination);
    * a departure authorisation (not implemented in this phase).

    Nothing about the vessel, port, berth, company or entry point is stored
    here: everything resolves through ``vessel_visit``.

    History, not a single mutable row
    ---------------------------------
    A clearance is a government act that may be reconsidered, so decisions are
    **append-only** (mirroring ``borders_health.BorderDecision``): a visit may
    accumulate several decisions and the newest one is the current one. Earlier
    decisions are never overwritten or deleted.

    Certificate boundary
    --------------------
    The statutory ship sanitation certificate is
    ``port_health.SanitationCertificate`` (SSCC/SSCEC). This decision does not
    create, require, or replace it — a clearance can be recorded without a
    certificate, and a certificate can exist without a clearance.
    """

    class Decision(models.TextChoices):
        CLEARED = 'CLEARED', 'مُفرج عنها'
        CONDITIONAL = 'CONDITIONAL', 'إفراج مشروط'
        REFUSED = 'REFUSED', 'مرفوض'

    #: Decisions that must carry supporting text.
    REQUIRE_REASON = {Decision.REFUSED}
    REQUIRE_CONDITIONS = {Decision.CONDITIONAL}

    vessel_visit = models.ForeignKey(
        'port_health.VesselVisit',
        on_delete=models.CASCADE,
        related_name='clearance_decisions',
        verbose_name='زيارة السفينة',
    )
    decision = models.CharField(
        max_length=20, choices=Decision.choices, verbose_name='القرار',
    )
    reason = models.TextField(blank=True, verbose_name='المبرر')
    conditions = models.TextField(blank=True, verbose_name='الشروط')
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='port_clearance_decisions',
        verbose_name='المُقرِّر',
    )
    decided_at = models.DateTimeField(default=timezone.now, verbose_name='وقت القرار')
    #: Marks the decision currently in force; superseded rows keep the history.
    is_current = models.BooleanField(default=True, verbose_name='القرار الساري')
    supersedes = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='superseded_by', verbose_name='يحل محل',
    )

    class Meta:
        ordering = ['-decided_at']
        verbose_name = 'قرار إفراج صحي بحري'
        verbose_name_plural = 'قرارات الإفراج الصحي البحري'
        indexes = [
            models.Index(fields=['vessel_visit', '-decided_at'], name='pa_clearance_visit'),
        ]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(decision='REFUSED') | ~models.Q(reason=''),
                name='ck_clearance_refused_requires_reason',
            ),
            models.CheckConstraint(
                check=~models.Q(decision='CONDITIONAL') | ~models.Q(conditions=''),
                name='ck_clearance_conditional_requires_conditions',
            ),
            # "supersedes must belong to the same visit" cannot be a CHECK
            # constraint (SQL cannot traverse a FK); it is enforced in
            # `services.record_port_clearance_decision`.
        ]

    def __str__(self):
        return f'{self.vessel_visit.vessel.vessel_name} — {self.get_decision_display()}'

    @property
    def is_cleared(self):
        return self.decision in (self.Decision.CLEARED, self.Decision.CONDITIONAL)


class ShippingAuditLog(BaseModel):
    """سجل تدقيق للتغييرات على شركات الملاحة ووكلائها."""

    class Action(models.TextChoices):
        CREATE = 'CREATE', 'إنشاء'
        UPDATE = 'UPDATE', 'تعديل'
        DELETE = 'DELETE', 'حذف'
        STATUS_CHANGE = 'STATUS_CHANGE', 'تغيير الحالة'
        ASSIGN = 'ASSIGN', 'إسناد'
        REVOKE = 'REVOKE', 'إلغاء إسناد'
        LICENSE_RENEW = 'LICENSE_RENEW', 'تجديد ترخيص'
        CLEARANCE_DECISION_RECORDED = 'CLEARANCE_DECISION_RECORDED', 'تسجيل قرار إفراج'
        DEPARTURE_RECORDED = 'DEPARTURE_RECORDED', 'تسجيل مغادرة السفينة'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shipping_audit_logs',
        verbose_name='المستخدم',
    )
    company = models.ForeignKey(
        'carriers.Carrier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shipping_audit_logs',
        verbose_name='شركة الملاحة',
        help_text='شركة الملاحة المرتبطة بالكائن المُدقَّق — وليست شركة الفاعل. '
                  'مثال: ضابط ميناء يسجّل مغادرة سفينة، فتبقى الشركة هي مالك السفينة.',
    )
    action = models.CharField(
        max_length=32, choices=Action.choices,
        verbose_name='الفعل',
    )
    object_type = models.CharField(max_length=60, verbose_name='نوع الكائن')
    object_id = models.CharField(max_length=80, verbose_name='معرّف الكائن')
    object_label = models.CharField(max_length=255, blank=True, verbose_name='وصف الكائن')
    detail = models.JSONField(default=dict, blank=True, verbose_name='تفاصيل')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الحدث')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل تدقيق ملاحي'
        verbose_name_plural = 'سجلات التدقيق الملاحي'

    def __str__(self):
        return f'{self.user} — {self.action} {self.object_type}'