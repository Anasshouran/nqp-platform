from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


def ihr_event_number():
    """توليد رقم حدث IHR بتسلسل يومي: IHR-SD-YYYYMMDD-NNNN."""
    from apps.ihr.models import IHREvent

    prefix = f'IHR-SD-{timezone.now():%Y%m%d}-'
    last = IHREvent.objects.filter(event_number__startswith=prefix).order_by('-event_number').first()
    seq = int(last.event_number.rsplit('-', 1)[-1]) + 1 if last else 1
    return f'{prefix}{seq:04d}'


class IHREvent(BaseModel):
    """حدث صحي دولي محتمل الاشتمال على خطر صحي عام (لوائح IHR 2005)."""

    class EventType(models.TextChoices):
        INFECTIOUS_DISEASE = 'INFECTIOUS_DISEASE', 'مرض معدٍ'
        ZOONOTIC = 'ZOONOTIC', 'مرض حيواني المصدر'
        FOOD_SAFETY = 'FOOD_SAFETY', 'سلامة الغذاء'
        CHEMICAL = 'CHEMICAL', 'خطر كيميائي'
        RADIOLOGICAL = 'RADIOLOGICAL', 'خطر إشعاعي'
        UNKNOWN = 'UNKNOWN', 'غير معروف'

    class RiskLevel(models.TextChoices):
        LOW = 'LOW', 'منخفض'
        MODERATE = 'MODERATE', 'متوسط'
        HIGH = 'HIGH', 'عالي'
        CRITICAL = 'CRITICAL', 'حرج'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        UNDER_REVIEW = 'UNDER_REVIEW', 'قيد المراجعة'
        NATIONAL_ASSESSMENT = 'NATIONAL_ASSESSMENT', 'تقييم وطني'
        NFP_REVIEW = 'NFP_REVIEW', 'مراجعة نقطة الاتصال'
        NOTIFIABLE = 'NOTIFIABLE', 'واجب الإبلاغ'
        SUBMITTED = 'SUBMITTED', 'أُرسل لمنظمة الصحة'
        FOLLOW_UP = 'FOLLOW_UP', 'متابعة'
        CLOSED = 'CLOSED', 'مغلق'

    event_number = models.CharField(max_length=40, unique=True, default=ihr_event_number, editable=False, verbose_name='رقم الحدث')
    emergency_event = models.OneToOneField(
        'emergency_eoc.EmergencyEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ihr_event',
        verbose_name='حدث الطوارئ المرتبط',
    )
    event_type = models.CharField(max_length=30, choices=EventType.choices, default=EventType.INFECTIOUS_DISEASE, verbose_name='نوع الحدث')
    title = models.CharField(max_length=300, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ihr_events',
        verbose_name='المرض',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ihr_events',
        verbose_name='القطاع',
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ihr_events',
        verbose_name='المنفذ',
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ihr_events',
        verbose_name='المحلية',
    )
    date_detected = models.DateField(verbose_name='تاريخ الاكتشاف')
    date_verified = models.DateField(null=True, blank=True, verbose_name='تاريخ التحقق')

    cases_suspected = models.PositiveIntegerField(default=0, verbose_name='حالات مشتبهة')
    cases_probable = models.PositiveIntegerField(default=0, verbose_name='حالات محتملة')
    cases_confirmed = models.PositiveIntegerField(default=0, verbose_name='حالات مؤكدة')
    deaths = models.PositiveIntegerField(default=0, verbose_name='الوفيات')

    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.MODERATE, verbose_name='مستوى الخطورة')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT, verbose_name='الحالة')

    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_ihr_events',
        verbose_name='المُبلّغ',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_ihr_events',
        verbose_name='المراجع',
    )
    nfp_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_ihr_events',
        verbose_name='مصادق نقطة الاتصال',
    )
    submitted_to_who_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإرسال لمنظمة الصحة')
    who_reference = models.CharField(max_length=100, blank=True, verbose_name='المرجع الخارجي لمنظمة الصحة')

    is_international_impact = models.BooleanField(default=False, verbose_name='تأثير دولي محتمل')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['-date_detected', '-created_at']
        verbose_name = 'حدث IHR'
        verbose_name_plural = 'أحداث IHR'

    def __str__(self):
        return f'{self.event_number} - {self.title}'


