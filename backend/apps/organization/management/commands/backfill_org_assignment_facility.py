"""Backfill `OrgAssignment.facility` (M6-bis، D-M5-C-F-1).

الربط يتم حصراً عبر الجسر التنظيمي المعتمد: `OrgAssignment.entry_point`
← `HealthFacility.entry_point`. لا استنتاج من القطاع/القسم/المحطة لأنها
ليست جسراً موثّقاً للمنشأة.

سياسة السلامة (least privilege):
  - تُملأ فقط التعيينات التي لم تُملأ سابقاً (`facility IS NULL`).
  - إذا كان لنقطة الدخول أكثر من منشأة نشطة، تُترك التعيينات كما هي
    وتُحتسب كـ `ambiguous` — لا تخمين، لأن ربطاً خاطئاً يوسّع نطاق
    مستخدم FACILITY إلى سجلات لا تخصّه.
"""

from django.core.management.base import BaseCommand

from apps.masterdata.models import HealthFacility
from apps.organization.models import OrgAssignment


class Command(BaseCommand):
    help = 'Backfill OrgAssignment.facility via entry_point → HealthFacility.entry_point'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='عرض ما سيُحدَّث دون حفظ',
        )
        parser.add_argument(
            '--limit', type=int, default=None,
            help='الحد الأقصى لعدد التعيينات المعالجة',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = (
            OrgAssignment.objects
            .filter(is_active=True, facility__isnull=True, entry_point__isnull=False)
            .order_by('created_at')
        )
        if limit:
            qs = qs[:limit]

        scanned = 0
        updated = 0
        ambiguous = 0

        for assignment in qs.iterator():
            scanned += 1
            facility_ids = list(
                HealthFacility.objects
                .filter(is_active=True, entry_point_id=assignment.entry_point_id)
                .values_list('id', flat=True)[:2]
            )
            if not facility_ids:
                continue
            if len(facility_ids) > 1:
                ambiguous += 1
                continue
            if not dry_run:
                assignment.facility_id = facility_ids[0]
                assignment.save(update_fields=['facility', 'updated_at'])
            updated += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}OrgAssignment facility backfill: '
            f'scanned={scanned} updated={updated} '
            f'ambiguous={ambiguous} skipped={scanned - updated - ambiguous}'
        )
