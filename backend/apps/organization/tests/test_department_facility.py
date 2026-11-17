"""اختبارات Department.facility FK — M1-addon.

يغطي السيناريوهات الأربعة:
1. إنشاء Department بدون facility (nullable).
2. إنشاء Department مرتبط بمنشأة + reverse relation.
3. حذف facility → SET_NULL.
4. FK إلى UUID غير موجود → IntegrityError.
"""
import uuid
import pytest
from django.db import IntegrityError

from apps.organization.models import Department
from apps.masterdata.models import HealthFacility


@pytest.mark.django_db
class TestDepartmentFacility:

    def test_create_department_without_facility(self):
        """Department يمكن إنشاؤه بدون facility (nullable)."""
        dept = Department.objects.create(
            code='TEST_DEPT_NULL_FAC',
            name_ar='إدارة اختبار بلا منشأة',
        )
        assert dept.facility is None
        assert dept.facility_id is None

    def test_create_department_with_facility(self):
        """Department مرتبط بمنشأة + reverse relation يعمل."""
        facility = HealthFacility.objects.create(
            code='TEST_FAC_X',
            name_ar='منشأة اختبار X',
        )
        dept = Department.objects.create(
            code='TEST_DEPT_WITH_FAC',
            name_ar='إدارة مرتبطة بمنشأة',
            facility=facility,
        )
        assert dept.facility_id == facility.id
        assert facility.departments.count() == 1
        assert facility.departments.first() == dept

    def test_set_null_on_facility_delete(self):
        """حذف facility → department.facility = None (SET_NULL)."""
        facility = HealthFacility.objects.create(
            code='TEST_FAC_Y',
            name_ar='منشأة اختبار Y',
        )
        dept = Department.objects.create(
            code='TEST_DEPT_SETNULL',
            name_ar='إدارة SET_NULL',
            facility=facility,
        )
        facility.delete()
        dept.refresh_from_db()
        assert dept.facility is None
        assert Department.objects.filter(pk=dept.pk).exists()  # لم يُحذف

    @pytest.mark.django_db(transaction=True)
    def test_reject_nonexistent_facility_id(self):
        """FK إلى UUID غير موجود → IntegrityError (حماية DB).

        يلزم transaction=True لأن Django's test runner يستخدم
        ترانزكشن خارجية؛ والتحقق من FK يحدث عند commitment.
        """
        from django.db import IntegrityError

        fake_id = uuid.uuid4()
        with pytest.raises(IntegrityError):
            Department.objects.create(
                code='TEST_DEPT_BAD_FK',
                name_ar='إدارة بمرجع خاطئ',
                facility_id=fake_id,
            )
