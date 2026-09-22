from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models, transaction
from django.db.models import F
from django.utils import timezone

from apps.masterdata.models import EntryPoint
from core.models import BaseModel


class VectorSequence(BaseModel):
    """عداد تسلسلي لكل كيان/سنة/قطاع لتوليد أرقام حروفية مثل VF-2026-RS-000124."""

    scope = models.CharField(max_length=80, unique=True, verbose_name='النطاق (السنة-القطاع-الكيان)')
    last = models.PositiveIntegerField(default=0, verbose_name='آخر تسلسل')

    class Meta:
        verbose_name = 'عداد تسلسلي'
        verbose_name_plural = 'العدادات التسلسلية'

    def __str__(self):
        return f'{self.scope} → {self.last}'


def vector_number(prefix, sector_code=None):
    """يولّد رقمًا تسلسليًا فريدًا في شكل `{prefix}-{year}-{sector}-{6 خانات}`.

    أمثلة: VF-2026-RS-000124 / WO-2026-KS-000003 / VS-2026-000045.
    يُنفَّذ داخل معاملة ذرية مع select_for_update لمنع تكرار الأرقام.
    """
    year = timezone.now().year
    scope = f'{prefix}-{year}' if not sector_code else f'{prefix}-{year}-{sector_code}'
    with transaction.atomic():
        counter, _ = VectorSequence.objects.select_for_update().get_or_create(
            scope=scope, defaults={'last': 0}
        )
        counter.last = F('last') + 1
        counter.save(update_fields=['last', 'updated_at'])
        counter.refresh_from_db()
        seq = counter.last
    suffix = f'{sector_code}-{seq:06d}' if sector_code else f'{seq:06d}'
    return f'{prefix}-{year}-{suffix}'


def _sector_code(entry_point):
    """رمز القطاع الإداري لنقطة الدخول (NA افتراضيًا إذا غاب)."""
    if entry_point and entry_point.sector_id:
        return entry_point.sector.code
    return 'NA'


class AuditedModel(BaseModel):
    """BaseModel + حارسا التدقيق (من أنشأ، ومن عدّل آخر مرة)."""

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='عدّله آخر مرة',
    )

    class Meta:
        abstract = True


class VectorRegistry(BaseModel):
    """السجل المركزي للنواقل — لا يُدخل اسم الناقل كنص حر في العمليات."""

    class VectorType(models.TextChoices):
        MOSQUITO = 'MOSQUITO', 'بعوض'
        RODENT = 'RODENT', 'قوارض'
        FLY = 'FLY', 'ذباب'
        COCKROACH = 'COCKROACH', 'صراصير'
        FLEA = 'FLEA', 'براغيث'
        TICK = 'TICK', 'قراد'
        OTHER = 'OTHER', 'أخرى'

    vector_type = models.CharField(max_length=20, choices=VectorType.choices, verbose_name='النوع')
    species = models.CharField(max_length=100, blank=True, verbose_name='النويع (Aedes/Anopheles/...)')
    name_ar = models.CharField(max_length=150, unique=True, verbose_name='الاسم بالعربية')
    description = models.TextField(blank=True, verbose_name='الوصف')
    disease_risk = models.CharField(max_length=150, blank=True, verbose_name='الأمراض المرتبطة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['vector_type', 'name_ar']
        verbose_name = 'ناقل'
        verbose_name_plural = 'سجل النواقل'

    def __str__(self):
        return f'{self.get_vector_type_display()} - {self.name_ar}'


class VectorUnit(BaseModel):
    """وحدة تنظيمية داخل إدارة مكافحة النواقل (الترصد، مكافحة البعوض، المختبر...)."""

    class Kind(models.TextChoices):
        SURVEILLANCE = 'SURVEILLANCE', 'الترصد الحشري'
        MOSQUITO = 'MOSQUITO', 'مكافحة البعوض'
        FLY = 'FLY', 'مكافحة الذباب'
        RODENT = 'RODENT', 'مكافحة القوارض'
        CRAWLING = 'CRAWLING', 'مكافحة الحشرات الزاحفة'
        SPRAY = 'SPRAY', 'الرش والتطهير'
        LAB = 'LAB', 'المختبر الحشري'
        STATS = 'STATS', 'التقارير والإحصاء'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SURVEILLANCE, verbose_name='النوع')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.CASCADE,
        related_name='vector_units',
        verbose_name='القطاع',
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['kind', 'name_ar']
        verbose_name = 'وحدة نواقل'
        verbose_name_plural = 'وحدات مكافحة النواقل'

    def __str__(self):
        return self.name_ar


