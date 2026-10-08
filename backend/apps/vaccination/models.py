import hmac
import uuid
from datetime import date

from django.conf import settings
from django.db import models

from apps.travelers.models import Traveler
from core.models import BaseModel
from core.utils.qr_payload import sign_payload


class Vaccine(BaseModel):
    """نوع اللقاح — بيانات أساسية قابلة للإدارة من الإدارة القومية."""

    class Route(models.TextChoices):
        ORAL = 'ORAL', 'فموي'
        INJECTION = 'INJECTION', 'حقن'
        INTRANASAL = 'INTRANASAL', 'بخاخ أنفي'
        OTHER = 'OTHER', 'أخرى'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    who_code = models.CharField(max_length=40, blank=True, verbose_name='كود منظمة الصحة العالمي')
    name_ar = models.CharField(max_length=120, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=120, blank=True, verbose_name='الاسم بالإنجليزية')
    route = models.CharField(max_length=15, choices=Route.choices, default=Route.INJECTION, verbose_name='طريق الإعطاء')
    series = models.PositiveSmallIntegerField(default=1, verbose_name='عدد جرعات السلسلة الأولية')
    booster_required = models.BooleanField(default=False, verbose_name='يتطلب جرعة تنشيطية')
    interval_days = models.PositiveIntegerField(null=True, blank=True, verbose_name='الفاصل بين الجرعات (يوم)')
    validity_days = models.PositiveIntegerField(null=True, blank=True, verbose_name='مدة صلاحية الشهادة (يوم)')
    required = models.BooleanField(default=False, verbose_name='إلزامي للسفر')
    description = models.TextField(blank=True, verbose_name='وصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'لقاح'
        verbose_name_plural = 'اللقاحات'

    def __str__(self):
        return f'{self.name_ar} ({self.code})'


class VaccineBatch(BaseModel):
    """تشغيلة لقاح (LOT) بالمخزون."""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'متاحة'
        DEPLETED = 'DEPLETED', 'نفدت'
        EXPIRED = 'EXPIRED', 'منتهية الصلاحية'
        RETURNED = 'RETURNED', 'مرتجعة'

    vaccine = models.ForeignKey(Vaccine, on_delete=models.PROTECT, related_name='batches', verbose_name='اللقاح')
    lot_number = models.CharField(max_length=60, unique=True, verbose_name='رقم التشغيلة LOT')
    manufacturer = models.CharField(max_length=120, blank=True, verbose_name='المُصنّع')
    manufacture_date = models.DateField(null=True, blank=True, verbose_name='تاريخ التصنيع')
    expiry_date = models.DateField(verbose_name='تاريخ الانتهاء')
    received_quantity = models.PositiveIntegerField(default=0, verbose_name='الكمية المستلمة')
    available_quantity = models.PositiveIntegerField(default=0, verbose_name='الكمية المتاحة')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, verbose_name='الحالة')
    received_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الاستلام')

    class Meta:
        ordering = ['expiry_date']
        verbose_name = 'تشغيلة لقاح'
        verbose_name_plural = 'تشغيلات اللقاح'

    def __str__(self):
        return f'{self.lot_number} — {self.vaccine.name_ar}'


class VaccinationSite(BaseModel):
    """عيادة أو نقطة تطعيم تابعة لمنفذ."""

    class Kind(models.TextChoices):
        CLINIC = 'CLINIC', 'عيادة تطعيم'
        PORT_POINT = 'PORT_POINT', 'نقطة تطعيم بمنفذ'

    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    kind = models.CharField(max_length=15, choices=Kind.choices, default=Kind.CLINIC, verbose_name='النوع')
    entry_point = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccination_sites',
        verbose_name='منفذ الدخول',
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    address = models.CharField(max_length=255, blank=True, verbose_name='العنوان')
    phone = models.CharField(max_length=30, blank=True, verbose_name='الهاتف')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'عيادة تطعيم'
        verbose_name_plural = 'عيادات التطعيم'

    def __str__(self):
        return self.name_ar


