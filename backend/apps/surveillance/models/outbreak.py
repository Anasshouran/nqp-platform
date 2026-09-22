from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class OutbreakStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('مسودة')
    UNDER_EVALUATION = 'UNDER_EVALUATION', _('قيد التقييم')
    CONFIRMED = 'CONFIRMED', _('مؤكد')
    ACTIVE_RESPONSE = 'ACTIVE_RESPONSE', _('استجابة نشطة')
    MONITORING = 'MONITORING', _('تحت المراقبة')
    CONTROLLED = 'CONTROLLED', _('تحت السيطرة')
    CLOSED = 'CLOSED', _('مغلق')
    REJECTED = 'REJECTED', _('مرفوض')


class OutbreakSeverity(models.TextChoices):
    LEVEL_1 = 'LEVEL_1', _('مستوى 1 - محلي')
    LEVEL_2 = 'LEVEL_2', _('مستوى 2 - قطاع/منطقة')
    LEVEL_3 = 'LEVEL_3', _('مستوى 3 - قومي')
    LEVEL_4 = 'LEVEL_4', _('مستوى 4 - دولي (PHEIC)')


class OutbreakMode(models.TextChoices):
    POINT_SOURCE = 'POINT_SOURCE', _('مصدر نقطة واحد')
    PROPAGATED = 'PROPAGATED', _('متسلسل')
    CONTINUOUS = 'CONTINUOUS', _('مستمر')
    UNKNOWN = 'UNKNOWN', _('غير معروف')


