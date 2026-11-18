"""Pytest session fixtures for organization app.

Background
----------
Migration organization.0013_seed_geographic_states creates the 18 canonical
GeographicState rows in every migrated DB. However, several tests elsewhere
in the suite use @pytest.mark.django_db(transaction=True) (TransactionTestCase),
which flushes ALL tables at teardown. The last transaction test therefore
leaves the DB with 0 canonical rows. With pytest.ini's --reuse-db, the next
test session would start empty and 3 tests (migration_created_18, seed_conflict,
seed_dry_run) would fail.

serialized_rollback does not help: it restores state BEFORE each transaction
test, and the FINAL flush still empties the DB afterwards.

This session fixture restores canonical rows at the start of each session,
but ONLY when migration 0013 is recorded as applied. That preserves the
contract tested by test_seed_migration_created_18_canonical_rows: if the
migration is missing, nothing is restored and the test fails loudly.
"""
import pytest

from apps.organization.management.commands.seed_geographic_states import STATES


@pytest.fixture(autouse=True, scope='session')
def restore_canonical_geo_states(django_db_setup, django_db_blocker):
    from django.db.migrations.recorder import MigrationRecorder
    from apps.organization.models import GeographicState

    with django_db_blocker.unblock():
        applied = MigrationRecorder.Migration.objects.filter(
            app='organization',
            name='0013_seed_geographic_states',
        ).exists()

        if not applied:
            # 0013 not applied → do NOT seed. The migration-contract test
            # will fail loudly, preserving the invariant.
            return

        # update_or_create (not call_command) — robust against both
        # missing rows (post-flush) and mutated rows (leaked state).
        # STATES is a list of (code, name_ar, name_en, order) tuples.
        for code, name_ar, name_en, order in STATES:
            GeographicState.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'order': order,
                    'is_active': True,
                },
            )
