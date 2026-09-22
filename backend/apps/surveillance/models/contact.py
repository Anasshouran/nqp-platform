import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class ContactType(models.TextChoices):
    FAMILY = 'FAMILY', _('أسرة')
    WORK = 'WORK', _('عمل')
    SOCIAL = 'SOCIAL', _('اجتماعي')
    HEALTHCARE = 'HEALTHCARE', _('رعاية صحية')
    TRAVEL = 'TRAVEL', _('سفر')
    SCHOOL = 'SCHOOL', _('مدرسة/جامعة')
    GATHERING = 'GATHERING', _('تجمع')
    OTHER = 'OTHER', _('أخرى')


class ContactStatus(models.TextChoices):
    UNDER_MONITORING = 'UNDER_MONITORING', _('تحت المتابعة')
    COMPLETED = 'COMPLETED', _('أكمل المتابعة')
    SYMPTOMATIC = 'SYMPTOMATIC', _('يظهر أعراضاً')
    CONVERTED_CASE = 'CONVERTED_CASE', _('تحول إلى حالة')
    LOST = 'LOST', _('فقد')
    REFUSED = 'REFUSED', _('رفض المتابعة')


class FollowUpStatus(models.TextChoices):
    OK = 'OK', _('لا أعراض')
    SYMPTOMATIC = 'SYMPTOMATIC', _('يظهر أعراضاً')
    CONVERTED = 'CONVERTED', _('تحول إلى حالة')
    NOT_REACHED = 'NOT_REACHED', _('لم يتم الوصول')
    REFUSED = 'REFUSED', _('رفض الفحص')


