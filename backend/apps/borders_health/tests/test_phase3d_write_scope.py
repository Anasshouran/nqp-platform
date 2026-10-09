"""Phase 3D — إغلاق ثغرة الكتابة خارج نطاق نقطة الدخول في `borders_health`.

ثغرة المرحلة 3C: كل ViewSet في `borders_health` يقيّد **القراءة** بنطاق
نقطة الدخول، لكن الإنشاء/التحديث عبر API لم يكن مقيّداً — الضابط المخصص
لـ `EP_ARGIN` كان يستطيع POST سجلاً مربوطاً بمعبر شقيق (أو قطاع آخر)
ويحصل على 201 مع سجل مخزَّن فعلاً (8 من 14 نقطة كتابة مفحوصة).

العلاج (المرحلة 3D): `BordersHealthScopedMixin` يفرض الآن على كل
`create`/`update`/`partial_update` أن تبقى نقطة الدخول الوجهة داخل
`resolve_authorized_entry_points(user)` قبل أي حفظ، بلا أي فهم ثانٍ
للنطاق — المحلّ المعتمد الوحيد هو القاطن في `core.utils.scoping`، ولا
يُغيّر العلاج أي موديل أو هيكل أوبـ migrations.

المصفوفة (§8 من التفويض):

  * نقاط كتابة (20) + `crossings` (بسبب OneToOne على entry_point):
    الإنشاء على معبر الضابط = 201، وعلى معبر شقيق = 403.
  * قطاع آخر / نقطة غير موجودة / لا إمكانية حلّ = 403.
  * GLOBAL / superuser = غير مقيّدين (201 حتى خارج القطاع).
  * `OrgAssignment` بلا `RoleAssignment` = لا تأذين (403).
  * `RoleAssignment` معطّل = لا تأذين (403).
  * تحديث ينقل السجل إلى معبر شقيق = 403؛ تحديث لا يغيّر النطاق =
    مقبول؛ نقل إلى نقطة أخرى مأذون بها (نطاق SECTOR) = مقبول.
  * مسار API/Serializer لا يتجاوز الحارس (لا يُخزَّن شيء عند الرفض).
  * المصفوفة الجغرافية (§9): ARGIN→WADI_HALFA/GALLABAT ممنوع،
    OSEIF→GABAIT ممنوع، ADRE→TINE/OSEIF ممنوع، النطاق القطاعي يسري
    على كل نقاط القطاع، GLOBAL على الكل.
"""
import uuid
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.borders_health.models import (
    BorderCrossing,
    BorderFacility,
    ContactTracingCase,
    HealthDeclaration,
    QuarantineCase,
    Vehicle,
)
from apps.masterdata.models import EntryPoint
from apps.organization.models import OrgAssignment
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'Str0ngPass!23'

BASE = '/api/v1/borders-health'

# المعابر البرية المسمّاة في مصفوفة Phase 2 (تسعة مسمّاة + سطلتان عامّتان).
NAMED_POES = [
    'EP_ARGIN', 'EP_WADI_HALFA', 'EP_MUTHALLATH', 'EP_GALLABAT', 'EP_ADRE',
    'EP_TINE', 'EP_ASHKEIT', 'EP_ALAFIA', 'EP_OSEIF', 'EP_GABAIT',
]
GENERIC_POE_BUCKETS = ['EP_ERITREA_BORDER', 'EP_SOUTH_SUDAN_BORDER']


def _sibling_code(entry_point, seeded_world, *, same_sector):
    """معبر آخر: داخل قطاع الضابط أو خارجه حسب `same_sector`."""
    for code, crossing in sorted(seeded_world.items()):
        if crossing.entry_point_id == entry_point.id:
            continue
        if (crossing.entry_point.sector_id == entry_point.sector_id) == same_sector:
            return code
    return None


def _traveler():
    country, _ = Country.objects.get_or_create(
        code='XZ9', defaults={'name': 'Testland', 'name_ar': 'أرض اختبار'},
    )
    return Traveler.objects.create(
        passport_number=f'PT{uuid.uuid4().hex[:8].upper()}',
        first_name='فهد', last_name='اختبار',
        date_of_birth=date(1990, 1, 1),
        nationality=country,
    )


