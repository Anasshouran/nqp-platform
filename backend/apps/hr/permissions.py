"""بوابة وصول HR التي تدمج الإدارة والخدمة الذاتية.

موديولات HR (النقل، الحضور) تخدم مستخدمَين مختلفين بنفس المسار: موظف HR
يدير السجلات ضمن نطاقه، وموظف عادي يقرأ سجلاته هو فقط. `AdminOrPermissionAction`
ترفض الموظف العادي (لا يملك `hr_posting:view`) قبل أن يصل إلى منطق الخدمة
ذاتية، فهذه البوابة تحسم الأمر: إمّا صلاحية الإجراء المطلوب، وإمّا ملف
وظيفي — على أن يبقى الحصر في «طلباتي/سجلاتي» مفروضاً في `get_queryset`.

البوابة لا تعرف مورداً بعينه: تقرأ `permission_resource` من الـview، فتبقى
صالحة لأي موديول HR جديد بنفس القواعد.
"""

import logging

from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)


#: إجراء DRF → الإجراء المطلوب من مورد الـview. كل إجراء يُذكر صراحةً:
#: أي إجراء غير مدرج يُمنع (فاشل-آمن).
_ACTION_MAP = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
    'timeline': 'view',
    'logs': 'view',
    # تجميعات الموظف نفسه: لا تُحتاج `view` على نطاق HR كاملاً.
    'summary': 'view',
    'kpi_detail': 'view',
    # إجراءات دورة الحالة. `submit`/`cancel` كتابة لا قراءة فيتطلّبان
    # `edit` — من يملك `view` وحده يقرأ ولا يقدّم.
    'submit': 'edit',
    'cancel': 'edit',
    'approve': 'approve',
    'reject': 'reject',
    # `return_for_revision` و`close` قرار معتمد لا موظف؛ الخريطة تقرؤها
    # لمن يحمل الصلاحية، لكن الـviewsets تستخدم `PermissionAction` صريحاً
    # لهما فلا تصلان إلى فرع الخدمة الذاتية أصلاً.
    'return_for_revision': 'approve',
    'complete': 'edit',
    'open': 'approve',
    'close': 'approve',
}

#: إجراءات تختلف صلاحيتها بين القراءة والكتابة: `kpis` تُقرأ بـ`view`
#: وتُكتب بـ`edit`. الخريطة أعلاه تعطي القراءة، وهذه تعطي الكتابة.
_METHOD_OVERRIDE = {
    'kpis': {'POST': 'edit', 'PUT': 'edit', 'PATCH': 'edit', 'DELETE': 'edit'},
    'kpi_detail': {'PUT': 'edit', 'PATCH': 'edit', 'DELETE': 'edit'},
}

#: الإجراءات التي لا تُفتح للخدمة الذاتية أبداً: الاعتماد والرفض والحذف.
#: المعتمد لا يعتمد نفسه، فلا معنى لمنح الموظف حق الاعتماد على سجل رفعه.
_SELF_SERVICE_DENIED = {'approve', 'reject', 'destroy', 'unapprove'}


class HrScopedAccessPermission(BasePermission):
    """إدارة HR أو خدمة ذاتية محدودة لصاحب الملف.

    الإدارة: تحتاج صلاحية الإجراء المقابل. الخدمة الذاتية: يكفي أن يكون
    الموظف مسجَّلاً وله ملف وظيفي، على أن يبقى محصوراً في سجلاته (قيد
    مفروض في `get_queryset` لا هنا).
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        required = _ACTION_MAP.get(action)
        override = _METHOD_OVERRIDE.get(action, {}).get(
            getattr(request, 'method', 'GET'),
        )
        if override:
            required = override
        if required is None:
            # لا صمت: إجراء غير مُعرَّف يُرفض، ويُسجَّل ليُكتشف.
            logger.warning(
                'HrScopedAccessPermission: unmapped action %r - DENYING for %s',
                action, user,
            )
            return False
        if user.is_superuser or user.is_staff:
            return True
        if action in _SELF_SERVICE_DENIED:
            # هذه الإجراءات لا تُفتح للخدمة الذاتية، وتبقى لمن يحمل
            # الصلاحية فقط. ملاحظة: الاسم هنا هو *إجراء DRF*، فنقرأ
            # الصلاحية من الخريطة لا من اسم الإجراء — `destroy` يقابل
            # الصلاحية `delete` لا `hr_attendance:destroy` (وهو غير
            # موجود أصلاً، فكان الفحص يرفض HR_MANAGER خطأً).
            return user.can(f'{view.permission_resource}:{required}')
        if user.can(f'{view.permission_resource}:{required}'):
            return True
        # خدمة ذاتية
        try:
            return hasattr(user, 'profile')
        except Exception:
            logger.exception('HrScopedAccessPermission failed to read profile - DENYING')
            return False


def actor_has_hr_admin_access(user, resource):
    """هل يملك المستخدم صلاحية إدارية (قراءة أو كتابة) على مورد HR؟

    يميّز موظف HR عن الموظف العادي. لازم لأن `user_within_hr_scope` ليست
    فاصلاً: الموظف العادي له نطاقه المنظّم (قسمه)، فيرى زملاءه —
    وقراءةُ الزميل لا تعني تفويضاً بإنشاء طلبات نيابةً عنه.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    return any(
        user.can(f'{resource}:{action}')
        for action in ('view', 'add', 'edit', 'delete')
    )