class VectorSite(BaseModel):
    """موقع عملي داخل منفذ يتم فيه الترصد والرصد (صالة، مخزن، مسطح مائي...)."""

    class SiteType(models.TextChoices):
        BUILDING = 'BUILDING', 'مبنى'
        YARD = 'YARD', 'فناء'
        WATER_BODY = 'WATER_BODY', 'مسطح مائي'
        STORAGE = 'STORAGE', 'مخزن'
        QUARANTINE = 'QUARANTINE', 'محجر صحي'
        DUMP = 'DUMP', 'منطقة نفايات'
        OTHER = 'OTHER', 'أخرى'

    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.CASCADE, related_name='vector_sites', verbose_name='المنفذ'
    )
    site_type = models.CharField(max_length=15, choices=SiteType.choices, default=SiteType.BUILDING, verbose_name='نوع الموقع')
    name_ar = models.CharField(max_length=200, verbose_name='اسم الموقع')
    area_m2 = models.PositiveIntegerField(null=True, blank=True, verbose_name='المساحة (م²)')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط العرض')
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط الطول')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['entry_point__name_ar', 'name_ar']
        verbose_name = 'موقع'
        verbose_name_plural = 'المواقع'

    def __str__(self):
        return f'{self.name_ar} — {self.entry_point.name_ar}'


class VectorTeam(BaseModel):
    """فريق ميداني (ترصد / تفتيش / مكافحة / مخزون...)."""

    class TeamType(models.TextChoices):
        SURVEY = 'SURVEY', 'ترصد حشري'
        INSPECTION = 'INSPECTION', 'تفتيش'
        CONTROL = 'CONTROL', 'مكافحة'
        RODENT = 'RODENT', 'قوارض'
        LAB = 'LAB', 'مختبر حشري'
        STOCK = 'STOCK', 'مخزون'
        OTHER = 'OTHER', 'أخرى'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='اسم الفريق')
    team_type = models.CharField(max_length=15, choices=TeamType.choices, default=TeamType.CONTROL, verbose_name='نوع الفريق')
    sector = models.ForeignKey(
        'organization.Sector', on_delete=models.CASCADE, related_name='vector_teams', verbose_name='القطاع'
    )
    entry_point = models.ForeignKey(
        EntryPoint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vector_teams',
        verbose_name='المنفذ',
    )
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_vector_teams',
        verbose_name='قائد الفريق',
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='vector_team_memberships', verbose_name='الأعضاء'
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'فريق'
        verbose_name_plural = 'الفرق الميدانية'

    def __str__(self):
        return self.name_ar


