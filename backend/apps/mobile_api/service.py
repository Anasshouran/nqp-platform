"""مشغّل المسار العملي لمساحة الجوال (M2-A).

الطبقة المسماة "علاقة" فقط لاستدعاء خدمات النطاق القائمة دون إعادة إنتاجها؛
لا يُكرَّر منطق أعمال موجود، ولا تُبنى عليه طبقات جديدة فوق /api/v1/mobile/ إلّا
بشكل مضبوط وموجّه للجوال (§5).
"""

from __future__ import annotations

from apps.carriers.models import HealthNotice
from apps.notifications.models import NotificationLog
from apps.vaccination.models import VaccinationCertificate
from django.utils import timezone

from .authentication import get_mobile_version, resolve_mobile_principal


def list_traveler_certificates(traveler):
    """شهادات تطعيم المسافر (SENSITIVE_HEALTH) — يملكها المسافر عبر traveler.user.

    لا تُضمَّن هنا أي بيانات تحقق/توقيع؛ صيغة التحقق تبقى closed (NG-04).
    """
    if traveler is None:
        return VaccinationCertificate.objects.none()
    return (
        VaccinationCertificate.objects.select_related('vaccine')
        .filter(traveler=traveler)
        .order_by('-issued_at')
    )


def list_requirements():
    """إسقاط المتطلبات للجوال — من مصدر اعتمادي حالي (HealthNotice) فقط.

    لا تُخترَع متطلبات؛ تُعرض الحقول المتوفرة فعلاً في المصدر، وتُترك
    الترجمة/الوصف غير المتوفرة فارغةً بدل كتابتها.
    """
    notices = HealthNotice.objects.filter(
        is_active=True,
        category__in=[
            HealthNotice.NoticeCategory.ENTRY_REQUIREMENTS,
            HealthNotice.NoticeCategory.EPIDEMIC_ALERT,
        ],
    ).order_by('-published_at')[:10]
    return notices


def list_user_notifications(user):
    """إشعارات مملوكة للمستخدم (لا إشعارات مؤسسية/متقاطعة)."""
    return NotificationLog.objects.filter(user=user).order_by('-created_at')


def count_unread(user):
    return NotificationLog.objects.filter(user=user, is_read=False).count()


def sync_status_payload():
    now = timezone.now()
    return {
        'server_time': now.isoformat(),
        'server_version': '1.0.0',
        'contract_version': get_mobile_version(),
        'unread_notifications': 0,  # يُستبدل لكل مسافر في view (بلا تنافس حالي)
    }