from django.db import models

from core.models import BaseModel


class ContactMessage(BaseModel):
    name = models.CharField(max_length=100, verbose_name='الاسم')
    email = models.EmailField(verbose_name='البريد الإلكتروني')
    phone = models.CharField(max_length=20, blank=True, verbose_name='رقم الهاتف')
    subject = models.CharField(max_length=200, verbose_name='الموضوع')
    message = models.TextField(verbose_name='الرسالة')
    is_read = models.BooleanField(default=False, verbose_name='تمت القراءة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'رسالة تواصل'
        verbose_name_plural = 'رسائل التواصل'

    def __str__(self):
        return f'{self.name} - {self.subject}'


class ServiceCategory(BaseModel):
    """فئة خدمة إلكترونية ضمن بوابة الخدمات (/services)."""

    code = models.SlugField(max_length=50, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم (عربي)')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم (إنجليزي)')
    description_ar = models.TextField(blank=True, verbose_name='الوصف')
    icon = models.CharField(max_length=60, blank=True, default='apps', verbose_name='الأيقونة')
    sort_order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    sectors = models.ManyToManyField(
        'organization.Sector',
        blank=True,
        related_name='service_categories',
        verbose_name='القطاعات',
        help_text='إن تركت فارغة فالفئة ظاهرة لجميع القطاعات، وإن حُددت قطاعات فعرضها يقتصر عليها.',
    )

    class Meta:
        ordering = ['sort_order', 'name_ar']
        verbose_name = 'فئة خدمة'
        verbose_name_plural = 'فئات الخدمات'

    def __str__(self):
        return self.name_ar


class Service(BaseModel):
    """خدمة إلكترونية واحدة ضمن كتالوج الخدمات الموحّد."""

    class Audience(models.TextChoices):
        PUBLIC = 'PUBLIC', 'عام'
        INDIVIDUAL = 'INDIVIDUAL', 'أفراد'
        BUSINESS = 'BUSINESS', 'أعمال'
        GOVERNMENT = 'GOVERNMENT', 'جهات حكومية'
        EMPLOYEE = 'EMPLOYEE', 'موظفون'

    class IdentityProvider(models.TextChoices):
        NONE = 'NONE', 'لا يتطلب هوية'
        CREDENTIALS = 'CREDENTIALS', 'اسم مستخدم وكلمة مرور'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'متاح'
        COMING_SOON = 'COMING_SOON', 'قريباً'

    code = models.SlugField(max_length=60, unique=True, verbose_name='الكود')
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.PROTECT,
        related_name='services',
        verbose_name='الفئة',
    )
    name_ar = models.CharField(max_length=200, verbose_name='الاسم (عربي)')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم (إنجليزي)')
    description_ar = models.TextField(blank=True, verbose_name='الوصف')
    icon = models.CharField(max_length=60, blank=True, default='task', verbose_name='الأيقونة')
    route = models.CharField(max_length=255, blank=True, verbose_name='المسار', help_text='المسار الداخلي للواجهة (مثل /services/food-safety/import)')
    external_url = models.CharField(max_length=500, blank=True, verbose_name='رابط خارجي')
    audience = models.CharField(
        max_length=20, choices=Audience.choices, default=Audience.PUBLIC, verbose_name='الجمهور'
    )
    requires_auth = models.BooleanField(default=False, verbose_name='يتطلب مصادقة')
    identity_provider = models.CharField(
        max_length=20, choices=IdentityProvider.choices, default=IdentityProvider.NONE, verbose_name='موفّر الهوية'
    )
    target_system = models.CharField(max_length=100, blank=True, verbose_name='النظام التشغيلي', help_text='النظام المتخصص الذي تنفَّذ فيه الخدمة')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, verbose_name='الحالة'
    )
    sort_order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['category__sort_order', 'sort_order', 'name_ar']
        verbose_name = 'خدمة'
        verbose_name_plural = 'الخدمات'

    def __str__(self):
        return self.name_ar


class HealthCertificate(BaseModel):
    class CertificateType(models.TextChoices):
        VACCINATION = 'VACCINATION', 'شهادة تطعيم'
        MEDICAL = 'MEDICAL', 'شهادة طبية'
        FITNESS = 'FITNESS', 'شهادة لياقة'

    certificate_number = models.CharField(max_length=30, unique=True, verbose_name='رقم الشهادة')
    traveler_name = models.CharField(max_length=150, verbose_name='اسم حامل الشهادة')
    passport_number = models.CharField(max_length=20, verbose_name='رقم جواز السفر')
    certificate_type = models.CharField(
        max_length=20, choices=CertificateType.choices, default=CertificateType.VACCINATION, verbose_name='نوع الشهادة'
    )
    disease = models.CharField(max_length=100, blank=True, verbose_name='المرض/التطعيم')
    issued_date = models.DateField(verbose_name='تاريخ الإصدار')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    is_valid = models.BooleanField(default=True, verbose_name='سارية')

    class Meta:
        ordering = ['-issued_date']
        verbose_name = 'شهادة صحية'
        verbose_name_plural = 'الشهادات الصحية'

    def __str__(self):
        return f'{self.certificate_number} - {self.traveler_name}'

