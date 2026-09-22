from django.conf import settings
from django.db import models

from core.models import BaseModel


class Country(BaseModel):
    class RiskLevel(models.TextChoices):
        GREEN = 'GREEN', 'أخضر'
        YELLOW = 'YELLOW', 'أصفر'
        RED = 'RED', 'أحمر'

    code = models.CharField(max_length=3, unique=True, verbose_name='الكود')
    name = models.CharField(max_length=100, verbose_name='الاسم')
    name_ar = models.CharField(max_length=100, blank=True, verbose_name='الاسم بالعربية')
    risk_level = models.CharField(
        max_length=10, choices=RiskLevel.choices, default=RiskLevel.GREEN, verbose_name='مستوى الخطر'
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'دولة'
        verbose_name_plural = 'الدول'

    def __str__(self):
        return self.name


class Traveler(BaseModel):
    class RegistrationStatus(models.TextChoices):
        PENDING_DOCUMENTS = 'PENDING_DOCUMENTS', 'في انتظار المستندات'
        UNDER_REVIEW = 'UNDER_REVIEW', 'قيد المراجعة'
        ACTION_REQUIRED = 'ACTION_REQUIRED', 'إجراء مطلوب'
        COMPLETED = 'COMPLETED', 'مكتمل'
        REJECTED = 'REJECTED', 'مرفوض'

    passport_number = models.CharField(max_length=20, unique=True, verbose_name='رقم جواز السفر')
    first_name = models.CharField(max_length=100, verbose_name='الاسم الأول')
    last_name = models.CharField(max_length=100, verbose_name='اسم العائلة')
    date_of_birth = models.DateField(verbose_name='تاريخ الميلاد')
    nationality = models.ForeignKey(
        Country, on_delete=models.PROTECT, related_name='travelers', verbose_name='الجنسية'
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name='رقم الجوال')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    medical_history = models.JSONField(default=dict, blank=True, verbose_name='التاريخ الطبي')
    registration_status = models.CharField(
        max_length=20,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.PENDING_DOCUMENTS,
        verbose_name='حالة التسجيل',
    )
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')
    medical_file_no = models.CharField(
        max_length=20, unique=True, null=True, blank=True, verbose_name='رقم الملف الطبي الموحد'
    )
    qr_token = models.UUIDField(null=True, blank=True, unique=True, verbose_name='رمز QR للملف الطبي')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='travelers',
        verbose_name='المستخدم المرتبط',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'مسافر'
        verbose_name_plural = 'المسافرون'

    def __str__(self):
        return f'{self.full_name} ({self.passport_number})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'


class TravelerDocument(BaseModel):
    class DocumentType(models.TextChoices):
        PASSPORT = 'PASSPORT', 'جواز السفر'
        VACCINE = 'VACCINE', 'شهادة تطعيم'
        TEST_RESULT = 'TEST_RESULT', 'نتيجة فحص'
        OTHER = 'OTHER', 'أخرى'

    traveler = models.ForeignKey(
        Traveler, on_delete=models.CASCADE, related_name='documents', verbose_name='المسافر'
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices, verbose_name='نوع المستند')
    file = models.FileField(upload_to='documents/%Y/%m/', verbose_name='الملف')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الرفع')

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'مستند'
        verbose_name_plural = 'المستندات'

    def __str__(self):
        return f'{self.traveler} - {self.document_type}'


class TravelerStatusLog(BaseModel):
    traveler = models.ForeignKey(
        Traveler, on_delete=models.CASCADE, related_name='status_logs', verbose_name='المسافر'
    )
    from_status = models.CharField(max_length=20, blank=True, verbose_name='الحالة السابقة')
    to_status = models.CharField(max_length=20, verbose_name='الحالة الجديدة')
    note = models.TextField(blank=True, verbose_name='ملاحظات')
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='traveler_status_logs',
        verbose_name='من قام بالتغيير',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل حالة الطلب'
        verbose_name_plural = 'سجل حالات الطلبات'

    def __str__(self):
        return f'{self.traveler} → {self.to_status}'
