"""Backfill HealthCase.reporting_node عبر تعيين المنشأة النشط (M7-A2b-full).

** snapshot تاريخي:** يُملأ `reporting_node` مرة واحدة من
`health_facility → HealthFacilityNodeAssignment (نشط) → node`.
لا يوجد أي sync لاحق — تغيير التعيين بعد الإدخال لا ينعكس على الحالة (T3).

السلوك (fail-safe، نفس نمط M6-bis):
- تعيين نشط واحد  → يُملأ reporting_node
- صفر تعيينات     → يبقى NULL (unassigned)
- تعيينات متعددة  → يبقى NULL (ambiguous) — لا اختيار عشوائي

الاستخدام:
    python manage.py backfill_healthcase_reporting_node --dry-run
    python manage.py backfill_healthcase_reporting_node --limit 100
"""

from django.core.management.base import BaseCommand

from apps.registry.models import HealthFacilityNodeAssignment
from apps.surveillance.models import HealthCase


class Command(BaseCommand):
    help = 'يملأ HealthCase.reporting_node من تعيين المنشأة النشط (snapshot تاريخي، بلا sync).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='تحليل فقط دون تعديل')
        parser.add_argument('--limit', type=int, default=None, help='حد أقصى للحالات المعالجة')

    def handle(self, *args, **options):
        # 1) خريطة facility → عقد النشطة (استعلام واحد، بلا N+1)
        active = {}
        for row in (
            HealthFacilityNodeAssignment.objects
            .filter(valid_to__isnull=True)
            .values_list('facility_id', 'node_id')
        ):
            active.setdefault(row[0], []).append(row[1])

        # 2) الحالات التي تفتقد reporting_node ولها منشأة
        qs = HealthCase.objects.filter(
            reporting_node__isnull=True,
            health_facility__isnull=False,
        ).order_by('id')
        if options['limit']:
            qs = qs[:options['limit']]

        updated = ambiguous = unassigned = 0
        batch = []

        for case in qs.iterator():
            node_ids = active.get(case.health_facility_id, [])
            if len(node_ids) == 1:
                case.reporting_node_id = node_ids[0]
                batch.append(case)
                updated += 1
            elif len(node_ids) == 0:
                unassigned += 1
            else:
                ambiguous += 1  # متعددة — يبقى NULL (fail-safe)

        if batch and not options['dry_run']:
            HealthCase.objects.bulk_update(batch, ['reporting_node'], batch_size=500)

        prefix = '[DRY-RUN] ' if options['dry_run'] else ''
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Updated: {updated}, Ambiguous: {ambiguous}, Unassigned: {unassigned}'
        ))
