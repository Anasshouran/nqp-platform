"""نموذج بيانات قسم تقنية المعلومات (IT) لحدود قطاع البحر الأحمر.

كل الكيانات مرتبطة بقطاع عبر حقل `sector` مباشر (organization.Sector)، وبعضها
يرتبط اختيارياً بنقطة دخول (masterdata.EntryPoint). يحصر الوصول على قطاع
المستخدم عبر نطاقه الإداري SECTOR.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


class ItSystem(BaseModel):
    """نظام/خدمة تقنية يُراقب جاهزيته عبر قطاع (أنظمة الموانئ/المطارات/الفسح...)."""

    class Status(models.TextChoices):
        ONLINE = 'ONLINE', 'مُتصل'
        WARNING = 'WARNING', 'تحذير'
        OFFLINE = 'OFFLINE', 'متوقف'

    code = models.CharField(max_length=50, unique=True, verbose_name='كود النظام')
    name = models.CharField(max_length=120, verbose_name='اسم النظام')
    name_ar = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالعربية')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ONLINE, verbose_name='الحالة'
    )
    request_count = models.PositiveIntegerField(default=0, verbose_name='عدد الطلبات')
    last_checked_at = models.DateTimeField(blank=True, null=True, verbose_name='آخر فحص')
    last_error = models.TextField(blank=True, verbose_name='آخر خطأ')
    sector = models.ForeignKey(
        'organization.Sector', related_name='it_systems', on_delete=models.CASCADE, verbose_name='القطاع'
    )

    class Meta:
        app_label = 'it_management'
        ordering = ['name_ar', 'name']
        verbose_name = 'نظام تقني'
        verbose_name_plural = 'الأنظمة التقنية'

    def __str__(self):
        return self.name_ar or self.name


class ITAsset(BaseModel):
    """جهاز/أصل تقني (حاسب، طابعة، ماسح، موجه شبكة...) برقم تسلسلي فريد."""

    class AssetType(models.TextChoices):
        COMPUTER = 'COMPUTER', 'حاسب آلي'
        LAPTOP = 'LAPTOP', 'حاسب محمول'
        PRINTER = 'PRINTER', 'طابعة'
        SCANNER = 'SCANNER', 'ماسح ضوئي'
        NETWORK = 'NETWORK', 'موجه شبكة'
        SERVER = 'SERVER', 'خادم'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشط'
        MAINTENANCE = 'MAINTENANCE', 'قيد الصيانة'
        REPAIR = 'REPAIR', 'مُعطّل'
        INACTIVE = 'INACTIVE', 'متوقف'

    name = models.CharField(max_length=150, verbose_name='اسم الجهاز')
    asset_type = models.CharField(
        max_length=20, choices=AssetType.choices, default=AssetType.COMPUTER, verbose_name='النوع'
    )
    serial_number = models.CharField(max_length=100, unique=True, verbose_name='الرقم التسلسلي')
    entry_point = models.ForeignKey(
        'masterdata.EntryPoint', blank=True, null=True, related_name='it_assets',
        on_delete=models.SET_NULL, verbose_name='نقطة الدخول',
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, blank=True, null=True, related_name='it_assets',
        on_delete=models.SET_NULL, verbose_name='المسؤول',
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, verbose_name='الحالة'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    sector = models.ForeignKey(
        'organization.Sector', related_name='it_assets', on_delete=models.CASCADE, verbose_name='القطاع'
    )

    class Meta:
        app_label = 'it_management'
        ordering = ['name']
        verbose_name = 'أصل تقني'
        verbose_name_plural = 'الأصول التقنية'

    def __str__(self):
        return f'{self.name} ({self.serial_number})'


class SupportTicket(BaseModel):
    """تذكرة دعم فني — الأولوية والحالة والمنفذ/الموظف المعني."""

    class Priority(models.TextChoices):
        CRITICAL = 'CRITICAL', 'حرجة'
        HIGH = 'HIGH', 'عالية'
        MEDIUM = 'MEDIUM', 'متوسطة'
        LOW = 'LOW', 'منخفضة'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد المعالجة'
        RESOLVED = 'RESOLVED', 'مُعالجة'
        CLOSED = 'CLOSED', 'مغلقة'

    ticket_no = models.CharField(max_length=30, unique=True, verbose_name='رقم التذكرة')
    subject = models.CharField(max_length=200, verbose_name='الموضوع')
    description = models.TextField(blank=True, verbose_name='الوصف')
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.MEDIUM, verbose_name='الأولوية'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة'
    )
    entry_point = models.ForeignKey(
        'masterdata.EntryPoint', blank=True, null=True, related_name='it_tickets',
        on_delete=models.SET_NULL, verbose_name='نقطة الدخول',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, blank=True, null=True, related_name='it_tickets_created',
        on_delete=models.SET_NULL, verbose_name='المُنشئ',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, blank=True, null=True, related_name='it_tickets_assigned',
        on_delete=models.SET_NULL, verbose_name='المُسند إليه',
    )
    resolved_at = models.DateTimeField(blank=True, null=True, verbose_name='وقت الحل')
    sector = models.ForeignKey(
        'organization.Sector', related_name='it_tickets', on_delete=models.CASCADE, verbose_name='القطاع'
    )

    class Meta:
        app_label = 'it_management'
        ordering = ['-created_at']
        verbose_name = 'تذكرة دعم'
        verbose_name_plural = 'تذاكر الدعم'

    def __str__(self):
        return f'{self.ticket_no} — {self.subject}'

    def save(self, *args, **kwargs):
        if self._state.adding and not self.ticket_no:
            year = timezone.now().year
            count = SupportTicket.objects.filter(
                ticket_no__startswith=f'TKT-{year}-'
            ).count() + 1
            self.ticket_no = f'TKT-{year}-{1000 + count}'
        super().save(*args, **kwargs)


class NetworkStatus(BaseModel):
    """حالة اتصال كل نقطة دخول (متصل/منقطع + زمن الاستجابة + آخر مزامنة)."""

    entry_point = models.OneToOneField(
        'masterdata.EntryPoint', related_name='it_network', on_delete=models.CASCADE,
        verbose_name='نقطة الدخول',
    )
    connected = models.BooleanField(default=True, verbose_name='متصل')
    ping_ms = models.PositiveSmallIntegerField(default=0, verbose_name='زمن الاستجابة (مللي ثانية)')
    last_sync = models.DateTimeField(blank=True, null=True, verbose_name='آخر مزامنة')
    sector = models.ForeignKey(
        'organization.Sector', related_name='it_networks', on_delete=models.CASCADE, verbose_name='القطاع'
    )

    class Meta:
        app_label = 'it_management'
        ordering = ['entry_point__order']
        verbose_name = 'حالة شبكة'
        verbose_name_plural = 'حالة الشبكات'

    def __str__(self):
        state = 'متصل' if self.connected else 'منقطع'
        return f'{self.entry_point.name_ar} — {state}'


class GovernmentIntegration(BaseModel):
    """تكامل حكومي خارجي (جمارك، جوازات، سوداباس، موانئ، وزارة المالية...).

    كيان وطني لا يرتبط بقطاع معيّن; يراقبه مدير تقنية المعلومات القومي.
    """

    class Status(models.TextChoices):
        CONNECTED = 'CONNECTED', 'متصل'
        WARNING = 'WARNING', 'تأخير'
        ERROR = 'ERROR', 'خطأ'

    code = models.CharField(max_length=50, unique=True, verbose_name='كود التكامل')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CONNECTED, verbose_name='الحالة'
    )
    last_sync_at = models.DateTimeField(blank=True, null=True, verbose_name='آخر مزامنة')
    error_count = models.PositiveIntegerField(default=0, verbose_name='عدد الأخطاء')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        app_label = 'it_management'
        ordering = ['order', 'name_ar']
        verbose_name = 'تكامل حكومي'
        verbose_name_plural = 'التكاملات الحكومية'

    def __str__(self):
        return self.name_ar