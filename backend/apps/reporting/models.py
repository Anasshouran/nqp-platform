from django.conf import settings
from django.db import models

from core.models import BaseModel


class Report(BaseModel):
    class ReportType(models.TextChoices):
        SCREENINGS = 'SCREENINGS', 'تقرير الفحوصات'
        EPIDEMIC = 'EPIDEMIC', 'تقرير وبائي'
        PORT_PERFORMANCE = 'PORT_PERFORMANCE', 'أداء المنافذ'
        FOOD = 'FOOD', 'الحجر الغذائي'
        LAB = 'LAB', 'أداء المختبرات'
        COMPREHENSIVE = 'COMPREHENSIVE', 'تقرير شامل'

    class ReportFormat(models.TextChoices):
        PDF = 'PDF', 'PDF'
        EXCEL = 'EXCEL', 'Excel'
        CSV = 'CSV', 'CSV'

    class ReportStatus(models.TextChoices):
        PROCESSING = 'PROCESSING', 'قيد الإنشاء'
        READY = 'READY', 'جاهز'
        FAILED = 'FAILED', 'فشل'

    report_type = models.CharField(max_length=30, choices=ReportType.choices, verbose_name='النوع')
    format = models.CharField(max_length=10, choices=ReportFormat.choices, default=ReportFormat.PDF, verbose_name='الصيغة')
    status = models.CharField(
        max_length=20, choices=ReportStatus.choices, default=ReportStatus.PROCESSING, verbose_name='الحالة'
    )
    params = models.JSONField(default=dict, blank=True, verbose_name='المعاملات')
    file = models.FileField(upload_to='reports/%Y/%m/', null=True, blank=True, verbose_name='الملف')
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_reports',
        verbose_name='الطالب',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تقرير'
        verbose_name_plural = 'التقارير'

    def __str__(self):
        return f'{self.report_type} - {self.status}'
