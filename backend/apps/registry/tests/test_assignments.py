"""T-3/T-4/T-5: اختبارات تعيينات العقد."""

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.masterdata.models import Sector as MasterSector, State
from apps.registry.models import (
    ReportingNode,
    StateNodeAssignment,
)


@pytest.fixture
def master_sector():
    return MasterSector.objects.create(
        code="TST_SEC", name_ar="قطاع اختبار"
    )


@pytest.fixture
def state(master_sector):
    return State.objects.create(
        code="TST_ST", name_ar="ولاية اختبار", sector=master_sector
    )


@pytest.fixture
def root():
    return ReportingNode.objects.create(
        code="FED_T", kind=ReportingNode.Kind.FEDERAL, name_ar="فيدرالي اختبار"
    )


@pytest.mark.django_db
class TestAssignmentValidation:
    def test_valid_to_before_valid_from(self, state, root):
        node = ReportingNode.objects.create(
            code="ND1", kind=ReportingNode.Kind.STATE, name_ar="عقدة", parent=root
        )
        assign = StateNodeAssignment(
            state=state,
            node=node,
            valid_from=timezone.localdate(),
            valid_to=timezone.localdate(),  # نفس اليوم = مرفوض
        )
        with pytest.raises(ValidationError):
            assign.full_clean()

    def test_two_primary_active_rejected(self, state, root):
        n1 = ReportingNode.objects.create(
            code="ND1", kind=ReportingNode.Kind.STATE, name_ar="عقدة 1", parent=root
        )
        n2 = ReportingNode.objects.create(
            code="ND2", kind=ReportingNode.Kind.STATE, name_ar="عقدة 2", parent=root
        )
        today = timezone.localdate()
        StateNodeAssignment.objects.create(
            state=state, node=n1, valid_from=today, is_primary=True,
        )
        assign2 = StateNodeAssignment(
            state=state, node=n2, valid_from=today, is_primary=True,
        )
        with pytest.raises(ValidationError):
            assign2.full_clean()

    def test_old_then_new_allowed(self, state, root):
        n1 = ReportingNode.objects.create(
            code="ND1", kind=ReportingNode.Kind.STATE, name_ar="عقدة قديمة", parent=root
        )
        n2 = ReportingNode.objects.create(
            code="ND2", kind=ReportingNode.Kind.STATE, name_ar="عقدة جديدة", parent=root
        )
        old_date = timezone.localdate() - timezone.timedelta(days=30)
        new_date = timezone.localdate()
        # تعيين قديم مغلق
        StateNodeAssignment.objects.create(
            state=state, node=n1, valid_from=old_date, valid_to=new_date,
            is_primary=True,
        )
        # تعيين جديد نشط — مسموح لاختلاف valid_from
        assign_new = StateNodeAssignment.objects.create(
            state=state, node=n2, valid_from=new_date, is_primary=True,
        )
        assert assign_new.pk is not None
        assert StateNodeAssignment.objects.filter(state=state).count() == 2
