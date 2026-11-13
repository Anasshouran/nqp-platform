"""Backfill `HealthScreening.facility` (M6-bis، D-M5-C-F-2).

الجسر: `HealthScreening.port` (EntryPoint) ← `HealthFacility.entry_point`.
تُترك الحالات غير الحصرية (أكثر من منشأة نشطة لنفس المعبر) بلا ربط
وتُحتسب `ambiguous` — فشل آمن، لا تخمين.
"""

from django.core.management.base import BaseCommand

from apps.masterdata.models import HealthFacility
from apps.screening.models import HealthScreening


class Command(BaseCommand):
    help = 'Backfill HealthScreening.facility via port → HealthFacility.entry_point'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='عرض ما سيُحدَّث دون حفظ')
        parser.add_argument('--limit', type=int, default=None, help='الحد الأقصى لعدد السجلات المعالجة')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = (
            HealthScreening.objects
            .filter(facility__isnull=True, port__isnull=False)
            .order_by('created_at')
        )
        if limit:
            qs = qs[:limit]

        scanned = 0
        updated = 0
        ambiguous = 0

        for screening in qs.iterator():
            scanned += 1
            facility_ids = list(
                HealthFacility.objects
                .filter(is_active=True, entry_point_id=screening.port_id)
                .values_list('id', flat=True)[:2]
            )
            if not facility_ids:
                continue
            if len(facility_ids) > 1:
                ambiguous += 1
                continue
            if not dry_run:
                screening.facility_id = facility_ids[0]
                screening.save(update_fields=['facility', 'updated_at'])
            updated += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}HealthScreening facility backfill: '
            f'scanned={scanned} updated={updated} '
            f'ambiguous={ambiguous} skipped={scanned - updated - ambiguous}'
        )
