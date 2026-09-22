import uuid
from django.db import models

from core.models import BaseModel


class SeaPort(BaseModel):
    """ميناء بحري / محطة حجر صحي بحرية."""

    code = models.CharField(max_length=20, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=100, verbose_name='الاسم بالإنجليزية')
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    capacity = models.PositiveIntegerField(null=True, blank=True, verbose_name='الطاقة الاستيعابية')
    authorities = models.TextField(blank=True, verbose_name='الجهات العاملة')
    description = models.TextField(blank=True, verbose_name='الوصف')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['code']
        verbose_name = 'ميناء بحري'
        verbose_name_plural = 'الموانئ البحرية'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class Berth(BaseModel):
    """رصيف داخل الميناء."""

    port = models.ForeignKey(
        SeaPort, on_delete=models.CASCADE, related_name='berths', verbose_name='الميناء'
    )
    code = models.CharField(max_length=20, verbose_name='رمز الرصيف')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    max_draft = models.FloatField(null=True, blank=True, verbose_name='الغاطس الأقصى (م)')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['code']
        unique_together = ['port', 'code']
        verbose_name = 'رصيف'
        verbose_name_plural = 'الأرصفة'

    def __str__(self):
        return f'{self.port.code} - {self.code}'


class Vessel(BaseModel):
    class VesselType(models.TextChoices):
        COMMERCIAL = 'COMMERCIAL', 'تجارية'
        PASSENGER = 'PASSENGER', 'ركاب'
        TANKER = 'TANKER', 'ناقلة نفط'
        CONTAINER = 'CONTAINER', 'حاويات'
        FISHING = 'FISHING', 'صيد'
        OTHER = 'OTHER', 'أخرى'

    class VesselStatus(models.TextChoices):
        EXPECTED = 'EXPECTED', 'متوقعة'
        ARRIVED = 'ARRIVED', 'وصلت'
        INSPECTED = 'INSPECTED', 'فُحصت'
        CLEARED = 'CLEARED', 'أُفرج عنها'
        QUARANTINED = 'QUARANTINED', 'محجورة'
        DEPARTED = 'DEPARTED', 'غادرت'

    vessel_name = models.CharField(max_length=150, verbose_name='اسم السفينة')
    imo_number = models.CharField(max_length=20, unique=True, verbose_name='رقم IMO')
    flag_state = models.CharField(max_length=50, verbose_name='العلم')
    shipping_company = models.CharField(max_length=150, blank=True, verbose_name='شركة الملاحة')
    vessel_type = models.CharField(max_length=20, choices=VesselType.choices, default=VesselType.COMMERCIAL, verbose_name='النوع')
    gross_tonnage = models.FloatField(null=True, blank=True, verbose_name='الحمولة الإجمالية')
    last_port_of_call = models.CharField(max_length=100, blank=True, verbose_name='آخر ميناء مزار')
    arrival_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الوصول')
    departure_date = models.DateField(null=True, blank=True, verbose_name='تاريخ المغادرة')
    status = models.CharField(max_length=20, choices=VesselStatus.choices, default=VesselStatus.EXPECTED, verbose_name='الحالة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['vessel_name']
        verbose_name = 'سفينة'
        verbose_name_plural = 'السفن'

    def __str__(self):
        return f'{self.vessel_name} ({self.imo_number})'


class VesselVisit(BaseModel):
    """زيارة السفينة لميناء معين (مسار يربط السفينة بالميناء)."""

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='visits', verbose_name='السفينة'
    )
    port = models.ForeignKey(
        SeaPort, on_delete=models.PROTECT, related_name='visits', verbose_name='الميناء'
    )
    berth = models.ForeignKey(
        Berth, on_delete=models.SET_NULL, null=True, blank=True, related_name='visits', verbose_name='الرصيف'
    )
    arrival_date = models.DateField(verbose_name='تاريخ الوصول')
    departure_date = models.DateField(null=True, blank=True, verbose_name='تاريخ المغادرة')
    status = models.CharField(
        max_length=20, choices=Vessel.VesselStatus.choices,
        default=Vessel.VesselStatus.EXPECTED, verbose_name='الحالة',
    )

    class Meta:
        ordering = ['-arrival_date']
        verbose_name = 'زيارة سفينة'
        verbose_name_plural = 'زيارات السفن'

    def __str__(self):
        return f'{self.vessel.vessel_name} → {self.port.name_ar}'


