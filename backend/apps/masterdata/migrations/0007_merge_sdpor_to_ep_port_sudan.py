"""
Merge legacy SDPOR → EP_PORT_SUDAN and deactivate SDPOR.

Reassigns all FK references from the legacy port SDPOR to the canonical
EP_PORT_SUDAN entry point, then deactivates SDPOR so it no longer appears
in active-entry-point queries (public pages, station cards, dashboards).
"""

from django.db import migrations


def forward(apps, schema_editor):
    EntryPoint = apps.get_model('masterdata', 'EntryPoint')
    try:
        sdpor = EntryPoint.objects.get(code='SDPOR')
        canon = EntryPoint.objects.get(code='EP_PORT_SUDAN')
    except EntryPoint.DoesNotExist:
        return

    def reassign(model_label, field_name):
        Model = apps.get_model(*model_label.split('.'))
        n = Model.objects.filter(**{field_name: sdpor}).update(**{field_name: canon})
        if n:
            print(f'  {model_label}.{field_name}: reassigned {n}')

    reassign('carriers.Flight', 'destination_port')
    reassign('screening.HealthScreening', 'port')
    reassign('clinic.Clinic', 'entry_point')
    reassign('clinic.ClinicReferral', 'port')
    reassign('food_quarantine.FoodShipment', 'port')
    reassign('emergency_eoc.HealthCase', 'port')
    reassign('emergency_eoc.SurveillanceAlert', 'port')
    reassign('airport_health.AirportTerminal', 'port')
    reassign('it_management.ITAsset', 'entry_point')
    reassign('it_management.SupportTicket', 'entry_point')

    sdpor.is_active = False
    sdpor.save(update_fields=['is_active'])
    print(f'  SDPOR deactivated')


def backward(apps, schema_editor):
    EntryPoint = apps.get_model('masterdata', 'EntryPoint')
    try:
        sdpor = EntryPoint.objects.get(code='SDPOR')
    except EntryPoint.DoesNotExist:
        return
    sdpor.is_active = True
    sdpor.save(update_fields=['is_active'])


class Migration(migrations.Migration):

    dependencies = [
        ('masterdata', '0006_entrypoint_locality_healthfacility'),
        ('carriers', '0007_alter_flight_destination_port'),
        ('screening', '0002_alter_healthscreening_port'),
        ('clinic', '0009_healthcertificate'),
        ('food_quarantine', '0025_alter_sampletest_status'),
        ('emergency_eoc', '0005_emergencyevent_case_count_emergencyevent_death_count_and_more'),
        ('airport_health', '0004_alter_airportterminal_port'),
        ('it_management', '0002_governmentintegration'),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
