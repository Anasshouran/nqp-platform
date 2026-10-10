"""نماذج نظام صحة المعابر البرية (Land Border Health System).

قاعدة معمارية: المعبر البري **مستهلك** لأنظمة المسافرين والأغذية والمختبر
المشتركة، وليس نظاماً مكرراً. لذلك يرث هذا التطبيق «عمود المنظومة» عبر
مفاتيح أجنبية إلى `masterdata.EntryPoint` و`travelers.Traveler` و
`food_quarantine.FoodShipment` و`clinic` و`laboratory` و`emergency_eoc`،
بينما يمتلك كياناته الخاصة غير الموجودة على المنصة: المركبات، تفتيش
المركبات، الشحنات، العزل والحجر، تتبع المخالطين، والطوارئ — إضافة إلى
لوحة القيادة القومية.
"""
from django.db import models
from django.utils import timezone

from core.models import BaseModel


# ---------------------------------------------------------------------------
# 1) إدارة المعابر
# ---------------------------------------------------------------------------


class BorderCrossing(BaseModel):
    """الملف التشغيلي للمعبر البري.

    امتداد تشغيلي (OneToOne) لـ `masterdata.EntryPoint` بنوع `LAND_PORT`
    وليس جدول منافذ ثانٍ — حتى يبقى النطاق والصلاحيات يعملان عبر
    `ScopeType.PORT` و`resolve_authorized_entry_points` دون تكرار، عدا
    `OrgAssignment.entry_point` الذي يقرّر المعبر فعلياً لضمّ إليه.
    """

    class BorderType(models.TextChoices):
        ROAD = 'ROAD', 'بري (طرق)'
        RAIL = 'RAIL', 'سكة حديد'
        RIVER = 'RIVER', 'نهر'

    class BorderStatus(models.TextChoices):
        OPEN = 'OPEN', 'مفتوح'
        RESTRICTED = 'RESTRICTED', 'مقيّد'
        LIMITED = 'LIMITED', 'محدود التشغيل'
        CLOSED = 'CLOSED', 'مغلق'
        EMERGENCY = 'EMERGENCY', 'طوارئ'

    entry_point = models.OneToOneField(
        'masterdata.EntryPoint', on_delete=models.CASCADE,
        related_name='border_crossing', verbose_name='منفذ الدخول',
    )
    border_type = models.CharField(
        max_length=10, choices=BorderType.choices, default=BorderType.ROAD,
        verbose_name='نوع المعبر',
    )
    neighbor_country = models.CharField(
        max_length=100, blank=True, verbose_name='الدولة المجاورة',
    )
    operating_status = models.CharField(
        max_length=20, choices=BorderStatus.choices, default=BorderStatus.OPEN,
        verbose_name='حالة التشغيل',
    )
    operating_hours = models.CharField(
        max_length=200, blank=True, verbose_name='ساعات العمل',
    )
    daily_capacity = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='الطاقة اليومية',
    )
    working_agencies = models.TextField(
        blank=True, verbose_name='الجهات العاملة',
    )
    has_health_facility = models.BooleanField(
        default=False, verbose_name='يوجد مرفق صحي',
    )
    has_laboratory = models.BooleanField(
        default=False, verbose_name='يوجد مختبر',
    )
    has_quarantine_facility = models.BooleanField(
        default=False, verbose_name='يوجد مرفق حجر',
    )
    has_isolation_facility = models.BooleanField(
        default=False, verbose_name='يوجد مرفق عزل',
    )
    quarantine_capacity = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='طاقة الحجر',
    )
    closure_reason = models.TextField(
        blank=True, verbose_name='سبب الإغلاق أو التقييد',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['entry_point__order', 'entry_point__name_ar']
        indexes = [
            models.Index(fields=['operating_status'], name='bh_o_xc'),
            models.Index(fields=['neighbor_country'], name='bh_n_xc'),
        ]
        verbose_name = 'معبر بري'
        verbose_name_plural = 'المعابر البرية'

    def __str__(self):
        return self.entry_point.name_ar


class BorderFacility(BaseModel):
    """مرفق داخل المعبر (مرفق صحي، مختبر، حجر، مخزن، مياه وصرف)."""

    class FacilityKind(models.TextChoices):
        HEALTH = 'HEALTH', 'مرفق صحي'
        LABORATORY = 'LABORATORY', 'مختبر'
        QUARANTINE = 'QUARANTINE', 'مرفق حجر'
        ISOLATION = 'ISOLATION', 'مرفق عزل'
        STORAGE = 'STORAGE', 'مخزن'
        WATER_SANITATION = 'WATER_SANITATION', 'مياه وصرف صحي'
        WASTE = 'WASTE', 'إدارة نفايات'
        VECTOR_CONTROL = 'VECTOR_CONTROL', 'مكافحة نواقل'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='facilities', verbose_name='المعبر',
    )
    kind = models.CharField(
        max_length=20, choices=FacilityKind.choices, verbose_name='نوع المرفق',
    )
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(
        max_length=150, blank=True, verbose_name='الاسم بالإنجليزية',
    )
    capacity = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='الطاقة',
    )
    staff_count = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='عدد الكوادر',
    )
    is_operational = models.BooleanField(
        default=True, verbose_name='يعمل',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['crossing', 'kind', 'name_ar']
        indexes = [
            models.Index(fields=['crossing', 'kind'], name='bh_ck_fac'),
        ]
        verbose_name = 'مرفق معبر'
        verbose_name_plural = 'مرافق المعابر'

    def __str__(self):
        return f'{self.name_ar} — {self.get_kind_display()}'


class BorderShift(BaseModel):
    """وردية العمل بالمعبر — أساس احتساب القوة البشرية وإحصاءات الحركة."""

    class ShiftType(models.TextChoices):
        MORNING = 'MORNING', 'الوردية الصباحية'
        AFTERNOON = 'AFTERNOON', 'الوردية المسائية'
        NIGHT = 'NIGHT', 'الوردية الليلية'
        ROTATING = 'ROTATING', 'تناوبية'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='shifts', verbose_name='المعبر',
    )
    shift_date = models.DateField(verbose_name='التاريخ')
    shift_type = models.CharField(
        max_length=20, choices=ShiftType.choices, default=ShiftType.MORNING,
        verbose_name='نوع الوردية',
    )
    started_at = models.TimeField(null=True, blank=True, verbose_name='البداية')
    ended_at = models.TimeField(null=True, blank=True, verbose_name='النهاية')
    supervisor = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_shifts', verbose_name='المشرف',
    )
    is_staffed = models.BooleanField(default=True, verbose_name='مؤمَّنة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-shift_date', 'shift_type']
        indexes = [
            models.Index(fields=['crossing', 'shift_date'], name='bh_cs_shf'),
        ]
        verbose_name = 'وردية معبر'
        verbose_name_plural = 'ورديات المعابر'

    def __str__(self):
        return f'{self.crossing} — {self.shift_date} ({self.get_shift_type_display()})'