def _bundle(seeded_world, code):
    """كائنات مساندة لمعبر معيّن تؤمّن حَمولات الكتابة (مركبة/مرفق/…)."""
    crossing = seeded_world[code]
    vehicle = Vehicle.objects.create(
        crossing=crossing,
        plate_number=f'PLT-{code}-{uuid.uuid4().hex[:6].upper()}',
        vehicle_type='TRUCK',
    )
    facility = BorderFacility.objects.create(
        crossing=crossing, kind='HEALTH',
        name_ar=f'مرفق-{code}-{uuid.uuid4().hex[:6]}',
    )
    quarantine_case = QuarantineCase.objects.create(
        crossing=crossing, person_name=f'حالة-{code}',
    )
    tracing_case = ContactTracingCase.objects.create(
        crossing=crossing, index_case_name=f'تتبع-{code}',
    )
    return {
        'label': code,
        'crossing_id': crossing.id,
        'vehicle_id': vehicle.id,
        'facility_id': facility.id,
        'tracing_case_id': tracing_case.id,
        'traveler_id': _traveler().id,
    }


# ---------------------------------------------------------------------------
# سجلّ نقاط الكتابة (20 نقطة + المصيد الخاص بـ `crossings` بسبب OneToOne).
# كل باعث ينتج حَمولة صالحة لنطاقه من `bundle` (الموجّهة أحد مفاتيح النطاق).
# ---------------------------------------------------------------------------


def _facilities(b): return {'crossing': b['crossing_id'], 'kind': 'HEALTH', 'name_ar': f'مرفق-{b["label"]}'}
def _shifts(b): return {'crossing': b['crossing_id'], 'shift_date': '2026-01-01', 'shift_type': 'MORNING'}
def _staff(b): return {'crossing': b['crossing_id'], 'user': b['officer_id'], 'role': 'INSPECTOR'}
def _traveler_records(b): return {'crossing': b['crossing_id'], 'traveler': b['traveler_id']}
def _declarations(b): return {'crossing': b['crossing_id'], 'traveler': b['traveler_id']}
def _screenings(b): return {'crossing': b['crossing_id'], 'traveler': b['traveler_id']}
def _vehicles(b): return {'crossing': b['crossing_id'], 'plate_number': f'PLT-{uuid.uuid4().hex[:8].upper()}', 'vehicle_type': 'TRUCK'}
def _vehicle_inspections(b): return {'vehicle': b['vehicle_id']}
def _cargo_inspections(b): return {'crossing': b['crossing_id'], 'scope': 'CARGO'}
def _samples(b): return {'crossing': b['crossing_id'], 'sample_code': f'S-{uuid.uuid4().hex[:8].upper()}'}
def _quarantine_cases(b): return {'crossing': b['crossing_id']}
def _isolation_cases(b): return {'crossing': b['crossing_id'], 'start_date': '2026-01-01'}
def _contact_tracing_cases(b): return {'crossing': b['crossing_id'], 'index_case_name': f'تتبع-{uuid.uuid4().hex[:6]}'}
def _contacts(b): return {'tracing_case': b['tracing_case_id'], 'full_name': 'مخالط'}
def _incidents(b): return {'crossing': b['crossing_id'], 'title': f'حادثة-{b["label"]}'}
def _emergencies(b): return {'crossing': b['crossing_id'], 'title': f'طوارئ-{b["label"]}'}
def _certificates(b): return {'crossing': b['crossing_id'], 'certificate_number': f'CRT-{uuid.uuid4().hex[:8].upper()}', 'certificate_type': 'HEALTH_CLEARANCE', 'issue_date': '2026-01-01', 'traveler': b['traveler_id']}
def _decisions(b): return {'crossing': b['crossing_id'], 'subject_type': 'PASSENGER', 'outcome': 'CLEARED'}
def _notifications(b): return {'crossing': b['crossing_id'], 'title': f'إشعار-{b["label"]}'}
def _daily_statistics(b): return {'crossing': b['crossing_id'], 'stat_date': '2026-06-01'}


ENDPOINT_CASES = [
    ('facilities', 'facilities', _facilities),
    ('shifts', 'shifts', _shifts),
    ('staff', 'staff', _staff),
    ('traveler-records', 'traveler-records', _traveler_records),
    ('declarations', 'declarations', _declarations),
    ('screenings', 'screenings', _screenings),
    ('vehicles', 'vehicles', _vehicles),
    ('vehicle-inspections', 'vehicle-inspections', _vehicle_inspections),
    ('cargo-inspections', 'cargo-inspections', _cargo_inspections),
    ('samples', 'samples', _samples),
    ('quarantine-cases', 'quarantine-cases', _quarantine_cases),
    ('isolation-cases', 'isolation-cases', _isolation_cases),
    ('contact-tracing-cases', 'contact-tracing-cases', _contact_tracing_cases),
    ('contacts', 'contacts', _contacts),
    ('incidents', 'incidents', _incidents),
    ('emergencies', 'emergencies', _emergencies),
    ('certificates', 'certificates', _certificates),
    ('decisions', 'decisions', _decisions),
    ('notifications', 'notifications', _notifications),
    ('daily-statistics', 'daily-statistics', _daily_statistics),
]
ENDPOINT_IDS = [c[0] for c in ENDPOINT_CASES]