class CrewMember(BaseModel):
    class HealthStatus(models.TextChoices):
        FIT = 'FIT', 'لائق'
        UNFIT = 'UNFIT', 'غير لائق'
        UNDER_OBSERVATION = 'UNDER_OBSERVATION', 'قيد المراقبة'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='crew_members', verbose_name='السفينة'
    )
    full_name = models.CharField(max_length=150, verbose_name='الاسم الكامل')
    nationality = models.CharField(max_length=50, blank=True, verbose_name='الجنسية')
    passport_number = models.CharField(max_length=50, blank=True, verbose_name='رقم الجواز')
    job_title = models.CharField(max_length=100, blank=True, verbose_name='الوظيفة')
    health_status = models.CharField(
        max_length=20, choices=HealthStatus.choices, default=HealthStatus.FIT, verbose_name='الحالة الصحية'
    )
    temperature = models.FloatField(null=True, blank=True, verbose_name='درجة الحرارة')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['full_name']
        verbose_name = 'فرد طاقم'
        verbose_name_plural = 'أفراد الطاقم'

    def __str__(self):
        return self.full_name


class Passenger(BaseModel):
    class HealthStatus(models.TextChoices):
        FIT = 'FIT', 'لائق'
        UNFIT = 'UNFIT', 'غير لائق'
        UNDER_OBSERVATION = 'UNDER_OBSERVATION', 'قيد المراقبة'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='passengers', verbose_name='السفينة'
    )
    full_name = models.CharField(max_length=150, verbose_name='الاسم الكامل')
    nationality = models.CharField(max_length=50, blank=True, verbose_name='الجنسية')
    passport_number = models.CharField(max_length=50, blank=True, verbose_name='رقم الجواز')
    cabin_number = models.CharField(max_length=30, blank=True, verbose_name='رقم المقصورة')
    health_status = models.CharField(
        max_length=20, choices=HealthStatus.choices, default=HealthStatus.FIT, verbose_name='الحالة الصحية'
    )
    temperature = models.FloatField(null=True, blank=True, verbose_name='درجة الحرارة')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['full_name']
        verbose_name = 'راكب'
        verbose_name_plural = 'الركاب'

    def __str__(self):
        return self.full_name


class HealthDeclaration(BaseModel):
    """الإقرار الصحي البحري Maritime Declaration of Health."""

    class DeclarationStatus(models.TextChoices):
        RECEIVED = 'RECEIVED', 'مستلم'
        REVIEWED = 'REVIEWED', 'جاري المراجعة'
        APPROVED = 'APPROVED', 'معتمد'
        REJECTED = 'REJECTED', 'مرفوض'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='health_declarations', verbose_name='السفينة'
    )
    visit = models.ForeignKey(
        VesselVisit, on_delete=models.CASCADE, related_name='health_declarations', null=True, blank=True, verbose_name='الزيارة'
    )
    captain_name = models.CharField(max_length=150, verbose_name='اسم الربان')
    declaration_date = models.DateField(verbose_name='تاريخ الإقرار')
    illness_on_board = models.BooleanField(default=False, verbose_name='حالات مرضية على متن السفينة')
    deaths_on_board = models.PositiveIntegerField(default=0, verbose_name='عدد الوفيات')
    reported_diseases = models.TextField(blank=True, verbose_name='الأمراض المبلغ عنها')
    visited_ports = models.TextField(blank=True, verbose_name='الموانئ المزارة')
    status = models.CharField(
        max_length=20, choices=DeclarationStatus.choices, default=DeclarationStatus.RECEIVED, verbose_name='الحالة'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-declaration_date']
        verbose_name = 'إقرار صحي بحري'
        verbose_name_plural = 'الإقرارات الصحية البحرية'

    def __str__(self):
        return f'{self.vessel.vessel_name} - {self.declaration_date}'


class ShipInspection(BaseModel):
    class Compliance(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'
        NOT_APPLICABLE = 'NOT_APPLICABLE', 'غير متاح'

    class OverallStatus(models.TextChoices):
        PASSED = 'PASSED', 'نجح'
        FAILED = 'FAILED', 'فشل'
        CONDITIONAL = 'CONDITIONAL', 'مشروط'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='inspections', verbose_name='السفينة'
    )
    visit = models.ForeignKey(
        VesselVisit, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections', verbose_name='الزيارة'
    )
    inspection_date = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ التفتيش')
    inspector = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='ship_inspections', verbose_name='المفتش'
    )
    accommodation_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='أماكن الإقامة')
    kitchen_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='المطابخ')
    storeroom_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='المخازن')
    clinic_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='العيادة الطبية')
    water_tank_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='خزانات المياه')
    toilet_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='دورات المياه')
    ventilation_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='التهوية')
    cleanliness_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='النظافة العامة')
    findings = models.TextField(blank=True, verbose_name='الملاحظات')
    overall_status = models.CharField(max_length=20, choices=OverallStatus.choices, default=OverallStatus.PASSED, verbose_name='الحالة العامة')
    certificate_issued = models.BooleanField(default=False, verbose_name='صدرت الشهادة')

    class Meta:
        ordering = ['-inspection_date']
        verbose_name = 'تفتيش صحي للسفينة'
        verbose_name_plural = 'التفتيش الصحي للسفن'

    def __str__(self):
        return f'{self.vessel.vessel_name} - {self.overall_status}'