class BorderStaff(BaseModel):
    """إسناد كادر صحي لم_crossing مع تحديد الدور حسب وَاصفات الوحدات."""

    class StaffRole(models.TextChoices):
        MANAGER = 'MANAGER', 'مدير محطة المعبر'
        DOCTOR = 'DOCTOR', 'طبيب حجر صحي'
        INSPECTOR = 'INSPECTOR', 'مفتش حجر صحي'
        FOOD_INSPECTOR = 'FOOD_INSPECTOR', 'مفتش رقابة أغذية'
        ENVIRONMENTAL_INSPECTOR = 'ENVIRONMENTAL_INSPECTOR', 'مفتش صحة بيئة'
        REGISTRATION_OFFICER = 'REGISTRATION_OFFICER', 'موظف تسجيل مسافرين'
        LAB_TECHNICIAN = 'LAB_TECHNICIAN', 'أخصائي مختبر'
        EPIDEMIOLOGY_OFFICER = 'EPIDEMIOLOGY_OFFICER', 'أخصائي وبائي'
        EMERGENCY_OFFICER = 'EMERGENCY_OFFICER', 'مسؤول طوارئ'

    class AssignmentType(models.TextChoices):
        FULL_TIME = 'FULL_TIME', 'دوام كامل'
        PART_TIME = 'PART_TIME', 'دوام جزئي'
        SECONDMENT = 'SECONDMENT', 'إعارة'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='staff_assignments', verbose_name='المعبر',
    )
    user = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT,
        related_name='border_staff_assignments', verbose_name='المستخدم',
    )
    role = models.CharField(
        max_length=30, choices=StaffRole.choices, verbose_name='الدور',
    )
    assignment_type = models.CharField(
        max_length=15, choices=AssignmentType.choices,
        default=AssignmentType.FULL_TIME, verbose_name='نوع الإسناد',
    )
    starts_on = models.DateField(null=True, blank=True, verbose_name='يبدأ من')
    ends_on = models.DateField(null=True, blank=True, verbose_name='ينتهي في')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['crossing', 'role', 'user']
        indexes = [
            models.Index(fields=['crossing', 'is_active'], name='bh_ci_stf'),
        ]
        verbose_name = 'إسناد كادر بالمعبر'
        verbose_name_plural = 'إسنادات الكوادر بالمعابر'
        constraints = [
            models.UniqueConstraint(
                fields=['crossing', 'user', 'role'],
                name='unique_border_staff_assignment',
            ),
        ]

    def __str__(self):
        return f'{self.user} — {self.get_role_display()} @ {self.crossing}'


# ---------------------------------------------------------------------------
# 2) فحص المسافرين والإقرار الصحي
# ---------------------------------------------------------------------------


class TravelerHealthRecord(BaseModel):
    """السجل الصحي للمسافر عند معبر بري — يرث هوية المسافر من `travelers`."""

    class Direction(models.TextChoices):
        INBOUND = 'INBOUND', 'داخل'
        OUTBOUND = 'OUTBOUND', 'خارج'

    class HealthStatus(models.TextChoices):
        FIT = 'FIT', 'لائق'
        UNFIT = 'UNFIT', 'غير لائق'
        UNDER_OBSERVATION = 'UNDER_OBSERVATION', 'قيد المراقبة'

    class RiskLevel(models.TextChoices):
        GREEN = 'GREEN', 'منخفض'
        YELLOW = 'YELLOW', 'متوسط'
        RED = 'RED', 'مرتفع'

    class Decision(models.TextChoices):
        CLEARED = 'CLEARED', 'أُفرج عنه'
        HOLD = 'HOLD', 'موقوف'
        REFERRED = 'REFERRED', 'مُحال'
        QUARANTINED = 'QUARANTINED', 'محجور'
        REFUSED_ENTRY = 'REFUSED_ENTRY', 'ممنوع الدخول'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='traveler_records', verbose_name='المعبر',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.PROTECT,
        related_name='border_health_records', verbose_name='المسافر',
    )
    direction = models.CharField(
        max_length=10, choices=Direction.choices, default=Direction.INBOUND,
        verbose_name='اتجاه الحركة',
    )
    entry_at = models.DateTimeField(
        default=timezone.now, verbose_name='وقت العبور',
    )
    departure_country = models.CharField(
        max_length=100, blank=True, verbose_name='بلد المغادرة',
    )
    visited_countries = models.JSONField(
        default=list, blank=True, verbose_name='الدول التي زارها',
    )
    transport_mode = models.CharField(
        max_length=50, blank=True, verbose_name='وسيلة النقل',
    )
    vehicle = models.ForeignKey(
        'borders_health.Vehicle', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='traveler_records',
        verbose_name='المركبة',
    )
    health_status = models.CharField(
        max_length=20, choices=HealthStatus.choices, default=HealthStatus.FIT,
        verbose_name='الحالة الصحية',
    )
    risk_level = models.CharField(
        max_length=10, choices=RiskLevel.choices, default=RiskLevel.GREEN,
        verbose_name='مستوى الخطورة',
    )
    decision = models.CharField(
        max_length=20, choices=Decision.choices, default=Decision.CLEARED,
        verbose_name='القرار',
    )
    assessed_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_traveler_records', verbose_name='المُقيِّم',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-entry_at']
        indexes = [
            models.Index(fields=['crossing', 'entry_at'], name='bh_ce_thr'),
            models.Index(fields=['traveler', 'crossing'], name='bh_tc_thr'),
            models.Index(fields=['crossing', 'risk_level'], name='bh_cr_thr'),
        ]
        verbose_name = 'سجل صحي للمسافر'
        verbose_name_plural = 'السجلات الصحية للمسافرين'

    def __str__(self):
        return f'{self.traveler.passport_number} @ {self.crossing}'