# ---------------------------------------------------------------------------
# المصائد
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def seeded_world():
    """السجل المرجعي + الهيكل الإداري + معبر تشغيلي لكل منفذ مسمّى."""
    call_command('seed_masterdata', verbosity=0)
    call_command('seed_organization', verbosity=0)

    crossings = {}
    for code in NAMED_POES + GENERIC_POE_BUCKETS:
        entry_point = EntryPoint.objects.filter(code=code).first()
        if entry_point is None or entry_point.kind != 'LAND_PORT':
            continue
        crossing, _ = BorderCrossing.objects.get_or_create(
            entry_point=entry_point,
            defaults={'neighbor_country': '—', 'operating_status': 'OPEN'},
        )
        crossings[code] = crossing
    return crossings


def _officer(api_client, email, entry_point, *, scope_type='PORT', scope_id=None):
    """ضابط border: تعيين هيكلي إلى نقطة دخوله + `RoleAssignment`.

    `scope_id=None` يعني «بلا نطاق دور» — جسر `OrgAssignment.entry_point`
    وحده يؤذّن التنفيذ (نمط Phase 2).
    """
    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    OrgAssignment.objects.create(
        user=user, sector=entry_point.sector, entry_point=entry_point,
        is_primary=True, is_active=True,
    )

    role, _ = Role.objects.get_or_create(
        code='P3D_BORDER_OFFICER', defaults={'name': 'ضابط', 'default_scope': 'PORT'},
    )
    perms = []
    for action in ('view', 'add', 'edit', 'delete', 'health_screen',
                   'certificate_issue', 'dashboard_view', 'cargo_inspect'):
        perm, _ = Permission.objects.get_or_create(
            code=f'borders_health:{action}',
            defaults={'name': action, 'resource': 'borders_health', 'action': action},
        )
        perms.append(perm)
    role.permissions.add(*perms)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id, is_active=True,
    )

    login = api_client.post(
        '/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json',
    )
    assert login.status_code == 200, login.content
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    return user


def _stafficer():
    """مستخدم محض (بلا صلاحيات) لسجل BorderStaff.user — تفادي تعارض unique."""
    return User.objects.create_user(
        email=f'staff.{uuid.uuid4().hex[:8]}@nqp.gov.sd', password=PASSWORD,
        full_name='كادر مثال',
    )