class VectorReport(BaseModel):
    """بلاغ عن نشاط ناقل أو شكوى من مواطن/موظف — بداية دورة العمل."""

    class ReportType(models.TextChoices):
        MOSQUITO = 'MOSQUITO', 'بعوض'
        RODENT = 'RODENT', 'قوارض'
        FLY = 'FLY', 'ذباب'
        COCKROACH = 'COCKROACH', 'صراصير'
        FLEA = 'FLEA', 'براغيث'
        TICK = 'TICK', 'قراد'
        OTHER = 'OTHER', 'أخرى'

    class Source(models.TextChoices):
        PUBLIC = 'PUBLIC', 'مواطن'
        OFFICER = 'OFFICER', 'موظف/مفتش'
        INSPECTION = 'INSPECTION', 'تفتيش'
        SURVEILLANCE = 'SURVEILLANCE', 'ترصد'
        HEALTH_FACILITY = 'HEALTH_FACILITY', 'مرفق صحي'
        OTHER = 'OTHER', 'أخرى'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفضة'
        MEDIUM = 'MEDIUM', 'متوسطة'
        HIGH = 'HIGH', 'عالية'
        CRITICAL = 'CRITICAL', 'حرجة'

    class Status(models.TextChoices):
        NEW = 'NEW', 'جديد'
        ASSESSING = 'ASSESSING', 'قيد التقييم'
        ACCEPTED = 'ACCEPTED', 'تم اعتماد المهمة'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        FOLLOW_UP = 'FOLLOW_UP', 'متابعة'
        CLOSED = 'CLOSED', 'مغلق'
        REJECTED = 'REJECTED', 'مرفوض'

    report_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم البلاغ')
    report_type = models.CharField(max_length=15, choices=ReportType.choices, default=ReportType.MOSQUITO, verbose_name='نوع البلاغ')
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.OFFICER, verbose_name='مصدر البلاغ')
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.PROTECT, related_name='vector_reports', verbose_name='المنفذ'
    )
    site = models.ForeignKey(
        VectorSite, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_reports', verbose_name='الموقع'
    )
    vector = models.ForeignKey(
        VectorRegistry, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_reports', verbose_name='الناقل'
    )
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.LOW, verbose_name='درجة الخطورة')
    problem_description = models.TextField(blank=True, verbose_name='وصف المشكلة')
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vector_reports',
        verbose_name='أبلغ به',
    )
    reported_at = models.DateTimeField(default=timezone.now, verbose_name='تاريخ ووقت البلاغ')
    gps_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط العرض GPS')
    gps_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط الطول GPS')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW, verbose_name='الحالة')
    assessment_note = models.TextField(blank=True, verbose_name='ملاحظات التقييم')
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assessed_vector_reports', verbose_name='قيّمه',
    )
    assessed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ التقييم')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الإغلاق')
    attachments = GenericRelation('VectorAttachment')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-reported_at']
        verbose_name = 'بلاغ'
        verbose_name_plural = 'البلاغات'

    def save(self, *args, **kwargs):
        if not self.report_number:
            self.report_number = vector_number('RPT', _sector_code(self.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.report_number} — {self.entry_point.name_ar}'


class VectorFocus(BaseModel):
    """البؤرة — قلب النظام: تجمع كل الترصد والزيارات والعينات والمكافحة للموقع/الناقل."""

    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفض'
        MEDIUM = 'MEDIUM', 'متوسط'
        HIGH = 'HIGH', 'مرتفع'
        CRITICAL = 'CRITICAL', 'حرج'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشطة'
        TREATMENT = 'TREATMENT', 'قيد المعالجة'
        MONITORING = 'MONITORING', 'تحت المراقبة'
        CLOSED = 'CLOSED', 'مغلقة'

    class WaterSource(models.TextChoices):
        CANALS = 'CANALS', 'قنوات'
        CONTAINERS = 'CONTAINERS', 'أوعية/حاويات'
        SWAMPS = 'SWAMPS', 'مستنقعات'
        TYRES = 'TYRES', 'إطارات'
        STORAGE = 'STORAGE', 'خزانات'
        BOTH = 'BOTH', 'مصدران معًا'
        NONE = 'NONE', 'لا يوجد'
        OTHER = 'OTHER', 'أخرى'

    class Origin(models.TextChoices):
        SURVEY = 'SURVEY', 'مسح'
        REPORT = 'REPORT', 'بلاغ'
        INSPECTION = 'INSPECTION', 'تفتيش'
        OTHER = 'OTHER', 'أخرى'

    focus_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم البؤرة')
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.PROTECT, related_name='vector_foci', verbose_name='المنفذ'
    )
    site = models.ForeignKey(
        VectorSite, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_foci', verbose_name='الموقع'
    )
    vector = models.ForeignKey(
        VectorRegistry, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_foci', verbose_name='الناقل'
    )
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM, verbose_name='الخطورة')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE, verbose_name='الحالة')
    water_source = models.CharField(max_length=12, choices=WaterSource.choices, default=WaterSource.NONE, verbose_name='مصدر المياه')
    environment = models.TextField(blank=True, verbose_name='حالة البيئة')
    focus_size = models.PositiveIntegerField(null=True, blank=True, verbose_name='حجم البؤرة (م²)')
    description = models.TextField(blank=True, verbose_name='وصف البؤرة')
    gps_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط العرض GPS')
    gps_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط الطول GPS')
    origin = models.CharField(max_length=15, choices=Origin.choices, default=Origin.REPORT, verbose_name='مصدر البؤرة')
    source_report = models.ForeignKey(
        VectorReport, on_delete=models.SET_NULL, null=True, blank=True, related_name='foci', verbose_name='البلاغ المصدر'
    )
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='opened_vector_foci', verbose_name='فتحها',
    )
    opened_at = models.DateTimeField(default=timezone.now, verbose_name='تاريخ الفتح')
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='closed_vector_foci', verbose_name='أغلقها',
    )
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الإغلاق')
    closure_reason = models.TextField(blank=True, verbose_name='سبب الإغلاق')
    attachments = GenericRelation('VectorAttachment')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-severity', '-opened_at']
        verbose_name = 'بؤرة'
        verbose_name_plural = 'بؤر النواقل'

    def save(self, *args, **kwargs):
        if not self.focus_number:
            self.focus_number = vector_number('VF', _sector_code(self.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.focus_number} — {self.entry_point.name_ar} ({self.get_status_display()})'


class VectorInspection(BaseModel):
    """زيارة ميدانية / نتائج تفتيش في موقع داخل المنفذ."""

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        SUBMITTED = 'SUBMITTED', 'مقدم'
        REVIEWED = 'REVIEWED', 'تمت المراجعة'

    class Purpose(models.TextChoices):
        ROUTINE = 'ROUTINE', 'ترصد روتيني'
        REPORT_FOLLOWUP = 'REPORT_FOLLOWUP', 'متابعة بلاغ'
        CONTROL_FOLLOWUP = 'CONTROL_FOLLOWUP', 'متابعة مكافحة'
        REINSPECTION = 'REINSPECTION', 'إعادة تفتيش'
        OTHER = 'OTHER', 'أخرى'

    inspection_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم الزيارة')
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.PROTECT, related_name='vector_inspections', verbose_name='المنفذ'
    )
    site = models.ForeignKey(
        VectorSite, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_inspections', verbose_name='الموقع'
    )
    team = models.ForeignKey(
        VectorTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_inspections', verbose_name='الفريق'
    )
    inspector = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='vector_inspections', verbose_name='المفتش'
    )
    visit_datetime = models.DateTimeField(default=timezone.now, verbose_name='تاريخ ووقت الزيارة')
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.ROUTINE, verbose_name='سبب الزيارة')
    adult_mosquito = models.BooleanField(default=False, verbose_name='وجود بعوض بالغ')
    larvae = models.BooleanField(default=False, verbose_name='وجود يرقات')
    flies = models.BooleanField(default=False, verbose_name='وجود ذباب')
    rodents = models.BooleanField(default=False, verbose_name='وجود قوارض')
    cockroaches = models.BooleanField(default=False, verbose_name='وجود صراصير')
    other_vectors = models.BooleanField(default=False, verbose_name='وجود نواقل أخرى')
    foci_count = models.PositiveSmallIntegerField(default=0, verbose_name='عدد البؤر المكتشفة')
    hazards_found = models.TextField(blank=True, verbose_name='المخاطر المكتشفة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات المفتش')
    gps_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط العرض GPS')
    gps_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط الطول GPS')
    findings_severity = models.CharField(
        max_length=10, choices=VectorReport.Severity.choices, default=VectorReport.Severity.LOW, verbose_name='مستوى الخطورة'
    )
    linked_focus = models.ForeignKey(
        VectorFocus, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections', verbose_name='البؤرة المرتبطة'
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name='الحالة')
    attachments = GenericRelation('VectorAttachment')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-visit_datetime']
        verbose_name = 'زيارة ميدانية'
        verbose_name_plural = 'الزيارات الميدانية'

    def save(self, *args, **kwargs):
        if not self.inspection_number:
            self.inspection_number = vector_number('VI', _sector_code(self.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.inspection_number} — {self.entry_point.name_ar}'


class VectorSurvey(BaseModel):
    """ترصد حشري منهجي (عدد مؤشرات، مصائد، غمس) في نقطة دخول."""

    class Method(models.TextChoices):
        SWEEP_NET = 'SWEEP_NET', 'شبكة جرف'
        OVITRAPS = 'OVITRAPS', 'مصائد البيض'
        CDC_TRAPS = 'CDC_TRAPS', 'مصائد CDC'
        LARVAL_DIPPING = 'LARVAL_DIPPING', 'غمس اليرقات'
        SIGHTING = 'SIGHTING', 'معاينة بصرية'
        TRAPS = 'TRAPS', 'مصائد'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        SUBMITTED = 'SUBMITTED', 'مقدم'
        APPROVED = 'APPROVED', 'معتمد'

    survey_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم المسح')
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.PROTECT, related_name='vector_surveys', verbose_name='منفذ الدخول'
    )
    site = models.ForeignKey(
        VectorSite, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_surveys', verbose_name='الموقع'
    )
    vector = models.ForeignKey(
        VectorRegistry, on_delete=models.PROTECT, related_name='vector_surveys', verbose_name='الناقل المستهدف'
    )
    method = models.CharField(max_length=15, choices=Method.choices, default=Method.SIGHTING, verbose_name='طريقة الترصد')
    area = models.CharField(max_length=200, verbose_name='منطقة المسح')
    team = models.ForeignKey(
        VectorTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_surveys', verbose_name='الفريق'
    )
    survey_date = models.DateField(default=timezone.localdate, verbose_name='تاريخ المسح')
    house_index = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='مؤشر المنازل %')
    breteau_index = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='مؤشر بريتو')
    container_index = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='مؤشر الحاويات %')
    breeding_sites = models.PositiveSmallIntegerField(default=0, verbose_name='مواقع التوالد المكتشفة')
    density = models.CharField(
        max_length=10, choices=VectorReport.Severity.choices, default=VectorReport.Severity.LOW, verbose_name='الكثافة'
    )
    proposed_risk = models.CharField(
        max_length=10, choices=VectorReport.Severity.choices, default=VectorReport.Severity.LOW, verbose_name='التقييم المبدئي للخطورة'
    )
    environmental_conditions = models.TextField(blank=True, verbose_name='الظروف البيئية')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    suggested_focus = models.ForeignKey(
        VectorFocus, on_delete=models.SET_NULL, null=True, blank=True, related_name='surveys', verbose_name='البؤرة المقترحة'
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUBMITTED, verbose_name='الحالة')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_vector_surveys', verbose_name='اعتمده',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الاعتماد')
    attachments = GenericRelation('VectorAttachment')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-survey_date', '-created_at']
        verbose_name = 'مسح نواقل'
        verbose_name_plural = 'مسوحات النواقل'

    def save(self, *args, **kwargs):
        if not self.survey_number:
            self.survey_number = vector_number('VS', _sector_code(self.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.survey_number} — {self.entry_point.name_ar}'


class VectorSample(BaseModel):
    """عينة حشرية/قوارض تُرسل للمختبر الحشري."""

    class Stage(models.TextChoices):
        ADULT = 'ADULT', 'بالغ'
        LARVAE = 'LARVAE', 'يرقة'
        PUPAE = 'PUPAE', 'عذراء'
        EGG = 'EGG', 'بيض'
        RODENT = 'RODENT', 'قارض'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        COLLECTED = 'COLLECTED', 'تم الجمع'
        RECEIVED = 'RECEIVED', 'تم الاستلام'
        IN_TESTING = 'IN_TESTING', 'قيد الفحص'
        COMPLETED = 'COMPLETED', 'مكتملة'
        REJECTED = 'REJECTED', 'مرفوضة'

    sample_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم العينة')
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.PROTECT, related_name='vector_samples', verbose_name='المنفذ'
    )
    focus = models.ForeignKey(
        VectorFocus, on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='البؤرة'
    )
    inspection = models.ForeignKey(
        VectorInspection, on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='الزيارة'
    )
    survey = models.ForeignKey(
        VectorSurvey, on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='المسح'
    )
    vector = models.ForeignKey(
        VectorRegistry, on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='الناقل'
    )
    stage = models.CharField(max_length=10, choices=Stage.choices, default=Stage.LARVAE, verbose_name='الطور')
    specimen_count = models.PositiveIntegerField(default=1, verbose_name='عدد العينات')
    collection_method = models.CharField(max_length=100, blank=True, verbose_name='طريقة الجمع')
    collector = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='collected_vector_samples', verbose_name='جامع العينة'
    )
    collected_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الجمع')
    condition_note = models.TextField(blank=True, verbose_name='حالة العينة')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.COLLECTED, verbose_name='الحالة')
    received_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاستلام')
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_vector_samples', verbose_name='استلمها',
    )
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')
    attachments = GenericRelation('VectorAttachment')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-collected_at']
        verbose_name = 'عينة'
        verbose_name_plural = 'العينات'

    def save(self, *args, **kwargs):
        if not self.sample_number:
            self.sample_number = vector_number('NQL-VEC', _sector_code(self.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.sample_number} — {self.get_stage_display()}'


class VectorLabResult(BaseModel):
    """نتيجة فحص العينة في المختبر الحشري."""

    class Result(models.TextChoices):
        POSITIVE = 'POSITIVE', 'إيجابي'
        NEGATIVE = 'NEGATIVE', 'سلبي'

    class Method(models.TextChoices):
        MORPHOLOGY = 'MORPHOLOGY', 'تشريحي (Morphology)'
        MOLECULAR = 'MOLECULAR', 'جزيئي (PCR)'
        CULTURE = 'CULTURE', 'زراعة'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'قيد الاعتماد'
        APPROVED = 'APPROVED', 'معتمد'
        REJECTED = 'REJECTED', 'مرفوض'

    sample = models.OneToOneField(
        VectorSample, on_delete=models.PROTECT, related_name='lab_result', verbose_name='العينة'
    )
    species_identified = models.CharField(max_length=150, blank=True, verbose_name='النوع المُعرَّف')
    identification_method = models.CharField(
        max_length=12, choices=Method.choices, default=Method.MORPHOLOGY, verbose_name='طريقة التعريف'
    )
    result = models.CharField(max_length=10, choices=Result.choices, default=Result.NEGATIVE, verbose_name='النتيجة')
    findings = models.TextField(blank=True, verbose_name='النتائج التفصيلية')
    analyst = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vector_lab_results', verbose_name='المحلل',
    )
    analyzed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الفحص')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_vector_lab_results', verbose_name='اعتمده',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الاعتماد')
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        verbose_name = 'نتيجة مختبر'
        verbose_name_plural = 'نتائج المختبر الحشري'

    def __str__(self):
        return f'{self.sample.sample_number} — {self.get_result_display()}'


