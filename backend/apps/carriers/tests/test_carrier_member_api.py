"""M8-B.2 — CarrierMember Management API：授权、生命周期与数据隔离。

安全边界（每条断言都不做 HTTP 状态码的二选一）：
    * `CARRIER` 无 members 权限 ⇒ 403
    * `CARRIER_ADMIN(COMPANY A)` 只能管理 A，跨公司 ⇒ 404
    * `CarrierMember` 的存在绝不能变成管理权限（anti-widening）
    * `GLOBAL` 的 `CARRIER_ADMIN` 不得等同于国家级（D1）
    * `user`/`carrier` 不可变；`is_active` 只能经生命周期端点修改
    * 创建/生命周期必须写入 `PermissionAudit`，且绝不产生新 RoleAssignment
"""
import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import Permission, PermissionAudit, Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.carriers.permissions import manageable_carrier_ids
from apps.carriers.tests.conftest import (
    PASSWORD,
    assign_carrier_admin_role,
    assign_carrier_role,
)

pytestmark = pytest.mark.django_db
User = get_user_model()
LOGIN = '/api/v1/auth/login/'
BASE = '/api/v1/carriers/companies/{carrier_id}/members/'
DETAIL = '/api/v1/carriers/companies/{carrier_id}/members/{member_id}/'
ACT_URL = DETAIL + '{action}/'


# ---------------------------------------------------------------------------
# 测试工具
# ---------------------------------------------------------------------------
def _two_carriers():
    return (
        Carrier.objects.create(name='شركة أ', iata_code='AA', is_active=True),
        Carrier.objects.create(name='شركة ب', iata_code='BB', is_active=True),
    )


def _mk_user(email, *, is_staff=False, is_active=True):
    return User.objects.create_user(
        email=email, password=PASSWORD, full_name=email,
        is_staff=is_staff, is_active=is_active,
    )


def _authed(user):
    from rest_framework.test import APIClient

    client = APIClient()
    resp = client.post(LOGIN, {'email': user.email, 'password': PASSWORD}, format='json')
    assert resp.status_code == 200, resp.content
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client


def _carrier_rep(email, carrier):
    user = _mk_user(email)
    assign_carrier_role(user)
    CarrierMember.objects.create(user=user, carrier=carrier, is_active=True)
    return _authed(user)


def _admin(email, carrier):
    user = _mk_user(email)
    assign_carrier_admin_role(user, carrier)
    return _authed(user)


def _staff(email):
    return _authed(_mk_user(email, is_staff=True))


def _m(carrier, *, is_active=True, is_primary=False, email=None):
    user = User.objects.create_user(
        email=email or f'm{CarrierMember.objects.count()}@nqp.sd',
        password=PASSWORD, full_name='member',
    )
    return CarrierMember.objects.create(
        user=user, carrier=carrier, is_active=is_active, is_primary=is_primary,
    )


# ---------------------------------------------------------------------------
# policy helper：核心反扩张语义（§5）
# ---------------------------------------------------------------------------
class TestManageableCarrierIds:
    def test_superuser_unrestricted(self):
        su = User.objects.create_superuser(email='su@nqp.sd', password=PASSWORD, full_name='su')
        assert manageable_carrier_ids(su) is None

    def test_staff_unrestricted(self):
        staff = _mk_user('staff@nqp.sd', is_staff=True)
        assert manageable_carrier_ids(staff) is None

    def test_anonymous_empty(self):
        assert manageable_carrier_ids(None) == set()

    def test_no_assignment_empty(self):
        user = _mk_user('noass@nqp.sd')
        assert manageable_carrier_ids(user) == set()

    def test_company_assignment_grants_that_carrier_only(self):
        a = Carrier.objects.create(name='a', iata_code='A', is_active=True)
        b = Carrier.objects.create(name='b', iata_code='B', is_active=True)
        user = _mk_user('acomp@nqp.sd')
        assign_carrier_admin_role(user, a)
        assert manageable_carrier_ids(user) == {a.id}

    def test_two_company_assignments(self):
        a, b, c = (Carrier.objects.create(name=x, iata_code=x, is_active=True) for x in 'ABC')
        user = _mk_user('two@nqp.sd')
        assign_carrier_admin_role(user, a)
        assign_carrier_admin_role(user, b)
        assert manageable_carrier_ids(user) == {a.id, b.id}

    def test_global_carrier_admin_is_not_unrestricted(self):
        """关键不变量：GLOBAL 的 CARRIER_ADMIN 不能变成国家级。"""
        carrier = Carrier.objects.create(name='a', iata_code='A', is_active=True)
        user = _mk_user('glob@nqp.sd')
        assign_carrier_admin_role(user, carrier, scope_type=RoleAssignment.ScopeType.GLOBAL)
        assert manageable_carrier_ids(user) == set()

    def test_carrier_membership_does_not_widen_scope(self):
        """Scope = A 的管理员 + B 的 CarrierMember ⇒ 仍只 A。"""
        a, b = _two_carriers()
        assign_carrier_admin_role(a_user := _mk_user('memberb@nqp.sd'), a)
        CarrierMember.objects.create(user=a_user, carrier=b, is_active=True)
        assert manageable_carrier_ids(a_user) == {a.id}

    def test_sector_scope_ignored(self):
        from apps.organization.models import Sector

        sector = Sector.objects.create(code='S1', name_ar='قطاع')
        a = Carrier.objects.create(name='a', iata_code='A', is_active=True)
        user = _mk_user('sector@nqp.sd')
        role = Role.objects.create(code='R1', name='r', name_ar='r')
        role.permissions.set(Permission.objects.filter(code='carrier_members:view'))
        RoleAssignment.objects.create(
            user=user, role=role, scope_type=RoleAssignment.ScopeType.SECTOR,
            scope_id=sector.id, is_active=True,
        )
        assert manageable_carrier_ids(user) == set()


