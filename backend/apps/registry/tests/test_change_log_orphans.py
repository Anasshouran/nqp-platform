"""فحص أن RegistryChangeLog لا يشير إلى كيانات غير موجودة."""
import uuid
import pytest
from apps.registry.models import RegistryChangeLog, ReportingNode


@pytest.mark.django_db
class TestChangeLogOrphans:

    def test_orphan_log_detected(self):
        """سجل يشير إلى ReportingNode غير موجود يُكتشف كـ orphan."""
        orphan_id = uuid.uuid4()
        log = RegistryChangeLog.objects.create(
            action='CREATE',
            entity_type='ReportingNode',
            entity_id=orphan_id,
            entity_label='orphan-test',
        )
        orphans = RegistryChangeLog.objects.filter(
            entity_type='ReportingNode',
        ).exclude(
            entity_id__in=ReportingNode.objects.values_list('id', flat=True),
        )
        assert orphans.filter(pk=log.pk).exists()
        log.delete()

    def test_healthy_log_not_orphan(self):
        """سجل يشير إلى ReportingNode موجود ليس orphan.
        
        يستخدم kind='STATE' مع parent لتجنب قيد الجذر الواحد
        (UniqueConstraint على parent=NULL) — انظر X-4.
        """
        # احصل على جذر موجود أو أنشئ واحداً
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        if root is None:
            root = ReportingNode.objects.create(
                code='TEST_ROOT_FOR_ORPHAN', name_ar='جذر اختبار', kind='FEDERAL',
            )
        
        node = ReportingNode.objects.create(
            code='TEST_ORPHAN_CHECK', name_ar='عقدة اختبار', kind='STATE',
            parent=root,
        )
        log = RegistryChangeLog.objects.create(
            action='CREATE',
            entity_type='ReportingNode',
            entity_id=node.id,
            entity_label='healthy-test',
        )
        orphans = RegistryChangeLog.objects.filter(
            entity_type='ReportingNode',
        ).exclude(
            entity_id__in=ReportingNode.objects.values_list('id', flat=True),
        )
        assert not orphans.filter(pk=log.pk).exists()
        log.delete()