class VectorChemical(BaseModel):
    """سجل المبيدات والمواد (التركيز، التصنيف، حد التنبيه للمخزون)."""

    class Form(models.TextChoices):
        EC = 'EC', 'مستحلب'
        SC = 'SC', 'معلق'
        WP = 'WP', 'بودرة قابلة للبلل'
        GR = 'GR', 'حبيبات'
        BAIT = 'BAIT', 'طعوم'
        UL = 'UL', 'سائل ULV'
        AEROSOL = 'AEROSOL', 'رذاذ'
        TABLET = 'TABLET', 'أقراص'
        OTHER = 'OTHER', 'أخرى'

    class HazardClass(models.TextChoices):
        WHO_I = 'WHO_I', 'الفئة الأولى تعالج بحذر شديد'
        WHO_II = 'WHO_II', 'الفئة الثانية: معتدل الخطورة'
        WHO_III = 'WHO_III', 'الفئة الثالثة: خفيف الخطورة'
        WHO_U = 'WHO_U', 'الفئة U: غير محتمل الخطر'
        OTHER = 'OTHER', 'أخرى'

    class Target(models.TextChoices):
        MOSQUITO = 'MOSQUITO', 'البعوض البالغ'
        LARVAE = 'LARVAE', 'اليرقات'
        RODENT = 'RODENT', 'القوارض'
        FLY = 'FLY', 'الذباب'
        COCKROACH = 'COCKROACH', 'الصراصير'
        GENERAL = 'GENERAL', 'عام'
        OTHER = 'OTHER', 'أخرى'

    name_ar = models.CharField(max_length=200, unique=True, verbose_name='الاسم بالعربية')
    active_ingredient = models.CharField(max_length=150, blank=True, verbose_name='المادة الفعالة')
    concentration = models.CharField(max_length=50, blank=True, verbose_name='التركيز')
    form = models.CharField(max_length=10, choices=Form.choices, default=Form.EC, verbose_name='الشكل الصيدلاني')
    hazard_class = models.CharField(max_length=10, choices=HazardClass.choices, default=HazardClass.WHO_II, verbose_name='تصنيف الخطر')
    target = models.CharField(max_length=12, choices=Target.choices, default=Target.MOSQUITO, verbose_name='الهدف')
    unit = models.CharField(max_length=30, default='لتر', verbose_name='الوحدة')
    min_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='الحد الأدنى للمخزون')
    supplier = models.CharField(max_length=150, blank=True, verbose_name='المورد')
    is_restricted = models.BooleanField(default=False, verbose_name='مقيد الاستخدام')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'مبيد/مادة'
        verbose_name_plural = 'المبيدات والمواد'

    def __str__(self):
        return self.name_ar