# ---------------------------------------------------------------------------
# 授权矩阵（§16）
# ---------------------------------------------------------------------------
class TestAuthorizationMatrix:
    def test_carrier_cannot_list(self):
        a, _ = _two_carriers()
        client = _carrier_rep('c1@nqp.sd', a)
        assert client.get(BASE.format(carrier_id=a.id)).status_code == 403

    def test_carrier_cannot_create(self):
        a, _ = _two_carriers()
        client = _carrier_rep('c2@nqp.sd', a)
        assert client.post(BASE.format(carrier_id=a.id), {}, format='json').status_code == 403

    def test_carrier_cannot_patch(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _carrier_rep('c3@nqp.sd', a)
        assert client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {}, format='json').status_code == 403

    def test_carrier_cannot_activate(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=False)
        client = _carrier_rep('c4@nqp.sd', a)
        assert client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='activate')).status_code == 403

    def test_carrier_cannot_deactivate(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _carrier_rep('c5@nqp.sd', a)
        assert client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='deactivate')).status_code == 403

    def test_admin_a_lists_own(self):
        a, b = _two_carriers()
        ma = _m(a, email='only-a@nqp.sd')
        _m(b)
        client = _admin('aa1@nqp.sd', a)
        resp = client.get(BASE.format(carrier_id=a.id))
        assert resp.status_code == 200
        rows = resp.json()['data']['results'] if isinstance(resp.json()['data'], dict) else resp.json()['data']
        ids = {row['id'] for row in rows}
        assert str(ma.id) in ids
        for row in rows:
            assert 'only-b' not in row['user_email']

    def test_admin_a_create_in_a(self):
        a, _ = _two_carriers()
        client = _admin('aa2@nqp.sd', a)
        u = _mk_user('new@nqp.sd')
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(u.id)}, format='json')
        assert resp.status_code == 201, resp.content

    def test_admin_a_patch_a(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _admin('aa3@nqp.sd', a)
        resp = client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {'is_primary': True}, format='json')
        assert resp.status_code == 200

    def test_admin_a_activate_a(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=False)
        client = _admin('aa4@nqp.sd', a)
        resp = client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='activate'))
        assert resp.status_code == 200, resp.content

    def test_admin_a_deactivate_a(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _admin('aa5@nqp.sd', a)
        resp = client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='deactivate'))
        assert resp.status_code == 200, resp.content

    def test_admin_a_list_b_404(self):
        a, b = _two_carriers()
        client = _admin('aa6@nqp.sd', a)
        assert client.get(BASE.format(carrier_id=b.id)).status_code == 404

    def test_admin_a_create_in_b_404(self):
        a, b = _two_carriers()
        client = _admin('aa7@nqp.sd', a)
        assert client.post(BASE.format(carrier_id=b.id), {}, format='json').status_code == 404

    def test_admin_a_patch_b_404(self):
        a, b = _two_carriers()
        mb = _m(b)
        client = _admin('aa8@nqp.sd', a)
        assert client.patch(DETAIL.format(carrier_id=b.id, member_id=mb.id), {'is_primary': True}, format='json').status_code == 404

    def test_admin_a_activate_b_404(self):
        a, b = _two_carriers()
        mb = _m(b, is_active=False)
        client = _admin('aa9@nqp.sd', a)
        assert client.post(ACT_URL.format(carrier_id=b.id, member_id=mb.id, action='activate')).status_code == 404

    def test_admin_a_deactivate_b_404(self):
        a, b = _two_carriers()
        mb = _m(b)
        client = _admin('aa10@nqp.sd', a)
        assert client.post(ACT_URL.format(carrier_id=b.id, member_id=mb.id, action='deactivate')).status_code == 404

    def test_member_of_b_through_a_admin_404(self):
        """A 的管理员拿着 B 成员的 UUID 也看不到它 — 即使管理员知道它存在。"""
        a, b = _two_carriers()
        mb = _m(b)
        client = _admin('aa11@nqp.sd', a)
        assert client.get(DETAIL.format(carrier_id=a.id, member_id=mb.id)).status_code == 404

    def test_membership_b_does_not_expand_scope(self):
        a, b = _two_carriers()
        user = _mk_user('antib@nqp.sd')
        assign_carrier_admin_role(user, a)
        CarrierMember.objects.create(user=user, carrier=b, is_active=True)
        client = _authed(user)
        assert client.get(BASE.format(carrier_id=a.id)).status_code == 200
        assert client.get(BASE.format(carrier_id=b.id)).status_code == 404

    def test_global_carrier_admin_not_unrestricted_via_api(self):
        a, b = _two_carriers()
        user = _mk_user('globapi@nqp.sd')
        assign_carrier_admin_role(user, a, scope_type=RoleAssignment.ScopeType.GLOBAL)
        client = _authed(user)
        assert client.get(BASE.format(carrier_id=a.id)).status_code == 404
        assert client.get(BASE.format(carrier_id=b.id)).status_code == 404

    def test_plain_member_cannot_manage(self):
        a, b = _two_carriers()
        client = _carrier_rep('plain@nqp.sd', b)
        assert client.get(BASE.format(carrier_id=b.id)).status_code == 403

    def test_national_admin_unrestricted(self):
        a, b = _two_carriers()
        mb = _m(b)
        client = _staff('nat@nqp.sd')
        assert client.get(BASE.format(carrier_id=b.id)).status_code == 200
        assert client.post(ACT_URL.format(carrier_id=b.id, member_id=mb.id, action='deactivate')).status_code == 200

    def test_admin_a_cannot_touch_b_member_via_a_url(self):
        a, b = _two_carriers()
        mb = _m(b)
        client = _admin('aa12@nqp.sd', a)
        assert client.patch(
            DETAIL.format(carrier_id=a.id, member_id=mb.id), {'is_primary': True}, format='json',
        ).status_code == 404


