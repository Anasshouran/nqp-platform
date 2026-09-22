import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.food_quarantine.models import FoodSample, SamplingPolicy

DATA_FILE = Path(__file__).resolve().parents[2] / 'data' / 'official_sampling_policy.json'


class Command(BaseCommand):
    help = 'بذر سياسات أخذ العينات الرسمية (146 صنفاً) + سياسات عامة احتياطية (وارد/صادر)'

    FALLBACKS = [
        {
            'name_ar': 'وارد — صنف غير مطابق: عينة لكل 500 كغ',
            'scope': 'IMPORT', 'benchmark': 'WEIGHT', 'threshold': 500,
            'samples_per_unit': 1, 'max_samples': 5,
            'default_reason': 'ROUTINE', 'order': 500,
        },
        {
            'name_ar': 'صادر — صنف غير مطابق: عينة لكل 1000 عبوة',
            'scope': 'EXPORT', 'benchmark': 'PACKAGES', 'threshold': 100,
            'samples_per_unit': 1, 'max_samples': 3,
            'default_reason': 'ROUTINE', 'order': 501,
        },
    ]

    def handle(self, *args, **options):
        if not DATA_FILE.exists():
            raise FileNotFoundError(f'ملف البيانات الرسمي غير موجود: {DATA_FILE}')
        rows = json.loads(DATA_FILE.read_text(encoding='utf-8'))
        created = updated = 0
        for index, row in enumerate(rows):
            product_key = row['product_key']
            package_size = row.get('package_size') or ''
            policy, was_created = SamplingPolicy.objects.update_or_create(
                product_key=product_key,
                package_size=package_size,
                scope=SamplingPolicy.ShipmentScope.BOTH,
                defaults={
                    'name_ar': f"{product_key} — {package_size}".strip(' —'),
                    'benchmark': SamplingPolicy.Benchmark.WEIGHT,
                    'threshold': 0,
                    'samples_per_unit': 1,
                    'max_samples': max(int(row.get('quantity_num') or 1), 1),
                    'default_reason': FoodSample.SamplingReason.ROUTINE,
                    'risk_group': row.get('risk_group') or '',
                    'rate_pct': row.get('rate_pct') or 0,
                    'quantity': row.get('quantity') or '',
                    'quantity_num': row.get('quantity_num'),
                    'sampling_conditions': row.get('sampling_conditions') or '',
                    'order': index + 1,
                    'is_active': True,
                },
            )
            created += int(was_created)
            updated += int(not was_created)

        # إزالة سياسات البذر القديمة (المسار القديم بلا صنف) لضمان تفعيل الاحتياطي الجديد
        deleted = SamplingPolicy.objects.filter(product_key='').exclude(
            name_ar__in=[rule['name_ar'] for rule in self.FALLBACKS],
        ).delete()[0]

        created_fb = 0
        for rule in self.FALLBACKS:
            name_ar = rule.pop('name_ar')
            _, was_created = SamplingPolicy.objects.get_or_create(
                name_ar=name_ar, defaults=rule,
            )
            created_fb += int(was_created)

        self.stdout.write(
            self.style.SUCCESS(
                f'سياسات العينات الرسمية: {len(rows)} ({created} جديدة، {updated} محدّثة) + احتياطية {created_fb}'
                f' (حذف القديمة: {deleted})'
            )
        )