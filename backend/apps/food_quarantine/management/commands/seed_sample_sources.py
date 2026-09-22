from django.core.management.base import BaseCommand

from apps.food_quarantine.models import SampleSource

SOURCES = [
    ('SRC_AIR', 'المطار', 'Airport'),
    ('SRC_FREE_ZONE', 'المنطقة الحرة', 'Free Zone'),
    ('SRC_NORTH_PORT', 'الميناء الشمالي', 'North Port'),
    ('SRC_SOUTH_PORT', 'الميناء الجنوبي', 'South Port'),
    ('SRC_AWSEEF', 'ميناء أوسيف', 'Awseef Port'),
    ('SRC_OSMAN_DIGNA', 'ميناء الأمير عثمان دقنة', 'Prince Osman Digna Port'),
    ('SRC_FIELD_INSPECTION', 'التفتيش الميداني', 'Field Inspection'),
    ('SRC_INTERNAL', 'الرقابة الداخلية', 'Internal Control'),
    ('SRC_FOOD_SURVEILLANCE', 'الترصد الغذائي', 'Food Surveillance'),
    ('SRC_GOV', 'المؤسسات الحكومية', 'Government Institutions'),
    ('SRC_OTHER', 'مصادر أخرى', 'Other Sources'),
]


class Command(BaseCommand):
    help = 'بذر مصادر العينات الأساسية (Sample Sources)'

    def handle(self, *args, **options):
        created = 0
        for index, (code, name_ar, name_en) in enumerate(SOURCES, start=1):
            _, was_created = SampleSource.objects.update_or_create(
                code=code,
                defaults={'name_ar': name_ar, 'name_en': name_en, 'order': index, 'is_active': True},
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'تم بذر مصادر العينات: {len(SOURCES)} مصدراً (جديدة = {created})'))