class Outbreak(BaseModel):
    """ملف التفشي الوبائي."""

    outbreak_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name=_('رقم التفشي')
    )

    # التصنيف
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.PROTECT,
        related_name='outbreaks',
        verbose_name=_('المرض'),
    )
    mode = models.CharField(
        max_length=20, choices=OutbreakMode.choices, default=OutbreakMode.UNKNOWN,
        verbose_name=_('نمط التفشي')
    )

    # المعلومات الأساسية
    name = models.CharField(max_length=250, verbose_name=_('اسم التفشي'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))

    # الموقع
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreaks',
        verbose_name=_('القطاع'),
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreaks',
        verbose_name=_('المحلية'),
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreaks',
        verbose_name=_('المنفذ'),
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreaks',
        verbose_name=_('الوحدة الصحية'),
    )
    affected_area_description = models.TextField(blank=True, verbose_name=_('وصف المنطقة المتأثرة'))
    gps_coordinates = models.JSONField(default=dict, blank=True, verbose_name=_('إحداثيات GPS'))

    # التواريخ
    onset_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ بداية التفشي'))
    detection_date = models.DateField(auto_now_add=True, verbose_name=_('تاريخ الاكتشاف'))
    confirmation_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ التأكيد'))
    peak_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ الذروة'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ الانتهاء'))

    # الحالة والخطورة
    status = models.CharField(
        max_length=25, choices=OutbreakStatus.choices, default=OutbreakStatus.DRAFT,
        verbose_name=_('الحالة')
    )
    severity = models.CharField(
        max_length=10, choices=OutbreakSeverity.choices, default=OutbreakSeverity.LEVEL_1,
        verbose_name=_('مستوى الخطورة')
    )

    # المصدر
    source_of_infection = models.TextField(blank=True, verbose_name=_('مصدر العدوى'))
    transmission_route = models.TextField(blank=True, verbose_name=_('طريقة الانتقال'))
    risk_factors = models.JSONField(default=list, blank=True, verbose_name=_('عوامل الخطر'))

    # الإحصائيات
    total_cases = models.PositiveIntegerField(default=0, verbose_name=_('إجمالي الحالات'))
    confirmed_cases = models.PositiveIntegerField(default=0, verbose_name=_('الحالات المؤكدة'))
    probable_cases = models.PositiveIntegerField(default=0, verbose_name=_('الحالات المحتملة'))
    suspected_cases = models.PositiveIntegerField(default=0, verbose_name=_('الحالات المشتبهة'))
    deaths = models.PositiveIntegerField(default=0, verbose_name=_('الوفيات'))
    recovered = models.PositiveIntegerField(default=0, verbose_name=_('المتعافون'))
    contacts = models.PositiveIntegerField(default=0, verbose_name=_('المخالطون'))
    attack_rate = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True, verbose_name=_('معدل الإصابة')
    )
    case_fatality_rate = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True, verbose_name=_('معدل إماتة الحالات')
    )

    # الإنذار الأصلي
    origin_alert = models.ForeignKey(
        'surveillance.SurveillanceAlert',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resulting_outbreaks',
        verbose_name=_('الإنذار الأصلي'),
    )

    # الفريق والاستجابة
    lead_epidemiologist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_outbreaks',
        verbose_name=_('الوبائي الرئيسي'),
    )
    response_coordinator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coordinated_outbreaks',
        verbose_name=_('منسق الاستجابة'),
    )
    response_plan = models.ForeignKey(
        'emergency_eoc.ResponsePlan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreaks',
        verbose_name=_('خطة الاستجابة'),
    )

    # تقارير
    investigation_report = models.TextField(blank=True, verbose_name=_('تقرير التحقيق'))
    response_report = models.TextField(blank=True, verbose_name=_('تقرير الاستجابة'))
    closure_report = models.TextField(blank=True, verbose_name=_('تقرير الإغلاق'))
    lessons_learned = models.TextField(blank=True, verbose_name=_('الدروس المستفادة'))

    # WHO/IHR
    ihr_notified = models.BooleanField(default=False, verbose_name=_('أُبلغت IHR'))
    ihr_notification_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ إبلاغ IHR'))
    who_notified = models.BooleanField(default=False, verbose_name=_('أُبلغت WHO'))
    who_report_ref = models.CharField(max_length=100, blank=True, verbose_name=_('مرجع تقرير WHO'))

    # ملاحظات
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        ordering = ['-detection_date']
        verbose_name = _('تفشي')
        verbose_name_plural = _('التفشيات')
        indexes = [
            models.Index(fields=['outbreak_number']),
            models.Index(fields=['disease', 'status']),
            models.Index(fields=['sector', 'status']),
            models.Index(fields=['status', 'detection_date']),
            models.Index(fields=['severity', 'status']),
        ]

    def __str__(self):
        return f'{self.outbreak_number} - {self.name}'

    def save(self, *args, **kwargs):
        if not self.outbreak_number:
            self.outbreak_number = self.generate_outbreak_number()
        # تحديث الإحصائيات
        self.update_statistics()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_outbreak_number():
        """توليد رقم تفشي: OB-YYYY-SECTOR-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        prefix = f'OB-{year}'
        with transaction.atomic():
            last_ob = Outbreak.objects.filter(outbreak_number__startswith=prefix).order_by('-outbreak_number').first()
            if last_ob:
                try:
                    last_num = int(last_ob.outbreak_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{prefix}-{new_num:06d}'

    def update_statistics(self):
        """تحديث الإحصائيات من الحالات المرتبطة."""
        cases = self.cases.all()
        self.total_cases = cases.count()
        self.confirmed_cases = cases.filter(case_type='CONFIRMED').count()
        self.probable_cases = cases.filter(case_type='PROBABLE').count()
        self.suspected_cases = cases.filter(case_type='SUSPECTED').count()
        self.deaths = cases.filter(status='DEAD').count()
        self.recovered = cases.filter(status='RECOVERED').count()

        if self.total_cases > 0:
            self.case_fatality_rate = round((self.deaths / self.total_cases) * 100, 2)

    def confirm(self, user):
        """تأكيد التفشي."""
        self.status = OutbreakStatus.CONFIRMED
        self.confirmation_date = timezone.localdate()
        self.lead_epidemiologist = user
        self.save(update_fields=['status', 'confirmation_date', 'lead_epidemiologist'])

    def activate_response(self, user, response_plan=None):
        """تفعيل الاستجابة."""
        self.status = OutbreakStatus.ACTIVE_RESPONSE
        self.response_coordinator = user
        if response_plan:
            self.response_plan = response_plan
        self.save(update_fields=['status', 'response_coordinator', 'response_plan'])

    def control(self, user):
        """السيطرة على التفشي."""
        self.status = OutbreakStatus.CONTROLLED
        self.end_date = timezone.localdate()
        self.save(update_fields=['status', 'end_date'])

    def close(self, user, closure_report=''):
        """إغلاق التفشي."""
        self.status = OutbreakStatus.CLOSED
        self.closure_report = closure_report
        self.save(update_fields=['status', 'closure_report'])


class OutbreakCase(BaseModel):
    """ربط حالة بتفشي مع بيانات إضافية."""

    class Role(models.TextChoices):
        INDEX = 'INDEX', _('حالة مؤشرة')
        PRIMARY = 'PRIMARY', _('حالة أولية')
        SECONDARY = 'SECONDARY', _('حالة ثانوية')
        TERTIARY = 'TERTIARY', _('حالة ثالثية')
        CO_PRIMARY = 'CO_PRIMARY', _('حالة أولية مشاركة')
        SPORADIC = 'SPORADIC', _('متفرقة')

    outbreak = models.ForeignKey(
        Outbreak, on_delete=models.CASCADE, related_name='outbreak_cases', verbose_name=_('التفشي')
    )
    case = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.CASCADE,
        related_name='outbreak_links',
        verbose_name=_('الحالة'),
    )
    role = models.CharField(
        max_length=15, choices=Role.choices, default=Role.SECONDARY, verbose_name=_('الدور في التفشي')
    )
    generation = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name=_('جيل الانتقال')
    )
    linked_to = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='secondary_cases',
        verbose_name=_('مربوطة بـ'),
    )
    exposure_setting = models.CharField(max_length=200, blank=True, verbose_name=_('موقع التعرض'))
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت التأكيد'))
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='added_outbreak_cases',
        verbose_name=_('أضيف بواسطة'),
    )

    class Meta:
        ordering = ['confirmed_at', 'generation']
        verbose_name = _('حالة تفشي')
        verbose_name_plural = _('حالات التفشي')
        unique_together = ['outbreak', 'case']

    def __str__(self):
        return f'{self.outbreak.outbreak_number} - {self.case.case_number} ({self.get_role_display()})'


class OutbreakContact(BaseModel):
    """مخالط في سياق تفشي."""

    outbreak = models.ForeignKey(
        Outbreak, on_delete=models.CASCADE, related_name='outbreak_contacts', verbose_name=_('التفشي')
    )
    contact = models.ForeignKey(
        'surveillance.ContactTrace',
        on_delete=models.CASCADE,
        related_name='outbreak_links',
        verbose_name=_('المخالط'),
    )
    priority = models.CharField(
        max_length=10,
        choices=[
            ('HIGH', _('عالية')),
            ('MEDIUM', _('متوسطة')),
            ('LOW', _('منخفضة')),
        ],
        default='MEDIUM',
        verbose_name=_('الأولوية'),
    )
    quarantine_start = models.DateField(null=True, blank=True, verbose_name=_('بداية الحجر'))
    quarantine_end = models.DateField(null=True, blank=True, verbose_name=_('نهاية الحجر'))
    quarantine_location = models.CharField(max_length=200, blank=True, verbose_name=_('مكان الحجر'))
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='added_outbreak_contacts',
        verbose_name=_('أضيف بواسطة'),
    )

    class Meta:
        ordering = ['priority', 'contact__follow_up_start']
        verbose_name = _('مخالط تفشي')
        verbose_name_plural = _('مخالطو التفشي')
        unique_together = ['outbreak', 'contact']

    def __str__(self):
        return f'{self.outbreak.outbreak_number} - {self.contact.contact_number}'


class OutbreakSpecimen(BaseModel):
    """عينة في سياق تفشي."""

    outbreak = models.ForeignKey(
        Outbreak, on_delete=models.CASCADE, related_name='outbreak_specimens', verbose_name=_('التفشي')
    )
    specimen = models.ForeignKey(
        'surveillance.Specimen',
        on_delete=models.CASCADE,
        related_name='outbreak_links',
        verbose_name=_('العينة'),
    )
    is_representative = models.BooleanField(default=False, verbose_name=_('عينة ممثلة'))
    sequencing_done = models.BooleanField(default=False, verbose_name=_('تم التسلسل'))
    sequence_id = models.CharField(max_length=100, blank=True, verbose_name=_('معرف التسلسل'))
    variant = models.CharField(max_length=100, blank=True, verbose_name=_('المتغير'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        ordering = ['-specimen__collected_at']
        verbose_name = _('عينة تفشي')
        verbose_name_plural = _('عينات التفشي')
        unique_together = ['outbreak', 'specimen']

    def __str__(self):
        return f'{self.outbreak.outbreak_number} - {self.specimen.specimen_number}'


class OutbreakResponseAction(BaseModel):
    """إجراء استجابة في تفشي."""

    class ActionType(models.TextChoices):
        ISOLATION = 'ISOLATION', _('عزل')
        QUARANTINE = 'QUARANTINE', _('حجر')
        REFERRAL = 'REFERRAL', _('إحالة')
        TREATMENT = 'TREATMENT', _('علاج')
        VACCINATION = 'VACCINATION', _('تطعيم')
        PROPHYLAXIS = 'PROPHYLAXIS', _('وقاية')
        VECTOR_CONTROL = 'VECTOR_CONTROL', _('مكافحة نواقل')
        DISINFECTION = 'DISINFECTION', _('تطهير')
        HEALTH_EDUCATION = 'HEALTH_EDUCATION', _('توعية صحية')
        ACTIVE_SURVEILLANCE = 'ACTIVE_SURVEILLANCE', _('ترصد نشط')
        CONTACT_TRACING = 'CONTACT_TRACING', _('تتبع مخالطين')
        SAMPLE_COLLECTION = 'SAMPLE_COLLECTION', _('جمع عينات')
        PORT_MEASURES = 'PORT_MEASURES', _('إجراءات منفذ')
        TRAVEL_RESTRICTION = 'TRAVEL_RESTRICTION', _('قيود سفر')
        FOOD_SAFETY = 'FOOD_SAFETY', _('سلامة غذائية')
        WATER_SAFETY = 'WATER_SAFETY', _('سلامة مياه')
        OTHER = 'OTHER', _('أخرى')

    class Status(models.TextChoices):
        PLANNED = 'PLANNED', _('مخطط')
        ASSIGNED = 'ASSIGNED', _('مُسند')
        IN_PROGRESS = 'IN_PROGRESS', _('قيد التنفيذ')
        COMPLETED = 'COMPLETED', _('منفذ')
        CANCELLED = 'CANCELLED', _('ملغى')
        ON_HOLD = 'ON_HOLD', _('معلق')

    outbreak = models.ForeignKey(
        Outbreak, on_delete=models.CASCADE, related_name='response_actions', verbose_name=_('التفشي')
    )
    action_type = models.CharField(max_length=25, choices=ActionType.choices, verbose_name=_('نوع الإجراء'))
    title = models.CharField(max_length=250, verbose_name=_('العنوان'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))

    # الموقع
    location = models.CharField(max_length=200, blank=True, verbose_name=_('الموقع'))
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreak_response_actions',
        verbose_name=_('المنفذ'),
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreak_response_actions',
        verbose_name=_('الوحدة الصحية'),
    )

    # الفريق
    responsible_team = models.ForeignKey(
        'vector_control.VectorTeam',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreak_actions',
        verbose_name=_('الفريق المسؤول'),
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_outbreak_actions',
        verbose_name=_('مُسند إلى'),
    )

    # التوقيت
    planned_start = models.DateTimeField(null=True, blank=True, verbose_name=_('البداية المخططة'))
    planned_end = models.DateTimeField(null=True, blank=True, verbose_name=_('النهاية المخططة'))
    actual_start = models.DateTimeField(null=True, blank=True, verbose_name=_('البداية الفعلية'))
    actual_end = models.DateTimeField(null=True, blank=True, verbose_name=_('النهاية الفعلية'))

    # الحالة
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PLANNED, verbose_name=_('الحالة')
    )
    progress_percent = models.PositiveSmallIntegerField(default=0, verbose_name=_('نسبة الإنجاز %'))
    outcome = models.TextField(blank=True, verbose_name=_('النتيجة'))
    effectiveness = models.CharField(
        max_length=10,
        choices=[
            ('HIGH', _('عالية')),
            ('MODERATE', _('متوسطة')),
            ('LOW', _('منخفضة')),
            ('UNKNOWN', _('غير معروف')),
        ],
        default='UNKNOWN',
        verbose_name=_('الفعالية'),
    )

    # الموارد
    resources_used = models.JSONField(default=list, blank=True, verbose_name=_('الموارد المستخدمة'))
    budget = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True, verbose_name=_('الميزانية')
    )

    # متابعة
    follow_up_required = models.BooleanField(default=False, verbose_name=_('تتطلب متابعة'))
    follow_up_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ المتابعة'))
    follow_up_notes = models.TextField(blank=True, verbose_name=_('ملاحظات المتابعة'))

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_outbreak_actions',
        verbose_name=_('أنشأه'),
    )

    class Meta:
        ordering = ['planned_start', '-created_at']
        verbose_name = _('إجراء استجابة تفشي')
        verbose_name_plural = _('إجراءات استجابة التفشي')

    def __str__(self):
        return f'{self.outbreak.outbreak_number} - {self.get_action_type_display()}: {self.title}'


class OutbreakResponseTeam(BaseModel):
    """فريق استجابة التفشي."""

    outbreak = models.ForeignKey(
        Outbreak, on_delete=models.CASCADE, related_name='response_teams', verbose_name=_('التفشي')
    )
    name = models.CharField(max_length=200, verbose_name=_('اسم الفريق'))
    team_type = models.CharField(
        max_length=30,
        choices=[
            ('INVESTIGATION', _('تحقيق')),
            ('MEDICAL', _('طبي')),
            ('LAB', _('مختبر')),
            ('VECTOR', _('نواقل')),
            ('LOGISTICS', _('لوجستيات')),
            ('COMMUNICATION', _('اتصالات')),
            ('DATA', _('بيانات')),
            ('COORDINATION', _('تنسيق')),
            ('OTHER', _('أخرى')),
        ],
        verbose_name=_('نوع الفريق'),
    )
    lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_outbreak_teams',
        verbose_name=_('قائد الفريق'),
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='outbreak_teams', blank=True, verbose_name=_('الأعضاء')
    )
    description = models.TextField(blank=True, verbose_name=_('الوصف'))
    contact_info = models.JSONField(default=dict, blank=True, verbose_name=_('معلومات الاتصال'))
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))

    class Meta:
        verbose_name = _('فريق استجابة تفشي')
        verbose_name_plural = _('فرق استجابة التفشي')

    def __str__(self):
        return f'{self.outbreak.outbreak_number} - {self.name}'


class OutbreakVectorFocus(BaseModel):
    """ربط بؤرة ناقل بتفشي."""

    outbreak = models.ForeignKey(
        Outbreak, on_delete=models.CASCADE, related_name='vector_foci', verbose_name=_('التفشي')
    )
    vector_focus = models.ForeignKey(
        'vector_control.VectorFocus',
        on_delete=models.CASCADE,
        related_name='outbreak_links',
        verbose_name=_('البؤرة'),
    )
    is_primary = models.BooleanField(default=False, verbose_name=_('بؤرة رئيسية'))
    role_in_transmission = models.TextField(blank=True, verbose_name=_('الدور في الانتقال'))
    control_measures = models.TextField(blank=True, verbose_name=_('إجراءات المكافحة'))
    control_status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', _('معلق')),
            ('IN_PROGRESS', _('قيد التنفيذ')),
            ('COMPLETED', _('مكتمل')),
            ('FAILED', _('فشل')),
        ],
        default='PENDING',
        verbose_name=_('حالة المكافحة'),
    )

    class Meta:
        verbose_name = _('بؤرة ناقل تفشي')
        verbose_name_plural = _('بؤر نواقل التفشي')
        unique_together = ['outbreak', 'vector_focus']

    def __str__(self):
        return f'{self.outbreak.outbreak_number} - {self.vector_focus.focus_number}'