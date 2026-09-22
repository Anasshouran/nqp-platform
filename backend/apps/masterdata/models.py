from django.conf import settings
from django.db import models

from core.models import BaseModel


class Sector(BaseModel):
    """نوع القطاع (البحري، البري، الجوي) — المستوى الأعلى في البيانات الأساسية."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=100, blank=True, verbose_name='الاسم بالإنجليزية')
    color = models.CharField(max_length=9, default='#0B5CAD', verbose_name='اللون')
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'قطاع (نوع)'
        verbose_name_plural = 'القطاعات (أنواع الحجر)'

    def __str__(self):
        return self.name_ar


class State(BaseModel):
    """الولاية — المستوى الثاني تحت القطاع."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=100, blank=True, verbose_name='الاسم بالإنجليزية')
    sector = models.ForeignKey(
        Sector, on_delete=models.CASCADE, related_name='states', verbose_name='القطاع'
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'ولاية'
        verbose_name_plural = 'الولايات'

    def __str__(self):
        return self.name_ar


class EntryPoint(BaseModel):
    """منفذ الدخول: ميناء بحري / منفذ بري / مطار."""

    class Kind(models.TextChoices):
        SEAPORT = 'SEAPORT', 'ميناء بحري'
        LAND_PORT = 'LAND_PORT', 'منفذ بري'
        AIRPORT = 'AIRPORT', 'مطار'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    kind = models.CharField(max_length=20, choices=Kind.choices, verbose_name='النوع')
    state = models.ForeignKey(
        State, on_delete=models.CASCADE, related_name='entry_points', verbose_name='الولاية'
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entry_points',
        verbose_name='القطاع الإداري',
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entry_points',
        verbose_name='المحلية',
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    location_geo = models.JSONField(default=dict, blank=True, verbose_name='الموقع الجغرافي')
    address = models.CharField(max_length=255, blank=True, verbose_name='العنوان')
    phone = models.CharField(max_length=30, blank=True, verbose_name='الهاتف')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'منفذ دخول'
        verbose_name_plural = 'منافذ الدخول'

    def __str__(self):
        return self.name_ar


class HealthFacility(BaseModel):
    """وحدة صحية (مستشفى / مركز صحي / وحدة أولية / عيادة / محجر) — وحدة الإبلاغ في الترصد."""

    class Kind(models.TextChoices):
        HOSPITAL = 'HOSPITAL', 'مستشفى'
        HEALTH_CENTER = 'HEALTH_CENTER', 'مركز صحي'
        PRIMARY_UNIT = 'PRIMARY_UNIT', 'وحدة صحية أولية'
        CLINIC = 'CLINIC', 'عيادة'
        QUARANTINE = 'QUARANTINE', 'محجر صحي'
        OTHER = 'OTHER', 'أخرى'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.HEALTH_CENTER, verbose_name='النوع')
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='facilities',
        verbose_name='المحلية',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_facilities',
        verbose_name='القطاع الإداري',
    )
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='health_facilities', verbose_name='منفذ الدخول',
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    address = models.CharField(max_length=255, blank=True, verbose_name='العنوان')
    phone = models.CharField(max_length=30, blank=True, verbose_name='الهاتف')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'وحدة صحية'
        verbose_name_plural = 'الوحدات الصحية'

    def __str__(self):
        return self.name_ar


class Terminal(BaseModel):
    """منشأة/طرفية داخل منفذ الدخول (الميناء الجنوبي، ميناء عثمان دقنة، ...)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.CASCADE, related_name='terminals', verbose_name='منفذ الدخول'
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'منشأة/طرفية'
        verbose_name_plural = 'المنشآت/الطرفيات'

    def __str__(self):
        return self.name_ar


class Station(BaseModel):
    """محطة الحجر الصحي — تُنسب إلى منشأة (أو مباشرة إلى المنفذ)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    terminal = models.ForeignKey(
        Terminal, on_delete=models.CASCADE, null=True, blank=True,
        related_name='stations', verbose_name='المنشأة',
    )
    entry_point = models.ForeignKey(
        EntryPoint, on_delete=models.CASCADE, null=True, blank=True,
        related_name='stations_direct', verbose_name='منفذ الدخول (مباشرة)',
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'محطة حجر صحي'
        verbose_name_plural = 'محطات الحجر الصحي'

    def __str__(self):
        return self.name_ar


class Section(BaseModel):
    """قسم تشغيلي داخل محطة الحجر الصحي (صحة المسافرين، رقابة الأغذية، المختبر، ...)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    station = models.ForeignKey(
        Station, on_delete=models.CASCADE, related_name='sections', verbose_name='المحطة'
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'قسم'
        verbose_name_plural = 'الأقسام'

    def __str__(self):
        return self.name_ar


class SectionMember(BaseModel):
    """تعيين موظف في قسم ضمن محطة الحجر الصحي (نهاية السلسلة: المستخدمون)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='masterdata_memberships', verbose_name='الموظف',
    )
    section = models.ForeignKey(
        Section, on_delete=models.CASCADE, related_name='members', verbose_name='القسم'
    )
    role_label = models.CharField(max_length=120, blank=True, verbose_name='العنوان الوظيفي')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['created_at']
        verbose_name = 'عضو قسم'
        verbose_name_plural = 'أعضاء الأقسام'

    def __str__(self):
        return f'{self.user} ← {self.section}'