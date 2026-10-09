"""نقاط نهاية ``/api/v1/mobile/`` — تنفيذ M2-A (طبقة إسقاط مضبوطة للجوال).

السلوك:
* كل استجابة موجهة للجوال صراحةً (لا تسريب ViewSet سرملاً — §5).
* الملكية مستنتجة من المبدأ المُصادَق عليه على الخادم فقط (§7) —
  لا owner id/traveler id من العميل إطلاقاً.
* التصنيف عبر ``classification.py``؛ حظر INTERNAL/SECURITY_SENSITIVE غير
  المعتمدة (§10).
* SUDAPASS مؤجَّل (§0): auth/login و auth/refresh و trips/ و declarations POST
  تبقى 501 بربط مسوّغ لكل استثناء.

الفجوات الموثقة (لا اختلاق):
  * auth/* : SUDAPASS = BLOCKED (Q8)؛ مسار الجوال الوطني JWT قائم في /api/v1/auth/*.
  * trips/* : لا يوجد نموذج رحلات مملوك للمسافر موحّد حتى الآن (D-P1-1) — نقص نطاق.
  * declarations POST: تدفق تقديم الإقرار عبر الجوال غير معتمد بعد (مزامنة M2-C).
"""

from __future__ import annotations

from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .authentication import resolve_mobile_principal
from .envelope import MobileAPIView, error_payload
from .serializers import (
    MobileAuthLoginResponseSerializer,
    MobileAuthRefreshResponseSerializer,
    MobileCertificateList,
    MobileCertificateSerializer,
    MobileDeclarationList,
    MobileDeclarationSerializer,
    MobileErrorEnvelope,
    MobileNotificationList,
    MobileNotificationSerializer,
    MobileProfileEnvelope,
    MobileRequirementList,
    MobileRequirementSerializer,
    MobileSyncStatusSerializer,
    MobileTripList,
    MobileTripSerializer,
)
from .service import (
    count_unread,
    list_requirements,
    list_traveler_certificates,
    list_user_notifications,
    sync_status_payload,
)

MOBILE_TAG = 'mobile'

_NOT_IMPLEMENTED_DESC = (
    'Not Implemented — مؤجَّل بربط مسوّغ موثق (SUDAPASS/Q8 أو نقص نموذج نطاق).'
)

PROFILE_SOURCE_KEYS = ('id', 'full_name', 'email', 'phone', 'national_id', 'user_type')


def _not_implemented_response() -> dict:
    return {501: OpenApiResponse(response=MobileErrorEnvelope, description=_NOT_IMPLEMENTED_DESC)}


def _profile_payload(principal):
    traveler, user = principal.traveler, principal.user
    return {
        'id': str(traveler.id if traveler else user.id),
        'full_name': traveler.full_name if traveler else getattr(user, 'full_name', ''),
        'email': (traveler.email or '') if traveler else (getattr(user, 'email', '') or ''),
        'phone': (traveler.phone or '') if traveler else (getattr(user, 'phone', '') or ''),
        'national_id': getattr(user, 'national_id', '') or '',
        'user_type': getattr(user, 'user_type', '') or '',
    }


def _certificate_payload(cert):
    return {
        'id': str(cert.id),
        'certificate_number': cert.certificate_number,
        'vaccine_name': cert.vaccine.name_ar if getattr(cert, 'vaccine_id', None) and cert.vaccine else '',
        'issued_at': cert.issued_at.isoformat(),
        'valid_until': cert.valid_until.isoformat(),
        'status': cert.effective_status,
    }


def _requirement_payload(notice):
    published = notice.published_at
    return {
        'code': str(notice.id),
        'title_ar': notice.title,
        'title_en': '',
        'description_ar': notice.description,
        'priority': notice.priority,
        'category': notice.category,
        'effective_from': published.date().isoformat() if published else None,
        'effective_until': notice.expiry_date.isoformat() if notice.expiry_date else None,
        'published_at': published.isoformat() if published else None,
    }


def _declaration_payload(traveler):
    medical = traveler.medical_history or {}
    declaration = medical.get('health_declaration') or {}
    declared = bool(declaration)
    symptoms = declaration.get('symptoms') or []
    if isinstance(symptoms, dict):
        symptoms = list(symptoms.keys())
    return {
        'id': str(traveler.id),
        'status': declaration.get('status') or ('DECLARED' if declared else ''),
        'declared': declared,
        'symptoms': [str(s) for s in symptoms],
        'submitted_at': declaration.get('submitted_at') or None,
    }


