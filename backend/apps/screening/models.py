from django.conf import settings
from django.db import models

from core.models import BaseModel


class HealthScreening(BaseModel):
    traveler = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.CASCADE,
        related_name='screenings',
        verbose_name='المسافر',
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.PROTECT,
        related_name='screenings',
        verbose_name='المنفذ',
    )
    officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='screenings',
        verbose_name='الموظف',
    )
    body_temperature = models.FloatField(null=True, blank=True, verbose_name='درجة الحرارة')
    oxygen_saturation = models.IntegerField(null=True, blank=True, verbose_name='تشبع الأكسجين')
    systolic_bp = models.IntegerField(null=True, blank=True, verbose_name='الضغط الانقباضي')
    diastolic_bp = models.IntegerField(null=True, blank=True, verbose_name='الضغط الانبساطي')
    observed_symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض الملاحظة')
    officer_notes = models.TextField(blank=True, verbose_name='ملاحظات الموظف')
    screened_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الفحص')

    class Meta:
        ordering = ['-screened_at']
        verbose_name = 'فحص صحي'
        verbose_name_plural = 'الفحوصات الصحية'

    def __str__(self):
        return f'{self.traveler_id} - {self.screened_at}'
