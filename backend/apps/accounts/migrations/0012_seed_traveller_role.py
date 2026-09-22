from django.db import migrations

def seed_traveller_role(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    Role.objects.get_or_create(
        code='TRAVELER',
        defaults={'name': 'Traveler', 'name_ar': 'مسافر'},
    )

def remove_traveller_role(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    Role.objects.filter(code='TRAVELER').delete()

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0011_add_traveller_login_lockout'),
    ]
    operations = [
        migrations.RunPython(seed_traveller_role, remove_traveller_role),
    ]