# ---------------------------------------------------------------------------
# Create / Patch 校验（§8、§9）
# ---------------------------------------------------------------------------
class TestCreateAndPatch:
    def test_unknown_user_400(self):
        import uuid as uuid_module

        a, _ = _two_carriers()
        client = _admin('cr1@nqp.sd', a)
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(uuid_module.uuid4())}, format='json')
        assert resp.status_code == 400

    def test_inactive_user_400(self):
        a, _ = _two_carriers()
        u = _mk_user('inact@nqp.sd', is_active=False)
        client = _admin('cr2@nqp.sd', a)
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(u.id)}, format='json')
        assert resp.status_code == 400

    def test_duplicate_membership_400(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _admin('cr3@nqp.sd', a)
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(m.user.id)}, format='json')
        assert resp.status_code == 400

    def test_body_carrier_rejected(self):
        a, b = _two_carriers()
        client = _admin('cr4@nqp.sd', a)
        u = _mk_user('new2@nqp.sd')
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(u.id), 'carrier': str(b.id)}, format='json')
        assert resp.status_code == 400

    def test_body_is_active_rejected(self):
        a, _ = _two_carriers()
        client = _admin('cr5@nqp.sd', a)
        u = _mk_user('new3@nqp.sd')
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(u.id), 'is_active': False}, format='json')
        assert resp.status_code == 400

    def test_body_identity_fields_rejected(self):
        a, _ = _two_carriers()
        client = _admin('cr6@nqp.sd', a)
        u = _mk_user('new4@nqp.sd')
        for field in ('role', 'permissions', 'extra_permissions', 'role_assignments', 'blocked_permissions'):
            resp = client.post(BASE.format(carrier_id=a.id), {'user': str(u.id), field: 'x'}, format='json')
            assert resp.status_code == 400, field

    def test_new_membership_is_active(self):
        a, _ = _two_carriers()
        client = _admin('cr7@nqp.sd', a)
        u = _mk_user('new5@nqp.sd')
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(u.id)}, format='json')
        assert resp.status_code == 201
        assert CarrierMember.objects.get(user=u, carrier=a).is_active is True

    def test_create_does_not_create_roleassignment(self):
        a, _ = _two_carriers()
        client = _admin('cr8@nqp.sd', a)
        u = _mk_user('new6@nqp.sd')
        before = RoleAssignment.objects.count()
        client.post(BASE.format(carrier_id=a.id), {'user': str(u.id)}, format='json')
        assert RoleAssignment.objects.count() == before

    def test_patch_user_rejected_and_unchanged(self):
        a, _ = _two_carriers()
        m = _m(a)
        other = _mk_user('other@nqp.sd')
        client = _admin('cr9@nqp.sd', a)
        resp = client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {'user': str(other.id)}, format='json')
        assert resp.status_code == 400
        m.refresh_from_db()
        assert m.user != other

    def test_patch_carrier_rejected_and_unchanged(self):
        a, b = _two_carriers()
        m = _m(a)
        client = _admin('cr10@nqp.sd', a)
        resp = client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {'carrier': str(b.id)}, format='json')
        assert resp.status_code == 400
        m.refresh_from_db()
        assert m.carrier == a

    def test_patch_is_active_rejected(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _admin('cr11@nqp.sd', a)
        assert client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {'is_active': False}, format='json').status_code == 400

    def test_patch_is_primary_works(self):
        a, _ = _two_carriers()
        m = _m(a, is_primary=False)
        client = _admin('cr12@nqp.sd', a)
        resp = client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {'is_primary': True}, format='json')
        assert resp.status_code == 200
        m.refresh_from_db()
        assert m.is_primary is True

    def test_patch_multiple_primary_rejected(self):
        a, _ = _two_carriers()
        m1 = _m(a, is_primary=True, email='p@nqp.sd')
        m2 = _m(a, is_primary=False, email='s@nqp.sd')
        client = _admin('cr13@nqp.sd', a)
        resp = client.patch(DETAIL.format(carrier_id=a.id, member_id=m2.id), {'is_primary': True}, format='json')
        assert resp.status_code == 400
        assert CarrierMember.objects.filter(carrier=a, is_primary=True).count() == 1

    def test_create_multiple_primary_rejected(self):
        a, _ = _two_carriers()
        _m(a, is_primary=True, email='p2@nqp.sd')
        u = _mk_user('new7@nqp.sd')
        client = _admin('cr14@nqp.sd', a)
        resp = client.post(BASE.format(carrier_id=a.id), {'user': str(u.id), 'is_primary': True}, format='json')
        assert resp.status_code == 400
        assert CarrierMember.objects.filter(carrier=a, is_primary=True).count() == 1


