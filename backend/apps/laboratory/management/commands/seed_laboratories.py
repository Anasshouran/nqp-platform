from django.core.management.base import BaseCommand

from apps.laboratory.models import LabSection, Laboratory
from apps.organization.models import Sector


class Command(BaseCommand):
    help = 'بذر المعامل القطاعية (مثيل معمل لكل قطاع تحت الإدارة القومية للمعامل)'

    def handle(self, *args, **options):
        created = 0
        sectors = Sector.objects.filter(is_active=True).order_by('order')
        for sector in sectors:
            obj, was_created = Laboratory.objects.update_or_create(
                sector=sector,
                defaults={
                    'code': f'LAB-{sector.code}',
                    'name_ar': f'معمل {sector.name_ar}',
                    'name_en': f'{sector.name_en or sector.code} Sector Laboratory',
                    'is_active': True,
                },
            )
            created += int(was_created)
            self.stdout.write(self.style.SUCCESS(f'✓ {obj.code} - {obj.name_ar}'))

        # أقسام المعمل القياسية للوحة القومية (إن لم تكن مزروعة)
        sections = [
            {'code': 'RECEPTION', 'name_ar': 'استقبال العينات', 'kind': LabSection.SectionKind.RECEPTION, 'order': 1},
            {'code': 'MICROBIOLOGY', 'name_ar': 'الأمراض المعدية والأحياء الدقيقة', 'kind': LabSection.SectionKind.MICROBIOLOGY, 'order': 2},
            {'code': 'MOLECULAR', 'name_ar': 'الأحياء الجزيئية', 'kind': LabSection.SectionKind.MOLECULAR, 'order': 3},
            {'code': 'FOOD', 'name_ar': 'سلامة الأغذية', 'kind': LabSection.SectionKind.FOOD, 'order': 4},
            {'code': 'WATER', 'name_ar': 'المياه والبيئة', 'kind': LabSection.SectionKind.WATER, 'order': 5},
            {'code': 'REFERENCE', 'name_ar': 'المختبر المرجعي', 'kind': LabSection.SectionKind.REFERENCE, 'order': 6},
        ]
        for s in sections:
            LabSection.objects.update_or_create(
                code=s['code'],
                defaults={
                    'name_ar': s['name_ar'],
                    'kind': s['kind'],
                    'order': s['order'],
                    'is_active': True,
                },
            )

        self.stdout.write(self.style.SUCCESS(f'تم بذر المعامل القطاعية ({created} جديدة)'))