"""اختبارات FacilityOwner."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.registry.models import FacilityOwner

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


@pytest.mark.django_db
class TestFacilityOwnerModel:

    def test_create_owner(self):
        owner = FacilityOwner.objects.create(
            code=f'OWN_{_uid()}', name_ar='مالك', kind='STATE_MINISTRY',
        )
        assert owner.is_active is True
        assert owner.kind == 'STATE_MINISTRY'

    def test_owner_code_unique(self):
        code = f'UNIQ_{_uid()}'
        FacilityOwner.objects.create(code=code, name_ar='1', kind='PRIVATE')
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            FacilityOwner.objects.create(code=code, name_ar='2', kind='NGO')


@pytest.mark.django_db
class TestFacilityOwnerAPI:

    def test_list_owners_authenticated(self):
        FacilityOwner.objects.create(
            code=f'OWN_{_uid()}', name_ar='مالك', kind='PRIVATE',
        )
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/owners/')
        assert response.status_code == 200

    def test_create_owner_global(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/owners/', {
            'code': f'API_OWN_{_uid()}',
            'name_ar': 'مالك API',
            'kind': 'NGO',
        })
        assert response.status_code == 201, response.json()

    def test_create_owner_non_global_forbidden(self):
        user = User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post('/api/v1/registry/owners/', {
            'code': f'DENY_{_uid()}',
            'name_ar': 'x',
            'kind': 'PRIVATE',
        })
        assert response.status_code in (403, 401)

    def test_reference_id_validation(self):
        """D-M3-2-1: reference_id مع reference_type='StateMinistry' غير موجود → رفض."""
        from django.core.exceptions import ValidationError
        owner = FacilityOwner(
            code=f'REF_{_uid()}', name_ar='مرجع',
            kind='STATE_MINISTRY',
            reference_type='StateMinistry',
            reference_id=uuid.uuid4(),  # غير موجود
        )
        with pytest.raises((ValidationError, Exception)):
            owner.full_clean()

    def test_reference_id_valid(self):
        """reference_id صحيح → مقبول."""
        from apps.masterdata.models import (
            Sector as MasterdataSector, State,
        )
        from apps.registry.models import StateMinistry

        md = MasterdataSector.objects.create(code=f'MD_{_uid()}', name_ar='نقل')
        state = State.objects.create(code=f'ST_{_uid()}', name_ar='ولاية', sector=md)
        ministry = StateMinistry.objects.create(
            state=state, ministry_name_ar='وزارة',
        )
        owner = FacilityOwner(
            code=f'REF_OK_{_uid()}', name_ar='مرجع صحيح',
            kind='STATE_MINISTRY',
            reference_type='StateMinistry',
            reference_id=ministry.id,
        )
        owner.full_clean()  # لا استثناء