class HealthDeclaration(BaseModel):
    """إقرار صحي للمسافر — نموذج مُصنَّف بالمعبر، منفصل عن سجل الفحص."""

    class Status(models.TextChoices):
        RECEIVED = 'RECEIVED', 'مستلم'
        REVIEWED = 'REVIEWED', 'قيد المراجعة'
        APPROVED = 'APPROVED', 'معتمد'
        REJECTED = 'REJECTED', 'مرفوض'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='declarations', verbose_name='المعبر',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.PROTECT,
        related_name='border_declarations', verbose_name='المسافر',
    )
    departure_country = models.CharField(
        max_length=100, blank=True, verbose_name='بلد المغادرة',
    )
    departure_date = models.DateField(
        null=True, blank=True, verbose_name='تاريخ السفر',
    )
    visited_countries = models.JSONField(
        default=list, blank=True, verbose_name='الدول التي زارها',
    )
    health_conditions = models.TextField(
        blank=True, verbose_name='الحالة الصحية',
    )
    current_symptoms = models.TextField(
        blank=True, verbose_name='الأعراض الحالية',
    )
    contact_name = models.CharField(
        max_length=150, blank=True, verbose_name='اسم جهة الاتصال',
    )
    contact_phone = models.CharField(
        max_length=30, blank=True, verbose_name='هاتف التواصل',
    )
    declared_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإقرار')
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.RECEIVED,
        verbose_name='الحالة',
    )
    reviewed_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_declarations_reviewed', verbose_name='المراجع',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-declared_at']
        indexes = [
            models.Index(fields=['crossing', 'declared_at'], name='bh_cd_dcl'),
            models.Index(fields=['traveler', 'crossing'], name='bh_tc_dcl'),
        ]
        verbose_name = 'إقرار صحي'
        verbose_name_plural = 'الإقرارات الصحية'

    def __str__(self):
        return f'إقرار {self.traveler.passport_number} — {self.get_status_display()}'


class BorderScreening(BaseModel):
    """فحص صحي للمسافر عند معبر بري — يُربط بالفحص المشترك عند وجوده."""

    class Decision(models.TextChoices):
        CLEARED = 'CLEARED', 'أُفرج عنه'
        HOLD = 'HOLD', 'موقوف'
        REFERRED = 'REFERRED', 'مُحال'
        QUARANTINED = 'QUARANTINED', 'محجور'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='screenings', verbose_name='المعبر',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.PROTECT,
        related_name='border_screenings', verbose_name='المسافر',
    )
    shared_screening = models.ForeignKey(
        'screening.HealthScreening', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='border_screenings',
        verbose_name='الفحص المشترك',
    )
    body_temperature = models.FloatField(
        null=True, blank=True, verbose_name='درجة الحرارة',
    )
    oxygen_saturation = models.FloatField(
        null=True, blank=True, verbose_name='نسبة الأكسجين',
    )
    observed_symptoms = models.JSONField(
        default=list, blank=True, verbose_name='الأعراض المرصودة',
    )
    risk_level = models.CharField(
        max_length=10, blank=True, verbose_name='مستوى الخطورة',
    )
    document_verified = models.BooleanField(
        default=False, verbose_name='تم التحقق من الوثائق',
    )
    vaccination_verified = models.BooleanField(
        default=False, verbose_name='تم التحقق من التطعيمات',
    )
    screening_certificate = models.ForeignKey(
        'vaccination.VaccinationCertificate', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='border_screenings',
        verbose_name='شهادة التطعيم',
    )
    decision = models.CharField(
        max_length=20, choices=Decision.choices, default=Decision.CLEARED,
        verbose_name='القرار',
    )
    screened_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_screenings_performed', verbose_name='الفاحص',
    )
    screened_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الفحص')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-screened_at']
        indexes = [
            models.Index(fields=['crossing', 'screened_at'], name='bh_cs_scr'),
            models.Index(fields=['traveler', 'crossing'], name='bh_tc_scr'),
            models.Index(fields=['crossing', 'decision'], name='bh_cd_scr'),
        ]
        verbose_name = 'فحص مسافر بمعبر'
        verbose_name_plural = 'فحوص المسافرين بالمعابر'

    def __str__(self):
        return f'فحص {self.traveler.passport_number} — {self.get_decision_display()}'


# ---------------------------------------------------------------------------
# 3) المركبات وتفتيشها
# ---------------------------------------------------------------------------


