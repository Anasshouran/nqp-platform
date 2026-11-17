"""Backfill HealthScreening.reporting_node عبر تعيين المنشأة النشط (M7-A2c-3، A2b-full).

**snapshot تاريخي:** يُملأ `reporting_node` مرة واحدة من
`facility → HealthFacilityNodeAssignment (نشط) → node`.
لا يوجد أي sync لاحق — تغيير التعيين بعد الإدخال لا ينعكس على الفحص (T3).

السلوك (fail-safe، نفس نمط M6-bis / A2b-full):
- تعيين نشط واحد  → يُملأ reporting_node (FACILITY/LOCALITY/STATE حسب التعيين)
- صفر تعيينات     → يبقى NULL (unassigned)
- تعيينات متعددة  → يبقى NULL (ambiguous) — لا اختيار عشوائي

لا يُستخدم `port` كبديل: A2b-full يكتفي بـ `facility` (تطابقاً مع surveillance).

الاستخدام:
    python manage.py backfill_healthscreening_reporting_node --dry-run
    python manage.py backfill_healthscreening_reporting_node --limit 100
"""

from django.core.management.base import BaseCommand

from apps.registry.models import HealthFacilityNodeAssignment
from apps.screening.models import HealthScreening


class Command(BaseCommand):
    help = 'يملأ HealthScreening.reporting_node من تعيين المنشأة النشط (snapshot تاريخي، بلا sync).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='تحليل فقط دون تعديل')
        parser.add_argument('--limit', type=int, default=None, help='حد أقصى للفحوص المعالجة')

    def handle(self, *args, **options):
        # 1) خريطة facility → عقد النشطة (استعلام واحد، بلا N+1)
        active = {}
        for row in (
            HealthFacilityNodeAssignment.objects
            .filter(valid_to__isnull=True)
            .values_list('facility_id', 'node_id')
        ):
            active.setdefault(row[0], []).append(row[1])

        # 2) الفحوص التي تفتقد reporting_node ولها منشأة
        qs = HealthScreening.objects.filter(
            reporting_node__isnull=True,
            facility__isnull=False,
        ).order_by('id')
        if options['limit']:
            qs = qs[:options['limit']]

        updated = ambiguous = unassigned = 0
        batch = []

        for screening in qs.iterator():
            node_ids = active.get(screening.facility_id, [])
            if len(node_ids) == 1:
                screening.reporting_node_id = node_ids[0]
                batch.append(screening)
                updated += 1
            elif len(node_ids) == 0:
                unassigned += 1
            else:
                ambiguous += 1  # متعددة — يبقى NULL (fail-safe)

        if batch and not options['dry_run']:
            HealthScreening.objects.bulk_update(
                batch, ['reporting_node'], batch_size=500,
            )

        prefix = '[DRY-RUN] ' if options['dry_run'] else ''
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Updated: {updated}, Ambiguous: {ambiguous}, Unassigned: {unassigned}'
        ))
