from django.db import models
from django.utils.text import slugify

from core.models import BaseModel


class ContentStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'مسودة'
    REVIEW = 'REVIEW', 'مراجعة'
    APPROVED = 'APPROVED', 'معتمد'
    PUBLISHED = 'PUBLISHED', 'منشور'
    ARCHIVED = 'ARCHIVED', 'مؤرشف'


class NewsArticle(BaseModel):
    class Category(models.TextChoices):
        GENERAL = 'GENERAL', 'عام'
        HEALTH = 'HEALTH', 'صحي'
        TRAVEL = 'TRAVEL', 'سفر'
        OFFICIAL = 'OFFICIAL', 'رسمي'

    title = models.CharField(max_length=255, verbose_name='العنوان')
    title_en = models.CharField(max_length=255, blank=True, verbose_name='العنوان بالإنجليزية')
    slug = models.SlugField(max_length=255, blank=True, verbose_name='الرابط المختصر')
    summary = models.TextField(blank=True, verbose_name='الملخص')
    content = models.TextField(verbose_name='المحتوى')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL, verbose_name='الفئة')
    image = models.ImageField(upload_to='news/%Y/%m/', null=True, blank=True, verbose_name='الصورة')
    status = models.CharField(
        max_length=20, choices=ContentStatus.choices, default=ContentStatus.DRAFT, verbose_name='الحالة'
    )
    is_published = models.BooleanField(default=False, verbose_name='منشور')
    is_urgent = models.BooleanField(default=False, verbose_name='عاجل')
    is_featured = models.BooleanField(default=False, verbose_name='مميز')
    keywords = models.JSONField(default=list, blank=True, verbose_name='الكلمات المفتاحية')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    published_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت النشر')
    author = models.CharField(max_length=150, blank=True, verbose_name='الكاتب')
    reviewer = models.CharField(max_length=150, blank=True, verbose_name='المراجع')
    approver = models.CharField(max_length=150, blank=True, verbose_name='المعتمد')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_news',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        ordering = ['-published_at']
        verbose_name = 'خبر'
        verbose_name_plural = 'الأخبار'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title_en) or slugify(self.title) or 'post'
            slug = base
            i = 1
            while NewsArticle.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{i}'
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Circular(BaseModel):
    """تعميم رسمي منشور للمواطنين (التعاميم)."""

    class Category(models.TextChoices):
        OFFICIAL = 'OFFICIAL', 'رسمي'
        HEALTH = 'HEALTH', 'صحي'
        ADMIN = 'ADMIN', 'إداري'
        TRAVEL = 'TRAVEL', 'سفر'
        OTHER = 'OTHER', 'أخرى'

    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'عادي'
        IMPORTANT = 'IMPORTANT', 'مهم'
        URGENT = 'URGENT', 'عاجل'

    title = models.CharField(max_length=255, verbose_name='العنوان')
    body = models.TextField(verbose_name='المحتوى')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OFFICIAL, verbose_name='الفئة')
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL, verbose_name='الأولوية')
    status = models.CharField(
        max_length=20, choices=ContentStatus.choices, default=ContentStatus.DRAFT, verbose_name='الحالة'
    )
    reference_number = models.CharField(max_length=100, blank=True, verbose_name='الرقم المرجعي')
    published_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت النشر')
    author = models.CharField(max_length=150, blank=True, verbose_name='الكاتب')
    reviewer = models.CharField(max_length=150, blank=True, verbose_name='المراجع')
    approver = models.CharField(max_length=150, blank=True, verbose_name='المعتمد')
    attachment = models.FileField(upload_to='circulars/%Y/%m/', null=True, blank=True, verbose_name='المرفق')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_circulars',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        ordering = ['-published_at', '-created_at']
        verbose_name = 'تعميم'
        verbose_name_plural = 'التعاميم'

    def __str__(self):
        return self.title


class Page(BaseModel):
    slug = models.SlugField(max_length=100, verbose_name='الرابط')
    title = models.CharField(max_length=255, verbose_name='العنوان')
    content = models.TextField(verbose_name='المحتوى')
    is_published = models.BooleanField(default=True, verbose_name='منشور')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_pages',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['slug', 'sector'], name='unique_page_slug_sector'),
        ]
        ordering = ['title']
        verbose_name = 'صفحة'
        verbose_name_plural = 'الصفحات'

    def __str__(self):
        return self.title


class FaqItem(BaseModel):
    question = models.CharField(max_length=255, verbose_name='السؤال')
    answer = models.TextField(verbose_name='الجواب')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_faq',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        ordering = ['order', 'question']
        verbose_name = 'سؤال شائع'
        verbose_name_plural = 'الأسئلة الشائعة'

    def __str__(self):
        return self.question


class CmsDocument(BaseModel):
    class Category(models.TextChoices):
        LAW = 'LAW', 'قانون'
        REGULATION = 'REGULATION', 'لائحة'
        FORM = 'FORM', 'نموذج'
        GUIDE = 'GUIDE', 'دليل'
        OTHER = 'OTHER', 'أخرى'

    title = models.CharField(max_length=255, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER, verbose_name='الفئة')
    file = models.FileField(upload_to='documents/%Y/%m/', verbose_name='الملف')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_documents',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        ordering = ['title']
        verbose_name = 'وثيقة'
        verbose_name_plural = 'الوثائق'

    def __str__(self):
        return self.title


