from django.db import migrations

"""جسر توحيد سجلات القطاعات: public.Sector (مهمل) ← organization.Sector (المرجع).

1. إسقاط قيود FK القديمة نحو public_sector (تُعاد إنشاؤها بميجرشنز AlterField اللاحقة).
2. نسخ صفوف public.Sector إلى organization.Sector (مطابقة بالاسم العربي).
3. إعادة إسناد معرّفات القطاع في: accounts.User، masterdata.EntryPoint، ports.Port
   مع تعطيل المراجع اليتيمة (قطاعات محذوفة سابقًا).
4. الحذف الفعلي للنموذج يقع في ميجرشن apps.public اللاحق.
"""


def _drop_legacy_fks(apps, schema_editor):
    """إسقاط أي قيد FK يشير إلى public_sector من الجداول الثلاثة."""
    TABLES = [
        ('accounts', 'User'),
        ('masterdata', 'EntryPoint'),
        ('ports', 'Port'),
    ]
    with schema_editor.connection.cursor() as cur:
        for app_label, model_name in TABLES:
            Model = apps.get_model(app_label, model_name)
            table = Model._meta.db_table
            cur.execute(
                """
                select conname from pg_constraint
                where contype = 'f'
                  and conrelid = %s::regclass
                  and confrelid = 'public_sector'::regclass
                """,
                [table],
            )
            for (conname,) in cur.fetchall():
                cur.execute(f'alter table {table} drop constraint if exists {conname}')


def bridge(apps, schema_editor):
    _drop_legacy_fks(apps, schema_editor)

    PublicSector = apps.get_model('public', 'Sector')
    OrgSector = apps.get_model('organization', 'Sector')
    User = apps.get_model('accounts', 'User')
    EntryPoint = apps.get_model('masterdata', 'EntryPoint')
    Port = apps.get_model('ports', 'Port')

    pk_map = {}
    for ps in PublicSector.objects.all().order_by('created_at'):
        org, _created = OrgSector.objects.get_or_create(
            name_ar=ps.name_ar,
            defaults={
                'code': f'SEC_{ps.pk.hex[:8].upper()}',
                'name_en': ps.name_en or '',
                'region': ps.region or '',
                'description': ps.description_ar or '',
                'color': ps.color or '#0a6b58',
                'is_active': ps.is_active,
            },
        )
        pk_map[ps.pk] = org.pk

    # تعطيل المراجع اليتيمة قبل الإعادة (كل الحقول nullable)
    User.objects.exclude(sector_id__in=pk_map).update(sector_id=None)
    EntryPoint.objects.exclude(sector_id__in=pk_map).update(sector_id=None)
    Port.objects.exclude(sector_id__in=pk_map).update(sector_id=None)

    for old_pk, new_pk in pk_map.items():
        User.objects.filter(sector_id=old_pk).update(sector_id=new_pk)
        EntryPoint.objects.filter(sector_id=old_pk).update(sector_id=new_pk)
        Port.objects.filter(sector_id=old_pk).update(sector_id=new_pk)


def unbridge(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('masterdata', '0002_entrypoint_sector'),
        ('accounts', '0009_user_sector'),
        ('organization', '0004_station_orgassignment_station'),
        ('public', '0003_healthcertificate'),
        ('ports', '0003_bridge_to_entrypoint'),
    ]

    operations = [
        migrations.RunPython(bridge, unbridge),
    ]