# ---------------------------------------------------------------------------
# [1] كل نقطة كتابة: إيجابية على معبرها، سالبة على معبر شقيق
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('case', ENDPOINT_CASES, ids=ENDPOINT_IDS)
def test_create_on_own_crossing_201(api_client, seeded_world, case):
    name, path, build = case
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(api_client, f'p3d.own.{name}@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, 'EP_ARGIN')
    b['officer_id'] = _stafficer().id
    res = api_client.post(f'{BASE}/{path}/', build(b), format='json')
    assert res.status_code == 201, f'{name}: {res.status_code} {res.content[:300]}'


@pytest.mark.parametrize('case', ENDPOINT_CASES, ids=ENDPOINT_IDS)
def test_create_at_sibling_crossing_403(api_client, seeded_world, case):
    name, path, build = case
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    sibling = _sibling_code(entry_point, seeded_world, same_sector=True)
    if sibling is None:
        pytest.skip('قطاع EP_ARGIN لا يملك معبراً شقيقاً مسمّىً')
    _officer(api_client, f'p3d.sib.{name}@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, sibling)
    b['officer_id'] = _stafficer().id
    res = api_client.post(f'{BASE}/{path}/', build(b), format='json')
    assert res.status_code == 403, f'{name}: {res.status_code} {res.content[:300]}'


def test_create_at_other_sector_crossing_403(api_client, seeded_world):
    """إيجابية/سالبة قطاع مختلفة: التفتيش على `declarations` يَردّ 403."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    other = _sibling_code(entry_point, seeded_world, same_sector=False)
    assert other is not None, 'السجل يجب أن يحوي أكثر من قطاع'

    _officer(api_client, 'p3d.other@nqp.gov.sd', entry_point)
    b = _bundle(seeded_world, other)
    res = api_client.post(
        f'{BASE}/declarations/', _declarations(b), format='json',
    )
    assert res.status_code == 403, res.status_code


# ---------------------------------------------------------------------------
# [2] `crossings` — مصيد entry_point بحدّ OneToOne على المنفذ
# ---------------------------------------------------------------------------


def test_crossings_create_at_own_fresh_entry_point_201(api_client, seeded_world):
    """ضابط على منفذ جديد (بلا معبر) ينشئ معبَره — ويعمل مرساة entry_point."""
    base = EntryPoint.objects.get(code='EP_ARGIN')
    ep = EntryPoint.objects.create(
        code=f'EP_3D_NEW_{uuid.uuid4().hex[:6].upper()}', name_ar='منفذ جديد',
        kind='LAND_PORT', state=base.state, sector=base.sector, is_active=True,
    )
    _officer(api_client, 'p3d.cross.own@nqp.gov.sd', ep)

    res = api_client.post(f'{BASE}/crossings/', {
        'entry_point': ep.id, 'border_type': 'ROAD',
        'neighbor_country': '—', 'operating_status': 'OPEN',
    }, format='json')
    assert res.status_code == 201, res.content[:300]


def test_crossings_create_at_sibling_entry_point_403(api_client, seeded_world):
    """إنشاء معبر على `EP_WADI_HALFA` من ضابط `EP_ARGIN` ممنوع قبل الحفظ."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    sibling = EntryPoint.objects.get(code='EP_WADI_HALFA')
    _officer(api_client, 'p3d.cross.sib@nqp.gov.sd', entry_point)

    res = api_client.post(f'{BASE}/crossings/', {
        'entry_point': sibling.id, 'border_type': 'ROAD',
        'neighbor_country': '—', 'operating_status': 'OPEN',
    }, format='json')
    assert res.status_code == 403, res.status_code


# ---------------------------------------------------------------------------
# [3] المصفوفة النطاقية (§8) على `declarations`
# ---------------------------------------------------------------------------


def test_create_at_nonexistent_crossing_403(api_client, seeded_world):
    """معبر غير موجود = لا نقطة قابلة للحل ⇒ رفض لتنفيذ create خارج النطاق."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(api_client, 'p3d.missing@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, 'EP_ARGIN')
    payload = _declarations(b)
    payload['crossing'] = uuid.uuid4()
    res = api_client.post(f'{BASE}/declarations/', payload, format='json')
    assert res.status_code == 403, res.status_code


def test_global_scope_can_create_outside_sector(api_client, seeded_world):
    """GLOBAL بلا تقييد: سجل في معبر قطاع مختلف يَنجح."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(
        api_client, 'p3d.global@nqp.gov.sd', entry_point,
        scope_type='GLOBAL', scope_id=None,
    )
    b = _bundle(seeded_world, 'EP_GALLABAT')
    res = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert res.status_code == 201, res.content[:300]


def test_superuser_can_create_outside_sector(api_client, seeded_world):
    """المشرف بلا تقييد: سجل في معبر قطاع مختلف يَنجح."""
    User.objects.create_superuser(
        email='p3d.super@nqp.gov.sd', password=PASSWORD, full_name='مشرف',
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': 'p3d.super@nqp.gov.sd', 'password': PASSWORD}, format='json',
    )
    assert login.status_code == 200, login.content
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )

    b = _bundle(seeded_world, 'EP_WADI_HALFA')
    res = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert res.status_code == 201, res.content[:300]


def test_no_resolvable_scope_create_403(api_client, seeded_world):
    """تعيين هيكلي معطّل + نطاق دور بلا scope_id ⇒ لا إمكانية حلّ ⇒ 403."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    user = _officer(api_client, 'p3d.noscope@nqp.gov.sd', entry_point)
    OrgAssignment.objects.filter(user=user).update(is_active=False)

    b = _bundle(seeded_world, 'EP_ARGIN')
    res = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert res.status_code == 403, res.status_code


def test_org_assignment_without_role_assignment_403(api_client, seeded_world):
    """حذف `RoleAssignment` بالكامل ⇒ لا تأذين (السياق لا يُؤمَّن بدونه)."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    user = _officer(api_client, 'p3d.norole@nqp.gov.sd', entry_point)
    RoleAssignment.objects.filter(user=user).delete()

    b = _bundle(seeded_world, 'EP_ARGIN')
    res = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert res.status_code == 403, res.status_code