class Vehicle(BaseModel):
    """مركبة عابرة للمعبر — سجل رئيسي غير موجود على المنصة."""

    class VehicleType(models.TextChoices):
        BUS = 'BUS', 'حافلة ركاب'
        TRUCK = 'TRUCK', 'شاحنة بضائع'
        PRIVATE_CAR = 'PRIVATE_CAR', 'سيارة خاصة'
        AMBULANCE = 'AMBULANCE', 'سيارة إسعاف'
        LIVESTOCK_TRANSPORT = 'LIVESTOCK_TRANSPORT', 'نقل حيوانات'
        REFRIGERATED_TRUCK = 'REFRIGERATED_TRUCK', 'شاحنة مبرّدة'
        TANKER = 'TANKER', 'ناقلة سوائل'
        OTHER = 'OTHER', 'أخرى'

    class VehicleStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشطة'
        UNDER_QUARANTINE = 'UNDER_QUARANTINE', 'محجورة'
        CONDEMNED = 'CONDEMNED', 'مرفوضة'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='vehicles', verbose_name='المعبر',
    )
    plate_number = models.CharField(
        max_length=30, unique=True, verbose_name='رقم اللوحة',
    )
    chassis_number = models.CharField(
        max_length=50, blank=True, verbose_name='رقم الهيكل',
    )
    vehicle_type = models.CharField(
        max_length=25, choices=VehicleType.choices, default=VehicleType.TRUCK,
        verbose_name='نوع المركبة',
    )
    make_model = models.CharField(
        max_length=100, blank=True, verbose_name='الصنع والطراز',
    )
    year_of_manufacture = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name='سنة الصنع',
    )
    capacity = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='السعة',
    )
    owner_name = models.CharField(
        max_length=200, blank=True, verbose_name='اسم المالك',
    )
    driver_name = models.CharField(
        max_length=150, blank=True, verbose_name='اسم السائق',
    )
    driver_phone = models.CharField(
        max_length=30, blank=True, verbose_name='هاتف السائق',
    )
    status = models.CharField(
        max_length=20, choices=VehicleStatus.choices, default=VehicleStatus.ACTIVE,
        verbose_name='الحالة',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['crossing', 'status'], name='bh_cs_veh'),
        ]
        verbose_name = 'مركبة'
        verbose_name_plural = 'المركبات'

    def __str__(self):
        return f'{self.plate_number} — {self.get_vehicle_type_display()}'


class VehicleInspection(BaseModel):
    """تفتيش صحي للمركبة (نظافة، مكافحة حشرات، نفايات، تبريد)."""

    class Compliance(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'
        NOT_APPLICABLE = 'NOT_APPLICABLE', 'غير منطبق'

    class InspectionType(models.TextChoices):
        EXTERIOR = 'EXTERIOR', 'الهيكل الخارجي'
        CARGO_HOLD = 'CARGO_HOLD', 'حمولة البضاعة'
        TEMPERATURE = 'TEMPERATURE', 'وسائل التبريد'
        DISINFECTION = 'DISINFECTION', 'التعقيم'
        PEST_CONTROL = 'PEST_CONTROL', 'مكافحة الحشرات'
        WASTE = 'WASTE', 'النفايات'
        CABIN = 'CABIN', 'المقصورة'

    class OverallStatus(models.TextChoices):
        PASSED = 'PASSED', 'نجح'
        CONDITIONAL = 'CONDITIONAL', 'مشروط'
        FAILED = 'FAILED', 'فشل'

    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE,
        related_name='inspections', verbose_name='المركبة',
    )
    inspection_type = models.CharField(
        max_length=20, choices=InspectionType.choices,
        default=InspectionType.EXTERIOR, verbose_name='نوع التفتيش',
    )
    inspection_date = models.DateTimeField(
        auto_now_add=True, verbose_name='تاريخ التفتيش',
    )
    inspector = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_vehicle_inspections', verbose_name='المفتش',
    )
    cleanliness_status = models.CharField(
        max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT,
        verbose_name='النظافة',
    )
    pest_control_status = models.CharField(
        max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT,
        verbose_name='مكافحة الحشرات',
    )
    waste_status = models.CharField(
        max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT,
        verbose_name='النفايات',
    )
    cooling_status = models.CharField(
        max_length=20, choices=Compliance.choices,
        default=Compliance.NOT_APPLICABLE, verbose_name='وسائل التبريد',
    )
    findings = models.TextField(blank=True, verbose_name='الملاحظات')
    overall_status = models.CharField(
        max_length=15, choices=OverallStatus.choices, default=OverallStatus.PASSED,
        verbose_name='الحالة العامة',
    )
    reinspection_required = models.BooleanField(
        default=False, verbose_name='يلزم إعادة تفتيش',
    )

    class Meta:
        ordering = ['-inspection_date']
        indexes = [
            models.Index(fields=['vehicle', 'inspection_date'], name='bh_vi_vin'),
        ]
        verbose_name = 'تفتيش مركبة'
        verbose_name_plural = 'تفتيش المركبات'

    def __str__(self):
        return f'تفتيش {self.vehicle.plate_number} — {self.get_overall_status_display()}'


# ---------------------------------------------------------------------------
# 4) الشحنات وتفتيش البضائع والأغذية
# ---------------------------------------------------------------------------


class CargoInspection(BaseModel):
    """تفتيش شحنة برية — أو مخزن المعبر أو مرافق المياه/الصرف.

    `scope` يغطي بند «إدارة التفتيش» على المخازن ومرافق المياه والصرف الصحي
    دون تكرار نموذج تفتيش خاص بكل نوع.
    """

    class Scope(models.TextChoices):
        CARGO = 'CARGO', 'شحنة'
        FOOD = 'FOOD', 'أغذية'
        WAREHOUSE = 'WAREHOUSE', 'مخزن المعبر'
        WATER_SANITATION = 'WATER_SANITATION', 'مياه وصرف صحي'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'قيد الفحص'
        INSPECTING = 'INSPECTING', 'جاري الفحص'
        SAMPLES_SENT = 'SAMPLES_SENT', 'أُرسلت العينات'
        AWAITING_DECISION = 'AWAITING_DECISION', 'بانتظار القرار'
        RELEASED = 'RELEASED', 'أُفرج عنها'
        REJECTED = 'REJECTED', 'مرفوضة'
        HOLD = 'HOLD', 'محجوزة'

    class Outcome(models.TextChoices):
        CLEARED = 'CLEARED', 'إفراج'
        CONDITIONAL = 'CONDITIONAL', 'إفراج مشروط'
        REJECTED = 'REJECTED', 'رفض'
        HOLD = 'HOLD', 'حجز'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='cargo_inspections', verbose_name='المعبر',
    )
    scope = models.CharField(
        max_length=20, choices=Scope.choices, default=Scope.CARGO,
        verbose_name='نطاق التفتيش',
    )
    food_shipment = models.ForeignKey(
        'food_quarantine.FoodShipment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='border_cargo_inspections',
        verbose_name='شحنة سلامة الغذاء',
    )
    facility = models.ForeignKey(
        BorderFacility, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cargo_inspections', verbose_name='المرفق',
    )
    declaration_number = models.CharField(
        max_length=50, blank=True, verbose_name='رقم الإقرار',
    )
    product_type = models.CharField(
        max_length=150, blank=True, verbose_name='نوع المنتج',
    )
    country_of_origin = models.CharField(
        max_length=100, blank=True, verbose_name='بلد المنشأ',
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cargo_inspections', verbose_name='المركبة',
    )
    samples_collected = models.PositiveIntegerField(
        default=0, verbose_name='عدد العينات المسحوبة',
    )
    laboratory_result = models.TextField(blank=True, verbose_name='نتيجة المختبر')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
        verbose_name='حالة الفحص',
    )
    decision = models.CharField(
        max_length=15, choices=Outcome.choices, blank=True, verbose_name='القرار',
    )
    decided_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_cargo_decisions', verbose_name='المُقرِّر',
    )
    decided_at = models.DateTimeField(
        null=True, blank=True, verbose_name='وقت القرار',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['crossing', 'scope', 'status'], name='bh_css_crg'),
        ]
        verbose_name = 'تفتيش شحنة'
        verbose_name_plural = 'تفتيش الشحنات'

    def __str__(self):
        return f'{self.declaration_number or self.pk} — {self.get_scope_display()}'


