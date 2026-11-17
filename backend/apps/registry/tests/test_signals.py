"""اختبارات signals — D-1 (RegistryChangeLog تلقائي)."""
import uuid
import pytest
from apps.registry.models import ReportingNode, RegistryChangeLog


def _uid():
    return uuid.uuid4().hex[:8]


@pytest.mark.django_db
class TestRegistrySignals:

    def test_create_node_creates_log(self):
        before = RegistryChangeLog.objects.count()
        ReportingNode.objects.create(
            code=f'SIG_{_uid()}', name_ar='سيج', kind='FEDERAL',
        )
        assert RegistryChangeLog.objects.count() == before + 1
        log = RegistryChangeLog.objects.order_by('-created_at').first()
        assert log.action == 'CREATE'
        assert log.entity_type == 'ReportingNode'

    def test_update_node_creates_update_log(self):
        node = ReportingNode.objects.create(
            code=f'SIG_{_uid()}', name_ar='قبل', kind='FEDERAL',
        )
        node.name_ar = 'بعد'
        node.save()
        log = RegistryChangeLog.objects.filter(
            entity_type='ReportingNode', entity_id=node.id,
        ).order_by('-created_at').first()
        assert log.action == 'UPDATE'

    def test_delete_node_creates_delete_log(self):
        node = ReportingNode.objects.create(
            code=f'SIG_{_uid()}', name_ar='حذف', kind='FEDERAL',
        )
        node_id = node.id
        node.delete()
        log = RegistryChangeLog.objects.filter(
            entity_type='ReportingNode', entity_id=node_id,
        ).order_by('-created_at').first()
        assert log is not None
        assert log.action == 'DELETE'

    def test_no_recursion(self):
        """إنشاء node يُنتج log واحد بالضبط (لا recursion)."""
        before = RegistryChangeLog.objects.count()
        ReportingNode.objects.create(
            code=f'NOREC_{_uid()}', name_ar='لا تكرار', kind='FEDERAL',
        )
        after = RegistryChangeLog.objects.count()
        assert after == before + 1, (
            f"Expected exactly 1 log, got {after - before}. Recursion detected."
        )

    def test_bulk_create_no_signals(self):
        """توثيق D-3: bulk_create لا يُطلق signals."""
        before = RegistryChangeLog.objects.count()
        ReportingNode.objects.bulk_create([
            ReportingNode(code=f'BULK_{_uid()}', name_ar='bulk', kind='STATE'),
        ])
        assert RegistryChangeLog.objects.count() == before, (
            "bulk_create should NOT fire signals (documented D-3)."
        )
