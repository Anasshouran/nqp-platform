"""جسر بين سجل المنافذ القديم (ports.Port — مهمل) وسجل منافذ الدخول الموحد (masterdata.EntryPoint).

كل الأنظمة تقرأ منافذها من masterdata.EntryPoint حصريًا؛ الربط بالقطاعات يتم عبر
`EntryPoint.sector` مباشرة.
"""
from apps.masterdata.models import EntryPoint


def sector_entry_points(sector):
    """منافذ الدخول النشطة المرتبطة بقطاع (organization.Sector) عبر الحقل المباشر `EntryPoint.sector`."""
    qs = EntryPoint.objects.filter(is_active=True)
    if sector is None:
        return qs.none()
    return qs.filter(sector=sector).order_by('order', 'name_ar')