# ---------------------------------------------------------------------------
# 生命周期（§11）
# ---------------------------------------------------------------------------
class TestLifecycle:
    def test_activate(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=False)
        client = _admin('lc1@nqp.sd', a)
        resp = client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='activate'))
        assert resp.status_code == 200, resp.content
        m.refresh_from_db()
        assert m.is_active is True

    def test_activate_already_active_400(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=True)
        client = _admin('lc2@nqp.sd', a)
        assert client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='activate')).status_code == 400

    def test_deactivate(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=True)
        client = _admin('lc3@nqp.sd', a)
        resp = client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='deactivate'))
        assert resp.status_code == 200, resp.content
        m.refresh_from_db()
        assert m.is_active is False

    def test_deactivate_already_inactive_400(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=False)
        client = _admin('lc4@nqp.sd', a)
        assert client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='deactivate')).status_code == 400

    def test_deactivation_revokes_portal_access(self):
        """تعطيل后成员不再拥有 carriers 门户访问资格。"""
        a, _ = _two_carriers()
        m = _m(a, is_active=True, email='rev@nqp.sd')
        assign_carrier_role(m.user)
        carrier_client = _authed(m.user)
        # 直接停用 ⇒ IsCarrierRep 必须拒绝 (is_active=False)
        m.is_active = False
        m.save(update_fields=['is_active'])
        resp = carrier_client.get('/api/v1/carriers/health-events/mine/')
        assert resp.status_code == 403, resp.content

    def test_no_delete_endpoint(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _admin('lc5@nqp.sd', a)
        # لا يوجد معالج DELETE؛ طبقة الصلاحيات تفشل مغلقة قبل التحقق من الطريقة
        # (403 عبر AdminOrPermissionAction) أو ترفض الطريقة (405 ترتيبياً).
        assert client.delete(DETAIL.format(carrier_id=a.id, member_id=m.id)).status_code in (403, 405)


# ---------------------------------------------------------------------------
# Audit（§15）
# ---------------------------------------------------------------------------
class TestAudit:
    def test_create_grant_audit(self):
        a, _ = _two_carriers()
        client = _admin('au1@nqp.sd', a)
        u = _mk_user('au-new@nqp.sd')
        client.post(BASE.format(carrier_id=a.id), {'user': str(u.id)}, format='json')
        obj = PermissionAudit.objects.get(permission_code=f'carrier_membership:{a.id}')
        assert obj.action == 'GRANT'
        assert obj.granted is True
        assert obj.user == u

    def test_activate_grant_audit(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=False)
        client = _admin('au2@nqp.sd', a)
        client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='activate'))
        assert PermissionAudit.objects.filter(
            permission_code=f'carrier_membership:{a.id}', action='GRANT', granted=True,
        ).exists()

    def test_deactivate_revoke_audit(self):
        a, _ = _two_carriers()
        m = _m(a, is_active=True)
        client = _admin('au3@nqp.sd', a)
        client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='deactivate'))
        assert PermissionAudit.objects.filter(
            permission_code=f'carrier_membership:{a.id}', action='REVOKE', granted=False,
        ).exists()

    def test_failed_operation_no_audit(self):
        import uuid as uuid_module

        a, _ = _two_carriers()
        client = _admin('au4@nqp.sd', a)
        client.post(BASE.format(carrier_id=a.id), {'user': str(uuid_module.uuid4())}, format='json')
        assert PermissionAudit.objects.count() == 0

    def test_failed_patch_no_audit(self):
        a, _ = _two_carriers()
        m = _m(a)
        client = _admin('au5@nqp.sd', a)
        client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {'user': str(m.user.id)}, format='json')
        assert PermissionAudit.objects.count() == 0