class Slider(BaseModel):
    """شريحة دعائية للصفحة الرئيسية لقطاع ما."""

    title_ar = models.CharField(max_length=200, blank=True, verbose_name='العنوان بالعربية')
    title_en = models.CharField(max_length=200, blank=True, verbose_name='العنوان بالإنجليزية')
    subtitle_ar = models.CharField(max_length=500, blank=True, verbose_name='الوصف بالعربية')
    subtitle_en = models.CharField(max_length=500, blank=True, verbose_name='الوصف بالإنجليزية')
    image = models.ImageField(upload_to='sliders/%Y/%m/', null=True, blank=True, verbose_name='الصورة')
    button_text = models.CharField(max_length=100, blank=True, verbose_name='نص الزر')
    button_link = models.CharField(max_length=500, blank=True, verbose_name='رابط الزر')
    sort_order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_sliders',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        ordering = ['sort_order', 'created_at']
        verbose_name = 'شريحة دعائية'
        verbose_name_plural = 'الشرائح الدعائية'

    def __str__(self):
        return self.title_ar or self.title_en or 'شريحة'


class MediaItem(BaseModel):
    """ملف وسائط ضمن مكتبة وسائط القطاع (صورة/وثيقة/فيديو)."""

    class Kind(models.TextChoices):
        IMAGE = 'image', 'صورة'
        DOCUMENT = 'document', 'وثيقة'
        VIDEO = 'video', 'فيديو'

    title = models.CharField(max_length=255, verbose_name='العنوان')
    file = models.FileField(upload_to='media/%Y/%m/', verbose_name='الملف')
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.IMAGE, verbose_name='النوع')
    mime_type = models.CharField(max_length=100, blank=True, verbose_name='نوع الملف')
    file_size = models.BigIntegerField(default=0, verbose_name='الحجم')
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_uploads',
        verbose_name='رافع الملف',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_media',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'ملف وسائط'
        verbose_name_plural = 'الوسائط'

    def __str__(self):
        return self.title


class SiteSetting(BaseModel):
    key = models.CharField(max_length=100, verbose_name='المفتاح')
    value = models.JSONField(default=dict, blank=True, verbose_name='القيمة')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_settings',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['key', 'sector'], name='unique_site_setting_key_sector'),
        ]
        ordering = ['key']
        verbose_name = 'إعداد موقع'
        verbose_name_plural = 'إعدادات الموقع'

    def __str__(self):
        return self.key


class Announcement(BaseModel):
    """إعلان/تنبيه صحي موجَّه للجمهور يظهر ضمن نافذة زمنية محددة."""

    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'عادي'
        IMPORTANT = 'IMPORTANT', 'مهم'
        URGENT = 'URGENT', 'عاجل'

    title = models.CharField(max_length=255, verbose_name='العنوان')
    title_en = models.CharField(max_length=255, blank=True, verbose_name='العنوان بالإنجليزية')
    slug = models.SlugField(max_length=255, blank=True, verbose_name='الرابط المختصر')
    body = models.TextField(verbose_name='المحتوى')
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.NORMAL, verbose_name='الأولوية'
    )
    audience = models.JSONField(default=list, blank=True, verbose_name='الجمهور المستهدف')
    start_at = models.DateTimeField(null=True, blank=True, verbose_name='بداية الظهور')
    end_at = models.DateTimeField(null=True, blank=True, verbose_name='نهاية الظهور')
    status = models.CharField(
        max_length=20, choices=ContentStatus.choices, default=ContentStatus.DRAFT, verbose_name='الحالة'
    )
    is_published = models.BooleanField(default=False, verbose_name='منشور')
    published_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت النشر')
    author = models.CharField(max_length=150, blank=True, verbose_name='الكاتب')
    reviewer = models.CharField(max_length=150, blank=True, verbose_name='المراجع')
    approver = models.CharField(max_length=150, blank=True, verbose_name='المعتمد')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cms_announcements',
        verbose_name='القطاع الإداري',
    )

    class Meta:
        ordering = ['-start_at', '-created_at']
        verbose_name = 'إعلان'
        verbose_name_plural = 'الإعلانات والتنبيهات'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title_en) or slugify(self.title) or 'announcement'
            slug = base
            i = 1
            while Announcement.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{i}'
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)


class DirectorProfile(BaseModel):
    """بيانات المدير (عام = وطني، أو خاص بقطاع محدد)."""

    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.CASCADE,
        related_name='director_profiles',
        null=True,
        blank=True,
        verbose_name='القطاع',
        help_text='اتركه فارغاً للمدير القومي العام، أو اختر قطاعاً للمدير الخاص بذلك القطاع.',
    )
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    title = models.CharField(max_length=200, verbose_name='اللقب الوظيفي')
    qualification = models.CharField(max_length=150, blank=True, verbose_name='المؤهل')
    specialization = models.CharField(max_length=150, blank=True, verbose_name='التخصص')
    summary = models.TextField(blank=True, verbose_name='نبذة تعريفية')
    message = models.TextField(blank=True, verbose_name='كلمة المدير')
    photo = models.ImageField(upload_to='director/', null=True, blank=True, verbose_name='الصورة')
    is_confirmed = models.BooleanField(default=False, verbose_name='معتمد رسمياً')
    confirmation_note = models.TextField(blank=True, verbose_name='ملاحظة حالة الاعتماد')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        verbose_name = 'بيانات المدير القومي'
        verbose_name_plural = 'بيانات المدير القومي'
        ordering = ['-created_at']

    def __str__(self):
        return self.name_ar