class VaccinationRecord(BaseModel):
    """جرعة لقاح مُعطاة لمسافر."""

    class DoseType(models.TextChoices):
        FIRST = 'FIRST', 'الجرعة الأولى'
        SECOND = 'SECOND', 'الجرعة الثانية'
        THIRD = 'THIRD', 'الجرعة الثالثة'
        BOOSTER = 'BOOSTER', 'جرعة تنشيطية'

    class Status(models.TextChoices):
        GIVEN = 'GIVEN', 'مُعطاة'
        CANCELLED = 'CANCELLED', 'ملغاة'

    traveler = models.ForeignKey(Traveler, on_delete=models.CASCADE, related_name='vaccination_records', verbose_name='المسافر')
    vaccine = models.ForeignKey(Vaccine, on_delete=models.PROTECT, related_name='records', verbose_name='اللقاح')
    batch = models.ForeignKey(VaccineBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name='records', verbose_name='التشغيلة')
    dose_type = models.CharField(max_length=10, choices=DoseType.choices, default=DoseType.FIRST, verbose_name='نوع الجرعة')
    dose_number = models.PositiveSmallIntegerField(default=1, verbose_name='رقم الجرعة')
    administered_at = models.DateField(verbose_name='تاريخ التطعيم')
    site = models.ForeignKey(VaccinationSite, on_delete=models.SET_NULL, null=True, blank=True, related_name='records', verbose_name='المكان')
    vaccinator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccination_administered',
        verbose_name='الطبيب/المطعّم',
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccination_recorded',
        verbose_name='سجّل بواسطة',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.GIVEN, verbose_name='الحالة')

    class Meta:
        ordering = ['-administered_at']
        verbose_name = 'سجل تطعيم'
        verbose_name_plural = 'سجلات التطعيم'

    def __str__(self):
        return f'{self.traveler.passport_number} — {self.vaccine.code} جرعة {self.dose_number}'


class VaccinationRule(BaseModel):
    """قاعدة تقييم احتياج المسافر لتطعيم معيَّن."""

    vaccine = models.ForeignKey(Vaccine, on_delete=models.CASCADE, related_name='rules', verbose_name='اللقاح')
    title_ar = models.CharField(max_length=150, verbose_name='العنوان بالعربية')
    destination_region = models.CharField(max_length=100, blank=True, verbose_name='منطقة الوجهة')
    min_age_days = models.PositiveIntegerField(null=True, blank=True, verbose_name='أدنى عمر (يوم)')
    max_age_days = models.PositiveIntegerField(null=True, blank=True, verbose_name='أقصى عمر (يوم)')
    required = models.BooleanField(default=True, verbose_name='إلزامي')
    doses_required = models.PositiveSmallIntegerField(default=1, verbose_name='الجرعات المطلوبة')
    validity_days = models.PositiveIntegerField(null=True, blank=True, verbose_name='مدة الصلاحية (يوم)')
    note = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['vaccine__name_ar']
        verbose_name = 'قاعدة تطعيم'
        verbose_name_plural = 'قواعد التطعيم'

    def __str__(self):
        return self.title_ar


class VaccinationCertificateQuerySet(models.QuerySet):
    def active(self, on=None):
        """الشهادات السارية فعلاً: `ACTIVE` لم تنتهِ صلاحيتها بعد.

        حالة `EXPIRED` تُشتق عند الاستعلام ولا تُكتب في الجدول: انتهاء
        الصلاحية يمرّ بالزمن ولا توجد مهمة دورية تُحدِّث العمود. لذلك
        الاعتماد على `status=ACTIVE` وحده يعدّ كل شهادة منتهيةً سارية —
        في العدّادات وفي ملخّص المسافر وفي استعلام المنفذ العام.
        """
        return self.filter(
            status=VaccinationCertificate.Status.ACTIVE,
            valid_until__gte=on or date.today(),
        )


class VaccinationCertificate(BaseModel):
    """شهادة التطعيم الدولية (International Vaccination Certificate)."""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'سارية'
        REVOKED = 'REVOKED', 'ملغاة'
        EXPIRED = 'EXPIRED', 'منتهية'

    traveler = models.ForeignKey(Traveler, on_delete=models.CASCADE, related_name='vaccination_certificates', verbose_name='المسافر')
    record = models.ForeignKey(
        VaccinationRecord,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certificates',
        verbose_name='الجرعة',
    )
    vaccine = models.ForeignKey(Vaccine, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='اللقاح')
    certificate_number = models.CharField(max_length=40, unique=True, verbose_name='رقم الشهادة')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, verbose_name='الحالة')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='issued_vaccination_certificates', verbose_name='أصدر بواسطة',
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإصدار')
    valid_until = models.DateField(verbose_name='صالحة حتى')
    validity_days = models.PositiveIntegerField(default=0, verbose_name='مدة الصلاحية (يوم)')
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, verbose_name='رمز التحقق')
    verification_path = models.CharField(max_length=200, blank=True, verbose_name='مسار التحقق')
    replaces = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='replacement_chain',
        db_index=True,
        verbose_name='الشهادة الأصل',
    )
    replacement_reason = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default='',
        verbose_name='سبب الاستبدال',
    )
    replaced_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='تاريخ الاستبدال',
    )

    objects = VaccinationCertificateQuerySet.as_manager()

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'شهادة تطعيم دولية'
        verbose_name_plural = 'شهادات التطعيم الدولية'

    def __str__(self):
        return self.certificate_number

    @property
    def effective_status(self):
        """الحالة المعروضة: `EXPIRED` عند تجاوز `valid_until` ما دامت ACTIVE."""
        if self.status == self.Status.ACTIVE and self.valid_until < date.today():
            return self.Status.EXPIRED
        return self.status

    @property
    def is_valid(self):
        return self.effective_status == self.Status.ACTIVE

    @property
    def verification_signature(self):
        """توقيع HMAC ثابت للشهادة — بلا تخزين، يُشتق من رقمها ورمزها.

        الشهادة تُطبع على ورق وتبقى سنوات، فلا يصحّ ربطها بحمولة ذات عمر
        24 ساعة كما هو حال QR المسافر. التوقيع هنا لكشف الغش: رمز يشير إلى
        شهادة أخرى أو مزالة يختلف عن حسابه.
        """
        return sign_payload(
            {'certificate_number': self.certificate_number, 'qr_token': str(self.qr_token)}
        )

    def verification_url(self, base=''):
        """رابط التحقق المطلق المطبوع في الـ QR."""
        base = (base or '').rstrip('/')
        url = f'{base}{self.verification_path}' if self.verification_path else ''
        return f'{url}?sig={self.verification_signature}'

    def signature_matches(self, signature):
        return bool(signature) and hmac.compare_digest(self.verification_signature, signature)


