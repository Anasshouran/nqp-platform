"""Backfill VaccinationRecord.reporting_node عبر تعيين الولاية النشط (M7-A2c-vaccination).

**snapshot تاريخي:** يُملأ `reporting_node` مرة واحدة من
`site.entry_point.state_id → StateNodeAssignment (نشط، أساسي) → node`.
لا يوجد أي sync لاحق — تغيير التعيين بعد الإدخال لا ينعكس على السجل (T3).

السلوك (fail-safe، سياسة (ii) strict):
- تعيين واحد نشط أساسي → يُملأ reporting_node (STATE)
- صفر تعيينات        → يبقى NULL (No STATE node)
- تعيينات متعددة     → يبقى NULL (ambiguous) — لا اختيار عشوائي

الاستعلامات: خريطة `state_id → [node_ids]` تُبنى باستعلام **واحد**، والسجلات
تُقرأ باستعلام آخر (select_related) — لا N+1.

لا يُستخدم `site` كبديل جغرافي آخر: STATE-only عبر `site.entry_point.state_id`.
سجلات بلا `site` أو بلا `entry_point` أو بلا `state` لا تدخل في المعالجة
(تبقى NULL — unassigned).

الاستخدام:
    python manage.py backfill_vaccinationrecord_reporting_node --dry-run
    python manage.py backfill_vaccinationrecord_reporting_node --limit 100
"""

from django.core.management.base import BaseCommand

from apps.registry.models import StateNodeAssignment
from apps.vaccination.models import VaccinationRecord


class Command(BaseCommand):
    help = 'يملأ VaccinationRecord.reporting_node من تعيين الولاية النشط (snapshot تاريخي، بلا sync).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='تحليل فقط دون تعديل')
        parser.add_argument('--limit', type=int, default=None, help='حد أقصى للسجلات المعالجة')

    def handle(self, *args, **options):
        # 1) خريطة state → عقد النشطة الأساسية (استعلام واحد)
        active = {}
        for state_id, node_id in (
            StateNodeAssignment.objects
            .filter(valid_to__isnull=True, is_primary=True)
            .values_list('state_id', 'node_id')
        ):
            active.setdefault(state_id, []).append(node_id)

        # 2) السجلات التي تفتقد reporting_node ولها مسار جغرافي كامل
        qs = VaccinationRecord.objects.filter(
            reporting_node__isnull=True,
            site__isnull=False,
            site__entry_point__isnull=False,
            site__entry_point__state__isnull=False,
        ).select_related('site__entry_point').order_by('id')
        if options['limit']:
            qs = qs[:options['limit']]

        updated = ambiguous = no_state_node = 0
        batch = []

        for record in qs.iterator():
            state_id = record.site.entry_point.state_id
            node_ids = active.get(state_id, [])
            if len(node_ids) == 1:
                record.reporting_node_id = node_ids[0]
                batch.append(record)
                updated += 1
            elif len(node_ids) == 0:
                no_state_node += 1
            else:
                ambiguous += 1  # متعددة — يبقى NULL (fail-safe)

        if batch and not options['dry_run']:
            VaccinationRecord.objects.bulk_update(
                batch, ['reporting_node'], batch_size=500,
            )

        prefix = '[DRY-RUN] ' if options['dry_run'] else ''
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Updated: {updated}, No STATE node: {no_state_node}, '
            f'Ambiguous: {ambiguous}'
        ))
