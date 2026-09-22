from django.core.management.base import BaseCommand

from apps.food_quarantine.models import FoodFee

FEES = [
    ('تفتيش شحنة', 'INSPECTION', '50000.00', 'لكل شحنة'),
    ('أخذ عينة', 'SAMPLE', '10000.00', 'لكل عينة'),
    ('تحليل ميكروبيولوجي', 'ANALYSIS', '25000.00', 'لكل فحص'),
    ('تحليل كيميائي', 'ANALYSIS', '30000.00', 'لكل فحص'),
    ('إصدار شهادة إفراج', 'CERTIFICATE', '15000.00', 'لكل شهادة'),
    ('رسوم إدارية', 'ADMIN', '5000.00', 'لكل شحنة'),
]


class Command(BaseCommand):
    help = 'بذر بنود الرسوم الافتراضية لرقابة الأغذية'

    def handle(self, *args, **options):
        created = 0
        for name_ar, fee_type, amount, unit in FEES:
            _, was_created = FoodFee.objects.update_or_create(
                name_ar=name_ar,
                fee_type=fee_type,
                defaults={'amount': amount, 'unit': unit, 'is_active': True},
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(f'تم بذر بنود الرسوم ({created} جديدة من أصل {len(FEES)})')
        )