def test_inactive_role_assignment_403(api_client, seeded_world):
    """`RoleAssignment` معطّل ⇒ لا تأذين حتى مع بقاء التعيين الهيكلي."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    user = _officer(api_client, 'p3d.inactiverole@nqp.gov.sd', entry_point)
    RoleAssignment.objects.filter(user=user).update(is_active=False)
    assert RoleAssignment.objects.filter(user=user, is_active=False).exists()

    b = _bundle(seeded_world, 'EP_ARGIN')
    res = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert res.status_code == 403, res.status_code


# ---------------------------------------------------------------------------
# [4] التحديثات: نقل النطاق وعدمه
# ---------------------------------------------------------------------------


def test_update_moving_crossing_to_sibling_403(api_client, seeded_world):
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    sibling = _sibling_code(entry_point, seeded_world, same_sector=True)
    _officer(api_client, 'p3d.move@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, 'EP_ARGIN')
    created = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert created.status_code == 201, created.content[:200]
    decl_id = created.json()['data']['id']

    sb = _bundle(seeded_world, sibling)
    res = api_client.patch(
        f'{BASE}/declarations/{decl_id}/', {'crossing': sb['crossing_id']},
        format='json',
    )
    assert res.status_code == 403, res.status_code


def test_update_without_scope_change_200(api_client, seeded_world):
    """PATCH لا يمسّ معرّف النطاق مقبول (نطاق لم يتغيّر)."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(api_client, 'p3d.notes@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, 'EP_ARGIN')
    created = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert created.status_code == 201, created.content[:200]
    decl_id = created.json()['data']['id']

    res = api_client.patch(
        f'{BASE}/declarations/{decl_id}/', {'notes': 'تحديث خارج النطاق'}, format='json',
    )
    assert res.status_code == 200, res.status_code


def test_sector_scope_update_to_another_authorized_poe_200(api_client, seeded_world):
    """سياق قطاعي: النقل إلى نقطة أخرى مأذون بها (نفس القطاع) لا يُرفض."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    other = _sibling_code(entry_point, seeded_world, same_sector=True)
    assert other is not None
    _officer(
        api_client, 'p3d.sector@nqp.gov.sd', entry_point,
        scope_type='SECTOR', scope_id=entry_point.sector_id,
    )

    b = _bundle(seeded_world, 'EP_ARGIN')
    created = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert created.status_code == 201, created.content[:200]
    decl_id = created.json()['data']['id']

    sb = _bundle(seeded_world, other)
    res = api_client.patch(
        f'{BASE}/declarations/{decl_id}/', {'crossing': sb['crossing_id']},
        format='json',
    )
    assert res.status_code == 200, res.status_code


def test_denied_create_persists_nothing(api_client, seeded_world):
    """عند 403 لا يُخزَّن أي سجل — الحارس يعمل قبل أي حفظ (لا تجاوز عبر
    Serializer/API path)."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    sibling = _sibling_code(entry_point, seeded_world, same_sector=True)
    _officer(api_client, 'p3d.nopersist@nqp.gov.sd', entry_point)

    sb = _bundle(seeded_world, sibling)
    res = api_client.post(f'{BASE}/declarations/', _declarations(sb), format='json')
    assert res.status_code == 403, res.status_code
    assert HealthDeclaration.objects.filter(crossing=sb['crossing_id']).count() == 0