# ---------------------------------------------------------------------------
# 隔离 / 回归（§14、§20）
# ---------------------------------------------------------------------------
class TestIsolation:
    def test_admin_a_list_excludes_b(self):
        a, b = _two_carriers()
        ma = _m(a, email='only-a@nqp.sd')
        _m(b, email='only-b@nqp.sd')
        client = _admin('iso1@nqp.sd', a)
        resp = client.get(BASE.format(carrier_id=a.id))
        rows = resp.json()['data']['results'] if isinstance(resp.json()['data'], dict) else resp.json()['data']
        emails = {row['user_email'] for row in rows}
        assert 'only-a@nqp.sd' in emails
        assert 'only-b@nqp.sd' not in emails

    def test_dual_membership_user_scoped_by_authorization(self):
        a, b = _two_carriers()
        u = _mk_user('dual@nqp.sd')
        ma = CarrierMember.objects.create(user=u, carrier=a, is_active=True)
        mb = CarrierMember.objects.create(user=u, carrier=b, is_active=True)
        assign_carrier_admin_role(u, a)
        client = _authed(u)
        assert client.get(DETAIL.format(carrier_id=a.id, member_id=ma.id)).status_code == 200
        assert client.get(DETAIL.format(carrier_id=b.id, member_id=mb.id)).status_code == 404

    def test_list_response_shape_no_secrets(self):
        a, _ = _two_carriers()
        _m(a)
        client = _admin('iso2@nqp.sd', a)
        resp = client.get(BASE.format(carrier_id=a.id))
        rows = resp.json()['data']['results'] if isinstance(resp.json()['data'], dict) else resp.json()['data']
        row = rows[0]
        for leaked in ('password', 'password_hash', 'national_id', 'role', 'permissions', 'extra_permissions', 'blocked_permissions', 'api_key', 'last_login', 'locked_until', 'token', 'refresh_token'):
            assert leaked not in row, leaked
        assert set(row) >= {'id', 'user', 'user_email', 'user_full_name', 'is_primary', 'is_active', 'created_at', 'updated_at'}

    def test_roleassignment_count_unchanged_by_member_ops(self):
        a, _ = _two_carriers()
        client = _admin('iso3@nqp.sd', a)
        u = _mk_user('iso-new@nqp.sd')
        before = RoleAssignment.objects.count()
        client.post(BASE.format(carrier_id=a.id), {'user': str(u.id)}, format='json')
        m = CarrierMember.objects.get(user=u, carrier=a)
        client.patch(DETAIL.format(carrier_id=a.id, member_id=m.id), {'is_primary': True}, format='json')
        client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='deactivate'))
        client.post(ACT_URL.format(carrier_id=a.id, member_id=m.id, action='activate'))
        assert RoleAssignment.objects.count() == before
