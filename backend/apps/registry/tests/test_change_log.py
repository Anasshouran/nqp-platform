"""T-6: اختبار RegistryChangeLog."""

import uuid

import pytest

from apps.registry.models import RegistryChangeLog


@pytest.mark.django_db
class TestRegistryChangeLog:
    def test_create_change_log(self):
        entity_id = uuid.uuid4()
        log = RegistryChangeLog.objects.create(
            action=RegistryChangeLog.Action.CREATE,
            entity_type="ReportingNode",
            entity_id=entity_id,
            entity_label="TEST_FMOH",
            detail={"node_kind": "FEDERAL"},
        )
        assert log.pk is not None
        assert log.action == "CREATE"
        assert log.entity_id == entity_id
        assert log.entity_type == "ReportingNode"
        assert log.detail["node_kind"] == "FEDERAL"
        assert log.created_at is not None

    def test_change_log_query_by_entity(self):
        entity_id = uuid.uuid4()
        RegistryChangeLog.objects.create(
            action=RegistryChangeLog.Action.CREATE,
            entity_type="Department",
            entity_id=entity_id,
        )
        RegistryChangeLog.objects.create(
            action=RegistryChangeLog.Action.UPDATE,
            entity_type="Department",
            entity_id=entity_id,
        )
        logs = RegistryChangeLog.objects.filter(entity_id=entity_id)
        assert logs.count() == 2
