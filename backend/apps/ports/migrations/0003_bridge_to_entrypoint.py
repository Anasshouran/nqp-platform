from django.db import migrations

REFERENCING = [
    ('carriers', 'Flight', 'destination_port'),
    ('screening', 'HealthScreening', 'port'),
    ('clinic', 'ClinicReferral', 'port'),
    ('food_quarantine', 'FoodShipment', 'port'),
    ('emergency_eoc', 'EmergencyAlert', 'port'),
    ('emergency_eoc', 'KillSwitch', 'port'),
    ('emergency_eoc', 'EmergencyEvent', 'location_port'),
    ('airport_health', 'AirportTerminal', 'port'),
    ('food_surveillance', 'FoodEstablishment', 'port'),
]


def _drop_legacy_fk(apps, schema_editor):
    """إسقاط قيود FK القديمة نحو ports_port قبل إعادة الإسناد (تُستبدل تلقائيًا بالـ AlterField)."""
    TABLES = {
        ('carriers', 'Flight'): 'destination_port',
        ('screening', 'HealthScreening'): 'port',
        ('clinic', 'ClinicReferral'): 'port',
        ('food_quarantine', 'FoodShipment'): 'port',
        ('emergency_eoc', 'EmergencyAlert'): 'port',
        ('emergency_eoc', 'KillSwitch'): 'port',
        ('emergency_eoc', 'EmergencyEvent'): 'location_port',
        ('airport_health', 'AirportTerminal'): 'port',
        ('food_surveillance', 'FoodEstablishment'): 'port',
    }
    with schema_editor.connection.cursor() as cur:
        for (app_label, model_name), field in TABLES.items():
            Model = apps.get_model(app_label, model_name)
            table = Model._meta.db_table
            cur.execute(
                """
                select conname from pg_constraint
                where contype = 'f'
                  and conrelid = %s::regclass
                  and confrelid = 'ports_port'::regclass
                """,
                [table],
            )
            for (conname,) in cur.fetchall():
                cur.execute(f'alter table {table} drop constraint if exists {conname}')


def bridge(apps, schema_editor):
    Port = apps.get_model('ports', 'Port')
    EntryPoint = apps.get_model('masterdata', 'EntryPoint')
    State = apps.get_model('masterdata', 'State')
    Sector = apps.get_model('masterdata', 'Sector')

    state = State.objects.filter(code='ST_KRT').first()
    if state is None:
        sector = Sector.objects.filter(code='SEC_MAIN').first()
        if sector is None:
            sector = Sector.objects.create(
                code='SEC_MAIN', name_ar='القطاع الرئيسي', name_en='Main Sector'
            )
        state = State.objects.create(
            code='ST_KRT', name_ar='الخرطوم', name_en='Khartoum', sector=sector
        )

    kind_map = {'AIRPORT': 'AIRPORT', 'SEAPORT': 'SEAPORT', 'LAND_PORT': 'LAND_PORT'}

    for port in Port.objects.all().order_by('code'):
        entry_point, _created = EntryPoint.objects.get_or_create(
            code=port.code,
            defaults={
                'name_ar': port.name_ar,
                'name_en': port.name_en or '',
                'kind': kind_map.get(port.type, 'SEAPORT'),
                'state': state,
                'is_active': port.is_active,
            },
        )
        for app_label, model_name, field in REFERENCING:
            Model = apps.get_model(app_label, model_name)
            Model.objects.filter(**{f'{field}_id': port.pk}).update(**{field: entry_point.pk})

    # معالجة المراجع اليتيمة (صفوف تشير لمنافذ حُذفت سابقًا)
    fallback = EntryPoint.objects.order_by('order', 'name_ar').first()
    if fallback is not None:
        for app_label, model_name, field in REFERENCING:
            Model = apps.get_model(app_label, model_name)
            Model.objects.filter(**{f'{field}_id__isnull': False}).exclude(
                **{f'{field}_id__in': EntryPoint.objects.values('id')}
            ).update(**{field: fallback.pk})


def unbridge(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ports', '0002_port_sector'),
        ('carriers', '0006_alter_manifestpassenger_date_of_birth'),
        ('screening', '0001_initial'),
        ('clinic', '0003_initial'),
        ('food_quarantine', '0021_foodinspection_reviewed_at_and_more'),
        ('emergency_eoc', '0003_alter_emergencyevent_event_number'),
        ('airport_health', '0003_initial'),
        ('food_surveillance', '0001_initial'),
        ('masterdata', '__first__'),
    ]

    operations = [
        migrations.RunPython(_drop_legacy_fk, migrations.RunPython.noop),
        migrations.RunPython(bridge, unbridge),
    ]
