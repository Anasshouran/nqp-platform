"""D-M2-3: SECTOR/DEPARTMENT scoping."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_plain_user():
    return User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')


@pytest.mark.django_db
class TestSectorScoping:

    def test_plain_user_still_fail_safe(self):
        """user بلا أي scope → qs.none()."""
        client = APIClient()
        client.force_authenticate(user=_make_plain_user())
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code in (200, 403)
        if response.status_code == 200:
            data = response.json()
            items = data.get('data', []) if isinstance(data, dict) else data
            assert items == [], f"Fail-safe violated: plain user sees {len(items)}"

    def test_superuser_still_sees_all(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code == 200

    def test_sector_user_sees_own_sector_only(self):
        """SECTOR user يرى فقط وزارات قطاعه — D-M2-3 verification."""
        from apps.masterdata.models import (
            Sector as MasterdataSector, State, EntryPoint,
        )
        from apps.organization.models import Sector as OrgSector, Locality
        from apps.registry.models import StateMinistry
        from apps.accounts.models import Role, RoleAssignment

        uid = _uid()

        # --- Sector A (user's sector) ---
        md_a = MasterdataSector.objects.create(code=f'MD_A_{uid}', name_ar='نقل أ')
        org_a = OrgSector.objects.create(code=f'ORG_A_{uid}', name_ar='قطاع أ')
        state_a = State.objects.create(code=f'ST_A_{uid}', name_ar='ولاية أ', sector=md_a)
        loc_a = Locality.objects.create(code=f'LOC_A_{uid}', name_ar='محلية أ', sector=org_a)
        EntryPoint.objects.create(
            code=f'EP_A_{uid}', name_ar='منفذ أ',
            state=state_a, sector=org_a, locality=loc_a,
        )
        ministry_a = StateMinistry.objects.create(
            state=state_a, ministry_name_ar=f'وزارة أ {uid}',
        )

        # --- Sector B (other) ---
        md_b = MasterdataSector.objects.create(code=f'MD_B_{uid}', name_ar='نقل ب')
        org_b = OrgSector.objects.create(code=f'ORG_B_{uid}', name_ar='قطاع ب')
        state_b = State.objects.create(code=f'ST_B_{uid}', name_ar='ولاية ب', sector=md_b)
        ministry_b = StateMinistry.objects.create(
            state=state_b, ministry_name_ar=f'وزارة ب {uid}',
        )

        # --- user + SECTOR role assignment ---
        user = _make_plain_user()
        user.sector = org_a
        user.save()
        role = Role.objects.create(name=f'SECTOR_ROLE_{uid}')
        RoleAssignment.objects.create(
            user=user, role=role, scope_type='SECTOR', scope_id=org_a.id,
        )
        # منح صلاحية القراءة للدور
        from apps.accounts.models import Permission
        perm, _ = Permission.objects.get_or_create(
            code='ministry:view', defaults={'name': 'View Ministries', 'resource': 'ministry', 'action': 'view'}
        )
        role.permissions.add(perm)

        # --- Request as SECTOR user ---
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        # EnvelopeRenderer: {'status': ..., 'data': <payload>, 'message': ...}
        # Paginated: data might be {'results': [...], 'count': ...}
        inner = body.get('data', {}) if isinstance(body, dict) else body
        if isinstance(inner, dict) and 'results' in inner:
            items = inner['results']
        elif isinstance(inner, list):
            items = inner
        else:
            items = []
        ids = {str(item['id']) for item in items}

        assert str(ministry_a.id) in ids, (
            f"SECTOR scoping leak — own ministry {ministry_a.id} not visible. "
            f"Got ids: {ids}. "
            "Check: resolve_authorized_entry_points returns entry_points for SECTOR? "
            "Or _user_has_any_scope returns False?"
        )
        assert str(ministry_b.id) not in ids, (
            f"SECTOR scoping VIOLATION — other sector's ministry {ministry_b.id} visible! "
            f"Got ids: {ids}. This is a security bug — fix before commits."
        )
