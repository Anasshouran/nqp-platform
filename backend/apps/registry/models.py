"""AFYATNA Organizational Registry — M1 foundation models.

Models:
- ReportingNode: the reporting-line tree (root = FEDERAL ministry).
- StateNodeAssignment / LocalityNodeAssignment / HealthFacilityNodeAssignment:
  historical assignments linking existing entities to ReportingNode.
- StateMinistry: state health ministry reference entity.
- RegistryChangeLog: audit trail for registry operations.

READ-ONLY note: this module is the M1 foundation only. No API,
no frontend, no RBAC changes — per the M1 execution spec.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from core.models.base import BaseModel


# ---------------------------------------------------------------------------
# ReportingNode
# ---------------------------------------------------------------------------

class ReportingNode(BaseModel):
    """عقدة في التسلسل التنظيمي الوطني — جذر شجرة Reporting Line."""

    class Kind(models.TextChoices):
        FEDERAL = "FEDERAL", "فيدرالي"
        STATE = "STATE", "ولاية"
        LOCALITY = "LOCALITY", "محلية"
        FACILITY = "FACILITY", "منشأة صحية"
        DEPARTMENT = "DEPARTMENT", "إدارة"
        SERVICE = "SERVICE", "خدمة"

    kind = models.CharField(max_length=20, choices=Kind.choices)
    code = models.CharField(max_length=64, unique=True, verbose_name="الكود")
    name_ar = models.CharField(max_length=200, verbose_name="الاسم بالعربية")
    name_en = models.CharField(max_length=200, blank=True, verbose_name="الاسم بالإنجليزية")
    description = models.TextField(blank=True, verbose_name="الوصف")

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
        verbose_name="العقدة الأعلى",
    )
    path = models.CharField(max_length=512, db_index=True, editable=False)
    depth = models.PositiveSmallIntegerField(default=0, editable=False)

    is_active = models.BooleanField(default=True, verbose_name="نشط")
    order = models.PositiveIntegerField(default=0, verbose_name="الترتيب")

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(parent__isnull=True) | ~Q(parent=F("id")),
                name="reporting_node_no_self_parent",
            ),
            # X-4: يمنع أكثر من جذر واحد على مستوى DB (حماية ضد bulk_create)
            # nulls_distinct=False: NULLs تُعامل كمتطابقة (PostgreSQL 15+)
            models.UniqueConstraint(
                fields=["parent"],
                condition=Q(parent__isnull=True),
                nulls_distinct=False,
                name="reporting_node_single_root",
            ),
        ]
        indexes = [
            models.Index(fields=["path"], name="registry_node_path_idx"),
            models.Index(fields=["kind", "is_active"], name="registry_node_kind_idx"),
            models.Index(fields=["parent", "order"], name="registry_node_parent_idx"),
        ]
        ordering = ["order", "code"]
        verbose_name = "عقدة تبليغ"
        verbose_name_plural = "عقد التبليغ"

    def clean(self):
        super().clean()
        # الجذر الوحيد يجب أن يكون FEDERAL
        if self.parent is None and self.kind != self.Kind.FEDERAL:
            raise ValidationError("Root node must have kind=FEDERAL")
        # D-2 fix: use Django's _state.adding instead of DB query.
        # Note: BaseModel.id has uuid4 default → pk is never None, so
        # 'pk is None' would always be False. _state.adding is set by
        # Django at instantiation and cleared after save() succeeds.
        is_new = self._state.adding
        if self.parent is None and is_new:
            if ReportingNode.objects.filter(parent__isnull=True).exists():
                raise ValidationError("Only one root node (FEDERAL) is allowed")
        # منع self-parent على مستوى التطبيق أيضاً (القيد في Meta أعمق)
        if self.pk is not None and self.parent_id == self.pk:
            raise ValidationError("A node cannot be its own parent")

    def save(self, *args, **kwargs):
        # تحقق من سلامة الشجرة قبل الحفظ (clean + full layout)
        self.full_clean(exclude=["path", "depth"])
        # بناء path و depth من الـ parent الحالي
        if self.parent_id is None:
            self.path = str(self.id) if self.id else ""
            self.depth = 0
        else:
            parent = self.parent
            self.depth = parent.depth + 1
            self.path = f"{parent.path}/{self.id}" if self.path else ""
        super().save(*args, **kwargs)
        # بعد أول حفظ: path يحتاج id — حدّثه إن كان فارغاً (أول إنشاء)
        if self.parent_id is None:
            expected = str(self.id)
        else:
            expected = f"{self.parent.path}/{self.id}"
        if self.path != expected:
            self.path = expected
            super().save(update_fields=["path", "depth", "updated_at"])
        # إن تغيّر الـ parent: حدّث descendants
        self._cascade_path_depth()

    def _cascade_path_depth(self):
        """تحديث path و depth لكل الأبناء بعد تغيير موقع العقدة."""
        for child in self.children.all():
            old_path_prefix = None  # يُحسب من child فعلياً
            child_depth = self.depth + 1
            child.path = f"{self.path}/{child.id}"
            child.depth = child_depth
            child.save(update_fields=["path", "depth", "updated_at"])
            child._cascade_path_depth()

    def __str__(self):
        return f"{self.code} — {self.name_ar}"


# ---------------------------------------------------------------------------
# Assignment models (historical linking to the tree)
# ---------------------------------------------------------------------------

class _NodeAssignmentBase(BaseModel):
    """قاعدة مشتركة لتعيين كيان خارجي إلى عقدة في الشجرة."""

    target = None  # يُعرَّف في كل نموذج فرعي
    node = models.ForeignKey(
        ReportingNode,
        on_delete=models.PROTECT,
        related_name="%(class)s_set",
    )
    valid_from = models.DateField(verbose_name="من تاريخ")
    valid_to = models.DateField(null=True, blank=True, verbose_name="إلى تاريخ")
    is_primary = models.BooleanField(default=False, verbose_name="أساسي")
    note = models.TextField(blank=True, verbose_name="ملاحظة")

    class Meta:
        abstract = True

    def clean(self):
        super().clean()
        if self.valid_to and self.valid_to <= self.valid_from:
            raise ValidationError("valid_to must be after valid_from")

        if self.is_primary and self.valid_to is None:
            # استخدام اسم حقل FK الحقيقي (state/locality/facility)
            field_name = self._target_field_name()
            qs = self.__class__.objects.filter(
                **{field_name: self.target},
                is_primary=True,
                valid_to__isnull=True,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    "Another primary assignment is active for this target"
                )

    def _target_field_name(self):
        """اسم حقل FK للهدف في النموذج الفرعي."""
        # الرابط بالأسماء: state/locality/facility
        for name in ("state", "locality", "facility"):
            field = self._meta.get_field(name) if hasattr(self, '_meta') else None
            if field is not None:
                return name
        raise AttributeError("No target FK field found")


class StateNodeAssignment(_NodeAssignmentBase):
    """تعيين ولاية إلى عقدة في الشجرة — تاريخي."""

    state = models.ForeignKey(
        "masterdata.State",
        on_delete=models.CASCADE,
        related_name="node_assignments",
        verbose_name="الولاية",
    )

    # الحقل التمهيدي لـ _NodeAssignmentBase.clean()
    @property
    def target(self):
        return self.state

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(valid_to__isnull=True) | Q(valid_to__gt=F("valid_from")),
                name="state_assignment_valid_range",
            ),
            models.UniqueConstraint(
                fields=["state", "valid_from"],
                name="state_assignment_unique_start",
            ),
        ]
        indexes = [
            models.Index(fields=["state", "valid_to"], name="state_assign_state_to_idx"),
            models.Index(fields=["node", "valid_to"], name="state_assign_node_to_idx"),
        ]
        ordering = ["-valid_from"]
        verbose_name = "تعيين ولاية"
        verbose_name_plural = "تعيينات الولايات"

    def __str__(self):
        return f"{self.state} → {self.node.code}"


class LocalityNodeAssignment(_NodeAssignmentBase):
    """تعيين محلية إلى عقدة في الشجرة — تاريخي."""

    locality = models.ForeignKey(
        "organization.Locality",
        on_delete=models.CASCADE,
        related_name="node_assignments",
        verbose_name="المحلية",
    )

    @property
    def target(self):
        return self.locality

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(valid_to__isnull=True) | Q(valid_to__gt=F("valid_from")),
                name="locality_assignment_valid_range",
            ),
            models.UniqueConstraint(
                fields=["locality", "valid_from"],
                name="locality_assignment_unique_start",
            ),
        ]
        indexes = [
            models.Index(fields=["locality", "valid_to"], name="locality_assign_loc_to_idx"),
            models.Index(fields=["node", "valid_to"], name="locality_assign_node_to_idx"),
        ]
        ordering = ["-valid_from"]
        verbose_name = "تعيين محلية"
        verbose_name_plural = "تعيينات المحليات"

    def __str__(self):
        return f"{self.locality} → {self.node.code}"


class HealthFacilityNodeAssignment(_NodeAssignmentBase):
    """تعيين منشأة صحية إلى عقدة في الشجرة — تاريخي."""

    facility = models.ForeignKey(
        "masterdata.HealthFacility",
        on_delete=models.CASCADE,
        related_name="node_assignments",
        verbose_name="المنشأة",
    )

    @property
    def target(self):
        return self.facility

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(valid_to__isnull=True) | Q(valid_to__gt=F("valid_from")),
                name="facility_assignment_valid_range",
            ),
            models.UniqueConstraint(
                fields=["facility", "valid_from"],
                name="facility_assignment_unique_start",
            ),
        ]
        indexes = [
            models.Index(fields=["facility", "valid_to"], name="facility_assign_fac_to_idx"),
            models.Index(fields=["node", "valid_to"], name="facility_assign_node_to_idx"),
        ]
        ordering = ["-valid_from"]
        verbose_name = "تعيين منشأة"
        verbose_name_plural = "تعيينات المنشآت"

    def __str__(self):
        return f"{self.facility} → {self.node.code}"


# ---------------------------------------------------------------------------
# StateMinistry
# ---------------------------------------------------------------------------

class StateMinistry(BaseModel):
    """وزارة صحة الولاية — كيان إداري مرجعي."""

    state = models.OneToOneField(
        "masterdata.State",
        on_delete=models.PROTECT,
        related_name="ministry",
        verbose_name="الولاية",
    )
    ministry_name_ar = models.CharField(max_length=200, verbose_name="اسم الوزارة (عربي)")
    ministry_name_en = models.CharField(max_length=200, blank=True, verbose_name="اسم الوزارة (إنجليزي)")
    address = models.TextField(blank=True, verbose_name="العنوان")
    phone = models.CharField(max_length=40, blank=True, verbose_name="الهاتف")
    email = models.EmailField(blank=True, verbose_name="البريد الإلكتروني")
    website = models.URLField(blank=True, verbose_name="الموقع الإلكتروني")
    is_active = models.BooleanField(default=True, verbose_name="نشط")

    class Meta:
        ordering = ["ministry_name_ar"]
        verbose_name = "وزارة ولاية"
        verbose_name_plural = "وزارات الولايات"

    def __str__(self):
        return self.ministry_name_ar


# ---------------------------------------------------------------------------
# RegistryChangeLog
# ---------------------------------------------------------------------------

class RegistryChangeLog(BaseModel):
    """سجل تدقيق خاص بالسجل التنظيمي."""

    class Action(models.TextChoices):
        CREATE = "CREATE", "إنشاء"
        UPDATE = "UPDATE", "تعديل"
        DELETE = "DELETE", "حذف"
        ASSIGN = "ASSIGN", "تعيين"
        REASSIGN = "REASSIGN", "إعادة تعيين"
        DEACTIVATE = "DEACTIVATE", "تعطيل"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registry_change_logs",
        verbose_name="المستخدم",
    )
    action = models.CharField(max_length=20, choices=Action.choices, verbose_name="الفعل")
    entity_type = models.CharField(max_length=64, verbose_name="نوع الكيان")
    entity_id = models.UUIDField(db_index=True, verbose_name="معرّف الكيان")
    entity_label = models.CharField(max_length=200, blank=True, verbose_name="وصف الكيان")
    detail = models.JSONField(default=dict, verbose_name="التفاصيل")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="عنوان IP")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="وقت الحدث")

    class Meta:
        indexes = [
            models.Index(fields=["entity_type", "entity_id"], name="registry_log_entity_idx"),
            models.Index(fields=["created_at"], name="registry_log_created_idx"),
            models.Index(fields=["user", "created_at"], name="registry_log_user_idx"),
        ]
        ordering = ["-created_at"]
        verbose_name = "سجل تغييرات"
        verbose_name_plural = "سجل تغييرات السجل التنظيمي"

    def __str__(self):
        return f"{self.action} {self.entity_type} {self.entity_id}"


# ---------------------------------------------------------------------------
# FacilityOwner (Institutional Ownership مرجع)
# ---------------------------------------------------------------------------

class FacilityOwner(BaseModel):
    """جهة مالكة — كيان مرجعي (وزارة، NGO، خاص، إلخ).
    
    المستوى الثالث من الأبعاد الثلاثة (Institutional Ownership).
    مستقل عن ReportingNode (الذي يمثل خط التبليغ) وعن TechnicalSupervision.
    """

    class Kind(models.TextChoices):
        FEDERAL_MINISTRY = 'FEDERAL_MINISTRY', 'وزارة اتحادية'
        STATE_MINISTRY = 'STATE_MINISTRY', 'وزارة ولاية'
        LOCALITY = 'LOCALITY', 'محلية'
        MILITARY = 'MILITARY', 'عسكري'
        PRIVATE = 'PRIVATE', 'خاص'
        NGO = 'NGO', 'منظمة غير حكومية'
        FAITH_BASED = 'FAITH_BASED', 'مؤسسة دينية'
        UN_AGENCY = 'UN_AGENCY', 'وكالة أممية'
        OTHER = 'OTHER', 'أخرى'

    code = models.CharField(max_length=64, unique=True, verbose_name="الكود")
    name_ar = models.CharField(max_length=200, verbose_name="الاسم بالعربية")
    name_en = models.CharField(max_length=200, blank=True, verbose_name="الاسم بالإنجليزية")
    kind = models.CharField(max_length=32, choices=Kind.choices, verbose_name="النوع")
    description = models.TextField(blank=True, verbose_name="الوصف")

    # مرجع اختياري إلى كيان آخر في النظام (StateMinistry, إلخ)
    reference_type = models.CharField(
        max_length=64, blank=True,
        help_text='اسم النموذج المرجعي، مثل: StateMinistry',
    )
    reference_id = models.UUIDField(null=True, blank=True)

    is_active = models.BooleanField(default=True, verbose_name="نشط")

    class Meta:
        ordering = ['kind', 'code']
        verbose_name = 'جهة مالكة'
        verbose_name_plural = 'الجهات المالكة'
        indexes = [
            models.Index(fields=['kind', 'is_active'], name='facility_owner_kind_idx'),
            models.Index(fields=['reference_type', 'reference_id'], name='facility_owner_ref_idx'),
        ]

    def __str__(self):
        return f'{self.name_ar} ({self.get_kind_display()})'

    def clean(self):
        super().clean()
        # D-M3-2-1: تحقق مرجعي — reference_id يجب أن يتوافق مع reference_type
        if self.reference_id and not self.reference_type:
            raise ValidationError({
                'reference_type': 'reference_type مطلوب عند وجود reference_id',
            })
        if self.reference_type and not self.reference_id:
            raise ValidationError({
                'reference_id': 'reference_id مطلوب عند وجود reference_type',
            })
        if self.reference_type == 'StateMinistry' and self.reference_id:
            if not StateMinistry.objects.filter(pk=self.reference_id).exists():
                raise ValidationError({
                    'reference_id': f'StateMinistry بـ id={self.reference_id} غير موجود',
                })
        # reference_type آخر: مقبول (polymorphic، غير محقَّق)


# ---------------------------------------------------------------------------
# FacilityOwnership (علاقة الملكية التاريخية)
# ---------------------------------------------------------------------------

class FacilityOwnership(BaseModel):
    """ملكية منشأة صحية — تاريخية.
    
    منشأة قد تكون:
    - مملوكة فيدرالياً ثم انتقلت لولاية (تاريخ).
    - مملوكة لعدة جهات (M2M عبر صفوف متعددة).
    
    قيود:
    - valid_to > valid_from
    - مالك أساسي واحد نشط فقط
    """

    facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.PROTECT,
        related_name='ownerships',
        verbose_name='المنشأة',
    )
    owner = models.ForeignKey(
        FacilityOwner,
        on_delete=models.PROTECT,
        related_name='facility_ownerships',
        verbose_name='المالك',
    )
    is_primary = models.BooleanField(default=False, verbose_name='أساسي')
    valid_from = models.DateField(verbose_name='من تاريخ')
    valid_to = models.DateField(null=True, blank=True, verbose_name='إلى تاريخ')
    note = models.TextField(blank=True, verbose_name='ملاحظة')

    class Meta:
        ordering = ['-valid_from']
        verbose_name = 'ملكية منشأة'
        verbose_name_plural = 'ملكيات المنشآت'
        constraints = [
            models.CheckConstraint(
                check=models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=models.F('valid_from')),
                name='facility_ownership_valid_range',
            ),
            # D-M3-2-3: منع تعيينين نشطين لنفس (facility, owner)
            models.UniqueConstraint(
                fields=['facility', 'owner'],
                condition=models.Q(valid_to__isnull=True),
                name='facility_ownership_unique_active',
            ),
        ]
        indexes = [
            models.Index(fields=['facility', 'valid_to'], name='facility_ow_fac_to_idx'),
            models.Index(fields=['owner', 'valid_to'], name='facility_ow_own_to_idx'),
            models.Index(fields=['facility', 'is_primary'], name='facility_ow_fac_prim_idx'),
        ]

    def clean(self):
        super().clean()
        if self.valid_to and self.valid_to <= self.valid_from:
            raise ValidationError('valid_to must be after valid_from')
        # تعيين أساسي واحد نشط لكل منشأة
        if self.is_primary and self.valid_to is None:
            qs = FacilityOwnership.objects.filter(
                facility=self.facility, is_primary=True, valid_to__isnull=True,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    'Another primary ownership is active for this facility'
                )

    def __str__(self):
        return f'{self.facility} ← {self.owner} ({self.valid_from})'


# ---------------------------------------------------------------------------
# TechnicalSupervisor (Technical Supervision مرجع)
# ---------------------------------------------------------------------------

class TechnicalSupervisor(BaseModel):
    """جهة إشراف فني — كيان مرجعي.
    
    المستوى الثالث من الأبعاد الثلاثة (Technical Supervision).
    مستقل عن ReportingNode (خط التبليغ) وعن FacilityOwner (الملكية).
    
    أمثلة:
    - برنامج مكافحة السل (فيدرالي)
    - مديرية الصحة بالولاية
    - مجلس التخصصات الطبية
    - منظمة WHO
    """

    class Kind(models.TextChoices):
        FEDERAL_PROGRAM = 'FEDERAL_PROGRAM', 'برنامج فيدرالي'
        STATE_HEALTH_DEPT = 'STATE_HEALTH_DEPT', 'مديرية صحة ولائية'
        ACADEMIC = 'ACADEMIC', 'جهة أكاديمية'
        UN_AGENCY = 'UN_AGENCY', 'وكالة أممية'
        NGO = 'NGO', 'منظمة غير حكومية'
        OTHER = 'OTHER', 'أخرى'

    class Domain(models.TextChoices):
        """المجال الفني للإشراف."""
        TB = 'TB', 'السل'
        HIV = 'HIV', 'فيروس نقص المناعة'
        IMMUNIZATION = 'IMMUNIZATION', 'التطعيم'
        SURVEILLANCE = 'SURVEILLANCE', 'الترصد'
        MATERNAL = 'MATERNAL', 'صحة الأم'
        CHILD = 'CHILD', 'صحة الطفل'
        NUTRITION = 'NUTRITION', 'التغذية'
        QUARANTINE = 'QUARANTINE', 'الحجر الصحي'
        LABORATORY = 'LABORATORY', 'المختبرات'
        GENERAL = 'GENERAL', 'عام'
        OTHER = 'OTHER', 'أخرى'

    code = models.CharField(max_length=64, unique=True, verbose_name="الكود")
    name_ar = models.CharField(max_length=200, verbose_name="الاسم بالعربية")
    name_en = models.CharField(max_length=200, blank=True, verbose_name="الاسم بالإنجليزية")
    kind = models.CharField(max_length=32, choices=Kind.choices, verbose_name="النوع")
    domain = models.CharField(max_length=32, choices=Domain.choices, verbose_name="المجال")
    description = models.TextField(blank=True, verbose_name="الوصف")

    # مرجع اختياري إلى كيان آخر
    reference_type = models.CharField(max_length=64, blank=True)
    reference_id = models.UUIDField(null=True, blank=True)

    is_active = models.BooleanField(default=True, verbose_name="نشط")

    class Meta:
        ordering = ['domain', 'code']
        verbose_name = 'جهة إشراف فني'
        verbose_name_plural = 'جهات الإشراف الفني'
        indexes = [
            models.Index(fields=['kind', 'is_active'], name='tech_sup_kind_idx'),
            models.Index(fields=['domain', 'is_active'], name='tech_sup_domain_idx'),
        ]

    def clean(self):
        super().clean()
        if self.reference_id and not self.reference_type:
            raise ValidationError({'reference_type': 'مطلوب عند وجود reference_id'})
        if self.reference_type and not self.reference_id:
            raise ValidationError({'reference_id': 'مطلوب عند وجود reference_type'})
        
        # D-M3-3-3: التحقق الوجودي (مثل D-M3-2-1 في FacilityOwner)
        if self.reference_type == 'StateMinistry' and self.reference_id:
            if not StateMinistry.objects.filter(pk=self.reference_id).exists():
                raise ValidationError({
                    'reference_id': f'StateMinistry بـ id={self.reference_id} غير موجود',
                })
        if self.reference_type == 'FacilityOwner' and self.reference_id:
            if not FacilityOwner.objects.filter(pk=self.reference_id).exists():
                raise ValidationError({
                    'reference_id': f'FacilityOwner بـ id={self.reference_id} غير موجود',
                })
        # reference_type آخر: مقبول (polymorphic، غير محقَّق)

    def __str__(self):
        return f'{self.name_ar} ({self.get_domain_display()})'


# ---------------------------------------------------------------------------
# TechnicalSupervision (علاقة الإشراف التاريخية)
# ---------------------------------------------------------------------------

class TechnicalSupervision(BaseModel):
    """إشراف فني على منشأة صحية — تاريخي.
    
    M3-3 MVP: target_type = FACILITY فقط.
    الحقل target_type جاهز للتوسع (SERVICE_POINT, DEPARTMENT) في M4.
    """

    class TargetType(models.TextChoices):
        FACILITY = 'FACILITY', 'منشأة صحية'
        # SERVICE_POINT = 'SERVICE_POINT', 'نقطة خدمة'  (M4)
        # DEPARTMENT = 'DEPARTMENT', 'إدارة'              (M4)

    class SupervisionLevel(models.TextChoices):
        PRIMARY = 'PRIMARY', 'أساسي'
        SUPPORTIVE = 'SUPPORTIVE', 'مساند'
        OVERSIGHT = 'OVERSIGHT', 'رقابي'

    # --- Target (MVP: facility only) ---
    target_type = models.CharField(
        max_length=32, choices=TargetType.choices, default='FACILITY',
        verbose_name='نوع الهدف',
    )
    facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.PROTECT,
        related_name='technical_supervisions',
        null=True, blank=True,  # nullable لأن target_type قد يتوسع مستقبلاً
        verbose_name='المنشأة',
    )
    # service_point / department (M4) — لا تُضاف الآن

    # --- Supervisor ---
    supervisor = models.ForeignKey(
        TechnicalSupervisor,
        on_delete=models.PROTECT,
        related_name='supervisions',
        verbose_name='المشرف',
    )

    # --- Relationship metadata ---
    supervision_level = models.CharField(
        max_length=16, choices=SupervisionLevel.choices, default='PRIMARY',
        verbose_name='مستوى الإشراف',
    )
    is_primary = models.BooleanField(default=False, verbose_name='أساسي')
    valid_from = models.DateField(verbose_name='من تاريخ')
    valid_to = models.DateField(null=True, blank=True, verbose_name='إلى تاريخ')
    note = models.TextField(blank=True, verbose_name='ملاحظة')

    class Meta:
        ordering = ['-valid_from']
        verbose_name = 'إشراف فني'
        verbose_name_plural = 'الإشراف الفني'
        constraints = [
            models.CheckConstraint(
                check=models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=models.F('valid_from')),
                name='technical_supervision_valid_range',
            ),
            # MVP: target_type=FACILITY يتطلب facility غير null
            models.CheckConstraint(
                check=(
                    models.Q(target_type='FACILITY', facility__isnull=False)
                    | ~models.Q(target_type='FACILITY')
                ),
                name='technical_supervision_facility_required',
            ),
            # لا إشرافين أساسيين نشطين لنفس (facility, supervisor)
            models.UniqueConstraint(
                fields=['facility', 'supervisor'],
                condition=models.Q(valid_to__isnull=True),
                name='technical_supervision_unique_active',
            ),
        ]
        indexes = [
            models.Index(fields=['facility', 'valid_to'], name='tech_sup_fac_to_idx'),
            models.Index(fields=['supervisor', 'valid_to'], name='tech_sup_sup_to_idx'),
            models.Index(fields=['facility', 'is_primary'], name='tech_sup_fac_prim_idx'),
            models.Index(fields=['target_type', 'valid_to'], name='tech_sup_type_to_idx'),
        ]

    def clean(self):
        super().clean()
        if self.valid_to and self.valid_to <= self.valid_from:
            raise ValidationError('valid_to must be after valid_from')
        if self.target_type == 'FACILITY' and not self.facility:
            raise ValidationError({'facility': 'مطلوب عند target_type=FACILITY'})
        # تعيين أساسي واحد نشط لكل (facility, supervisor)
        if self.is_primary and self.valid_to is None and self.facility:
            qs = TechnicalSupervision.objects.filter(
                facility=self.facility,
                supervisor=self.supervisor,
                is_primary=True,
                valid_to__isnull=True,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    'Another primary supervision exists for this facility+supervisor'
                )

    def __str__(self):
        return f'{self.facility} ← {self.supervisor} ({self.valid_from})'


# ---------------------------------------------------------------------------
# DepartmentNodeAssignment (ربط Department بشجرة Reporting)
# ---------------------------------------------------------------------------

class DepartmentNodeAssignment(BaseModel):
    """تعيين إدارة (organization.Department) إلى عقدة ReportingNode.
    
    يتبع نفس نمط StateNodeAssignment / LocalityNodeAssignment / 
    HealthFacilityNodeAssignment من M1.
    
    القيود:
    - valid_to > valid_from
    - تعيين أساسي واحد نشط لكل إدارة
    - node.kind يجب أن يكون 'DEPARTMENT' (يُفرَض في clean())
    """

    department = models.ForeignKey(
        'organization.Department',
        on_delete=models.CASCADE,
        related_name='node_assignments',
        verbose_name='الإدارة',
    )
    node = models.ForeignKey(
        ReportingNode,
        on_delete=models.PROTECT,
        related_name='department_assignments',
        verbose_name='العقدة',
    )
    valid_from = models.DateField(verbose_name='من تاريخ')
    valid_to = models.DateField(null=True, blank=True, verbose_name='إلى تاريخ')
    is_primary = models.BooleanField(default=False, verbose_name='أساسي')
    note = models.TextField(blank=True, verbose_name='ملاحظة')

    class Meta:
        ordering = ['-valid_from']
        verbose_name = 'تعيين إدارة'
        verbose_name_plural = 'تعيينات الإدارات'
        constraints = [
            models.CheckConstraint(
                check=models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=models.F('valid_from')),
                name='department_node_assignment_valid_range',
            ),
            models.UniqueConstraint(
                fields=['department', 'valid_from'],
                name='department_node_assignment_unique_start',
            ),
        ]
        indexes = [
            models.Index(fields=['department', 'valid_to'], name='dept_assign_dept_to_idx'),
            models.Index(fields=['node', 'valid_to'], name='dept_assign_node_to_idx'),
            models.Index(fields=['department', 'is_primary'], name='dept_assign_dept_prim_idx'),
        ]

    def clean(self):
        super().clean()
        if self.valid_to and self.valid_to <= self.valid_from:
            raise ValidationError('valid_to must be after valid_from')
        # التحقق من node.kind
        if self.node and self.node.kind != 'DEPARTMENT':
            raise ValidationError({
                'node': f'node.kind يجب أن يكون DEPARTMENT، وليس {self.node.kind}',
            })
        # تعيين أساسي واحد نشط لكل إدارة
        if self.is_primary and self.valid_to is None:
            qs = DepartmentNodeAssignment.objects.filter(
                department=self.department,
                is_primary=True,
                valid_to__isnull=True,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    'Another primary assignment is active for this department'
                )

    def __str__(self):
        return f'{self.department} ← {self.node.code} ({self.valid_from})'


# ---------------------------------------------------------------------------
# Service (catalog) + ServiceAvailability (M2M via rows)
# ---------------------------------------------------------------------------

class Service(BaseModel):
    """خدمة صحية مرجعية (كتالوج وطني).
    
    كتالوج مركزي — لا يتبع منشأة أو إدارة.
    التوفّر (ServiceAvailability) يحدد أين تُقدَّم.
    
    ADR-03: لا تُفرض تبعية خدمة لمنشأة واحدة.
    """

    class Category(models.TextChoices):
        PRIMARY_CARE = 'PRIMARY_CARE', 'رعاية أولية'
        EMERGENCY = 'EMERGENCY', 'طوارئ'
        SURGERY = 'SURGERY', 'جراحة'
        MATERNAL = 'MATERNAL', 'صحة الأم'
        CHILD = 'CHILD', 'صحة الطفل'
        NUTRITION = 'NUTRITION', 'تغذية'
        TB = 'TB', 'السل'
        HIV = 'HIV', 'فيروس نقص المناعة'
        IMMUNIZATION = 'IMMUNIZATION', 'تطعيم'
        SURVEILLANCE = 'SURVEILLANCE', 'ترصد'
        QUARANTINE = 'QUARANTINE', 'حجر صحي'
        LABORATORY = 'LABORATORY', 'مختبر'
        IMAGING = 'IMAGING', 'أشعة'
        PHARMACY = 'PHARMACY', 'صيدلة'
        MENTAL_HEALTH = 'MENTAL_HEALTH', 'صحة نفسية'
        OTHER = 'OTHER', 'أخرى'

    code = models.CharField(max_length=64, unique=True, verbose_name="الكود")
    name_ar = models.CharField(max_length=200, verbose_name="الاسم بالعربية")
    name_en = models.CharField(max_length=200, blank=True, verbose_name="الاسم بالإنجليزية")
    category = models.CharField(max_length=32, choices=Category.choices, verbose_name="الفئة")
    description = models.TextField(blank=True, verbose_name="الوصف")
    is_active = models.BooleanField(default=True, verbose_name="نشط")

    class Meta:
        ordering = ['category', 'code']
        verbose_name = 'خدمة'
        verbose_name_plural = 'الخدمات'
        indexes = [
            models.Index(fields=['category', 'is_active'], name='service_category_idx'),
        ]

    def __str__(self):
        return f'{self.name_ar} ({self.get_category_display()})'


class ServiceAvailability(BaseModel):
    """توفّر خدمة في منشأة أو إدارة — تاريخي.
    
    Service ← M2M → Facility/Department (عبر صفوف متعددة).
    
    ADR-03: خدمة يمكن أن تُقدَّم في عدة منشآت/إدارات.
    """

    class TargetType(models.TextChoices):
        FACILITY = 'FACILITY', 'منشأة صحية'
        DEPARTMENT = 'DEPARTMENT', 'إدارة'

    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name='availabilities',
        verbose_name='الخدمة',
    )

    target_type = models.CharField(max_length=16, choices=TargetType.choices, verbose_name="نوع الهدف")
    facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.CASCADE,
        related_name='service_availabilities',
        null=True, blank=True,
        verbose_name='المنشأة',
    )
    department = models.ForeignKey(
        'organization.Department',
        on_delete=models.CASCADE,
        related_name='service_availabilities',
        null=True, blank=True,
        verbose_name='الإدارة',
    )

    valid_from = models.DateField(verbose_name='من تاريخ')
    valid_to = models.DateField(null=True, blank=True, verbose_name='إلى تاريخ')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    note = models.TextField(blank=True, verbose_name='ملاحظة')

    class Meta:
        ordering = ['-valid_from']
        verbose_name = 'توفر خدمة'
        verbose_name_plural = 'توفر الخدمات'
        constraints = [
            # valid range
            models.CheckConstraint(
                check=models.Q(valid_to__isnull=True) | models.Q(valid_to__gt=models.F('valid_from')),
                name='service_availability_valid_range',
            ),
            # exactly one target
            models.CheckConstraint(
                check=(
                    models.Q(target_type='FACILITY', facility__isnull=False, department__isnull=True)
                    | models.Q(target_type='DEPARTMENT', department__isnull=False, facility__isnull=True)
                ),
                name='service_availability_exactly_one_target',
            ),
            # no duplicate active (service, facility) or (service, department)
            models.UniqueConstraint(
                fields=['service', 'facility'],
                condition=models.Q(valid_to__isnull=True, facility__isnull=False),
                name='service_availability_unique_active_facility',
            ),
            models.UniqueConstraint(
                fields=['service', 'department'],
                condition=models.Q(valid_to__isnull=True, department__isnull=False),
                name='service_availability_unique_active_department',
            ),
        ]
        indexes = [
            models.Index(fields=['service', 'valid_to'], name='svc_avail_svc_to_idx'),
            models.Index(fields=['facility', 'valid_to'], name='svc_avail_fac_to_idx'),
            models.Index(fields=['department', 'valid_to'], name='svc_avail_dept_to_idx'),
            models.Index(fields=['target_type', 'valid_to'], name='svc_avail_type_to_idx'),
        ]

    def clean(self):
        super().clean()
        if self.valid_to and self.valid_to <= self.valid_from:
            raise ValidationError('valid_to must be after valid_from')
        if self.target_type == 'FACILITY':
            if not self.facility:
                raise ValidationError({'facility': 'مطلوب عند target_type=FACILITY'})
            if self.department:
                raise ValidationError({'department': 'يجب أن يكون فارغاً عند target_type=FACILITY'})
        elif self.target_type == 'DEPARTMENT':
            if not self.department:
                raise ValidationError({'department': 'مطلوب عند target_type=DEPARTMENT'})
            if self.facility:
                raise ValidationError({'facility': 'يجب أن يكون فارغاً عند target_type=DEPARTMENT'})

    def __str__(self):
        # آمن ضد حذف العلاقات (CASCADE) — لا يفشل عند حذف facility/department أولاً
        try:
            target = self.facility or self.department
        except Exception:
            target = f'id:{self.facility_id or self.department_id}'
        try:
            svc_code = self.service.code
        except Exception:
            svc_code = f'svc:{self.service_id}'
        return f'{svc_code} @ {target} ({self.valid_from})'