class VectorEquipment(BaseModel):
    """معدات الرش والمكافحة (مرشات، ULV، مصائد، وقاية...)."""

    class Kind(models.TextChoices):
        SPRAYER = 'SPRAYER', 'مرشة'
        ULV_FOGGER = 'ULV_FOGGER', 'جهاز ضباب'
        TRAP = 'TRAP', 'مصيدة حشرية'
        RODENT_TRAP = 'RODENT_TRAP', 'مصيدة قوارض'
        PPE = 'PPE', 'معدات وقاية'
        VEHICLE = 'VEHICLE', 'مركبة'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        OPERATIONAL = 'OPERATIONAL', 'صالحة'
        MAINTENANCE = 'MAINTENANCE', 'تحت الصيانة'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'معطلة'

    code = models.CharField(max_length=40, unique=True, blank=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=200, verbose_name='اسم المعدة')
    kind = models.CharField(max_length=15, choices=Kind.choices, default=Kind.SPRAYER, verbose_name='النوع')
    model = models.CharField(max_length=100, blank=True, verbose_name='الطراز')
    quantity = models.PositiveIntegerField(default=1, verbose_name='الكمية')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPERATIONAL, verbose_name='الحالة')
    assigned_team = models.ForeignKey(
        VectorTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name='equipment', verbose_name='الفريق المعين'
    )
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_equipment', verbose_name='المنفذ'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['kind', 'name_ar']
        verbose_name = 'معدة'
        verbose_name_plural = 'المعدات'

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = vector_number('EQ')
        super().save(*args, **kwargs)

    def __str__(self):
        status = self.get_status_display()
        return f'{self.name_ar} ({status})'