class BorderSample(BaseModel):
    """عيّنه مسحوبة من مركبة أو شحنة بإجراء معبر."""

    class SampleStatus(models.TextChoices):
        COLLECTED = 'COLLECTED', 'مسحوبة'
        SENT = 'SENT', 'أُرسلت للمختبر'
        UNDER_TEST = 'UNDER_TEST', 'قيد الفحص'
        RESULT_RECEIVED = 'RESULT_RECEIVED', 'وصلت النتيجة'
        REJECTED = 'REJECTED', 'مرفوضة'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='samples', verbose_name='المعبر',
    )
    lab_sample = models.ForeignKey(
        'laboratory.LabSample', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_samples', verbose_name='عيّنة المختبر',
    )
    cargo_inspection = models.ForeignKey(
        CargoInspection, on_delete=models.CASCADE, null=True, blank=True,
        related_name='samples', verbose_name='تفتيش الشحنة',
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='samples', verbose_name='المركبة',
    )
    sample_code = models.CharField(
        max_length=40, blank=True, verbose_name='رمز العيّنة',
    )
    sample_type = models.CharField(
        max_length=100, blank=True, verbose_name='نوع العيّنة',
    )
    collected_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_samples_collected', verbose_name='المسحوب',
    )
    collected_at = models.DateTimeField(
        auto_now_add=True, verbose_name='تاريخ السحب',
    )
    status = models.CharField(
        max_length=20, choices=SampleStatus.choices, default=SampleStatus.COLLECTED,
        verbose_name='الحالة',
    )
    result = models.TextField(blank=True, verbose_name='النتيجة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-collected_at']
        indexes = [
            models.Index(fields=['crossing', 'collected_at'], name='bh_cc_smp'),
            models.Index(fields=['cargo_inspection', 'status'], name='bh_cs_smp'),
        ]
        verbose_name = 'عيّنة معبر'
        verbose_name_plural = 'عيّنات المعابر'

    def __str__(self):
        return self.sample_code or str(self.pk)


# ---------------------------------------------------------------------------
# 5) العزل والحجر
# ---------------------------------------------------------------------------


class QuarantineCase(BaseModel):
    """حالة حجر صحي — كيان مستقل يربط العزل والعيادة والمرصد."""

    class QuarantineStatus(models.TextChoices):
        ADMITTED = 'ADMITTED', 'مقبول'
        UNDER_QUARANTINE = 'UNDER_QUARANTINE', 'قيد الحجر'
        REFERRED = 'REFERRED', 'مُحال'
        RELEASED = 'RELEASED', 'أُفرج عنه'
        ESCALATED = 'ESCALATED', 'مُصعَّد'

    class Phase(models.TextChoices):
        SCREENED = 'SCREENED', 'مفحوص'
        ASSESSED = 'ASSESSED', 'مُقيَّم'
        QUARANTINED = 'QUARANTINED', 'محجور'
        UNDER_TREATMENT = 'UNDER_TREATMENT', 'تحت العلاج'
        RECOVERED = 'RECOVERED', 'تعافى'
        RELEASED = 'RELEASED', 'مُفرج عنه'
        REFERRED_OUT = 'REFERRED_OUT', 'مُحال خارج المعبر'

    # `null=True` مع `unique=True` يسمح بعدة صفوف بلا رقم (NULL يتكرر في Postgres)
    # و`save()` يولّد الرقم قبل أول INSERT، فلا يحدث تصادم على '' الفارغ.
    case_number = models.CharField(
        max_length=30, unique=True, null=True, blank=True, verbose_name='رقم الحالة',
    )
    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='quarantine_cases', verbose_name='المعبر',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_quarantine_cases', verbose_name='المسافر',
    )
    person_name = models.CharField(
        max_length=200, blank=True, verbose_name='اسم الحالة',
    )
    health_case = models.ForeignKey(
        'emergency_eoc.HealthCase', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_quarantine_cases', verbose_name='حالة الترصد المشتركة',
    )
    disease = models.ForeignKey(
        'laboratory.Disease', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_quarantine_cases', verbose_name='المرض',
    )
    clinic = models.ForeignKey(
        'clinic.Clinic', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_quarantine_cases', verbose_name='العيادة',
    )
    facility = models.ForeignKey(
        BorderFacility, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quarantine_cases', verbose_name='مرفق الحجر',
    )
    entry_at = models.DateTimeField(
        auto_now_add=True, verbose_name='وقت الدخول للحجر',
    )
    required_days = models.PositiveSmallIntegerField(
        default=14, verbose_name='المدة المطلوبة (أيام)',
    )
    expected_end_date = models.DateField(
        null=True, blank=True, verbose_name='تاريخ الانتهاء المتوقع',
    )
    actual_end_date = models.DateField(
        null=True, blank=True, verbose_name='تاريخ الانتهاء الفعلي',
    )
    phase = models.CharField(
        max_length=20, choices=Phase.choices, default=Phase.SCREENED,
        verbose_name='المرحلة',
    )
    status = models.CharField(
        max_length=20, choices=QuarantineStatus.choices,
        default=QuarantineStatus.ADMITTED, verbose_name='الحالة',
    )
    follow_up_notes = models.TextField(blank=True, verbose_name='ملاحظات المتابعة')

    class Meta:
        ordering = ['-entry_at']
        indexes = [
            models.Index(fields=['crossing', 'status'], name='bh_cs_qua'),
            models.Index(fields=['crossing', 'entry_at'], name='bh_ce_qua'),
        ]
        verbose_name = 'حالة حجر'
        verbose_name_plural = 'حالات الحجر'

    def save(self, *args, **kwargs):
        if not self.case_number:
            from django.utils import timezone
            # `BaseModel.id` مُولَّد عند الإنشاء، فاستخدامه يضمن التفرّد.
            stamp = timezone.localdate().strftime('%y%m%d')
            self.case_number = f'Q-{stamp}-{str(self.pk)[:8].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.case_number or self.person_name or str(self.pk)


