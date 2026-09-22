try:
    from django.contrib.gis.db import models as gis_models
except Exception:
    gis_models = None

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class LocationType(models.TextChoices):
    HEALTH_FACILITY = 'HEALTH_FACILITY', _('منشأة صحية')
    PORT_OF_ENTRY = 'PORT_OF_ENTRY', _('نقطة دخول')
    LABORATORY = 'LABORATORY', _('مختبر')
    VECTOR_FOCUS = 'VECTOR_FOCUS', _('بؤرة ناقل')
    COMMUNITY = 'COMMUNITY', _('مجتمع/قرية')
    CAMP = 'CAMP', _('مخيم')
    SCHOOL = 'SCHOOL', _('مدرسة')
    WORKPLACE = 'WORKPLACE', _('مكان عمل')
    MARKET = 'MARKET', _('سوق')
    GATHERING_POINT = 'GATHERING_POINT', _('نقطة تجمع')
    WATER_SOURCE = 'WATER_SOURCE', _('مصدر مياه')
    ADMIN_BOUNDARY = 'ADMIN_BOUNDARY', _('حدود إدارية')
    OTHER = 'OTHER', _('أخرى')


class SurveillanceLocation(BaseModel):
    """موقع جغرافي للترصد - يدعم PostGIS."""

    name_ar = models.CharField(max_length=200, verbose_name=_('الاسم بالعربية'))
    name_en = models.CharField(max_length=200, blank=True, verbose_name=_('الاسم بالإنجليزية'))
    location_type = models.CharField(
        max_length=25, choices=LocationType.choices, verbose_name=_('نوع الموقع')
    )
    code = models.CharField(max_length=50, unique=True, blank=True, verbose_name=_('الكود'))

    # الموقع الجغرافي
    point = (
        gis_models.PointField(srid=4326, geography=True, null=True, blank=True, verbose_name=_('النقطة'))
        if gis_models is not None
        else models.JSONField(null=True, blank=True, verbose_name=_('النقطة (JSON)'))
    )
    polygon = (
        gis_models.PolygonField(srid=4326, geography=True, null=True, blank=True, verbose_name=_('المضلع'))
        if gis_models is not None
        else models.JSONField(null=True, blank=True, verbose_name=_('المضلع (JSON)'))
    )
    address = models.TextField(blank=True, verbose_name=_('العنوان'))

    # التسلسل الهرمي
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name=_('الموقع الأب')
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_locations',
        verbose_name=_('القطاع'),
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_locations',
        verbose_name=_('المحلية'),
    )

    # البيانات الوصفية
    population = models.PositiveIntegerField(null=True, blank=True, verbose_name=_('السكان'))
    area_km2 = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name=_('المساحة (كم²)')
    )
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('بيانات إضافية'))

    # الحالة
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))
    is_sentinel = models.BooleanField(default=False, verbose_name=_('موقع رصد ترسيمي'))

    class Meta:
        ordering = ['name_ar']
        verbose_name = _('موقع ترصد')
        verbose_name_plural = _('مواقع الترصد')

    def __str__(self):
        return f'{self.name_ar} ({self.get_location_type_display()})'


