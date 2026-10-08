"""دورات تقييم الأداء والتقييمات الفردية.

`PerformanceCycle` يعرّف نافذة التقييم (فترة، كpis، مواعيد)،
و`PerformanceReview` تقييم موظف واحد في تلك الدورة.

الفصل مقصود: الدورة رأس واحد يتحكم في القواعد (من يُقيَّم، ما الأوزان)،
والتقييم صفّ يحفظ النتائج. لولا الفصل لتكرّرت القاعدة مع كل موظف.

مجموع الأوزان لا يُفرض عند إنشاء الدورة وحدها (|kpis| غير معروف بعد)، بل
يُتحقَّق عند **إغلاق** الدورة: حتى ذلك الحين يمكن إضافة مؤشر وتعديل وزنه،
ولا يُقفل دليل ناقص.
"""

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import BaseModel

from apps.accounts.models import EmployeeProfile, User


class CycleStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'مسودة'
    OPEN = 'OPEN', 'مفتوحة'
    CLOSED = 'CLOSED', 'مغلقة'
    ARCHIVED = 'ARCHIVED', 'مؤرشفة'


class ReviewStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'مسودة'
    SUBMITTED = 'SUBMITTED', 'مُقدَّم'
    APPROVED = 'APPROVED', 'معتمد'
    REJECTED = 'REJECTED', 'مرفوض'
    RETURNED = 'RETURNED', 'مُعادة'


OPEN_REVIEW_STATUSES = {ReviewStatus.DRAFT, ReviewStatus.SUBMITTED, ReviewStatus.RETURNED}
FINAL_REVIEW_STATUSES = {ReviewStatus.APPROVED, ReviewStatus.REJECTED}


class PerformanceCycle(BaseModel):
    """دورة تقييم أداء (سنوية/فصلية/أربعية)."""

    name = models.CharField(max_length=150, unique=True, verbose_name='الاسم')
    period_start = models.DateField(verbose_name='بداية الفترة')
    period_end = models.DateField(verbose_name='نهاية الفترة')
    review_due_date = models.DateField(
        null=True, blank=True, verbose_name='موعد التقييم',
    )
    status = models.CharField(
        max_length=20, choices=CycleStatus.choices,
        default=CycleStatus.DRAFT, verbose_name='الحالة',
    )
    #: نطاق التقييم: يُقيَّم من في هذا القسم (NULL = كل النطاق المرئي).
    department = models.ForeignKey(
        'organization.Department',
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='performance_cycles', verbose_name='القسم',
    )
    is_anonymous_peer_review = models.BooleanField(
        default=False, verbose_name='تقييم الأقران مجهول',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-period_start']
        verbose_name = 'دورة تقييم أداء'
        verbose_name_plural = 'دورات تقييم الأداء'

    def __str__(self):
        return self.name

    def clean(self):
        if self.period_end and self.period_start and self.period_end < self.period_start:
            raise ValidationError({'period_end': 'نهاية الفترة لا تسبق بدايتها'})
        if (self.review_due_date and self.period_start
                and self.review_due_date < self.period_start):
            raise ValidationError({'review_due_date': 'موعد التقييم قبل بداية الفترة'})

    def is_editable(self):
        return self.status == CycleStatus.DRAFT

    def kpi_weight_total(self):
        return self.kpis.aggregate(
            total=models.Sum('weight')
        )['total'] or 0

    def can_close(self, *reviews):
        """هل يمكن إغلاق الدورة؟

        يُشترط أن يكون مجموع أوزان المؤشرات 100 — لا يكفي وجود مؤشرات.
        """
        if self.status != CycleStatus.OPEN:
            return False, 'الدورة ليست مفتوحة'
        total = self.kpi_weight_total()
        if total != 100:
            return False, f'مجموع أوزان المؤشرات {total} — يلزم 100'
        for r in reviews:
            if r.status != ReviewStatus.APPROVED:
                return False, f'تقييم «{r.employee}» لم يُعتمد بعد'
        return True, ''


class PerformanceKPI(BaseModel):
    """مؤشر أداء داخل دورة، بوزن نسبي."""

    cycle = models.ForeignKey(
        PerformanceCycle, on_delete=models.CASCADE,
        related_name='kpis', verbose_name='الدورة',
    )
    name = models.CharField(max_length=200, verbose_name='المؤشر')
    description = models.TextField(blank=True, verbose_name='الوصف')
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name='الوزن',
        help_text='نسبة مئوية؛ مجموع أوزان الدورة 100.',
    )
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'مؤشر أداء'
        verbose_name_plural = 'مؤشرات الأداء'
        constraints = [
            models.UniqueConstraint(
                fields=['cycle', 'name'], name='uniq_kpi_name_per_cycle',
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.weight}%)'

    def clean(self):
        if self.weight is not None and not (0 <= self.weight <= 100):
            raise ValidationError({'weight': 'الوزن بين 0 و100'})