class IsolationCase(BaseModel):
    """حالة عزل — مرتبطة بالحجر أو الإحالة من العيادة."""

    class IsolationStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشطة'
        RELEASED = 'RELEASED', 'أُفرج عنه'
        REMOVED = 'REMOVED', 'مُنقلت'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='isolation_cases', verbose_name='المعبر',
    )
    quarantine_case = models.ForeignKey(
        QuarantineCase, on_delete=models.CASCADE, null=True, blank=True,
        related_name='isolation_cases', verbose_name='حالة الحجر',
    )
    clinic_isolation = models.ForeignKey(
        'clinic.IsolationRecord', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_isolation_cases', verbose_name='سجل العزل بالعيادة',
    )
    facility = models.ForeignKey(
        BorderFacility, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='isolation_cases', verbose_name='مرفق العزل',
    )
    start_date = models.DateField(verbose_name='تاريخ البدء')
    expected_end_date = models.DateField(
        null=True, blank=True, verbose_name='تاريخ الانتهاء المتوقع',
    )
    end_date = models.DateField(
        null=True, blank=True, verbose_name='تاريخ الانتهاء الفعلي',
    )
    status = models.CharField(
        max_length=10, choices=IsolationStatus.choices, default=IsolationStatus.ACTIVE,
        verbose_name='الحالة',
    )
    started_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_isolation_started', verbose_name='بدأها',
    )
    closed_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_isolation_closed', verbose_name='أغلقها',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['crossing', 'status'], name='bh_cs_iso'),
        ]
        verbose_name = 'حالة عزل'
        verbose_name_plural = 'حالات العزل'

    def __str__(self):
        return f'عزل — {self.start_date} ({self.get_status_display()})'


# ---------------------------------------------------------------------------
# 6) تتبع المخالطين
# ---------------------------------------------------------------------------


class ContactTracingCase(BaseModel):
    """حالة تتبع مخالطين مرتبطة بحالة حجر أو سراية."""

    class TracingStatus(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        MONITORING = 'MONITORING', 'قيد المتابعة'
        COMPLETED = 'COMPLETED', 'مكتملة'
        ESCALATED = 'ESCALATED', 'مُصعَّدة'

    case = models.ForeignKey(
        QuarantineCase, on_delete=models.CASCADE, null=True, blank=True,
        related_name='contact_tracing_cases', verbose_name='حالة الحجر',
    )
    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='contact_tracing_cases', verbose_name='المعبر',
    )
    index_case_name = models.CharField(
        max_length=200, blank=True, verbose_name='الحالة المفهرسة',
    )
    transport_mode = models.CharField(
        max_length=50, blank=True, verbose_name='وسيلة النقل',
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contact_tracing_cases', verbose_name='المركبة',
    )
    shared_contact_trace = models.ForeignKey(
        'emergency_eoc.ContactTrace', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_contact_tracing_cases', verbose_name='سجل التتبع المشترك',
    )
    follow_up_days = models.PositiveSmallIntegerField(
        default=14, verbose_name='مدة المتابعة (أيام)',
    )
    started_at = models.DateTimeField(
        auto_now_add=True, verbose_name='تاريخ البدء',
    )
    status = models.CharField(
        max_length=15, choices=TracingStatus.choices, default=TracingStatus.OPEN,
        verbose_name='الحالة',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['crossing', 'status'], name='bh_cs_ctc'),
        ]
        verbose_name = 'حالة تتبع مخالطين'
        verbose_name_plural = 'حالات تتبع المخالطين'

    def __str__(self):
        return f'تتبع — {self.index_case_name or self.pk}'