class ContactTrace(BaseModel):
    """مخالط لحالة مؤشرة - تتبع يومي خلال فترة الحضانة."""

    contact_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name=_('رقم المخالط')
    )
    index_case = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.CASCADE,
        related_name='contacts',
        verbose_name=_('الحالة المؤشرة'),
    )

    # بيانات المخالط
    person_name = models.CharField(max_length=200, verbose_name=_('الاسم'))
    age = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name=_('العمر'))
    sex = models.CharField(
        max_length=1, choices=[('M', _('ذكر')), ('F', _('أنثى')), ('U', _('غير محدد'))],
        default='U', verbose_name=_('الجنس')
    )
    phone = models.CharField(max_length=30, blank=True, verbose_name=_('رقم الجوال'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('الرقم الوطني'))
    relationship = models.CharField(max_length=200, blank=True, verbose_name=_('صلة القرابة/العلاقة'))
    contact_type = models.CharField(
        max_length=20, choices=ContactType.choices, default=ContactType.FAMILY, verbose_name=_('نوع الاتصال')
    )

    # تفاصيل المخالطة
    last_exposure_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ آخر تعرض'))
    exposure_duration_minutes = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_('مدة المخالطة (دقائق)')
    )
    exposure_setting = models.CharField(max_length=200, blank=True, verbose_name=_('مكان المخالطة'))
    exposure_details = models.TextField(blank=True, verbose_name=_('تفاصيل المخالطة'))

    # المتابعة
    follow_up_start = models.DateField(null=True, blank=True, verbose_name=_('بداية المتابعة'))
    follow_up_end = models.DateField(null=True, blank=True, verbose_name=_('نهاية المتابعة'))
    follow_up_days = models.PositiveIntegerField(default=14, verbose_name=_('مدة المتابعة (يوم)'))
    current_follow_up_day = models.PositiveIntegerField(default=0, verbose_name=_('يوم المتابعة الحالي'))

    # الموقع
    location = models.CharField(max_length=200, blank=True, verbose_name=_('الموقع الحالي'))
    latitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True, verbose_name=_('خط العرض')
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True, verbose_name=_('خط الطول')
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_contact_traces',
        verbose_name=_('المنفذ'),
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_contact_traces',
        verbose_name=_('القطاع'),
    )

    # الحالة
    status = models.CharField(
        max_length=25,
        choices=ContactStatus.choices,
        default=ContactStatus.UNDER_MONITORING,
        verbose_name=_('الحالة'),
    )
    converted_case = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_contact',
        verbose_name=_('الحالة المحولة'),
    )
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    # تعيين
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contacts',
        verbose_name=_('مُسند إلى'),
    )
    supervised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_contacts',
        verbose_name=_('مشرف'),
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('مخالط')
        verbose_name_plural = _('المخالطون')
        indexes = [
            models.Index(fields=['contact_number']),
            models.Index(fields=['index_case', 'status']),
            models.Index(fields=['status', 'follow_up_end']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['port', 'status']),
        ]

    def __str__(self):
        return f'{self.contact_number} - {self.person_name}'

    def save(self, *args, **kwargs):
        if not self.contact_number:
            self.contact_number = self.generate_contact_number()
        if not self.follow_up_start and self.last_exposure_date:
            self.follow_up_start = self.last_exposure_date
        if self.follow_up_start and not self.follow_up_end:
            from datetime import date as _date
            start = self.follow_up_start
            if isinstance(start, str):
                start = _date.fromisoformat(start[:10]) if len(start) >= 10 else _date.fromisoformat(start)
                self.follow_up_start = start
            self.follow_up_end = start + timedelta(days=int(self.follow_up_days or 0))
        super().save(*args, **kwargs)

    @staticmethod
    def generate_contact_number():
        """توليد رقم مخالط: CT-YYYY-SECTOR-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        prefix = f'CT-{year}'
        with transaction.atomic():
            last_contact = ContactTrace.objects.filter(contact_number__startswith=prefix).order_by('-contact_number').first()
            if last_contact:
                try:
                    last_num = int(last_contact.contact_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{prefix}-{new_num:06d}'

    def is_followup_due_today(self):
        """تحقق مما إذا كانت المتابعة مستحقة اليوم."""
        if self.status != ContactStatus.UNDER_MONITORING:
            return False
        if not self.follow_up_start:
            return False
        today = timezone.localdate()
        if today < self.follow_up_start:
            return False
        if self.follow_up_end and today > self.follow_up_end:
            return False
        # التحقق من وجود متابعة اليوم
        return not self.follow_ups.filter(check_date=today).exists()

    def get_missed_followups_count(self):
        """عدد المتابعات المفقودة."""
        if self.status != ContactStatus.UNDER_MONITORING:
            return 0
        today = timezone.localdate()
        if not self.follow_up_start:
            return 0
        expected_days = (today - self.follow_up_start).days + 1
        expected_days = min(expected_days, self.follow_up_days)
        completed = self.follow_ups.count()
        return max(0, expected_days - completed)


class ContactFollowUp(BaseModel):
    """زيارة متابعة يومية لمخالط."""

    contact = models.ForeignKey(
        ContactTrace, on_delete=models.CASCADE, related_name='follow_ups', verbose_name=_('المخالط')
    )
    check_date = models.DateField(verbose_name=_('تاريخ الفحص'))
    check_time = models.TimeField(null=True, blank=True, verbose_name=_('وقت الفحص'))

    # العلامات الحيوية
    temperature = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, verbose_name=_('درجة الحرارة')
    )
    heart_rate = models.PositiveIntegerField(null=True, blank=True, verbose_name=_('معدل النبض'))
    respiratory_rate = models.PositiveIntegerField(null=True, blank=True, verbose_name=_('معدل التنفس'))
    oxygen_saturation = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_('تشبع الأكسجين')
    )

    # الأعراض
    symptoms = models.JSONField(default=list, blank=True, verbose_name=_('الأعراض'))
    symptom_onset_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ بداية الأعراض'))

    # الحالة
    status = models.CharField(
        max_length=20, choices=FollowUpStatus.choices, default=FollowUpStatus.OK, verbose_name=_('الحالة')
    )
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    # الفحص
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_contact_follow_ups',
        verbose_name=_('الفحص بواسطة'),
    )
    check_method = models.CharField(
        max_length=20,
        choices=[
            ('PHONE', _('هاتف')),
            ('VISIT', _('زيارة منزلية')),
            ('APP', _('تطبيق')),
            ('SELF', _('إبلاغ ذاتي')),
            ('OTHER', _('أخرى')),
        ],
        default='PHONE',
        verbose_name=_('طريقة الفحص'),
    )

    # تحويل لحالة
    converted_case = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_followup',
        verbose_name=_('الحالة المحولة'),
    )

    class Meta:
        ordering = ['-check_date', '-created_at']
        verbose_name = _('متابعة مخالط')
        verbose_name_plural = _('متابعات المخالطين')
        unique_together = ['contact', 'check_date']

    def __str__(self):
        return f'{self.contact.contact_number} - {self.check_date} - {self.get_status_display()}'

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            # تحديث يوم المتابعة الحالي
            if self.contact.follow_up_start:
                from datetime import timedelta
                day = (self.check_date - self.contact.follow_up_start).days + 1
                self.contact.current_follow_up_day = max(self.contact.current_follow_up_day, day)
                self.contact.save(update_fields=['current_follow_up_day'])

            # تحديث حالة المخالط بناءً على المتابعة
            if self.status == FollowUpStatus.CONVERTED and self.contact.status != ContactStatus.CONVERTED_CASE:
                self.contact.status = ContactStatus.CONVERTED_CASE
                self.contact.converted_case = self.converted_case
                self.contact.save(update_fields=['status', 'converted_case'])
            elif self.status == FollowUpStatus.SYMPTOMATIC and self.contact.status == ContactStatus.UNDER_MONITORING:
                self.contact.status = ContactStatus.SYMPTOMATIC
                self.contact.save(update_fields=['status'])

            # التحقق من اكتمال المتابعة
            if self.contact.current_follow_up_day >= self.contact.follow_up_days:
                if self.contact.status == ContactStatus.UNDER_MONITORING:
                    self.contact.status = ContactStatus.COMPLETED
                    self.contact.save(update_fields=['status'])