class VectorInventoryItem(BaseModel):
    """رصيد مبيد/مادة بمستودع منفذ معين (دفعة وتاريخ صلاحية)."""

    chemical = models.ForeignKey(
        VectorChemical, on_delete=models.PROTECT, related_name='inventory_items', verbose_name='المبيد/المادة'
    )
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vector_inventory_items', verbose_name='المنفذ/المستودع',
    )
    batch_number = models.CharField(max_length=80, blank=True, verbose_name='رقم الدفعة')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الصلاحية')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='الرصيد الحالي')
    unit = models.CharField(max_length=30, default='لتر', verbose_name='الوحدة')
    received_date = models.DateField(default=timezone.localdate, verbose_name='تاريخ الاستلام')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-received_date']
        verbose_name = 'رصيد مخزون'
        verbose_name_plural = 'رصيد المخزون'

    def __str__(self):
        loc = f' — {self.entry_point.name_ar}' if self.entry_point else ''
        return f'{self.chemical.name_ar}{loc} ({self.quantity} {self.unit})'

    @property
    def low_stock(self):
        return self.quantity <= self.chemical.min_stock


class InventoryMovement(BaseModel):
    """حركة مخزون: استلام / صرف / استخدام / إرجاع / تسوية."""

    class MovementType(models.TextChoices):
        RECEIVE = 'RECEIVE', 'استلام'
        WITHDRAW = 'WITHDRAW', 'صرف'
        USE = 'USE', 'استخدام'
        RETURN = 'RETURN', 'إرجاع'
        ADJUST = 'ADJUST', 'تسوية'

    item = models.ForeignKey(
        VectorInventoryItem, on_delete=models.PROTECT, related_name='movements', verbose_name='رصيد'
    )
    movement_type = models.CharField(max_length=10, choices=MovementType.choices, default=MovementType.RECEIVE, verbose_name='نوع الحركة')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='الكمية')
    unit = models.CharField(max_length=30, default='لتر', verbose_name='الوحدة')
    operation = models.ForeignKey(
        'VectorControlOperation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inventory_movements', verbose_name='العملية المرتبطة',
    )
    reference = models.CharField(max_length=120, blank=True, verbose_name='المرجع')
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vector_movements', verbose_name='نفّذه',
    )
    performed_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الحركة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-performed_at']
        verbose_name = 'حركة مخزون'
        verbose_name_plural = 'حركات المخزون'

    def __str__(self):
        return f'{self.get_movement_type_display()} {self.quantity} {self.unit}'


