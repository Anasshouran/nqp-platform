"""Phase 3B — `REGION` في HR قطاع إداري لا نقطة دخول.

الخلل الذي عولج: كان الصف `'REGION': ('entry_point_id',)` في
`hr.scoping.SCOPE_LOOKUPS`. و`accounts.serializers`
(`_validate_scope_id`) يقبل `organization.Sector` — أي أن `scope_id` المُدخَل معرّف **قطاع**، بينما
الاستعلام كان يقارنه بـ `OrgAssignment.entry_point_id` (فضاء معرّفات مختلف).
النتيجة: لا يطابق أي صف أبداً ⇒ HR يحجب كل الموظفين بصمت، وسببه غير ظاهر
في السجلات.

المحور: معرّف القطاع الإداري يجب أن يُطابق عبر سلسلة `OrgAssignment` كاملة،
ومعرّف نقطة الدخول يجب **ألا** يُطابق هنا.
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.masterdata.models import EntryPoint
from apps.organization.models import Department, OrgAssignment, Sector, Station
from apps.hr.scoping import (
    SCOPE_LOOKUPS,
    resolve_hr_scope_keys,
    resolve_visible_employee_user_ids,
)

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'Str0ngPass!23'


@pytest.fixture
def registry(monkeypatch):
    """سجل كامل: master's + هيكل إداري + ضباط + تعييناتهم الهيكلية.

    ترتيب مهم: `seed_org_assignments` يحتاج أن يكون حساب الضابط موجوداً أولاً،
    وإلا تخطّى كل معبر بـ `ORGANIZATIONAL_ASSIGNMENT_PENDING`.
    """
    monkeypatch.setenv('SEED_DEMO_USERS', 'true')
    call_command('seed_rbac', verbosity=0)
    call_command('seed_masterdata', verbosity=0)
    call_command('seed_organization', verbosity=0)
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    call_command('seed_org_assignments', verbosity=0)


def _employee(email, *, sector=None, department=None, station=None, entry_point=None):
    return User.objects.create_user(email=email, password=PASSWORD, full_name=email)


def _assign(user, **kwargs):
    return OrgAssignment.objects.create(user=user, is_primary=True, is_active=True, **kwargs)


def _viewer(email, scope_type, scope_id):
    """مستخدم بنطاق واحد محدّد — نتعامل مع `hr.scoping` مباشرة، لا عبر HTTP."""
    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    role = Role.objects.create(
        code='R_' + email.replace('@', '_').replace('.', '_').upper(), name=email,
        default_scope=scope_type,
    )
    role.permissions.add(Permission.objects.get_or_create(
        code='hr:view', defaults={'name': 'hr view', 'resource': 'hr', 'action': 'view'},
    )[0])
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id, is_active=True,
    )
    return user


# ---------------------------------------------------------------------------
# العقد الثابت
# ---------------------------------------------------------------------------


def test_region_lookup_is_identical_to_sector_lookup():
    """`REGION` و`SECTOR` يقرآن نفس المسارات — لا فضاء معرّفات مختلفاً."""
    assert SCOPE_LOOKUPS['REGION'] == SCOPE_LOOKUPS['SECTOR']
    assert SCOPE_LOOKUPS['REGION'][0] == 'sector_id'

    # جوهر الإصلاح: لا يقارن `REGION` بـ `entry_point_id` مباشرةً أبداً.
    assert 'entry_point_id' not in SCOPE_LOOKUPS['REGION']
    assert 'entry_point__sector_id' in SCOPE_LOOKUPS['REGION']


def test_region_scope_target_is_an_organizational_sector(registry):
    """التحقق الفعلي في الـ serializer يقبل قطاعاً إدارياً لـ `REGION`."""
    from rest_framework.test import APIRequestFactory

    from apps.accounts.serializers import RoleAssignmentWriteSerializer

    supervisor = User.objects.create_superuser(
        email='hr.supervisor@nqp.gov.sd', password=PASSWORD, full_name='sup',
    )
    role = Role.objects.create(
        code='P3B_HR_REGION_ROLE', name='دور', default_scope='REGION',
    )
    request = APIRequestFactory().post('/api/v1/accounts/role-assignments/')
    request.user = supervisor
    context = {'request': request}

    target_sector = Sector.objects.get(code='RED_SEA')
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')

    # قطاع إداري مقبول لـ `REGION`.
    serializer = RoleAssignmentWriteSerializer(data={
        'user': User.objects.create_user(
            email='hr.validate@nqp.gov.sd', password=PASSWORD, full_name='v',
        ).id,
        'role': role.code,
        'scope_type': 'REGION',
        'scope_id': str(target_sector.id),
    }, context=context)
    assert serializer.is_valid(), serializer.errors

    # نقطة دخول مرفوضة لـ `REGION` — تخص `POINT`/`PORT` لا `REGION`.
    rejected = RoleAssignmentWriteSerializer(data={
        'user': User.objects.create_user(
            email='hr.validate2@nqp.gov.sd', password=PASSWORD, full_name='v2',
        ).id,
        'role': role.code,
        'scope_type': 'REGION',
        'scope_id': str(entry_point.id),
    }, context=context)
    assert not rejected.is_valid()
    assert 'scope_id' in rejected.errors


def test_every_region_lookup_path_actually_resolves(registry):
    """مسار خاطئ ينتج `FieldError` ثم حجباً صامتاً — ننفّذه كله هنا.

    الفحص يمرّ على `OrgAssignment.objects.filter(**{path: id})` نفسه، لا على
    أسماء الحقول: مسارات `__` لا يمكن التحقق منها من `_meta` وحده.
    """
    from apps.hr.scoping import _assignments_in_scope

    sample = OrgAssignment.objects.filter(sector_id__isnull=False).first()
    assert sample is not None, 'السجل المرجعي يجب أن يحوي تعييناً بقطاع'

    for path in SCOPE_LOOKUPS['REGION']:
        qs = OrgAssignment.objects.filter(**{path: sample.sector_id})
        assert qs.model is OrgAssignment, f'مسار REGION غير صالح: {path}'

    # والمسار الكامل عبر دالّة الإنتاج لا يرفع استثناءً.
    assert _assignments_in_scope('REGION', sample.sector_id).model is OrgAssignment


# ---------------------------------------------------------------------------
# الدلالة الفعلية: معرّف القطاع الإداري
# ---------------------------------------------------------------------------


def test_region_resolves_employees_in_that_organizational_sector(registry):
    """الحدّ الإيجابي: معرّف قطاع إداري ⇒ موظفو ذلك القطاع."""
    target_sector = Sector.objects.get(code='RED_SEA')
    inside = _employee('hr.inside@nqp.gov.sd')
    _assign(inside, sector=target_sector)

    actor = _viewer('hr.actor@nqp.gov.sd', 'REGION', target_sector.id)

    assert resolve_hr_scope_keys(actor) == {('REGION', target_sector.id)}
    assert inside.id in resolve_visible_employee_user_ids(actor)


def test_region_follows_the_full_org_assignment_chain(registry):
    """التعيينات الأعمق تُحتسب: إدارة، محطة، ومنصب داخل القطاع."""
    target_sector = Sector.objects.get(code='RED_SEA')
    department = Department.objects.filter(sector=target_sector).first()
    assert department is not None
    station = Station.objects.filter(sector=target_sector).first()

    by_department = _employee('hr.by.dept@nqp.gov.sd')
    _assign(by_department, department=department)
    if station is not None:
        by_station = _employee('hr.by.station@nqp.gov.sd')
        _assign(by_station, station=station)
    else:
        pytest.skip('لا محطة في هذا القطاع')

    actor = _viewer('hr.chain@nqp.gov.sd', 'REGION', target_sector.id)
    visible = resolve_visible_employee_user_ids(actor)

    assert by_department.id in visible
    assert by_station.id in visible


def test_region_and_sector_produce_identical_results(registry):
    """لا فرق دلالي بين الاسمين — شرط أن يكون `REGION` قطاعاً."""
    target_sector = Sector.objects.get(code='RED_SEA')
    other_sector = Sector.objects.exclude(pk=target_sector.pk).first()

    mine = _employee('hr.eq.mine@nqp.gov.sd')
    _assign(mine, sector=target_sector)
    theirs = _employee('hr.eq.theirs@nqp.gov.sd')
    _assign(theirs, sector=other_sector)

    by_region = resolve_visible_employee_user_ids(
        _viewer('hr.eq.region@nqp.gov.sd', 'REGION', target_sector.id)
    )
    by_sector = resolve_visible_employee_user_ids(
        _viewer('hr.eq.sector@nqp.gov.sd', 'SECTOR', target_sector.id)
    )

    assert by_region == by_sector
    assert mine.id in by_region
    assert theirs.id not in by_region, 'REGION تجاوز إلى قطاع آخر'


# ---------------------------------------------------------------------------
# الحدّ الذي كان مغطّى بالخطأ
# ---------------------------------------------------------------------------


def test_region_does_not_interpret_its_scope_id_as_an_entry_point(registry):
    """الحدّ الحاسم: معرّف نقطة الدخول لـ `REGION` لا يجب أن يُطابق.

    هذا بالضبط ما كان يفعله الصف القديم `('entry_point_id',)`؛ فمعرّف نقطة
    الدخول كان يمرّ بلاتحقّق فيُمنح نطاقاً زائفاً لم يُطلب.
    """
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    assert Sector.objects.filter(pk=entry_point.sector_id).exists()

    user = _viewer('hr.epid@nqp.gov.sd', 'REGION', entry_point.id)

    assert resolve_visible_employee_user_ids(user) == set()


def test_region_with_a_station_uuid_matches_nothing(registry):
    """معرّف محطة لـ `REGION` لا يُطابق — مساحة معرّفات خاطئة تُحجب."""
    station = Station.objects.first()
    assert station is not None

    user = _viewer('hr.stid@nqp.gov.sd', 'REGION', station.id)
    assert resolve_visible_employee_user_ids(user) == set()


def test_region_with_no_assignment_returns_empty(registry):
    """فشل آمن: قطاع بلا موظفين ⇒ مجموعة فارغة، لا خطأ ولا انفجار."""
    empty_sector = Sector.objects.filter(assignments__isnull=True).first()
    assert empty_sector is not None, 'السجل يجب أن يحوي قطاعاً بلا تعيينات'

    user = _viewer('hr.empty@nqp.gov.sd', 'REGION', empty_sector.id)
    assert resolve_visible_employee_user_ids(user) == set()


def test_national_scope_stays_unrestricted_under_region_change(registry):
    """`GLOBAL` يبقى بلا تقييد بعد التغيير."""
    user = User.objects.create_superuser(
        email='hr.super@nqp.gov.sd', password=PASSWORD, full_name='super',
    )
    assert resolve_visible_employee_user_ids(user) is None
    assert resolve_hr_scope_keys(user) is None