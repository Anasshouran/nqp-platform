"""Backfill `LabSample.facility` (M6-bis، D-M5-C-F-3).

الجسر: `LabSample.entry_point` ← `HealthFacility.entry_point`.
تُترك الحالات غير الحصرية بلا ربط وتُحتسب `ambiguous` — فشل آمن.
"""

from django.core.management.base import BaseCommand

from apps.laboratory.models import LabSample
from apps.masterdata.models import HealthFacility


class Command(BaseCommand):
    help = 'Backfill LabSample.facility via entry_point → HealthFacility.entry_point'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='عرض ما سيُحدَّث دون حفظ')
        parser.add_argument('--limit', type=int, default=None, help='الحد الأقصى لعدد السجلات المعالجة')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = (
            LabSample.objects
            .filter(facility__isnull=True, entry_point__isnull=False)
            .order_by('created_at')
        )
        if limit:
            qs = qs[:limit]

        scanned = 0
        updated = 0
        ambiguous = 0

        for sample in qs.iterator():
            scanned += 1
            facility_ids = list(
                HealthFacility.objects
                .filter(is_active=True, entry_point_id=sample.entry_point_id)
                .values_list('id', flat=True)[:2]
            )
            if not facility_ids:
                continue
            if len(facility_ids) > 1:
                ambiguous += 1
                continue
            if not dry_run:
                sample.facility_id = facility_ids[0]
                sample.save(update_fields=['facility', 'updated_at'])
            updated += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}LabSample facility backfill: '
            f'scanned={scanned} updated={updated} '
            f'ambiguous={ambiguous} skipped={scanned - updated - ambiguous}'
        )