class VectorControlOperation(BaseModel):
    """أمر/عملية مكافحة — تنفيذ الرش أو المعالجة أو مكافحة القوارض."""

    class OperationType(models.TextChoices):
        LARVICIDING = 'LARVICIDING', 'مكافحة اليرقات'
        INDOOR_SPRAY = 'INDOOR_SPRAY', 'رش داخل المباني'
        OUTDOOR_SPRAY = 'OUTDOOR_SPRAY', 'رش خارجي'
        FOGGING = 'FOGGING', 'ضباب'
        RODENT_BAITING = 'RODENT_BAITING', 'طعوم قوارض'
        TRAPPING = 'TRAPPING', 'مصائد'
        SOURCE_REMOVAL = 'SOURCE_REMOVAL', 'إزالة مصادر التكاثر'
        WATER_TREATMENT = 'WATER_TREATMENT', 'معالجة المياه'
        ENVIRONMENTAL = 'ENVIRONMENTAL', 'إجراءات بيئية'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        APPROVED = 'APPROVED', 'معتمد'
        ASSIGNED = 'ASSIGNED', 'مُسند'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        COMPLETED = 'COMPLETED', 'منفذة'
        FOLLOW_UP = 'FOLLOW_UP', 'تحت المتابعة'
        CLOSED = 'CLOSED', 'مغلقة'

    op_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم العملية')
    focus = models.ForeignKey(
        VectorFocus, on_delete=models.SET_NULL, null=True, blank=True, related_name='control_operations', verbose_name='البؤرة'
    )
    report = models.ForeignKey(
        VectorReport, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='control_operations', verbose_name='البلاغ المصدر',
    )
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.PROTECT, related_name='vector_operations', verbose_name='المنفذ'
    )
    site = models.ForeignKey(
        VectorSite, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_operations', verbose_name='الموقع'
    )
    vector = models.ForeignKey(
        VectorRegistry, on_delete=models.SET_NULL, null=True, blank=True, related_name='vector_operations', verbose_name='الناقل'
    )
    operation_type = models.CharField(
        max_length=20, choices=OperationType.choices, default=OperationType.LARVICIDING, verbose_name='نوع العملية'
    )
    area_m2 = models.PositiveIntegerField(null=True, blank=True, verbose_name='المساحة المعالجة (م²)')
    team = models.ForeignKey(
        VectorTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name='operations', verbose_name='الفريق'
    )
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='led_operations', verbose_name='مشرف التنفيذ',
    )
    application_method = models.CharField(max_length=120, blank=True, verbose_name='طريقة التطبيق')
    planned_at = models.DateField(null=True, blank=True, verbose_name='تاريخ التخطيط')
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت البداية')
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت النهاية')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, verbose_name='الحالة')
    result_effective = models.BooleanField(null=True, blank=True, verbose_name='هل كانت المكافحة فعالة؟')
    effectiveness_percent = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='نسبة الفعالية %')
    equipment_used = models.ManyToManyField(
        VectorEquipment, blank=True, related_name='operations', verbose_name='المعدات المستخدمة'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    review_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_vector_operations', verbose_name='راجعه',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ المراجعة')
    attachments = GenericRelation('VectorAttachment')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    NEXT_STATUS = {
        Status.DRAFT: Status.APPROVED,
        Status.APPROVED: Status.ASSIGNED,
        Status.ASSIGNED: Status.IN_PROGRESS,
        Status.IN_PROGRESS: Status.COMPLETED,
        Status.COMPLETED: Status.FOLLOW_UP,
        Status.FOLLOW_UP: None,
        Status.CLOSED: None,
    }

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'عملية مكافحة'
        verbose_name_plural = 'عمليات المكافحة'

    def save(self, *args, **kwargs):
        if not self.op_number:
            self.op_number = vector_number('WO', _sector_code(self.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.op_number} — {self.get_operation_type_display()} ({self.get_status_display()})'


class OpChemicalLine(BaseModel):
    """بند كيميائي مستخدم في عملية مكافحة — يُخصم تلقائيًا من المخزون."""

    operation = models.ForeignKey(
        VectorControlOperation, on_delete=models.CASCADE, related_name='chemical_lines', verbose_name='العملية'
    )
    chemical = models.ForeignKey(
        VectorChemical, on_delete=models.PROTECT, related_name='operation_lines', verbose_name='المبيد'
    )
    item = models.ForeignKey(
        VectorInventoryItem, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='operation_lines', verbose_name='الرصيد المصروف',
    )
    dosage = models.CharField(max_length=80, blank=True, verbose_name='الجرعة')
    concentration = models.CharField(max_length=50, blank=True, verbose_name='التركيز')
    quantity_used = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='الكمية المستخدمة')
    unit = models.CharField(max_length=30, default='لتر', verbose_name='الوحدة')
    area_covered = models.PositiveIntegerField(null=True, blank=True, verbose_name='المساحة المغطاة (م²)')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['chemical__name_ar']
        verbose_name = 'بند كيميائي'
        verbose_name_plural = 'المواد المستخدمة في العمليات'

    def __str__(self):
        return f'{self.chemical.name_ar} × {self.quantity_used} {self.unit}'


