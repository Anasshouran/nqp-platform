from django.core.management.base import BaseCommand
from apps.organization.models import OrgAssignment
from apps.registry.models import HealthFacilityNodeAssignment


class Command(BaseCommand):
    help = 'Backfill OrgAssignment.reporting_node via facility assignment'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='أظهر النتائج بدون حفظ')
        parser.add_argument('--limit', type=int, default=None, help='أقصى عدد سجلات للمعالجة')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = OrgAssignment.objects.filter(
            reporting_node__isnull=True,
            facility__isnull=False,
            is_active=True,
        )
        if limit:
            qs = qs[:limit]

        updated, ambiguous, unassigned = 0, 0, 0
        for assignment in qs.iterator():
            assignments = HealthFacilityNodeAssignment.objects.filter(
                facility=assignment.facility,
                valid_to__isnull=True,
            )
            count = assignments.count()
            if count == 1:
                if not dry_run:
                    assignment.reporting_node = assignments.first().node
                    assignment.save(update_fields=['reporting_node'])
                updated += 1
            elif count == 0:
                unassigned += 1
            else:
                ambiguous += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}Updated: {updated}, Ambiguous: {ambiguous}, Unassigned: {unassigned}'
        )