class RiskAssessment(BaseModel):
    """تقييم مخاطر الحدث وفق منهجية IHR (احتمال، أثر، جهوزية الاستجابة)."""

    event = models.OneToOneField(
        IHREvent,
        on_delete=models.CASCADE,
        related_name='risk_assessment',
        verbose_name='الحدث',
    )
    hazard = models.CharField(max_length=300, verbose_name='الخطر')
    geographic_spread = models.CharField(max_length=300, blank=True, verbose_name='الانتشار الجغرافي')
    transmission = models.CharField(max_length=300, blank=True, verbose_name='نمط الانتقال')
    international_travel = models.CharField(max_length=300, blank=True, verbose_name='السفر الدولي')
    poe_impact = models.CharField(max_length=300, blank=True, verbose_name='أثر نقاط الدخول')
    response_capacity = models.CharField(max_length=300, blank=True, verbose_name='جهوزية الاستجابة')
    overall_risk = models.CharField(
        max_length=20, choices=IHREvent.RiskLevel.choices, default=IHREvent.RiskLevel.MODERATE, verbose_name='الخطر الكلي'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='risk_assessments',
        verbose_name='المقيّم',
    )
    assessed_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التقييم')

    class Meta:
        verbose_name = 'تقييم مخاطر'
        verbose_name_plural = 'تقييمات المخاطر'

    def __str__(self):
        return f'{self.event.event_number} - {self.overall_risk}'


class NationalFocalPoint(BaseModel):
    """نقطة الاتصال الوطنية بـ IHR (NFP) — الشخصية المفوضة رسمياً للتواصل مع منظمة الصحة العالمية."""

    class NFPType(models.TextChoices):
        PRIMARY = 'PRIMARY', 'أساسي'
        ALTERNATE = 'ALTERNATE', 'بديل'
        DEPUTY = 'DEPUTY', 'نائب'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='nfp_profile',
        verbose_name='المستخدم',
    )
    nfp_type = models.CharField(max_length=20, choices=NFPType.choices, default=NFPType.PRIMARY, verbose_name='نوع النقطة')
    phone = models.CharField(max_length=50, blank=True, verbose_name='الهاتف')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    institution = models.CharField(max_length=200, blank=True, verbose_name='المؤسسة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    appointed_at = models.DateField(verbose_name='تاريخ التعيين')

    class Meta:
        verbose_name = 'نقطة اتصال وطنية'
        verbose_name_plural = 'نقاط الاتصال الوطنية'

    def __str__(self):
        return f'{self.user} ({self.get_nfp_type_display()})'


class SPARIndicator(BaseModel):
    """مؤشر تقييم القدرات الوطنية للصحة العامة (SPAR) 15 قدرة × 35 مؤشراً."""

    code = models.CharField(max_length=20, unique=True, verbose_name='الكود')  # C1..C15
    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    description = models.TextField(blank=True, verbose_name='الوصف')
    max_score = models.DecimalField(max_digits=3, decimal_places=1, default=4.0, verbose_name='الدرجة القصوى')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'code']
        verbose_name = 'مؤشر SPAR'
        verbose_name_plural = 'مؤشرات SPAR'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class SPARAssessment(BaseModel):
    """تقييم سنوي لقدرة من مؤشرات SPAR مع الأدلة والفجوات وخطة التحسين."""

    year = models.PositiveIntegerField(verbose_name='السنة')
    indicator = models.ForeignKey(
        SPARIndicator,
        on_delete=models.CASCADE,
        related_name='assessments',
        verbose_name='المؤشر',
    )
    score = models.DecimalField(max_digits=3, decimal_places=2, verbose_name='الدرجة')  # 0-4
    evidence = models.TextField(blank=True, verbose_name='الأدلة')
    gaps = models.TextField(blank=True, verbose_name='الفجوات')
    action_plan = models.TextField(blank=True, verbose_name='خطة التحسين')
    comments = models.TextField(blank=True, verbose_name='ملاحظات')
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='spar_assessments',
        verbose_name='المقيّم',
    )

    class Meta:
        unique_together = ['year', 'indicator']
        ordering = ['year', 'indicator__order']
        verbose_name = 'تقييم SPAR'
        verbose_name_plural = 'تقييمات SPAR'

    def __str__(self):
        return f'SPAR {self.year} - {self.indicator.code} ({self.score})'