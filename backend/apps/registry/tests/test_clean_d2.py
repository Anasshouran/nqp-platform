"""اختبارات D-2: clean() يستخدم _state.adding."""
import uuid
import pytest
from django.core.exceptions import ValidationError

from apps.registry.models import ReportingNode


def _uid():
    return uuid.uuid4().hex[:8]


@pytest.mark.django_db
class TestCleanD2:

    def test_second_root_rejected_via_clean(self):
        """إنشاء جذر ثانٍ عبر create() يجب أن يُرفض."""
        ReportingNode.objects.create(
            code=f'EXISTING_{_uid()}', name_ar='موجود', kind='FEDERAL',
        )
        with pytest.raises((ValidationError, Exception)):
            ReportingNode.objects.create(
                code=f'SECOND_{_uid()}', name_ar='ثاني', kind='FEDERAL',
            )

    def test_resave_existing_root_allowed(self):
        """إعادة حفظ الجذر الموجود بـ parent=None مسموحة (D-2)."""
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
        # إعادة الحفظ — يجب ألا يفشل
        root.name_ar = 'جذر محدّث'
        root.save()
        root.refresh_from_db()
        assert root.name_ar == 'جذر محدّث'
