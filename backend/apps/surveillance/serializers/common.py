"""مساعدات مشتركة للسيرياليزرات."""

from rest_framework import serializers

import uuid


def format_uuid(value):
    """تنسيق معرف كـ string."""
    return str(value) if value else None


def resolve_user(user):
    """هوية المستخدم كـ string أو None."""
    if not user or not getattr(user, 'pk', None):
        return None
    return str(user.pk)


class DisplayFieldMixin:
    """يعرض حقول FK مع أسماء آلية.

    يضيف حقولاً للقراءة مثل: <field>_name أو <field>_code
    تُدعم colon notation: disease.name_ar -> disease_name
    """

    DISPLAY_FIELDS = [
        ('disease', 'disease.name_ar', 'disease_name'),
        ('disease', 'disease.name_en', 'disease_name_en'),
        ('disease', 'disease.icd_11_code', 'disease_icd'),
        ('port', 'port.name_ar', 'port_name'),
        ('port', 'port.code', 'port_code'),
        ('sector', 'sector.name_ar', 'sector_name'),
        ('sector', 'sector.code', 'sector_code'),
        ('locality', 'locality.name_ar', 'locality_name'),
        ('health_facility', 'health_facility.name_ar', 'facility_name'),
        ('outbreak', 'outbreak.outbreak_number', 'outbreak_number'),
        ('event', 'event.event_number', 'event_number'),
        ('alert', 'alert.alert_number', 'alert_number'),
    ]

    @classmethod
    def build_extra_field_map(cls):
        mapping = {}
        for field, source, out in cls.DISPLAY_FIELDS:
            mapping[out] = serializers.CharField(source=source, read_only=True, default=None)
        return mapping


def common_choices(source, dest):
    """إرجاع قائمة الخيارات لـ metadata API."""
    choices = {}
    for key, label in sorted(dest.choices, key=lambda x: str(x[1])):
        choices[key] = str(label)
    return choices