class Contact(BaseModel):
    """مخالط مُعرَّف (راكب/مرافق) تحت متابعة."""

    class ContactStatus(models.TextChoices):
        IDENTIFIED = 'IDENTIFIED', 'مُعرَّف'
        CONTACTED = 'CONTACTED', 'تم التواصل'
        QUARANTINED = 'QUARANTINED', 'محجور'
        MONITORING = 'MONITORING', 'قيد المتابعة'
        CLEARED = 'CLEARED', 'أُعلن سلامته'
        LOST = 'LOST', 'مفقود المتابعة'

    tracing_case = models.ForeignKey(
        ContactTracingCase, on_delete=models.CASCADE,
        related_name='contacts', verbose_name='حالة التتبع',
    )
    full_name = models.CharField(max_length=200, verbose_name='الاسم الكامل')
    passport_number = models.CharField(
        max_length=40, blank=True, verbose_name='رقم الجواز',
    )
    phone = models.CharField(max_length=30, blank=True, verbose_name='رقم الجوال')
    seat_or_relation = models.CharField(
        max_length=60, blank=True, verbose_name='المقعد أو صلة القرابة',
    )
    status = models.CharField(
        max_length=15, choices=ContactStatus.choices, default=ContactStatus.IDENTIFIED,
        verbose_name='الحالة',
    )
    follow_up_day = models.PositiveSmallIntegerField(
        default=0, verbose_name='يوم المتابعة',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['tracing_case', 'full_name']
        indexes = [
            models.Index(fields=['tracing_case', 'status'], name='bh_ts_con'),
        ]
        verbose_name = 'مخالط'
        verbose_name_plural = 'المخالطون'

    def __str__(self):
        return self.full_name


# ---------------------------------------------------------------------------
# 7) الطوارئ والحوادث
# ---------------------------------------------------------------------------


class BorderHealthIncident(BaseModel):
    """حادثة صحية على مستوى المعبر."""

    class IncidentStatus(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        INVESTIGATING = 'INVESTIGATING', 'قيد التحقيق'
        CONTROLLED = 'CONTROLLED', 'مسيطر عليها'
        CLOSED = 'CLOSED', 'مغلقة'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفضة'
        MEDIUM = 'MEDIUM', 'متوسطة'
        HIGH = 'HIGH', 'عالية'
        CRITICAL = 'CRITICAL', 'حرجة'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='incidents', verbose_name='المعبر',
    )
    quarantine_case = models.ForeignKey(
        QuarantineCase, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='incidents', verbose_name='حالة الحجر',
    )
    title = models.CharField(max_length=200, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM,
        verbose_name='الخطورة',
    )
    status = models.CharField(
        max_length=15, choices=IncidentStatus.choices, default=IncidentStatus.OPEN,
        verbose_name='الحالة',
    )
    reported_at = models.DateTimeField(
        auto_now_add=True, verbose_name='وقت البلاغ',
    )
    closed_at = models.DateTimeField(
        null=True, blank=True, verbose_name='وقت الإغلاق',
    )
    reported_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_incidents_reported', verbose_name='المبلِّغ',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-reported_at']
        indexes = [
            models.Index(fields=['crossing', 'status'], name='bh_cs_inc'),
        ]
        verbose_name = 'حادثة صحية'
        verbose_name_plural = 'الحوادث الصحية'

    def __str__(self):
        return self.title


class BorderEmergency(BaseModel):
    """طوارئ صحية تُقيّد حركة المعبر عند الضرورة (بند IHR)."""

    class EmergencyStatus(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        ACTIVE = 'ACTIVE', 'نشطة'
        CONTROLLED = 'CONTROLLED', 'مسيطر عليها'
        CLOSED = 'CLOSED', 'مغلقة'

    class RestrictionLevel(models.TextChoices):
        ADVISORY = 'ADVISORY', 'توصية'
        INCREASED_SURVEILLANCE = 'INCREASED_SURVEILLANCE', 'مراقبة مكثفة'
        MOVEMENT_REDUCED = 'MOVEMENT_REDUCED', 'تقليل الحركة'
        MOVEMENT_SUSPENDED = 'MOVEMENT_SUSPENDED', 'إيقاف الحركة'
        CLOSED = 'CLOSED', 'إغلاق المعبر'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='emergencies', verbose_name='المعبر',
    )
    shared_event = models.ForeignKey(
        'emergency_eoc.EmergencyEvent', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_emergencies', verbose_name='حدث الطوارئ المشترك',
    )
    disease = models.ForeignKey(
        'laboratory.Disease', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='border_emergencies', verbose_name='المرض',
    )
    title = models.CharField(max_length=200, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    restriction_level = models.CharField(
        max_length=25, choices=RestrictionLevel.choices,
        default=RestrictionLevel.ADVISORY, verbose_name='مستوى التقييد',
    )
    status = models.CharField(
        max_length=15, choices=EmergencyStatus.choices, default=EmergencyStatus.OPEN,
        verbose_name='الحالة',
    )
    reported_at = models.DateTimeField(
        auto_now_add=True, verbose_name='وقت البلاغ',
    )
    resolved_at = models.DateTimeField(
        null=True, blank=True, verbose_name='وقت الإنهاء',
    )
    reported_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_emergencies_reported', verbose_name='المبلِّغ',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-reported_at']
        indexes = [
            models.Index(fields=['crossing', 'status'], name='bh_cs_emg'),
        ]
        verbose_name = 'طوارئ صحية'
        verbose_name_plural = 'الطوارئ الصحية'

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# 8) الشهادات والقرارات والإشعارات والإحصاءات
# ---------------------------------------------------------------------------


class BorderCertificate(BaseModel):
    """شهادة معبرية (إفراج صحي، تفتيش، تصريح عبور، رفض)."""

    class CertificateType(models.TextChoices):
        HEALTH_CLEARANCE = 'HEALTH_CLEARANCE', 'شهادة إفراج صحي'
        INSPECTION = 'INSPECTION', 'شهادة فحص'
        PASSAGE_PERMIT = 'PASSAGE_PERMIT', 'تصريح عبور'
        QUARANTINE_RELEASE = 'QUARANTINE_RELEASE', 'شهادة خروج من الحجر'
        REJECTION = 'REJECTION', 'شهادة رفض'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        ISSUED = 'ISSUED', 'صادرة'
        EXPIRED = 'EXPIRED', 'منتهية'
        REVOKED = 'REVOKED', 'ملغاة'
        CANCELLED = 'CANCELLED', 'ملغاة بطلب'

    certificate_number = models.CharField(
        max_length=50, unique=True, verbose_name='رقم الشهادة',
    )
    certificate_type = models.CharField(
        max_length=25, choices=CertificateType.choices, verbose_name='نوع الشهادة',
    )
    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='certificates', verbose_name='المعبر',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_certificates', verbose_name='المسافر',
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='certificates', verbose_name='المركبة',
    )
    vehicle_inspection = models.ForeignKey(
        VehicleInspection, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='certificates', verbose_name='تفتيش المركبة',
    )
    issue_date = models.DateField(verbose_name='تاريخ الإصدار')
    expiry_date = models.DateField(
        null=True, blank=True, verbose_name='تاريخ الانتهاء',
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.DRAFT,
        verbose_name='الحالة',
    )
    qr_payload = models.CharField(
        max_length=500, blank=True, verbose_name='محتوى رمز QR',
    )
    issued_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_certificates_issued', verbose_name='أصدرها',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['crossing', 'issue_date'], name='bh_ci_crt'),
        ]
        verbose_name = 'شهادة معبرية'
        verbose_name_plural = 'الشهادات المعبرية'

    def __str__(self):
        return f'{self.certificate_number} — {self.get_certificate_type_display()}'


