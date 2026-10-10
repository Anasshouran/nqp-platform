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



# --------------------------------------------------------------------------- #
# المساعد الذكي: تسجيل مجهول + تقييم الرضا
# --------------------------------------------------------------------------- #

class AssistantConversation(BaseModel):
    """سؤال واحد للمساعد — سجل مجهول لتحسين النوايا.

    التوثيق يطلب «تسجيل المحادثات مجهول الهوية». لذلك **لا** نخزّن نص
    السؤال ولا الـIP ولا معرّف الجلسة: ما يُحفظ هو تصنيف النية ونوع
    الإجابة ودرجة الثقة واللغة وطول النص فقط. تحليل النوايا لا يحتاج
    النص الأصلي، والاحتفاظ به يجعل السجل بيانات شخصية.
    """

    class Intent(models.TextChoices):
        GREETING = 'GREETING'
        THANKS = 'THANKS'
        FAQ = 'FAQ'
        TRAVEL_REQUIREMENTS = 'TRAVEL_REQUIREMENTS'
        COUNTRY_REQUIREMENTS = 'COUNTRY_REQUIREMENTS'
        VACCINATION = 'VACCINATION'
        DOCUMENTS = 'DOCUMENTS'
        QR = 'QR'
        CERTIFICATE = 'CERTIFICATE'
        TRACKING = 'TRACKING'
        REGISTRATION = 'REGISTRATION'
        SERVICES = 'SERVICES'
        NOTICE = 'NOTICE'
        DISEASE = 'DISEASE'
        CONTACT = 'CONTACT'
        ESCALATE = 'ESCALATE'
        UNKNOWN = 'UNKNOWN'

    class AnswerType(models.TextChoices):
        INFO = 'INFO'
        ACTION = 'ACTION'
        ALERT = 'ALERT'
        SOURCE = 'SOURCE'
        NOT_FOUND = 'NOT_FOUND'

    class Confidence(models.TextChoices):
        LOW = 'LOW'
        MEDIUM = 'MEDIUM'
        HIGH = 'HIGH'

    intent = models.CharField(
        max_length=30, choices=Intent.choices, db_index=True, verbose_name='النية'
    )
    answer_type = models.CharField(
        max_length=12, choices=AnswerType.choices, default=AnswerType.INFO, db_index=True,
        verbose_name='نوع الإجابة',
    )
    confidence = models.CharField(
        max_length=6, choices=Confidence.choices, default=Confidence.LOW, verbose_name='درجة الثقة'
    )
    language = models.CharField(max_length=2, default='ar', verbose_name='اللغة')
    source_count = models.PositiveIntegerField(default=0, verbose_name='عدد المصادر')
    message_length = models.PositiveIntegerField(default=0, verbose_name='طول الرسالة')
    has_disclaimer = models.BooleanField(default=False, verbose_name='حمل إخلاء المسؤولية')
    engine = models.CharField(max_length=20, default='rules', verbose_name='المحرّك')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['intent', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = 'محادثة مساعد'
        verbose_name_plural = 'محادثات المساعد'

    def __str__(self) -> str:
        return f'{self.intent} - {self.created_at:%Y-%m-%d %H:%M}'


class AssistantFeedback(BaseModel):
    """تقييم المستخدم لإجابة (👍/👎) — يُربط بالمحادثة نفسها.

    لا يحمل نصاً حراً: التعليق الحر في محادثة عامة يفتح باب إدخال بيانات
    شخصية، والتوثيق يكتفي بعلامة الرضا. `conversation` اختياري لأن
    التقييم قد يصل بلا جلسة معروفة (أو بعد انتهاء retention).
    """

    class Rating(models.IntegerChoices):
        UP = 1, 'مفيد'
        DOWN = -1, 'غير مفيد'

    conversation = models.ForeignKey(
        AssistantConversation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='feedback', verbose_name='المحادثة',
    )
    rating = models.SmallIntegerField(choices=Rating.choices, verbose_name='التقييم')
    intent = models.CharField(
        max_length=30, blank=True, db_index=True,
        choices=AssistantConversation.Intent.choices, default=AssistantConversation.Intent.UNKNOWN,
        verbose_name='النية (نسخة عند التقييم)',
    )
    answer_type = models.CharField(
        max_length=12, blank=True, choices=AssistantConversation.AnswerType.choices,
        default=AssistantConversation.AnswerType.INFO, verbose_name='نوع الإجابة (نسخة عند التقييم)',
    )
    engine = models.CharField(max_length=20, default='rules', verbose_name='المحرّك')

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['intent', '-created_at'])]
        verbose_name = 'تقييم مساعد'
        verbose_name_plural = 'تقييمات المساعد'

    def __str__(self) -> str:
        return f'{"مفيد" if self.rating == 1 else "غير مفيد"} - {self.intent}'
