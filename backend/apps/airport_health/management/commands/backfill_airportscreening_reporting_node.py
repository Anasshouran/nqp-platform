from django.core.management.base import BaseCommand

from apps.airport_health.models import AirportScreening
from apps.registry.models import StateNodeAssignment


class Command(BaseCommand):
    help = (
        'Backfill AirportScreening.reporting_node (STATE-only) via '
        'screening_point.terminal.port.state_id. Policy (ii): count==1 else NULL.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show counts without saving')
        parser.add_argument('--limit', type=int, default=None, help='Max records to process')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = AirportScreening.objects.filter(
            reporting_node__isnull=True,
            screening_point__isnull=False,
            screening_point__terminal__isnull=False,
            screening_point__terminal__port__isnull=False,
            screening_point__terminal__port__state__isnull=False,
        ).select_related('screening_point__terminal__port__state')

        if limit:
            qs = qs[:limit]

        updated, no_state_node, ambiguous = 0, 0, 0

        for screening in qs.iterator():
            state_id = screening.screening_point.terminal.port.state_id

            # Policy (ii) strict: only exactly one active primary assignment
            # resolves deterministically. Multiple actives stay NULL (no guessing).
            assignments = StateNodeAssignment.objects.filter(
                state_id=state_id,
                valid_to__isnull=True,
                is_primary=True,
            ).select_related('node')

            count = assignments.count()
            if count == 1:
                if not dry_run:
                    screening.reporting_node = assignments.first().node
                    screening.save(update_fields=['reporting_node'])
                updated += 1
            elif count == 0:
                no_state_node += 1
            else:
                ambiguous += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}Updated: {updated}, '
            f'No STATE node: {no_state_node}, '
            f'Ambiguous: {ambiguous}'
        )