# ---------------------------------------------------------------------------
# [5] المصفوفة الجغرافية (§9) ومقايضات القطاعات على نقاط متسربة سابقاً
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('officer_code,target_code,path', [
    # شقيق (نفس القطاع) — ممنوع
    ('EP_OSEIF', 'EP_GABAIT', 'incidents'),
    ('EP_ADRE', 'EP_TINE', 'incidents'),
    # قطاع مختلف — ممنوع
    ('EP_ADRE', 'EP_OSEIF', 'incidents'),
    ('EP_ARGIN', 'EP_GALLABAT', 'incidents'),
], ids=['oseif-gabait', 'adre-tine', 'adre-oseif', 'argin-gallabatt'])
def test_cross_poe_matrix_denied(api_client, seeded_world, officer_code, target_code, path):
    """أزواج المرحلة 3C (§9): الضابط لا يكتب عن معبر خارج نطاقه (أياً كان
    نوع المرساة — هنا `crossing` عبر نموذج `incidents`)."""
    entry_point = EntryPoint.objects.get(code=officer_code)
    _officer(api_client, f'p3d.mx.{officer_code}.{target_code}@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, target_code)
    res = api_client.post(f'{BASE}/{path}/', _incidents(b), format='json')
    assert res.status_code == 403, res.status_code


def test_cross_poe_matrix_denied_via_indirect_anchor(api_client, seeded_world):
    """المرساة غير المباشرة (المركبة → معبرها) تُحلّ إلى نفس نطاق المعبر:
    مركبة من معبر شقيق ترفض شهادةَ ضابط يحمل نطَاقَ معبره فقط."""
    officer_code, target_code = 'EP_ARGIN', 'EP_WADI_HALFA'
    entry_point = EntryPoint.objects.get(code=officer_code)
    _officer(api_client, f'p3d.mx.anchor.{officer_code.lower()}@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, target_code)
    res = api_client.post(f'{BASE}/certificates/', _certificates(b), format='json')
    assert res.status_code == 403, res.status_code


def test_sector_scope_write_across_sector_eps_allowed(api_client, seeded_world):
    """نطاق قطاعي = كل نقط القطاع مأذون بها للكتابة (وقطاع آخر ممنوع)."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    other = _sibling_code(entry_point, seeded_world, same_sector=True)
    assert other is not None
    _officer(
        api_client, 'p3d.seccreate@nqp.gov.sd', entry_point,
        scope_type='SECTOR', scope_id=entry_point.sector_id,
    )

    b = _bundle(seeded_world, other)
    res = api_client.post(f'{BASE}/declarations/', _declarations(b), format='json')
    assert res.status_code == 201, res.content[:300]


def test_global_write_at_western_poe_allowed(api_client, seeded_world):
    """GLOBAL: تُصدر شهادة في معبر غربي بعيد عن معبر ضابطةِ الاختبار."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(
        api_client, 'p3d.global.west@nqp.gov.sd', entry_point,
        scope_type='GLOBAL', scope_id=None,
    )
    b = _bundle(seeded_world, 'EP_ADRE')
    res = api_client.post(f'{BASE}/certificates/', _certificates(b), format='json')
    assert res.status_code == 201, res.content[:300]


# ---------------------------------------------------------------------------
# [6] الإجراءات المخصّصة المقيّدة بنطاق (لا تزال مقيّدة على الأشقاء)
# ---------------------------------------------------------------------------


def test_issue_action_own_crossing_still_works(api_client, seeded_world):
    """`issue` لمعبر الضابط يواصل العمل (لا إنذار كاذب من الحارس)."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(api_client, 'p3d.issue.own@nqp.gov.sd', entry_point)

    b = _bundle(seeded_world, 'EP_ARGIN')
    res = api_client.post(f'{BASE}/certificates/issue/', {
        'crossing': b['crossing_id'], 'certificate_type': 'HEALTH_CLEARANCE',
    }, format='json')
    assert res.status_code in (201, 400), res.status_code
    assert res.status_code == 201, res.content[:300]


def test_issue_action_sibling_crossing_denied(api_client, seeded_world):
    """`issue` على معبر شقيق مرفوض (نطاقٍ لا يشمله الضابط)."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    sibling = _sibling_code(entry_point, seeded_world, same_sector=True)
    _officer(api_client, 'p3d.issue.sib@nqp.gov.sd', entry_point)

    sb = _bundle(seeded_world, sibling)
    res = api_client.post(f'{BASE}/certificates/issue/', {
        'crossing': sb['crossing_id'], 'certificate_type': 'HEALTH_CLEARANCE',
    }, format='json')
    assert res.status_code == 400, res.status_code


def test_refresh_action_scoped_to_authorized_crossings(api_client, seeded_world):
    """`refresh` بحساب معبرين: المأذون فقط يُحتسب، ولا يُرفع خطأ للنطاق."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    sibling = _sibling_code(entry_point, seeded_world, same_sector=True)
    if sibling is None:
        pytest.skip('قطاع EP_ARGIN لا يملك معبراً شقيقاً مسمّىً')
    _officer(api_client, 'p3d.refresh@nqp.gov.sd', entry_point)

    res = api_client.post(f'{BASE}/daily-statistics/refresh/', {}, format='json')
    assert res.status_code == 200, res.status_code
    own = seeded_world['EP_ARGIN']
    ids = {row['crossing'] for row in res.json()['data']['results']}
    assert ids == {str(own.id)}
    assert seeded_world[sibling].id not in ids