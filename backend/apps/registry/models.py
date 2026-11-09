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
