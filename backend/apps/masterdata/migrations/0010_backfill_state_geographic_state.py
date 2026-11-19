"""Backfill masterdata.State.geographic_state from the B-1 map.

Policy:
- fail-loud if a GeographicState code is missing (0013 guarantees presence).
- silent no-op if a masterdata.State row is missing (fresh test DBs are
  legitimately empty of State rows; migrations do not seed them).
  This is intentional — nqp_db has the 10 rows and gets backfilled;
  test DBs create their own fixtures in test setUp when needed.
"""
from django.db import migrations

MAP = {
    'ST_KRT':          'SD-KH',
    'MD_KHARTOUM':     'SD-KH',
    'MD_RED_SEA':      'SD-RS',
    'MD_RED_SEA_AIR':  'SD-RS',
    'MD_RED_SEA_LAND': 'SD-RS',
    'MD_NORTHERN':     'SD-NO',
    'MD_KASSALA':      'SD-KA',
    'MD_GEDAREF':      'SD-GD',
    'MD_BLUE_NILE':    'SD-NB',
    'MD_W_DARFUR':     'SD-DW',
}


def forwards(apps, schema_editor):
    State = apps.get_model('masterdata', 'State')
    GeographicState = apps.get_model('organization', 'GeographicState')
    for state_code, geo_code in MAP.items():
        geo = GeographicState.objects.filter(code=geo_code).first()
        if geo is None:
            raise RuntimeError(
                f'GeographicState {geo_code!r} غير موجود — '
                f'تطبيق 0013_seed_geographic_states مطلوب.'
            )
        # silent no-op إذا لم يوجد صف State (قاعدة اختبار طازجة).
        State.objects.filter(code=state_code).update(geographic_state=geo)


def backwards(apps, schema_editor):
    State = apps.get_model('masterdata', 'State')
    State.objects.filter(code__in=MAP.keys()).update(geographic_state=None)


class Migration(migrations.Migration):
    dependencies = [
        ('masterdata', '0009_add_state_geographic_state'),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ]
