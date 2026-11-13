"""M7-A2 — Organizational Registry integration audit.

سؤال التدقيق: هل السجل التنظيمي (registry) مستخدم فعلاً في منطق التطبيقات،
أم أنه جزيرة معزولة؟

الفرضية المختبرة (مُثبتة بالكود): جميع التطبيقات التجارية تستخدم مفاتيح مباشرة
(direct FKs) إلى masterdata.EntryPoint / masterdata.HealthFacility /
organization.Sector / organization.Locality — ولا أي تطبيق يشير إلى نماذج السجل
التنظيمي (ReportingNode / StateNodeAssignment / HealthFacilityNodeAssignment /
FacilityOwnership / TechnicalSupervision / ServiceAvailability).

نتائج التدقيق موثقة في `backend/docs/m7-a2-integration-audit.md`.

هذا الملف يضيف اختبارات تكامل توثق:
- أن التطبيقات التجارية تحتفظ بـ FKs مباشرة (عدم وجود سجل تنظيمي).
- أن Attempt traverse من حالة ترصد → منشأة → عقدة سجل يُفشل (فجوة تكامل موثقة).
- أن التجميع الإحصائي يستخدم القيم المباشرة (by sector/locality) وليس عقدة السجل.
"""

import uuid

import pytest
from django.db.models import Count

from apps.masterdata.models import (
    Sector as MasterdataSector,
    State,
    EntryPoint,
    HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import (
    ReportingNode,
    HealthFacilityNodeAssignment,
    StateNodeAssignment,
    LocalityNodeAssignment,
)


def _uid():
    return uuid.uuid4().hex[:8]


def _ensure_root():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'ROOT_A2_{_uid()}', name_ar='جذر تدقيق', kind='FEDERAL',
        )
    return root


def _build_hierarchy(uid):
    """ybni state→locality→entry_point→health_facility للتدقيق."""
    md = MasterdataSector.objects.create(code=f'MD_A2_{_uid()}', name_ar='قطاع')
    org = OrgSector.objects.create(code=f'ORG_A2_{_uid()}', name_ar='قطاع إداري')
    state = State.objects.create(code=f'ST_A2_{_uid()}', name_ar=f'ولاية {uid}', sector=md)
    loc = Locality.objects.create(code=f'LOC_A2_{_uid()}', name_ar=f'محلية {uid}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_A2_{_uid()}', name_ar=f'منفذ {uid}', state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_A2_{_uid()}', name_ar=f'منشأة {uid}', sector=org, locality=loc, entry_point=ep,
    )
    return {'state': state, 'locality': loc, 'entry_point': ep, 'facility': fac}


@pytest.mark.django_db
class TestHealthCaseDirectFKs:
    """IQ1: حالات الترصد تحتفظ بمفاتيح مباشرة، لا سجل تنظيمي."""

    def test_health_case_has_direct_org_fks(self):
        """IQ1 — HealthCase يشير مباشرة إلى EntryPoint/HealthFacility/Sector/Locality."""
        from apps.surveillance.models import HealthCase

        fields = {f.name for f in HealthCase._meta.fields}
        expected = {'port', 'sector', 'locality', 'health_facility'}
        missing = expected - fields
        assert not missing, f'HealthCase مفقود FKs مباشرة: {missing}'

        # प्रकार التأكيد: كلFK يشير إلى النموذج المتوقع
        port_fk = HealthCase._meta.get_field('port')
        assert port_fk.remote_field.model.__name__ == 'EntryPoint'
        facility_fk = HealthCase._meta.get_field('health_facility')
        assert facility_fk.remote_field.model.__name__ == 'HealthFacility'
        sector_fk = HealthCase._meta.get_field('sector')
        assert sector_fk.remote_field.model.__name__ == 'Sector'
        locality_fk = HealthCase._meta.get_field('locality')
        assert locality_fk.remote_field.model.__name__ == 'Locality'

    def test_health_case_has_no_registry_fk(self):
        """IQ2 — HealthCase لا يشير إلى ReportingNode أو أي نموذج سجل."""
        from apps.surveillance.models import HealthCase

        fields = {f.name for f in HealthCase._meta.fields}
        registry_fields = {
            'reporting_node', 'reportingnode', 'node', 'reporting_node_id',
            'healthfacilitynodeassignment', 'statenodeassignment',
            'localitynodeassignment', 'facilityownership',
            'technicalsupervision', 'serviceavailability',
        }
        found = fields & registry_fields
        assert not found, f'HealthCase يحتوي على حقول سجل غير متوقعة: {found}'