class BorderDecision(BaseModel):
    """قرار الإفراج أو الإحالة أو الإنفاذ — سجل قرارات قابل للتدقيق."""

    class Outcome(models.TextChoices):
        CLEARED = 'CLEARED', 'إفراج'
        CONDITIONAL = 'CONDITIONAL', 'إفراج مشروط'
        HOLD = 'HOLD', 'حجز'
        REFERRED = 'REFERRED', 'إحالة'
        REJECTED = 'REJECTED', 'رفض'
        ENFORCEMENT = 'ENFORCEMENT', 'إجراء إنفاذي'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='decisions', verbose_name='المعبر',
    )
    subject_type = models.CharField(
        max_length=30, blank=True, verbose_name='نوع المخاطَب',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_decisions', verbose_name='المسافر',
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='decisions', verbose_name='المركبة',
    )
    cargo_inspection = models.ForeignKey(
        CargoInspection, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='decisions', verbose_name='تفتيش الشحنة',
    )
    quarantine_case = models.ForeignKey(
        QuarantineCase, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='decisions', verbose_name='حالة الحجر',
    )
    outcome = models.CharField(
        max_length=20, choices=Outcome.choices, verbose_name='القرار',
    )
    reason = models.TextField(blank=True, verbose_name='المبرر')
    decided_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_decisions_made', verbose_name='المُقرِّر',
    )
    decided_at = models.DateTimeField(
        auto_now_add=True, verbose_name='وقت القرار',
    )

    class Meta:
        ordering = ['-decided_at']
        indexes = [
            models.Index(fields=['crossing', 'decided_at'], name='bh_cd_dec'),
        ]
        verbose_name = 'قرار'
        verbose_name_plural = 'القرارات'

    def __str__(self):
        return f'{self.get_outcome_display()} — {self.decided_at:%Y-%m-%d}'


class BorderNotification(BaseModel):
    """إشعار صادر من المعبر (رفع إخطار، إحالة، تنبيه)."""

    class Channel(models.TextChoices):
        INTERNAL = 'INTERNAL', 'داخلي'
        EMAIL = 'EMAIL', 'بريد إلكتروني'
        SMS = 'SMS', 'رسالة نصية'
        PUSH = 'PUSH', 'إشعار'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'قيد الإرسال'
        SENT = 'SENT', 'أُرسل'
        FAILED = 'FAILED', 'فشل'

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='notifications', verbose_name='المعبر',
    )
    recipient_role = models.CharField(
        max_length=40, blank=True, verbose_name='الدور المستلم',
    )
    recipient_contact = models.CharField(
        max_length=120, blank=True, verbose_name='جهة الاتصال',
    )
    title = models.CharField(max_length=200, verbose_name='العنوان')
    body = models.TextField(blank=True, verbose_name='النص')
    channel = models.CharField(
        max_length=15, choices=Channel.choices, default=Channel.INTERNAL,
        verbose_name='القناة',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING,
        verbose_name='الحالة',
    )
    sent_at = models.DateTimeField(
        null=True, blank=True, verbose_name='وقت الإرسال',
    )
    sent_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='border_notifications_sent', verbose_name='المرسل',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['crossing', 'sent_at'], name='bh_cs_ntf'),
        ]
        verbose_name = 'إشعار معبر'
        verbose_name_plural = 'إشعارات المعابر'

    def __str__(self):
        return self.title


class BorderDailyStatistics(BaseModel):
    """إحصاءات حركة يومية مجمَّعة لكل معبر — تغذّي لوحة القيادة القومية."""

    crossing = models.ForeignKey(
        BorderCrossing, on_delete=models.CASCADE,
        related_name='daily_statistics', verbose_name='المعبر',
    )
    stat_date = models.DateField(verbose_name='التاريخ')
    travelers_inbound = models.PositiveIntegerField(
        default=0, verbose_name='المسافرون الداخليون',
    )
    travelers_outbound = models.PositiveIntegerField(
        default=0, verbose_name='المسافرون الخارجون',
    )
    vehicles_inspected = models.PositiveIntegerField(
        default=0, verbose_name='المركبات المفحوصة',
    )
    cargo_inspections = models.PositiveIntegerField(
        default=0, verbose_name='تفتيش الشحنات',
    )
    quarantine_cases = models.PositiveIntegerField(
        default=0, verbose_name='حالات الحجر',
    )
    isolation_cases = models.PositiveIntegerField(
        default=0, verbose_name='حالات العزل',
    )
    suspected_cases = models.PositiveIntegerField(
        default=0, verbose_name='الحالات المشتبه بها',
    )
    certificates_issued = models.PositiveIntegerField(
        default=0, verbose_name='الشهادات الصادرة',
    )
    samples_collected = models.PositiveIntegerField(
        default=0, verbose_name='العينات المسحوبة',
    )
    average_processing_minutes = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='متوسط زمن المعاملة (دقائق)',
    )

    class Meta:
        ordering = ['-stat_date', 'crossing']
        verbose_name = 'إحصاء يومي'
        verbose_name_plural = 'الإحصاءات اليومية'
        constraints = [
            models.UniqueConstraint(
                fields=['crossing', 'stat_date'],
                name='unique_border_daily_statistic',
            ),
        ]

    def __str__(self):
        return f'{self.crossing} — {self.stat_date}'
