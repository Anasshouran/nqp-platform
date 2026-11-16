from django.core.management.base import BaseCommand
from apps.borders_health.models import QuarantineCase
from apps.registry.models import ReportingNode, StateNodeAssignment


class Command(BaseCommand):
    help = (
        'Backfill QuarantineCase.reporting_node (STATE-only) '
        'via crossing.entry_point.state_id → StateNodeAssignment → node'
    )

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show counts without saving')
        parser.add_argument('--limit', type=int, default=None, help='Max records to process')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']

        qs = QuarantineCase.objects.filter(
            reporting_node__isnull=True,
            crossing__isnull=False,
            crossing__entry_point__isnull=False,
            crossing__entry_point__state__isnull=False,
        ).select_related('crossing__entry_point')

        if limit:
            qs = qs[:limit]

        updated, no_state_node, no_ep_or_state = 0, 0, 0
        for case in qs.iterator():
            ep = case.crossing.entry_point
            if not ep or not ep.state_id:
                no_ep_or_state += 1
                continue

            assignment = StateNodeAssignment.objects.filter(
                state_id=ep.state_id,
                valid_to__isnull=True,
            ).select_related('node').first()

            if not assignment or assignment.node.kind != 'STATE':
                no_state_node += 1
                continue

            if not dry_run:
                case.reporting_node = assignment.node
                case.save(update_fields=['reporting_node'])
            updated += 1

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(
            f'{prefix}Updated: {updated}, '
            f'No STATE node: {no_state_node}, '
            f'No EP/state: {no_ep_or_state}'
        )
