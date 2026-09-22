from django.db import models

from core.models import BaseModel


class RiskSettings(BaseModel):
    temp_weight = models.FloatField(default=1.0, verbose_name='وزن درجة الحرارة')
    spo2_weight = models.FloatField(default=1.0, verbose_name='وزن الأكسجين')
    symptom_weight = models.FloatField(default=5.0, verbose_name='وزن الأعراض')
    origin_weight = models.FloatField(default=1.0, verbose_name='وزن المنشأ')
    vaccine_weight = models.FloatField(default=1.0, verbose_name='وزن التطعيم')
    yellow_threshold = models.FloatField(default=15.0, verbose_name='حد الأصفر')
    red_threshold = models.FloatField(default=30.0, verbose_name='حد الأحمر')
    red_temp_threshold = models.FloatField(default=39.0, verbose_name='حد الحرارة الأحمر')
    red_spo2_threshold = models.FloatField(default=93.0, verbose_name='حد الأكسجين الأحمر')

    class Meta:
        verbose_name = 'إعدادات تقييم المخاطر'
        verbose_name_plural = 'إعدادات تقييم المخاطر'

    def __str__(self):
        return f'RiskSettings {self.pk}'

    @classmethod
    def get_settings(cls):
        obj = cls.objects.order_by('pk').first()
        if obj is None:
            obj = cls.objects.create()
        return obj


class RiskAssessment(BaseModel):
    class RiskLevel(models.TextChoices):
        GREEN = 'GREEN', 'أخضر'
        YELLOW = 'YELLOW', 'أصفر'
        RED = 'RED', 'أحمر'

    class Recommendation(models.TextChoices):
        ADMIT = 'ADMIT', 'إفراج'
        QUARANTINE = 'QUARANTINE', 'حجر صحي'
        REFER = 'REFER', 'إحالة'

    screening = models.OneToOneField(
        'screening.HealthScreening',
        on_delete=models.CASCADE,
        related_name='risk_assessment',
        verbose_name='الفحص',
    )
    risk_level = models.CharField(max_length=10, choices=RiskLevel.choices, verbose_name='مستوى الخطر')
    risk_score = models.FloatField(verbose_name='درجة الخطر')
    decision_factors = models.JSONField(default=dict, blank=True, verbose_name='عوامل القرار')
    recommendation = models.CharField(
        max_length=20, choices=Recommendation.choices, verbose_name='التوصية'
    )
    assessed_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التقييم')

    class Meta:
        ordering = ['-assessed_at']
        verbose_name = 'تقييم مخاطر'
        verbose_name_plural = 'تقييمات المخاطر'

    def __str__(self):
        return f'{self.screening_id} - {self.risk_level}'
