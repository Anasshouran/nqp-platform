"""Backfill `VectorUnit.facility` (M6-bis، D-M5-C-F-3).

الجسر: `VectorUnit.sector` ← `HealthFacility.sector`.
القطاع الواحد قد يضم عدة منشآت؛ لذا تُملأ فقط الوحدات التي لها **منشأة
نشطة واحدة** في قطاعها، وتُحتسب الباقيات `ambiguous` — فشل آمن.
"""

from django.core.management.base import BaseCommand

from apps.masterdata.models import HealthFacility
from apps.vector_control.models import VectorUnit


class Command(BaseCommand):
    help = 'Backfill VectorUnit.facility via sector → HealthFacility.sector'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='عرض ما سيُحدَّث دون حفظ')
        parser.add_argument('--limit', type=int, default=None, help='الحد الأقصى لعدد الوحدات المعالجة')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = (
            VectorUnit.objects
            .filter(facility__isnull=True, sector__isnull=False)
            .order_by('created_at')
        )
        if limit:
            qs = qs[:limit]

        scanned = 0
        updated = 0
        ambiguous = 0

        for unit in qs.iterator():
            scanned += 1
            facility_ids = list(
                HealthFacility.objects
                .filter(is_active=True, sector_id=unit.sector_id)
                .values_list('id', flat=True)[:2]
            )
            if not facility_ids:
                continue
            if len(facility_ids) > 1:
                ambiguous += 1
                continue
            if not dry_run:
                unit.facility_id = facility_ids[0]
                unit.save(update_fields=['facility', 'updated_at'])
            updated += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}VectorUnit facility backfill: '
            f'scanned={scanned} updated={updated} '
            f'ambiguous={ambiguous} skipped={scanned - updated - ambiguous}'
        )
