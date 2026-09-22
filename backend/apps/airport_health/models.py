from django.db import models

from core.models import BaseModel


class AirportTerminal(BaseModel):
    port = models.ForeignKey(
        'masterdata.EntryPoint', on_delete=models.CASCADE, related_name='airport_terminals', verbose_name='المنفذ'
    )
    terminal_code = models.CharField(max_length=20, verbose_name='رمز الصالة')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=100, verbose_name='الاسم بالإنجليزية')
    capacity = models.PositiveIntegerField(null=True, blank=True, verbose_name='السعة')
    location_geo = models.JSONField(default=dict, blank=True, verbose_name='الموقع الجغرافي')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['terminal_code']
        unique_together = ['port', 'terminal_code']
        verbose_name = 'صالة مطار'
        verbose_name_plural = 'صالات المطارات'

    def __str__(self):
        return f'{self.port.code} - {self.terminal_code}'


class ScreeningPoint(BaseModel):
    class PointType(models.TextChoices):
        ARRIVAL = 'ARRIVAL', 'وصول'
        DEPARTURE = 'DEPARTURE', 'مغادرة'
        TRANSIT = 'TRANSIT', 'عبور'
        CREW = 'CREW', 'طاقم'

    terminal = models.ForeignKey(
        AirportTerminal, on_delete=models.CASCADE, related_name='screening_points', verbose_name='الصالة'
    )
    point_code = models.CharField(max_length=20, verbose_name='رمز النقطة')
    point_type = models.CharField(max_length=20, choices=PointType.choices, verbose_name='النوع')
    location_geo = models.JSONField(default=dict, blank=True, verbose_name='الموقع الجغرافي')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['point_code']
        unique_together = ['terminal', 'point_code']
        verbose_name = 'نقطة فحص'
        verbose_name_plural = 'نقاط الفحص'

    def __str__(self):
        return f'{self.terminal.terminal_code} - {self.point_code}'


class AirportScreening(BaseModel):
    class ScreeningType(models.TextChoices):
        ARRIVAL = 'ARRIVAL', 'وصول'
        DEPARTURE = 'DEPARTURE', 'مغادرة'
        TRANSIT = 'TRANSIT', 'عبور'
        CREW = 'CREW', 'طاقم'

    class RiskLevel(models.TextChoices):
        GREEN = 'GREEN', 'أخضر'
        YELLOW = 'YELLOW', 'أصفر'
        RED = 'RED', 'أحمر'

    class ScreeningStatus(models.TextChoices):
        PENDING = 'PENDING', 'قيد الانتظار'
        CLEARED = 'CLEARED', 'مؤهل'
        QUARANTINED = 'QUARANTINED', 'محجور'
        REFERRED = 'REFERRED', 'مُحال'

    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.CASCADE, related_name='airport_screenings', verbose_name='المسافر'
    )
    screening_point = models.ForeignKey(
        ScreeningPoint, on_delete=models.PROTECT, related_name='screenings', verbose_name='نقطة الفحص'
    )
    flight = models.ForeignKey(
        'carriers.Flight', on_delete=models.SET_NULL, null=True, blank=True, related_name='airport_screenings', verbose_name='الرحلة'
    )
    screening_type = models.CharField(max_length=20, choices=ScreeningType.choices, verbose_name='النوع')
    body_temperature = models.FloatField(null=True, blank=True, verbose_name='درجة الحرارة')
    oxygen_saturation = models.IntegerField(null=True, blank=True, verbose_name='تشبع الأكسجين')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    risk_level = models.CharField(max_length=10, choices=RiskLevel.choices, default=RiskLevel.GREEN, verbose_name='مستوى الخطر')
    status = models.CharField(
        max_length=20, choices=ScreeningStatus.choices, default=ScreeningStatus.PENDING, verbose_name='الحالة'
    )
    screened_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='airport_screenings', verbose_name='المُفحص'
    )
    screened_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الفحص')

    class Meta:
        ordering = ['-screened_at']
        verbose_name = 'فحص مطار'
        verbose_name_plural = 'فحوصات المطارات'

    def __str__(self):
        return f'{self.traveler_id} - {self.status}'


class AircraftInspection(BaseModel):
    class Compliance(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'

    class OverallStatus(models.TextChoices):
        PASSED = 'PASSED', 'نجح'
        FAILED = 'FAILED', 'فشل'
        CONDITIONAL = 'CONDITIONAL', 'مشروط'

    aircraft_registration = models.CharField(max_length=20, verbose_name='تسجيل الطائرة')
    flight = models.ForeignKey(
        'carriers.Flight', on_delete=models.CASCADE, related_name='inspections', verbose_name='الرحلة'
    )
    inspection_date = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ التفتيش')
    inspector = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='aircraft_inspections', verbose_name='المفتش'
    )
    cleanliness_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='النظافة')
    water_quality_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='جودة المياه')
    toilets_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='المراحيض')
    medical_waste_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='النفايات الطبية')
    pest_control_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='مكافحة الآفات')
    rodent_control_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='مكافحة القوارض')
    food_safety_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='سلامة الغذاء')
    findings = models.TextField(blank=True, verbose_name='الملاحظات')
    overall_status = models.CharField(max_length=20, choices=OverallStatus.choices, default=OverallStatus.PASSED, verbose_name='الحالة العامة')
    certificate_issued = models.BooleanField(default=False, verbose_name='صدرت الشهادة')

    class Meta:
        ordering = ['-inspection_date']
        verbose_name = 'تفتيش طائرة'
        verbose_name_plural = 'تفتيش الطائرات'

    def __str__(self):
        return f'{self.aircraft_registration} - {self.overall_status}'


class CrewHealthRecord(BaseModel):
    class HealthStatus(models.TextChoices):
        FIT = 'FIT', 'لائق'
        UNFIT = 'UNFIT', 'غير لائق'
        UNDER_OBSERVATION = 'UNDER_OBSERVATION', 'قيد المراقبة'

    crew = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='crew_health_records', verbose_name='طاقم'
    )
    flight = models.ForeignKey(
        'carriers.Flight', on_delete=models.CASCADE, related_name='crew_records', verbose_name='الرحلة'
    )
    health_status = models.CharField(max_length=20, choices=HealthStatus.choices, default=HealthStatus.FIT, verbose_name='الحالة الصحية')
    temperature = models.FloatField(null=True, blank=True, verbose_name='درجة الحرارة')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    medical_clearance_date = models.DateField(null=True, blank=True, verbose_name='تاريخ التصريح')
    next_clearance_date = models.DateField(null=True, blank=True, verbose_name='التصريح القادم')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل صحة طاقم'
        verbose_name_plural = 'سجلات صحة الأطقم'

    def __str__(self):
        return f'{self.crew_id} - {self.health_status}'
