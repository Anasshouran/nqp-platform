"""حدود مصادقة الجوال — مزوّد-محايد (§6).

M2-A: النقل ممكَّن عبر مصادقة NQP الحالية (JWT + حساب مسافر).
SUDAPASS مؤجَّل صراحةً: لا تنفيذ، لا mock، لا افتراضات — مجرد درز مُوثَّق
حتى تتوفر المواصفات الرسمية (Q8). لا يُكتب أي مسار SUDAPASS هنا.

ملاحظة 1.5: هذا الوحدة لا تُغيّر مصادقة الموظفين/المؤسسات؛ تلك تبقى على
RBAC القائم (PermissionAction/HasApiKey) ومستقلة تماماً.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from django.conf import settings
from rest_framework.request import Request

from apps.travelers.models import Traveler


@dataclass(frozen=True)
class MobilePrincipal:
    """هوية جوال مُستنتَجة على الخادم فقط — لا يُصدَّق أبداً owner id من العميل."""

    user: object
    traveler: "Traveler | None"


class MobileAuthenticationProvider(Protocol):
    """عقد مزوّدي هوية الجوال.

    واجهة واحدة تكفي لإضافة مزوّد مستقبلي (SUDAPASS) دون إعادة كتابة
    منطق أعمال الجوال — تقع مسؤولية "من هو هذا المبدأ" على الخادم حصراً.
    """

    def resolve(self, request: Request) -> MobilePrincipal: ...


class JwtTravelerProvider:
    """المزوّد الحالي: مبدأ JWT عبر مصادقة NQP القائمة (national-ID/…).

    لا يُنشئ هوية من العميل؛ يستقي المبدأ من المستخدم المُصادَق عليه في الطلب
    ويربط حساب المسافر عبر علاقة الملكية (Traveler.user).
    """

    name = 'nqp_jwt'

    def resolve(self, request: Request) -> MobilePrincipal:
        user = request.user
        if not user or user.is_anonymous:
            from rest_framework.exceptions import NotAuthenticated

            raise NotAuthenticated()
        traveler = (
            Traveler.objects.select_related('nationality')
            .filter(user=user)
            .order_by('-created_at')
            .first()
        )
        return MobilePrincipal(user=user, traveler=traveler)


class SudapassProvider:
    """درز SUDAPASS (مؤجَّل): غير متاح — لن يُنشأ عميل SUDAPASS وهمي."""

    name = 'sudapass'

    def resolve(self, request: Request) -> MobilePrincipal:  # pragma: no cover — seam only
        from rest_framework.exceptions import APIException

        raise APIException(
            'SUDAPASS_IMPLEMENTATION',
        )


def resolve_mobile_principal(request: Request) -> MobilePrincipal:
    """نقطة الدخول الموحّدة لاستخراج مبدأ الجوال في كل view (حدود SUDAPASS لاحقة)."""
    return JwtTravelerProvider().resolve(request)


def get_mobile_version() -> str:
    return getattr(settings, 'AFYATNA_MOBILE_CONTRACT_VERSION', 'v1')