class FoodWaterInspection(BaseModel):
    class Compliance(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'

    class SampleStatus(models.TextChoices):
        NOT_COLLECTED = 'NOT_COLLECTED', 'لم تُسحب'
        SENT = 'SENT', 'أُرسلت للمختبر'
        UNDER_TEST = 'UNDER_TEST', 'قيد الفحص'
        RESULT_RECEIVED = 'RESULT_RECEIVED', 'وصلت النتيجة'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='food_water_inspections', verbose_name='السفينة'
    )
    inspection_date = models.DateField(auto_now_add=True, verbose_name='تاريخ التفتيش')
    inspector = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='food_water_inspections', verbose_name='المفتش'
    )
    food_safety_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='سلامة الأغذية')
    food_expiry_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='صلاحية الأغذية')
    storage_temp_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='درجات حرارة التخزين')
    drinking_water_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='مياه الشرب')
    ice_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='الثلج المستخدم')
    samples_collected = models.PositiveIntegerField(default=0, verbose_name='عدد العينات المسحوبة')
    sample_status = models.CharField(max_length=20, choices=SampleStatus.choices, default=SampleStatus.NOT_COLLECTED, verbose_name='حالة العينات')
    findings = models.TextField(blank=True, verbose_name='الملاحظات')

    class Meta:
        ordering = ['-inspection_date']
        verbose_name = 'تفتيش أغذية ومياه'
        verbose_name_plural = 'تفتيش الأغذية والمياه'

    def __str__(self):
        return f'{self.vessel.vessel_name} - {self.inspection_date}'


class SanitationCertificate(BaseModel):
    class CertificateType(models.TextChoices):
        SSCC = 'SSCC', 'شهادة مكافحة التلوث (SSCC)'
        SSCEC = 'SSCEC', 'شهادة الإعفاء (SSCEC)'

    class CertStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        ISSUED = 'ISSUED', 'صادرة'
        EXPIRED = 'EXPIRED', 'منتهية'
        REVOKED = 'REVOKED', 'ملغاة'

    certificate_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الشهادة')
    certificate_type = models.CharField(max_length=10, choices=CertificateType.choices, verbose_name='نوع الشهادة')
    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='sanitation_certificates', verbose_name='السفينة'
    )
    inspection = models.ForeignKey(
        ShipInspection, on_delete=models.SET_NULL, null=True, blank=True, related_name='sanitation_certificates', verbose_name='التفتيش'
    )
    issue_date = models.DateField(verbose_name='تاريخ الإصدار')
    expiry_date = models.DateField(verbose_name='تاريخ الانتهاء')
    status = models.CharField(max_length=10, choices=CertStatus.choices, default=CertStatus.DRAFT, verbose_name='الحالة')
    qr_code = models.CharField(max_length=100, blank=True, verbose_name='رمز QR')

    class Meta:
        ordering = ['-issue_date']
        verbose_name = 'شهادة صحة السفينة'
        verbose_name_plural = 'شهادات صحة السفن'

    def __str__(self):
        return f'{self.certificate_number} - {self.certificate_type}'