class VectorFollowUp(BaseModel):
    """زيارة متابعة بعد عملية المكافحة — تحدد الإغلاق أو إعادة المعالجة."""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        CLOSED = 'CLOSED', 'مغلقة'

    followup_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم المتابعة')
    focus = models.ForeignKey(
        VectorFocus, on_delete=models.CASCADE, related_name='followups', verbose_name='البؤرة'
    )
    operation = models.ForeignKey(
        VectorControlOperation, on_delete=models.SET_NULL, null=True, blank=True, related_name='followups', verbose_name='العملية'
    )
    visit_datetime = models.DateTimeField(default=timezone.now, verbose_name='وقت الزيارة')
    team = models.ForeignKey(
        VectorTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name='followups', verbose_name='الفريق'
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vector_followups', verbose_name='نفّذها',
    )
    findings = models.TextField(blank=True, verbose_name='نتائج الزيارة')
    controlled = models.BooleanField(null=True, blank=True, verbose_name='هل تمت السيطرة؟')
    recommend_retreatment = models.BooleanField(default=False, verbose_name='يوصى بإعادة المعالجة')
    new_foci_count = models.PositiveSmallIntegerField(default=0, verbose_name='بؤر جديدة مكتشفة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الإغلاق')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-visit_datetime']
        verbose_name = 'زيارة متابعة'
        verbose_name_plural = 'زيارات المتابعة'

    def save(self, *args, **kwargs):
        if not self.followup_number:
            self.followup_number = vector_number('FU', _sector_code(self.focus.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.followup_number} — {self.focus.focus_number}'


class VectorCase(BaseModel):
    """حالة مرضية مرتبطة بالإنسان/الماشية وشبيهة بمنطقة بؤرة."""

    class Classification(models.TextChoices):
        SUSPECT = 'SUSPECT', 'مشتبهة'
        PROBABLE = 'PROBABLE', 'محتملة'
        CONFIRMED = 'CONFIRMED', 'مؤكدة'

    case_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name='رقم الحالة')
    focus = models.ForeignKey(VectorFocus, on_delete=models.CASCADE, related_name='cases', verbose_name='البؤرة')
    disease = models.CharField(max_length=150, blank=True, verbose_name='المرض')
    classification = models.CharField(
        max_length=12, choices=Classification.choices, default=Classification.SUSPECT, verbose_name='التصنيف'
    )
    detected_at = models.DateField(default=timezone.localdate, verbose_name='تاريخ الاكتشاف')
    patient_ref = models.CharField(max_length=80, blank=True, verbose_name='مرجع المريض')
    outcome = models.TextField(blank=True, verbose_name='النتيجة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='أنشأه',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name='عدّله',
    )

    class Meta:
        ordering = ['-detected_at']
        verbose_name = 'حالة'
        verbose_name_plural = 'الحالات'

    def save(self, *args, **kwargs):
        if not self.case_number:
            self.case_number = vector_number('VCS', _sector_code(self.focus.entry_point))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.case_number} — {self.get_classification_display()}'


class VectorAlert(BaseModel):
    """تنبيهات تشغيلية (بؤرة عالية الخطورة، مخزون منخفض، عمل متأخر...)."""

    class AlertType(models.TextChoices):
        HIGH_RISK_FOCUS = 'HIGH_RISK_FOCUS', 'بؤرة عالية الخطورة'
        LOW_STOCK = 'LOW_STOCK', 'مخزون منخفض'
        EXPIRY = 'EXPIRY', 'صلاحية وشيكة'
        OVERDUE = 'OVERDUE', 'عملية متأخرة'
        NEW_REPORT = 'NEW_REPORT', 'بلاغ جديد'
        SAMPLE_READY = 'SAMPLE_READY', 'عينة جاهزة'
        LAB_POSITIVE = 'LAB_POSITIVE', 'نتيجة مختبر إيجابية'

    class Severity(models.TextChoices):
        INFO = 'INFO', 'معلومة'
        WARNING = 'WARNING', 'تحذير'
        CRITICAL = 'CRITICAL', 'حرج'

    alert_type = models.CharField(max_length=15, choices=AlertType.choices, default=AlertType.NEW_REPORT, verbose_name='النوع')
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.WARNING, verbose_name='الأهمية')
    title_ar = models.CharField(max_length=200, verbose_name='العنوان')
    body = models.TextField(blank=True, verbose_name='التفاصيل')
    focus = models.ForeignKey(
        VectorFocus, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts', verbose_name='البؤرة'
    )
    operation = models.ForeignKey(
        VectorControlOperation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='alerts', verbose_name='العملية',
    )
    chemical = models.ForeignKey(
        VectorChemical, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts', verbose_name='المبيد'
    )
    item = models.ForeignKey(
        VectorInventoryItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts', verbose_name='الرصيد'
    )
    is_read = models.BooleanField(default=False, verbose_name='مقروء')
    created_for = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vector_alerts', verbose_name='أُنشئ له',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تنبيه'
        verbose_name_plural = 'التنبيهات'

    def __str__(self):
        return f'[{self.get_severity_display()}] {self.title_ar}'


class VectorAttachment(BaseModel):
    """مرفق عام (صورة/ملف) يُربط بأي سجل عبر GenericForeignKey."""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField(verbose_name='معرف السجل')
    content_object = GenericForeignKey('content_type', 'object_id')
    file = models.FileField(upload_to='vector/', verbose_name='الملف')
    caption = models.CharField(max_length=200, blank=True, verbose_name='التعليق')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vector_attachments', verbose_name='رفعه',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'مرفق'
        verbose_name_plural = 'المرفقات'

    def __str__(self):
        return self.caption or self.file.name


class VectorAuditLog(BaseModel):
    """سجل تدقيق للعمليات الحساسة (الاعتماد، الإغلاق، تغيير الحالة)."""

    action = models.CharField(max_length=60, verbose_name='الإجراء')
    model_name = models.CharField(max_length=80, blank=True, verbose_name='النموذج')
    object_id = models.UUIDField(null=True, blank=True, verbose_name='معرف السجل')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vector_audit_logs', verbose_name='المستخدم',
    )
    details = models.JSONField(default=dict, blank=True, verbose_name='التفاصيل')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل تدقيق'
        verbose_name_plural = 'سجلات التدقيق'

    def __str__(self):
        return f'{self.action} — {self.model_name}'