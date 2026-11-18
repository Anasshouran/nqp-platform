"""Seed the 18 GeographicState rows as a data migration.

Idempotent (update_or_create by code). Ensures CI/test DBs get the
18 rows via migrate — the seed_geographic_states command remains
for manual/local use only.
"""
from django.db import migrations

STATES = [
    ('SD-KH', 'الخرطوم', 'Khartoum', 1),
    ('SD-GZ', 'الجزيرة', 'Gezira', 2),
    ('SD-NW', 'النيل الأبيض', 'White Nile', 3),
    ('SD-NB', 'النيل الأزرق', 'Blue Nile', 4),
    ('SD-SI', 'سنار', 'Sennar', 5),
    ('SD-GD', 'القضارف', 'Gedaref', 6),
    ('SD-KA', 'كسلا', 'Kassala', 7),
    ('SD-RS', 'البحر الأحمر', 'Red Sea', 8),
    ('SD-NO', 'الشمالية', 'Northern', 9),
    ('SD-NR', 'نهر النيل', 'River Nile', 10),
    ('SD-KN', 'شمال كردفان', 'North Kordofan', 11),
    ('SD-KS', 'جنوب كردفان', 'South Kordofan', 12),
    ('SD-GK', 'غرب كردفان', 'West Kordofan', 13),
    ('SD-DN', 'شمال دارفور', 'North Darfur', 14),
    ('SD-DS', 'جنوب دارفور', 'South Darfur', 15),
    ('SD-DW', 'غرب دارفور', 'West Darfur', 16),
    ('SD-DC', 'وسط دارفور', 'Central Darfur', 17),
    ('SD-DE', 'شرق دارفور', 'East Darfur', 18),
]


def forwards(apps, schema_editor):
    GeographicState = apps.get_model('organization', 'GeographicState')
    for code, name_ar, name_en, order in STATES:
        GeographicState.objects.update_or_create(
            code=code,
            defaults={
                'name_ar': name_ar,
                'name_en': name_en,
                'order': order,
                'is_active': True,
            },
        )


def backwards(apps, schema_editor):
    GeographicState = apps.get_model('organization', 'GeographicState')
    GeographicState.objects.filter(code__in=[s[0] for s in STATES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('organization', '0012_add_geographic_state'),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ]
