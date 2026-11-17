from django.core.management.base import BaseCommand
from apps.vector_control.models import VectorUnit
from apps.registry.models import HealthFacilityNodeAssignment


class Command(BaseCommand):
    help = 'Backfill VectorUnit.reporting_node via facility assignment'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show counts without saving')
        parser.add_argument('--limit', type=int, default=None, help='Max records to process')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = VectorUnit.objects.filter(
            reporting_node__isnull=True,
            facility__isnull=False,
        )
        if limit:
            qs = qs[:limit]

        updated, ambiguous, unassigned = 0, 0, 0
        for unit in qs.iterator():
            assignments = HealthFacilityNodeAssignment.objects.filter(
                facility=unit.facility,
                valid_to__isnull=True,
            )
            count = assignments.count()
            if count == 1:
                if not dry_run:
                    unit.reporting_node = assignments.first().node
                    unit.save(update_fields=['reporting_node'])
                updated += 1
            elif count == 0:
                unassigned += 1
            else:
                ambiguous += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}Updated: {updated}, Ambiguous: {ambiguous}, Unassigned: {unassigned}'
        )