def _notification_payload(entry):
    def _iso(value):
        return value.isoformat() if value else None

    return {
        'id': str(entry.id),
        'channel': entry.channel,
        'status': entry.status,
        'subject': entry.subject,
        'is_read': entry.is_read,
        'read_at': _iso(entry.read_at),
        'sent_at': _iso(entry.sent_at),
        'created_at': _iso(entry.created_at),
    }


# --------------------------------------------------------------------------- #
# auth — مؤجَّل (SUDAPASS Q8)؛ مسار JWT الوطني القائم في /api/v1/auth/*
# --------------------------------------------------------------------------- #
class MobileAuthLoginView(MobileAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-auth'],
        request=None,
        responses={
            200: OpenApiResponse(response=MobileAuthLoginResponseSerializer, description='تسجيل دخول المسافر'),
            **_not_implemented_response(),
        },
        description='دخول المسافر — SUDAPASS (D-P0-1) مؤجَّل: SUDAPASS_IMPLEMENTATION = BLOCKED (Q8).',
    )
    def post(self, request, *args, **kwargs):
        return self.not_implemented()


class MobileAuthRefreshView(MobileAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-auth'],
        request=None,
        responses={
            200: OpenApiResponse(response=MobileAuthRefreshResponseSerializer, description='تجديد رمز الوصول'),
            **_not_implemented_response(),
        },
        description='تجديد رمز الوصول — مؤجَّل مع مسار SUDAPASS (Q8).',
    )
    def post(self, request, *args, **kwargs):
        return self.not_implemented()


# --------------------------------------------------------------------------- #
# profile
# --------------------------------------------------------------------------- #
class MobileProfileView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-profile'],
        responses={
            200: OpenApiResponse(response=MobileProfileEnvelope, description='الملف الشخصي للمسافر'),
        },
        description='الملف الشخصي — الملكية من المبدأ المُصادَق عليه فقط.',
    )
    def get(self, request, *args, **kwargs):
        principal = resolve_mobile_principal(request)
        return Response({'status': 'success', 'data': _profile_payload(principal), 'message': None})


# --------------------------------------------------------------------------- #
# trips — فجوة موثقة: لا نموذج رحلات مملوك للمسافر بعد (D-P1-1)
# --------------------------------------------------------------------------- #
class MobileTripsView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-trips'],
        responses={
            200: OpenApiResponse(response=MobileTripList, description='رحلات المسافر'),
            **_not_implemented_response(),
        },
        description=(
            'فجوة نطاق موثقة: الرحلات مجزأة (carriers/port_health/borders_health) ولا يوجد '
            'نموذج موحّد مملوك للمسافر بعد (D-P1-1). يبقى 501 حتى تتكامل الواجهة.'
        ),
    )
    def get(self, request, *args, **kwargs):
        return self.not_implemented()


class MobileTripDetailView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-trips'],
        responses={
            200: OpenApiResponse(response=MobileTripSerializer, description='تفاصيل الرحلة'),
            **_not_implemented_response(),
        },
        description='فجوة نطاق موثقة مثل القائمة (D-P1-1).',
    )
    def get(self, request, pk=None, *args, **kwargs):
        return self.not_implemented()


# --------------------------------------------------------------------------- #
# requirements — إسقاط من HealthNotice (مصدر اعتمادي) بلا اختلاق
# --------------------------------------------------------------------------- #
class MobileRequirementsView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-requirements'],
        responses={
            200: OpenApiResponse(response=MobileRequirementList, description='متطلبات السفر المطبَّقة'),
        },
        description='إسقاط HealthNotice فقط؛ لا تُبتكر متطلبات ولا ترجمات.',
    )
    def get(self, request, *args, **kwargs):
        data = [_requirement_payload(n) for n in list_requirements()]
        return Response({'status': 'success', 'data': data, 'message': None})


# --------------------------------------------------------------------------- #
# certificates — مملوك للمسافر، التحقق يبقى fail-closed
# --------------------------------------------------------------------------- #
class MobileCertificatesView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-certificates'],
        responses={
            200: OpenApiResponse(response=MobileCertificateList, description='شهادات التطعيم'),
        },
        description='شهادات المسافر الخاصة فقط (SENSITIVE_HEALTH) — بلا أدوات تحقق هنا.',
    )
    def get(self, request, *args, **kwargs):
        principal = resolve_mobile_principal(request)
        certs = list_traveler_certificates(principal.traveler)
        data = [_certificate_payload(c) for c in certs]
        return Response({'status': 'success', 'data': data, 'message': None})