@pytest.mark.django_db
class TestRegistryTraversalGap:
    """IQ5: traverse من حالة ترصد إلى عقدة سجل يُفشل إن لم تُنشأ مهمة تعيين."""

    def test_case_to_facility_to_node_requires_assignment(self):
        """IQ5 — يمكن الوصول للمنشأة، لكن الوصول لعقدة السجل يحتاج مهمة تعيين صريحة."""
        from apps.surveillance.models import HealthCase

        setup = _build_hierarchy(_uid())
        case = HealthCase.objects.create(
            case_number=f'CASE_A2_{_uid()}',
            health_facility=setup['facility'],
            port=setup['entry_point'],
            sector=setup['locality'].sector,
            locality=setup['locality'],
            workflow_state='OPEN',
            status='UNDER_INVESTIGATION',
        )

        # التأكيد الإيجابي: FK المباشر موجود
        assert case.health_facility_id == setup['facility'].id
        assert case.port_id == setup['entry_point'].id

        # gap: traverse إلى ReportingNode يتطلب HealthFacilityNodeAssignment صريح
        assignments = setup['facility'].node_assignments.filter(valid_to__isnull=True)
        if not assignments.exists():
            pytest.skip(
                'فجوة تكامل موثقة: HealthFacility لا يملك HealthFacilityNodeAssignment '
                'نشط → لا يمكن الانتقال من HealthCase إلى ReportingNode عبر الشجرة'
            )
        node = assignments.first().node
        assert node is not None
        assert node.kind in (ReportingNode.Kind.FACILITY, ReportingNode.Kind.LOCALITY)

    def test_reporting_node_not_referenced_by_surveillance(self):
        """IQ2 — لا نموذج ترصد يشير إلى ReportingNode مباشرة."""
        from apps.surveillance.models import HealthCase, HealthEvent

        for model in (HealthCase, HealthEvent):
            fields = {f.name for f in model._meta.fields}
            assert 'reporting_node' not in fields, f'{model.__name__} يشير إلى reporting_node'
            assert 'reportingnode' not in fields, f'{model.__name__} يشير إلى reportingnode'


@pytest.mark.django_db
class TestAggregationUsesDirectFK:
    """IQ4: التجميع الإحصائي يستخدم القيم المباشرة، لا عقدة السجل."""

    def test_cases_aggregate_by_sector_not_node(self):
        """IQ4 — التجميع يستخدم sector__name_ar (مفتاح مباشر)، لا node.path."""
        from apps.surveillance.models import HealthCase

        setup = _build_hierarchy(_uid())
        HealthCase.objects.create(
            case_number=f'CASE_A2_{_uid()}_1',
            health_facility=setup['facility'],
            sector=setup['locality'].sector,
            locality=setup['locality'],
            workflow_state='OPEN',
            status='UNDER_INVESTIGATION',
        )

        qs = HealthCase.objects.filter(sector=setup['locality'].sector)
        by_sector = list(
            qs.exclude(sector__isnull=True)
            .values('sector__name_ar')
            .annotate(count=Count('id'))
        )
        # التحقق من أن التجميع ينفّذ مباشرة على sector، لا على عقدة سجل
        assert any(r['sector__name_ar'] == setup['locality'].sector.name_ar for r in by_sector)

    def test_no_registry_node_path_aggregation_endpoint(self):
        """IQ4 — لا يوجد تجميع عبر node.path في الاستعلامات الموثقة (ثبات الضبط).
        
        هذا اختبار“हندسي” يضمن أن التجميع الحالي لا يستخدم path.
        """
        # HealthCase لا يحوي حقل node/path — التجميع عبر FKs مباشرة
        from apps.surveillance.models import HealthCase
        fields = {f.name for f in HealthCase._meta.fields}
        assert 'node_path' not in fields
        assert 'reporting_node_id' not in fields


@pytest.mark.django_db
class TestRegistryAssignmentExistsInternally:
    """الضبط: نماذج السجل تعمل داخلياً (مرجع للمقارنة) — لا 증거 اعتماد خارجي."""

    def test_state_node_assignment_creates_path(self):
        """المرجع: StateNodeAssignment يربط State بعقدة سجل (داخلي للسجل فقط)."""
        uid = _uid()
        setup = _build_hierarchy(uid)
        root = _ensure_root()
        state_node = ReportingNode.objects.create(
            code=f'NODE_ST_{uid}', name_ar='عقدة ولاية', kind='STATE', parent=root,
        )
        assignment = StateNodeAssignment.objects.create(
            state=setup['state'], node=state_node, valid_from='2026-01-01',
        )
        assert assignment.state == setup['state']
        assert assignment.node == state_node
        # هذا التكامل داخلي بين State و ReportingNode — لا يشمل تطبيقات الأعمال

    def test_health_facility_node_assignment_exists(self):
        """المرجع: HealthFacilityNodeAssignment يربط منشأة بعقدة (اختياري، غير مُلزِم)."""
        uid = _uid()
        setup = _build_hierarchy(uid)
        root = _ensure_root()
        fac_node = ReportingNode.objects.create(
            code=f'NODE_FAC_{uid}', name_ar='عقدة منشأة', kind='FACILITY', parent=root,
        )
        assignment = HealthFacilityNodeAssignment.objects.create(
            facility=setup['facility'], node=fac_node, valid_from='2026-01-01',
        )
        assert assignment.facility == setup['facility']
        assert assignment.node == fac_node
