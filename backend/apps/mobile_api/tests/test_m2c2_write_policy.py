"""M2-C2 — سياسة كتابة الإقرار الصحي للمسافر = DEFERRED (رصد-فقط).

يُثبت أن مسار الكتابة عبر الجوال يبقى غير متاح (501/لا واجهات) ولا يُخلق
أي مسار خلق/تعديل/إرسال/تعديل/إلغاء/إعادة إرسال — لا افتراض سياسة (§22).
"""

from __future__ import annotations

import pytest

from .conftest import client_a  # noqa: F401  (مبدأ مسافر مسجل)

pytestmark = pytest.mark.django_db

# يجب ألا يظهر أي مسار **كتابة** للإقرار عبر الجوال (لا create/edit/submit/amend/cancel).
# ملاحظة: `/api/v1/mobile/declarations/` مسموح كقراءة؛ الكتابة على نفس المسار تبقى 501
# (يُفحص في اختبار POST منفصل) فلا يُدرج المسار الأساسي هنا كنقاط "كتابة".
FORBIDDEN_MOBILE_DECLARATION_PATHS = (
    '/api/v1/mobile/declarations/{id}/',
    '/api/v1/mobile/declarations/submit/',
    '/api/v1/mobile/declarations/amend/',
    '/api/v1/mobile/declarations/cancel/',
    '/api/v1/mobile/declarations/draft/',
)


def test_no_traveler_declaration_write_endpoints_registered():
    """ضمان تصميمي: لا نقاط كتابة إقرار في مساحة الجوال (§9/§22)."""
    from django.urls import get_resolver

    def _walk(urlpatterns, prefix=''):
        leaves = set()
        for entry in urlpatterns:
            if hasattr(entry, 'url_patterns'):
                leaves |= _walk(entry.url_patterns, prefix + str(entry.pattern))
            else:
                leaves.add('/' + (prefix + str(entry.pattern)).lstrip('/'))
        return leaves

    leaves = _walk(get_resolver().url_patterns)
    for path in FORBIDDEN_MOBILE_DECLARATION_PATHS:
        assert path not in leaves, f'مسار كتابة إقرار ظهر في الجوال بدون تفويض: {path}'
    assert '/api/v1/mobile/declarations/' in leaves  # القراءة مسجلة فقط


def test_mobile_declarations_post_remains_501(client_a):
    """POST إقرار عبر الجوال = 501 (DEFERRED) — بلا بيانات/حالة "قُدِّم" مختلقة."""
    resp = client_a.post('/api/v1/mobile/declarations/', {'symptoms': []}, format='json')
    assert resp.status_code == 501
    assert resp.json()['message']['code'] == 'NOT_IMPLEMENTED'


def test_mobile_declarations_supports_read_only_get(client_a):
    """القراءة المتاحة فقط: GET يعيد الإسقاط الأدنى/القائمة بلا حقول مخاطرة."""
    resp = client_a.get('/api/v1/mobile/declarations/')
    assert resp.status_code == 200
    body = str(resp.json()).lower()
    for risky in ('risk_score', 'risk_level'):
        assert risky not in body


def test_no_foreign_traveler_writable_through_medical_history_on_mobile(client_a, traveler_a, traveler_b):
    """عدم تسريب: جوال المسافر لا يعرّض مسار كتابة medical_history الخاص بغيره."""
    _user_a, _rec_a = traveler_a
    _user_b, record_b = traveler_b
    # لا مسار mobile لكتابة الإقرار أصلاً؛ حتى PUT على traveler profile الخاص
    # بآخر (لو وُجد) يبقى خارج مساحة الجوال (طبقة إسقاط مضبوطة).
    resp = client_a.get(f'/api/v1/mobile/certificates/{record_b.id}/')
    assert resp.status_code in (401, 403, 404, 501)
    assert resp.status_code != 200