class HealthFacilitySurveillance(BaseModel):
    """معلومات ترصد خاصة بالمنشأة الصحية."""

    facility = models.OneToOneField(
        'masterdata.HealthFacility',
        on_delete=models.CASCADE,
        related_name='surveillance_profile',
        verbose_name=_('المنشأة'),
    )

    # تصنيف الترصد
    reporting_level = models.CharField(
        max_length=20,
        choices=[
            ('SENTINEL', _('ترسيمي')),
            ('COMPREHENSIVE', _('شامل')),
            ('EVENT_BASED', _('قائم على الأحداث')),
            ('AGGREGATE', _('تجميعي')),
        ],
        default='COMPREHENSIVE',
        verbose_name=_('مستوى الإبلاغ'),
    )
    surveillance_diseases = models.ManyToManyField(
        'laboratory.Disease', blank=True, related_name='sentinel_facilities',
        verbose_name=_('أمراض الترصد')
    )

    # القدرة
    has_lab = models.BooleanField(default=False, verbose_name=_('يحتوي مختبر'))
    has_isolation = models.BooleanField(default=False, verbose_name=_('يحتوي عزل'))
    lab_capacity = models.JSONField(default=list, blank=True, verbose_name=_('القدرات المختبرية'))
    staff_count = models.PositiveIntegerField(default=0, verbose_name=_('عدد الكادر'))
    trained_staff_count = models.PositiveIntegerField(default=0, verbose_name=_('الكادر المدرب'))

    # الإبلاغ
    reporting_frequency = models.CharField(
        max_length=20,
        choices=[
            ('DAILY', _('يومي')),
            ('WEEKLY', _('أسبوعي')),
            ('MONTHLY', _('شهري')),
            ('ON_DEMAND', _('عند الطلب')),
        ],
        default='WEEKLY',
        verbose_name=_('تواتر الإبلاغ'),
    )
    reporting_method = models.JSONField(
        default=list, blank=True, verbose_name=_('طرق الإبلاغ'),
        help_text=_('مثال: ["APP", "EMAIL", "PHONE", "PAPER"]')
    )
    contact_person = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='facility_surveillance_contact',
        verbose_name=_('الشخص المسؤول'),
    )

    # مؤشرات الأداء
    timeliness_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_('معدل التوقيت %')
    )
    completeness_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_('معدل الاكتمال %')
    )
    last_report_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ آخر بلاغ'))

    # ملاحظات
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        verbose_name = _('ملف ترصد منشأة')
        verbose_name_plural = _('ملفات ترصد المنشآت')

    def __str__(self):
        return f'{self.facility.name_ar} - {self.get_reporting_level_display()}'


class PortOfEntrySurveillance(BaseModel):
    """معلومات ترصد خاصة بنقطة الدخول."""

    port = models.OneToOneField(
        'masterdata.EntryPoint',
        on_delete=models.CASCADE,
        related_name='surveillance_profile',
        verbose_name=_('نقطة الدخول'),
    )

    # نقاط الفحص
    screening_points = models.JSONField(
        default=list, blank=True, verbose_name=_('نقاط الفحص'),
        help_text=_('مثال: [{"name": "صالة الوصول", "type": "THERMAL", "staff": 4}]')
    )

    # الأمراض المستهدفة
    target_diseases = models.ManyToManyField(
        'laboratory.Disease', blank=True, related_name='target_ports',
        verbose_name=_('الأمراض المستهدفة')
    )

    # القدرة
    has_holding_area = models.BooleanField(default=False, verbose_name=_('منطقة احتجاز'))
    has_isolation_rooms = models.BooleanField(default=False, verbose_name=_('غرف عزل'))
    has_lab = models.BooleanField(default=False, verbose_name=_('مختبر ميداني'))
    lab_capacity = models.JSONField(default=list, blank=True, verbose_name=_('القدرات المختبرية'))
    ambulance_available = models.BooleanField(default=False, verbose_name=_('إسعاف متاح'))

    # الكادر
    medical_officers = models.PositiveIntegerField(default=0, verbose_name=_('الضباط الطبيين'))
    nurses = models.PositiveIntegerField(default=0, verbose_name=_('الممرضين'))
    lab_technicians = models.PositiveIntegerField(default=0, verbose_name=_('فنيي مختبر'))
    vector_control_staff = models.PositiveIntegerField(default=0, verbose_name=_('كادر النواقل'))

    # الإجراءات
    screening_protocol = models.TextField(blank=True, verbose_name=_('بروتوكول الفحص'))
    referral_hospitals = models.ManyToManyField(
        'masterdata.HealthFacility', blank=True, related_name='referral_ports',
        verbose_name=_('مستشفيات الإحالة')
    )
    quarantine_facilities = models.ManyToManyField(
        'masterdata.HealthFacility', blank=True, related_name='quarantine_ports',
        verbose_name=_('مرافق الحجر')
    )

    # الإحصائيات
    travelers_screened_daily_avg = models.PositiveIntegerField(default=0, verbose_name=_('المفحوصين يومياً (معدل)'))
    referrals_made = models.PositiveIntegerField(default=0, verbose_name=_('الإحالات'))
    cases_detected = models.PositiveIntegerField(default=0, verbose_name=_('الحالات المكتشفة'))
    last_screening_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ آخر فحص'))

    # التكامل
    thermal_cameras = models.PositiveIntegerField(default=0, verbose_name=_('كاميرات حرارية'))
    auto_alert_enabled = models.BooleanField(default=True, verbose_name=_('الإنذار التلقائي مفعل'))

    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        verbose_name = _('ملف ترصد منفذ')
        verbose_name_plural = _('ملفات ترصد المنافذ')

    def __str__(self):
        return f'{self.port.name_ar} - ترصد المنفذ'