class IsolationRecord(BaseModel):
    class IsolationStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشطة'
        COMPLETED = 'COMPLETED', 'منتهية'
        RELEASED = 'RELEASED', 'أُفرج عنه'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='isolation_records', verbose_name='السفينة'
    )
    person_name = models.CharField(max_length=150, verbose_name='اسم الحالة')
    person_type = models.CharField(
        max_length=10, choices=[('CREW', 'طاقم'), ('PASSENGER', 'راكب')], verbose_name='النوع'
    )
    start_date = models.DateField(verbose_name='تاريخ بدء العزل')
    end_date = models.DateField(null=True, blank=True, verbose_name='تاريخ نهاية العزل')
    status = models.CharField(max_length=10, choices=IsolationStatus.choices, default=IsolationStatus.ACTIVE, verbose_name='الحالة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-start_date']
        verbose_name = 'سجل عزل وحجر'
        verbose_name_plural = 'سجلات العزل والحجر'

    def __str__(self):
        return f'{self.person_name} - {self.status}'


class SurveillanceCase(BaseModel):
    class CaseStatus(models.TextChoices):
        SUSPECTED = 'SUSPECTED', 'مشتبه بها'
        CONFIRMED = 'CONFIRMED', 'مؤكدة'
        RULED_OUT = 'RULED_OUT', 'مستبعدة'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='surveillance_cases', verbose_name='السفينة'
    )
    disease_name = models.CharField(max_length=150, verbose_name='المرض')
    person_name = models.CharField(max_length=150, verbose_name='اسم الحالة')
    report_date = models.DateField(auto_now_add=True, verbose_name='تاريخ البلاغ')
    status = models.CharField(max_length=20, choices=CaseStatus.choices, default=CaseStatus.SUSPECTED, verbose_name='الحالة')
    international_alert = models.BooleanField(default=False, verbose_name='تنبيه دولي')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-report_date']
        verbose_name = 'حالة ترصد وبائي'
        verbose_name_plural = 'حالات الترصد الوبائي'

    def __str__(self):
        return f'{self.disease_name} - {self.status}'


class VectorControl(BaseModel):
    class ControlType(models.TextChoices):
        MOSQUITO = 'MOSQUITO', 'بعوض'
        RODENT = 'RODENT', 'قوارض'
        INSECT = 'INSECT', 'حشرات'
        OTHER = 'OTHER', 'أخرى'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='vector_controls', verbose_name='السفينة'
    )
    control_type = models.CharField(max_length=20, choices=ControlType.choices, verbose_name='النوع')
    inspection_date = models.DateField(auto_now_add=True, verbose_name='تاريخ التفتيش')
    evidence_found = models.BooleanField(default=False, verbose_name='دلائل على وجود نواقل')
    treatment_applied = models.BooleanField(default=False, verbose_name='نُفذت المكافحة')
    campaign_name = models.CharField(max_length=150, blank=True, verbose_name='الحملة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-inspection_date']
        verbose_name = 'ترصد ومكافحة نواقل'
        verbose_name_plural = 'ترصد ومكافحة النواقل'

    def __str__(self):
        return f'{self.vessel.vessel_name} - {self.control_type}'


class CargoInspection(BaseModel):
    class CargoType(models.TextChoices):
        FOOD = 'FOOD', 'أغذية'
        MEDICINE = 'MEDICINE', 'أدوية'
        CHEMICAL = 'CHEMICAL', 'مواد كيميائية'
        ANIMAL = 'ANIMAL', 'حيوانات ومنتجات حيوانية'
        AGRICULTURAL = 'AGRICULTURAL', 'منتجات زراعية'
        OTHER = 'OTHER', 'أخرى'

    class CargoStatus(models.TextChoices):
        PENDING = 'PENDING', 'قيد الفحص'
        CLEARED = 'CLEARED', 'أُفرج عنها'
        REJECTED = 'REJECTED', 'مرفوضة'
        SENT_TO_LAB = 'SENT_TO_LAB', 'أُرسلت للمختبر'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='cargo_inspections', verbose_name='السفينة'
    )
    declaration_number = models.CharField(max_length=50, blank=True, verbose_name='رقم الإقرار')
    cargo_type = models.CharField(max_length=20, choices=CargoType.choices, verbose_name='نوع الشحنة')
    country_of_origin = models.CharField(max_length=100, blank=True, verbose_name='بلد المنشأ')
    description = models.TextField(blank=True, verbose_name='الوصف')
    status = models.CharField(max_length=20, choices=CargoStatus.choices, default=CargoStatus.PENDING, verbose_name='حالة الفحص')
    laboratory_result = models.TextField(blank=True, verbose_name='نتيجة المختبر')
    decision = models.TextField(blank=True, verbose_name='القرار')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تفتيش شحنة'
        verbose_name_plural = 'تفتيش الشحنات'

    def __str__(self):
        return f'{self.declaration_number or self.pk} - {self.cargo_type}'


