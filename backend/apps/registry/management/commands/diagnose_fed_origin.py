"""تشخيص مصدر عقدة FED — READ ONLY."""
from django.core.management.base import BaseCommand
from apps.registry.models import ReportingNode, RegistryChangeLog


class Command(BaseCommand):
    help = 'تشخيص مصدر عقدة FED في ReportingNode (READ ONLY)'

    def handle(self, *args, **options):
        self.stdout.write('=== Root Nodes ===')
        roots = ReportingNode.objects.filter(parent__isnull=True)
        for r in roots:
            self.stdout.write(
                f'ROOT code={r.code} id={r.id} '
                f'created_at={r.created_at} kind={r.kind}'
            )
        self.stdout.write(f'Total roots: {roots.count()}')  # يجب أن يكون 1

        self.stdout.write('\n=== FED Node Details ===')
        fed = ReportingNode.objects.filter(code='FED').first()
        if fed:
            self.stdout.write(f'FED id={fed.id} path={fed.path} depth={fed.depth}')
            logs = RegistryChangeLog.objects.filter(
                entity_type='ReportingNode', entity_id=fed.id
            ).order_by('created_at')
            self.stdout.write(f'ChangeLog entries: {logs.count()}')
            for log in logs:
                self.stdout.write(
                    f'  {log.created_at} action={log.action} '
                    f'user={log.user_id} label={log.entity_label}'
                )
        else:
            self.stdout.write('FED node NOT FOUND')

        self.stdout.write('\n=== TEST_FMOH Check ===')
        fmoh = ReportingNode.objects.filter(code='TEST_FMOH').first()
        self.stdout.write(f'TEST_FMOH exists: {fmoh is not None}')

        self.stdout.write('\n=== Seed Reference ===')
        self.stdout.write(
            'Note: seed_registry_testdata uses TEST_FMOH as fallback. '
            'FED is NOT from seed.'
        )
