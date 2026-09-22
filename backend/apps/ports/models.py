from django.db import models

from core.models import BaseModel


class Port(BaseModel):
    class PortType(models.TextChoices):
        AIRPORT = 'AIRPORT', 'مطار'
        SEAPORT = 'SEAPORT', 'ميناء بحري'
        LAND_PORT = 'LAND_PORT', 'منفذ بري'

    code = models.CharField(max_length=20, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=100, verbose_name='الاسم بالإنجليزية')
    type = models.CharField(max_length=20, choices=PortType.choices, verbose_name='النوع')
    country = models.ForeignKey(
        'travelers.Country',
        on_delete=models.RESTRICT,
        related_name='ports',
        verbose_name='الدولة',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='legacy_ports',
        verbose_name='القطاع',
    )
    location_geo = models.JSONField(default=dict, blank=True, verbose_name='الموقع الجغرافي')
    address = models.CharField(max_length=255, blank=True, verbose_name='العنوان')
    phone = models.CharField(max_length=20, blank=True, verbose_name='الهاتف')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['code']
        verbose_name = 'منفذ'
        verbose_name_plural = 'المنافذ'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'
