"""T-1/T-2: اختبارات ReportingNode."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.registry.models import ReportingNode


@pytest.mark.django_db
class TestReportingNodeCreation:
    def test_create_root_and_child(self):
        root = ReportingNode.objects.create(
            code="FED", kind=ReportingNode.Kind.FEDERAL, name_ar="فيدرالي"
        )
        assert root.depth == 0
        assert root.path == str(root.id)

        child = ReportingNode.objects.create(
            code="ST1", kind=ReportingNode.Kind.STATE, name_ar="ولاية",
            parent=root,
        )
        assert child.depth == 1
        assert child.path == f"{root.id}/{child.id}"

    def test_second_root_rejected(self):
        ReportingNode.objects.create(
            code="FED", kind=ReportingNode.Kind.FEDERAL, name_ar="فيدرالي"
        )
        node = ReportingNode(
            code="FED2", kind=ReportingNode.Kind.FEDERAL, name_ar="فيدرالي ثانٍ"
        )
        with pytest.raises(ValidationError):
            node.full_clean(exclude=["path", "depth"])

    def test_non_federal_root_rejected(self):
        node = ReportingNode(
            code="STX", kind=ReportingNode.Kind.STATE, name_ar="ولاية جذر"
        )
        with pytest.raises(ValidationError):
            node.full_clean(exclude=["path", "depth"])

    def test_self_parent_rejected(self):
        root = ReportingNode.objects.create(
            code="FED", kind=ReportingNode.Kind.FEDERAL, name_ar="فيدرالي"
        )
        root.parent = root
        with pytest.raises(ValidationError):
            root.full_clean(exclude=["path", "depth"])


@pytest.mark.django_db
class TestReportingNodeMove:
    def test_move_updates_descendant_paths(self):
        root = ReportingNode.objects.create(
            code="FED", kind=ReportingNode.Kind.FEDERAL, name_ar="فيدرالي"
        )
        state_a = ReportingNode.objects.create(
            code="STA", kind=ReportingNode.Kind.STATE, name_ar="ولاية A", parent=root
        )
        state_b = ReportingNode.objects.create(
            code="STB", kind=ReportingNode.Kind.STATE, name_ar="ولاية B", parent=root
        )
        loc = ReportingNode.objects.create(
            code="LOC", kind=ReportingNode.Kind.LOCALITY, name_ar="محلية", parent=state_a
        )
        fac = ReportingNode.objects.create(
            code="FAC", kind=ReportingNode.Kind.FACILITY, name_ar="منشأة", parent=loc
        )

        assert loc.path == f"{root.id}/{state_a.id}/{loc.id}"
        assert fac.depth == 3

        # نقل المحلية إلى ولاية ثانية
        loc.parent = state_b
        loc.save()

        loc.refresh_from_db()
        fac.refresh_from_db()

        assert loc.parent_id == state_b.id
        assert loc.depth == 2
        assert loc.path == f"{root.id}/{state_b.id}/{loc.id}"
        assert fac.depth == 3
        assert fac.path == f"{root.id}/{state_b.id}/{loc.id}/{fac.id}"


def test_single_root_constraint_at_db_level(db):
    """UniqueConstraint يمنع جذرين على مستوى DB حتى مع bulk_create.
    
    bulk_create لا يستدعي clean()، لكن UniqueConstraint على DB سيُطلق IntegrityError.
    """
    from django.db import IntegrityError
    from apps.registry.models import ReportingNode

    ReportingNode.objects.create(
        code='ROOT_A', name_ar='جذر أ', kind='FEDERAL',
    )

    with pytest.raises(IntegrityError):
        ReportingNode.objects.bulk_create([
            ReportingNode(
                code='ROOT_B', name_ar='جذر ب', kind='FEDERAL',
            ),
        ])