class WasteInspection(BaseModel):
    class Compliance(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'

    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='waste_inspections', verbose_name='السفينة'
    )
    inspection_date = models.DateField(auto_now_add=True, verbose_name='تاريخ التفتيش')
    inspector = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='waste_inspections', verbose_name='المفتش'
    )
    medical_waste_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='النفايات الطبية')
    food_waste_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='النفايات الغذائية')
    wastewater_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='مياه الصرف')
    safe_disposal_status = models.CharField(max_length=20, choices=Compliance.choices, default=Compliance.COMPLIANT, verbose_name='التخلص الآمن')
    findings = models.TextField(blank=True, verbose_name='الملاحظات')

    class Meta:
        ordering = ['-inspection_date']
        verbose_name = 'تفتيش نفايات'
        verbose_name_plural = 'تفتيش النفايات'

    def __str__(self):
        return f'{self.vessel.vessel_name} - {self.inspection_date}'


class PortEmergency(BaseModel):
    class EmergencyStatus(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        CLOSED = 'CLOSED', 'مغلقة'

    class EmergencySeverity(models.TextChoices):
        LOW = 'LOW', 'منخفضة'
        MEDIUM = 'MEDIUM', 'متوسطة'
        HIGH = 'HIGH', 'عالية'

    port = models.ForeignKey(
        SeaPort, on_delete=models.CASCADE, related_name='emergencies', verbose_name='الميناء'
    )
    vessel = models.ForeignKey(
        Vessel, on_delete=models.SET_NULL, null=True, blank=True, related_name='emergencies', verbose_name='السفينة'
    )
    title = models.CharField(max_length=200, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    severity = models.CharField(max_length=10, choices=EmergencySeverity.choices, default=EmergencySeverity.MEDIUM, verbose_name='الخطورة')
    status = models.CharField(max_length=10, choices=EmergencyStatus.choices, default=EmergencyStatus.OPEN, verbose_name='الحالة')
    vessel_restricted = models.BooleanField(default=False, verbose_name='حركة السفينة مقيدة')
    reported_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت البلاغ')

    class Meta:
        ordering = ['-reported_at']
        verbose_name = 'طوارئ صحية'
        verbose_name_plural = 'الطوارئ الصحية'

    def __str__(self):
        return self.title


class HealthCertificate(BaseModel):
    class CertificateType(models.TextChoices):
        SHIP_HEALTH = 'SHIP_HEALTH', 'شهادة صحة السفينة'
        INSPECTION = 'INSPECTION', 'شهادة التفتيش الصحي'
        RELEASE = 'RELEASE', 'شهادة الإفراج الصحي'

    class CertStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        ISSUED = 'ISSUED', 'صادرة'
        REVOKED = 'REVOKED', 'ملغاة'

    certificate_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الشهادة')
    certificate_type = models.CharField(max_length=20, choices=CertificateType.choices, verbose_name='نوع الشهادة')
    vessel = models.ForeignKey(
        Vessel, on_delete=models.CASCADE, related_name='health_certificates', verbose_name='السفينة'
    )
    inspection = models.ForeignKey(
        ShipInspection, on_delete=models.SET_NULL, null=True, blank=True, related_name='health_certificates', verbose_name='التفتيش'
    )
    issue_date = models.DateField(verbose_name='تاريخ الإصدار')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    status = models.CharField(max_length=10, choices=CertStatus.choices, default=CertStatus.DRAFT, verbose_name='الحالة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-issue_date']
        verbose_name = 'شهادة صحية'
        verbose_name_plural = 'الشهادات الصحية'

    def __str__(self):
        return f'{self.certificate_number} - {self.certificate_type}'