class MobileCertificateDetailView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-certificates'],
        responses={
            200: OpenApiResponse(response=MobileCertificateSerializer, description='شهادة واحدة'),
            404: OpenApiResponse(response=MobileErrorEnvelope, description='غير مملوكة/غير موجودة (إخفاء)'),
        },
        description='تفاصيل شهادة مملوكة فقط؛ غير المملوكة → 404 (لا تأكيد وجود).',
    )
    def get(self, request, pk=None, *args, **kwargs):
        principal = resolve_mobile_principal(request)
        cert = list_traveler_certificates(principal.traveler).filter(id=pk).first()
        if cert is None:
            raise NotFound()
        return Response({'status': 'success', 'data': _certificate_payload(cert), 'message': None})


# --------------------------------------------------------------------------- #
# declarations — قراءة الإسقاط الأدنى للمسافر؛ الكتابة مؤجَّلة (فجوة موثقة)
# --------------------------------------------------------------------------- #
class MobileDeclarationsView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-declarations'],
        responses={
            200: OpenApiResponse(response=MobileDeclarationList, description='سجل الإقرار الأدنى'),
        },
        description=(
            'إسقاط أدنى لإقرار المسافر الصحي — يستبعد risk_score/risk_level والبيانات الداخلية (§8.3).'
        ),
    )
    def get(self, request, *args, **kwargs):
        principal = resolve_mobile_principal(request)
        if principal.traveler is None:
            data = []
        else:
            data = [_declaration_payload(principal.traveler)]
        return Response({'status': 'success', 'data': data, 'message': None})

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-declarations'],
        request=None,
        responses={
            201: OpenApiResponse(response=MobileDeclarationSerializer, description='قُبل للطابور'),
            **_not_implemented_response(),
        },
        description='فجوة معتمدة: تدفق تقديم إقرار الجوال غير معتمد بعد (مزامنة M2-C) — 501.',
    )
    def post(self, request, *args, **kwargs):
        return self.not_implemented()


# --------------------------------------------------------------------------- #
# notifications (new in M2-A) — مملوك للمستخدم، بلا تسريب نص/مستلم
# --------------------------------------------------------------------------- #
class MobileNotificationsView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-notifications'],
        responses={
            200: OpenApiResponse(response=MobileNotificationList, description='إشعارات المستخدم'),
        },
        description='إشعارات مملوكة للمستخدم فقط — لا إشعارات مؤسسية ولا مستلم/نص داخلي.',
    )
    def get(self, request, *args, **kwargs):
        principal = resolve_mobile_principal(request)
        entries = list_user_notifications(principal.user)
        data = [_notification_payload(e) for e in entries]
        return Response({'status': 'success', 'data': data, 'message': None})


class MobileNotificationReadView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-notifications'],
        request=None,
        responses={
            200: OpenApiResponse(response=MobileNotificationSerializer, description='إشعار محدَّث (read)'),
            404: OpenApiResponse(response=MobileErrorEnvelope, description='غير مملوك/غير موجود'),
        },
        description='تحديد قراءة — الطابع الزمني خادم موثوق (+read_at).',
    )
    def patch(self, request, pk=None, *args, **kwargs):
        principal = resolve_mobile_principal(request)
        entry = list_user_notifications(principal.user).filter(id=pk).first()
        if entry is None:
            raise NotFound()
        if not entry.is_read:
            entry.is_read = True
            entry.read_at = timezone.now()
            entry.save(update_fields=['is_read', 'read_at'])
        return Response({'status': 'success', 'data': _notification_payload(entry), 'message': None})


# --------------------------------------------------------------------------- #
# sync/status — بيانات خادم موثوقة (بدون جعل كاش العميل سلطة)
# --------------------------------------------------------------------------- #
class MobileSyncStatusView(MobileAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=[MOBILE_TAG, 'mobile-sync'],
        responses={
            200: OpenApiResponse(response=MobileSyncStatusSerializer, description='حالة المزامنة'),
        },
        description='حالة/وقت/إصدار عقد الخادم — الخادم مرجعي (phase-09).',
    )
    def get(self, request, *args, **kwargs):
        principal = resolve_mobile_principal(request)
        payload = sync_status_payload()
        payload['unread_notifications'] = count_unread(principal.user)
        return Response({'status': 'success', 'data': payload, 'message': None})