from django.core.management.base import BaseCommand
from apps.laboratory.models import LabSample
from apps.registry.models import HealthFacilityNodeAssignment


class Command(BaseCommand):
    help = 'Backfill LabSample.reporting_node via facility assignment'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show counts without saving')
        parser.add_argument('--limit', type=int, default=None, help='Max records to process')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = LabSample.objects.filter(
            reporting_node__isnull=True,
            facility__isnull=False,
        )
        if limit:
            qs = qs[:limit]

        updated, ambiguous, unassigned = 0, 0, 0
        for sample in qs.iterator():
            assignments = HealthFacilityNodeAssignment.objects.filter(
                facility=sample.facility,
                valid_to__isnull=True,
            )
            count = assignments.count()
            if count == 1:
                if not dry_run:
                    sample.reporting_node = assignments.first().node
                    sample.save(update_fields=['reporting_node'])
                updated += 1
            elif count == 0:
                unassigned += 1
            else:
                ambiguous += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}Updated: {updated}, Ambiguous: {ambiguous}, Unassigned: {unassigned}'
        )
