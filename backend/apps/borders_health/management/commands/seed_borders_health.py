"""بذر بيانات نظام صحة المعابر البرية.

ينشئ ملفاً تشغيلياً (`BorderCrossing`) لكل نقطة دخول من نوع `LAND_PORT`
موجودة في البيانات الأساسية، مع مرافق المعبر الافتراضية. آمن للتشغيل
المتكرر: `update_or_create` على `entry_point` (OneToOne).
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.borders_health.models import BorderCrossing, BorderFacility
from apps.masterdata.models import EntryPoint


# حدود تشغيلية تقريبية لكل معبر: ساعات العمل، السعة اليومية، المختبر، سعة الحجر.
BORDER_PROFILE = {
    'EP_ARGIN': {'neighbor_country': 'مصر', 'hours': '24 ساعة', 'capacity': 3000,
                 'lab': True, 'quarantine': 120},
    'EP_WADI_HALFA': {'neighbor_country': 'مصر', 'hours': '24 ساعة', 'capacity': 2500,
                      'lab': True, 'quarantine': 80},
    'EP_MUTHALLATH': {'neighbor_country': 'مصر', 'hours': '06:00 - 22:00', 'capacity': 900,
                      'lab': False, 'quarantine': 30},
    'EP_ERITREA_BORDER': {'neighbor_country': 'إريتريا', 'hours': '08:00 - 18:00',
                          'capacity': 600, 'lab': False, 'quarantine': 20},
    'EP_GALLABAT': {'neighbor_country': 'إريتريا', 'hours': '24 ساعة', 'capacity': 1800,
                    'lab': True, 'quarantine': 60},
    'EP_SOUTH_SUDAN_BORDER': {'neighbor_country': 'جنوب السودان', 'hours': '06:00 - 20:00',
                              'capacity': 1200, 'lab': False, 'quarantine': 40},
    'EP_ADRE': {'neighbor_country': 'تشاد', 'hours': '06:00 - 20:00', 'capacity': 700,
                'lab': False, 'quarantine': 25},
    'EP_TINE': {'neighbor_country': 'تشاد', 'hours': '06:00 - 20:00', 'capacity': 500,
                'lab': False, 'quarantine': 20},
    'EP_OSEIF': {'neighbor_country': 'إريتريا', 'hours': '24 ساعة', 'capacity': 2000,
                 'lab': True, 'quarantine': 70},
    'EP_GABAIT': {'neighbor_country': 'إريتريا', 'hours': '24 ساعة', 'capacity': 2200,
                  'lab': True, 'quarantine': 75},
    'EP_ASHKEIT': {'neighbor_country': 'تشاد', 'hours': '24 ساعة', 'capacity': 1500,
                   'lab': False, 'quarantine': 50},
    'EP_ALAFIA': {'neighbor_country': 'تشاد', 'hours': '24 ساعة', 'capacity': 1400,
                  'lab': False, 'quarantine': 45},
}

# المرافق القياسية عند كل معبر: (النوع، الاسم، السعة، عدد الكادر).
STANDARD_FACILITIES = [
    (BorderFacility.FacilityKind.HEALTH, 'مركز الفحص الصحي', 12, 6),
    (BorderFacility.FacilityKind.QUARANTINE, 'وحدة الحجر', 40, 8),
    (BorderFacility.FacilityKind.ISOLATION, 'وحدة العزل', 6, 3),
    (BorderFacility.FacilityKind.LABORATORY, 'مختبر المعبر', 4, 2),
    (BorderFacility.FacilityKind.WATER_SANITATION, 'وحدة المياه والصرف الصحي', 5, 2),
    (BorderFacility.FacilityKind.WASTE, 'وحدة إدارة النفايات', 4, 2),
    (BorderFacility.FacilityKind.VECTOR_CONTROL, 'وحدة مكافحة النواقل', 4, 2),
    (BorderFacility.FacilityKind.STORAGE, 'مخزن المعدات والمواد', 10, 2),
]


class Command(BaseCommand):
    help = 'بذر الملفات التشغيلية لنظام صحة المعابر البرية (BorderCrossing + المرافق)'

    @transaction.atomic
    def handle(self, *args, **options):
        land_ports = EntryPoint.objects.filter(kind=EntryPoint.Kind.LAND_PORT).order_by('order')
        if not land_ports.exists():
            self.stdout.write(
                self.style.WARNING(
                    'لا توجد نقاط دخول من نوع LAND_PORT — شغّل seed_masterdata أولاً.'
                )
            )
            return

        created_crossings = updated = created_facilities = 0
        for entry_point in land_ports:
            profile = BORDER_PROFILE.get(entry_point.code, {})

            _, was_created = BorderCrossing.objects.update_or_create(
                entry_point=entry_point,
                defaults={
                    'border_type': BorderCrossing.BorderType.ROAD,
                    'neighbor_country': profile.get('neighbor_country', ''),
                    'operating_status': BorderCrossing.BorderStatus.OPEN,
                    'operating_hours': profile.get('hours', '08:00 - 18:00'),
                    'daily_capacity': profile.get('capacity', 0),
                    'has_health_facility': True,
                    'has_laboratory': bool(profile.get('lab')),
                    'has_quarantine_facility': True,
                    'has_isolation_facility': True,
                    'quarantine_capacity': profile.get('quarantine', 0),
                },
            )
            if was_created:
                created_crossings += 1
            else:
                updated += 1

            for kind, name, capacity, staff in STANDARD_FACILITIES:
                # `get_or_create` على (crossing, kind) لتفادي تكرار المرفق.
                _, f_created = BorderFacility.objects.get_or_create(
                    crossing=entry_point.border_crossing,
                    kind=kind,
                    defaults={
                        'name_ar': name,
                        'capacity': capacity,
                        'staff_count': staff,
                        'is_operational': True,
                    },
                )
                if f_created:
                    created_facilities += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'تم بذر المعابر البرية: {created_crossings} معبر جديد، '
                f'{updated} محدَّث، {created_facilities} مرفق جديد.'
            )
        )