class PerformanceReview(BaseModel):
    """تقييم أداء موظف في دورة."""

    cycle = models.ForeignKey(
        PerformanceCycle, on_delete=models.PROTECT,
        related_name='reviews', verbose_name='الدورة',
    )
    employee = models.ForeignKey(
        EmployeeProfile, on_delete=models.CASCADE,
        related_name='performance_reviews', verbose_name='الموظف',
    )
    status = models.CharField(
        max_length=20, choices=ReviewStatus.choices,
        default=ReviewStatus.DRAFT, verbose_name='الحالة',
    )

    #: الدرجة النهائية محسوبة من (درجة كل مؤشر × وزنه)، لا تُكتب يدوياً.
    total_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        verbose_name='الدرجة النهائية',
    )
    rating = models.CharField(
        max_length=20, blank=True, verbose_name='التقدير',
        help_text='مشتق من الدرجة النهائية: التقدير يُحسب ولا يُكتب.',
    )
    strengths = models.TextField(blank=True, verbose_name='نقاط القوة')
    improvements = models.TextField(blank=True, verbose_name='نقاط التحسين')
    comments = models.TextField(blank=True, verbose_name='ملاحظات')

    reviewed_by = models.ForeignKey(
        User, on_delete=models.PROTECT,
        related_name='performance_reviews_authored', verbose_name='المُقيِّم',
    )
    is_self_service = models.BooleanField(default=False, verbose_name='تقييم ذاتي')
    decided_by = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True,
        related_name='performance_reviews_decided', verbose_name='المعتمد',
    )
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ القرار')
    decision_note = models.TextField(blank=True, verbose_name='ملاحظات القرار')
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تقييم أداء'
        verbose_name_plural = 'تقييمات الأداء'
        constraints = [
            models.UniqueConstraint(
                fields=['cycle', 'employee'], name='uniq_review_per_employee_cycle',
            ),
        ]
        indexes = [
            models.Index(fields=['cycle', 'status']),
        ]

    def __str__(self):
        return f'{self.employee} — {self.cycle}'

    #: حدود التقدير: (الحد الأدنى، رمز التقدير، الوصف). الدرجة تُعدّ في
    #: الحد الأعلى (`>=`) فوقت 100 درجة «ممتاز».
    RATING_BANDS = (
        (90, 'EXCELLENT', 'ممتاز'),
        (80, 'VERY_GOOD', 'جيد جداً'),
        (70, 'GOOD', 'جيد'),
        (60, 'ACCEPTABLE', 'مقبول'),
        (0, 'NEEDS_IMPROVEMENT', 'يحتاج تحسين'),
    )

    def compute_total(self):
        """الدرجة النهائية = مجموع (درجة المؤشر × وزنه / 100).

        تُرجع `None` إن لم تُقيَّم كل المؤشرات — التقييم الناقص ليس صفراً.
        """
        from decimal import Decimal
        kpis = list(self.cycle.kpis.all())
        if not kpis:
            return None
        scores = {s.kpi_id: s for s in self.kpi_scores.all()}
        if any(k.pk not in scores or scores[k.pk].score is None for k in kpis):
            return None
        total = Decimal('0')
        for k in kpis:
            weight = (k.weight or Decimal('0')) / Decimal('100')
            total += (scores[k.pk].score or Decimal('0')) * weight
        return round(total, 2)

    def rating_for(self, total):
        """التقدير مشتق من الدرجة — لا يُكتب يدوياً."""
        if total is None:
            return ''
        for threshold, code, _label in self.RATING_BANDS:
            if total >= threshold:
                return code
        return ''

    def is_editable(self):
        return self.status in (ReviewStatus.DRAFT, ReviewStatus.RETURNED)

    def can_submit(self, actor):
        if self.status not in (ReviewStatus.DRAFT, ReviewStatus.RETURNED):
            return False
        if self.is_self_service:
            return self.employee.user_id == getattr(actor, 'pk', None)
        from apps.hr.scoping import user_within_hr_scope
        return user_within_hr_scope(self.employee.user, actor)

    def can_decide(self, actor):
        if self.status != ReviewStatus.SUBMITTED:
            return False
        if getattr(actor, 'pk', None) and actor.pk == self.reviewed_by_id:
            return False
        return True


class ReviewKPIScore(BaseModel):
    """درجة موظف في مؤشر واحد داخل تقييم."""

    review = models.ForeignKey(
        PerformanceReview, on_delete=models.CASCADE,
        related_name='kpi_scores', verbose_name='التقييم',
    )
    kpi = models.ForeignKey(
        PerformanceKPI, on_delete=models.PROTECT,
        related_name='scores', verbose_name='المؤشر',
    )
    score = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name='الدرجة',
    )
    comment = models.TextField(blank=True, verbose_name='ملاحظة')

    class Meta:
        ordering = ['kpi__order']
        verbose_name = 'درجة مؤشر'
        verbose_name_plural = 'درجات المؤشرات'
        constraints = [
            models.UniqueConstraint(
                fields=['review', 'kpi'], name='uniq_kpi_score_per_review',
            ),
        ]

    def __str__(self):
        return f'{self.kpi}: {self.score}'

    def clean(self):
        if self.score is not None and not (0 <= self.score <= 100):
            raise ValidationError({'score': 'الدرجة بين 0 و100'})
        if self.review_id and self.kpi_id and self.review.cycle_id != self.kpi.cycle_id:
            raise ValidationError({'kpi': 'المؤشر من دورة أخرى'})
