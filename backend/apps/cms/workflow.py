"""دورة حياة محتوى CMS: انتقالات الحالة واستحقاق الأدوار.

يُفسَّر النطاق القائم (DRAFT/REVIEW/APPROVED/PUBLISHED/ARCHIVED) وفق نموذج
اقتراح إدارة محتوى قطاع الخرطوم: مسودة → قيد المراجعة → معتمد → منشور → مؤرشف.
REVIEW يمثّل "قيد المراجعة/قيد الاعتماد"، و DRAFT يشمل "مسودة/جاهزة للإرسال".
"""

from .models import ContentStatus

CONTRIBUTOR_CODES = ('SECTOR_CONTENT_CONTRIBUTOR',)
EDITOR_CODES = ('SECTOR_CONTENT_EDITOR', 'SECTOR_CONTENT_CONTRIBUTOR')
REVIEWER_CODES = ('SECTOR_CONTENT_REVIEWER',)
APPROVER_CODES = (
    'SECTOR_CONTENT_APPROVER',
    'NATIONAL_CONTENT_ADMIN',
    'SECTOR_MANAGER',
    'SECTOR_HEAD',
    'ADMIN',
)

# خريطة (من-support → إلى) : اسم الإجراء
TRANSITION_ACTIONS = {
    (ContentStatus.DRAFT, ContentStatus.REVIEW): 'submit',
    (ContentStatus.REVIEW, ContentStatus.DRAFT): 'reject',
    (ContentStatus.REVIEW, ContentStatus.APPROVED): 'approve',
    (ContentStatus.APPROVED, ContentStatus.PUBLISHED): 'publish',
    (ContentStatus.APPROVED, ContentStatus.ARCHIVED): 'archive',
    (ContentStatus.PUBLISHED, ContentStatus.ARCHIVED): 'archive',
    (ContentStatus.REVIEW, ContentStatus.ARCHIVED): 'archive',
}

ACTION_ROLES = {
    'submit': {'writer'},
    'reject': {'reviewer', 'approver'},
    'approve': {'reviewer', 'approver'},
    'publish': {'approver'},
    'archive': {'approver'},
}


def _active_role_codes(user):
    from apps.accounts.models import RoleAssignment

    if not user or user.is_anonymous:
        return set()
    return set(
        RoleAssignment.objects.filter(user=user, is_active=True)
        .values_list('role__code', flat=True)
    )


def content_role(user):
    """يرجع المستوى الفعّال لدور المحتوى: writer / reviewer / approver أو None.

    - staff/superuser → approver (إشراف قومي).
    - الأدوار الإشرافية القائمة (SECTOR_MANAGER/SECTOR_HEAD/ADMIN) → approver.
    - NATIONAL_CONTENT_ADMIN/SECTOR_CONTENT_APPROVER → approver.
    - SECTOR_CONTENT_REVIEWER → reviewer.
    - SECTOR_CONTENT_EDITOR / SECTOR_CONTENT_CONTRIBUTOR → writer.
    """
    if not user or user.is_anonymous:
        return None
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return 'approver'
    codes = _active_role_codes(user)
    if codes & {'NATIONAL_CONTENT_ADMIN', 'SECTOR_CONTENT_APPROVER', 'SECTOR_MANAGER', 'SECTOR_HEAD', 'ADMIN'}:
        return 'approver'
    if codes & {'SECTOR_CONTENT_REVIEWER'}:
        return 'reviewer'
    if codes & {'SECTOR_CONTENT_EDITOR', 'SECTOR_CONTENT_CONTRIBUTOR'}:
        return 'writer'
    return None


def can_perform(user, action):
    role = content_role(user)
    return role is not None and role in ACTION_ROLES.get(action, set())


def transition_action_for(from_status, to_status):
    """اسم الإجراء المقابل لانتقال معيّن، أو None إذا كان غير قانوني."""
    return TRANSITION_ACTIONS.get((from_status, to_status))


def display_name(user):
    full = getattr(user, 'full_name', '') or ''
    if full.strip():
        return full.strip()
    return getattr(user, 'email', '') or getattr(user, 'username', '') or str(user.pk or '')


def apply_action(instance, action, user):
    """ينفّذ الانتقال على المثيل (بعد التحقق من الاستحقاق في المتصل) ويعيده."""
    from django.utils import timezone

    from .models import ContentStatus as CS

    name = display_name(user)
    if action == 'submit':
        instance.status = CS.REVIEW
        if not instance.author:
            instance.author = name
    elif action == 'reject':
        instance.status = CS.DRAFT
        instance.reviewer = ''
    elif action == 'approve':
        instance.status = CS.APPROVED
        instance.reviewer = name
    elif action == 'publish':
        instance.status = CS.PUBLISHED
        instance.is_published = True
        instance.approver = name
        instance.published_at = timezone.now()
    elif action == 'archive':
        instance.status = CS.ARCHIVED
        instance.is_published = False
    return instance