class CertificateVerification(BaseModel):
    """سجل عمليات التحقق من الشهادة (عامة أو بواسطة موظف)."""

    certificate = models.ForeignKey(
        VaccinationCertificate, on_delete=models.CASCADE, related_name='verifications', verbose_name='الشهادة'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccination_certificate_verifications',
        verbose_name='تحقق بواسطة',
    )
    success = models.BooleanField(default=True, verbose_name='نتيجة التحقق')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    note = models.CharField(max_length=200, blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'عملية تحقق'
        verbose_name_plural = 'عمليات التحقق'

    def __str__(self):
        return f'{self.certificate.certificate_number} — {"نجاح" if self.success else "فشل"}'


class VaccinationAuditLog(BaseModel):
    """تدقيق دورة حياة الشهادة: إصدار/استبدال/إعادة إصدار/إلغاء.

    يُنشأ داخل نفس معاملة قاعدة البيانات التي تُنفّذ التغيير؛ أي فشل في
    الكتابة يُرجِع التغيير بأكمله (لا يوجد best-effort ولا تسجيل غير متزامن).
    """

    class Action(models.TextChoices):
        ISSUE = 'ISSUE', 'إصدار'
        REPLACE = 'REPLACE', 'استبدال'
        REISSUE = 'REISSUE', 'إعادة إصدار'
        REVOKE = 'REVOKE', 'إلغاء'

    action = models.CharField(max_length=20, choices=Action.choices, verbose_name='الإجراء')
    certificate = models.ForeignKey(
        VaccinationCertificate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='الشهادة',
    )
    source_certificate = models.ForeignKey(
        VaccinationCertificate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='derived_audit_logs',
        verbose_name='الشهادة الأصل',
    )
    record = models.ForeignKey(
        VaccinationRecord,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certificate_audit_logs',
        verbose_name='الجرعة',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vaccination_audit_logs',
        verbose_name='المستخدم',
    )
    details = models.JSONField(default=dict, blank=True, verbose_name='التفاصيل')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تدقيق حياة الشهادة'
        verbose_name_plural = 'تدقيق دورة حياة الشهادات'

    def __str__(self):
        return f'{self.action} — {self.certificate.certificate_number if self.certificate else "-"}'


class InventoryTransaction(BaseModel):
    """حركة مخزون للجرعات (استلام/صرف/انتهاء/تسوية)."""

    class Type(models.TextChoices):
        IN = 'IN', 'استلام'
        OUT = 'OUT', 'صرف'
        ADJUST = 'ADJUST', 'تسوية'
        EXPIRED = 'EXPIRED', 'انتهاء صلاحية'

    batch = models.ForeignKey(VaccineBatch, on_delete=models.CASCADE, related_name='transactions', verbose_name='التشغيلة')
    type = models.CharField(max_length=10, choices=Type.choices, verbose_name='النوع')
    quantity = models.PositiveIntegerField(verbose_name='الكمية')
    reference_record = models.ForeignKey(
        VaccinationRecord, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inventory_transactions', verbose_name='الجرعة المرتبطة',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='vaccination_inventory_transactions', verbose_name='أنشأ بواسطة',
    )
    note = models.CharField(max_length=250, blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'حركة مخزون'
        verbose_name_plural = 'حركات المخزون'

    def __str__(self):
        return f'{self.batch.lot_number} {self.type} {self.quantity}'