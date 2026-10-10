import time

from django.core.cache import cache
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework.exceptions import AuthenticationFailed, Throttled
from rest_framework.permissions import BasePermission

from .models import Carrier, CarrierMember

# ---------------------------------------------------------------------------
# M8-B.2: نطاق إدارة أعضاء شركات النقل
# ---------------------------------------------------------------------------
# مصدر النطاق هو تفويض صريح فقط: تعيين دور بنطاق `COMPANY` على مورد
# `carrier_members`. الاتجاه صارم:
#
#     RoleAssignment(COMPANY) ──► CarrierMember management
#     CarrierMember ──► بوابة الناقل فقط (لا إدارة)
#
# لا تُستخدم هنا `resolve_user_company_ids` ولا `resolve_combined_scope_ids`:
# كليهما يعتمد `has_global_scope` (أي تعيين GLOBAL نشط) فيعامّلان كـ«بلا تقييد»
# — ودور `CARRIER` مبذور بنطاق GLOBAL، فأيٌّ منهما كان سيمنح نطاقاً مفتوحاً.
# كما أن `resolve_combined_scope_ids` يوسّع النطاق بعضويات المستخدم، وهو عكس
# المطلوب هنا: عضوية الشركة B لا تمنح إدارةَ B.
#
# `GLOBAL` على `CARRIER_ADMIN` لا يجعله مديراً قومياً: الإسناد العام يُتجاهل
# عمداً، ويبقى الفاعل على نطاقه الـCOMPANY فقط.

CARRIER_MEMBERS_RESOURCE = 'carrier_members'


def manageable_carrier_ids(user):
    """معرّفات الشركات التي يحق للمستخدم إدارة أعضائها.

    يعيد:
      * ``None``  → الفاعل على المستوى الوطني/المنصّة (إدارة بلا تقييد).
        محجوز لـ`is_superuser`/`is_staff` وهي بوابة الوصول الإدارية القائمة
        (M8-S). لا تُشتق من أي صلاحية منح ولا من `CarrierMember`.
      * ``set()`` → لا شيء قابل للإدارة (فشل آمن: كل رابط.company يُعطى 404).
      * ``set``  → معرّفات ``Carrier.id`` من تعيينات `COMPANY` النشطة فقط.
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return set()
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return None
    from apps.accounts.models import ScopeType

    return {
        scope['scope_id']
        for scope in user.active_scopes(CARRIER_MEMBERS_RESOURCE)
        if scope['scope_type'] == ScopeType.COMPANY and scope['scope_id']
    }


class IsCarrierRep(BasePermission):
    """صلاحية ممثل شركة النقل (عضو نشط في شركة نقل)."""

    message = 'المستخدم ليس ممثلاً لشركة نقل مسجلة.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        return CarrierMember.objects.filter(user=user, is_active=True).exists()

    def get_carrier(self, request):
        member = getattr(request, 'carrier_member', None)
        if member is None:
            member = CarrierMember.objects.filter(
                user=request.user, is_active=True
            ).select_related('carrier').first()
            request.carrier_member = member
        return member.carrier if member else None


class HasApiKey(BasePermission):
    """مصادقة التكامل عبر مفتاح API برأس `X-API-Key`.

    يتحقق من المفتاح، ثم يطبّق قيود البوابة المعلنة على الشركة:
    الصلاحيات (api_scopes) وعناوين IP المسموحة وحدود معدل الطلبات
    (اللحظية واليومية) المخزنة في Django Cache (Redis عند تفعيله).
    """

    message = 'مفتاح API غير صحيح أو منتهي.'
    default_scope = 'flights'

    def has_permission(self, request, view):
        key = request.headers.get('X-API-Key')
        if not key:
            raise AuthenticationFailed(self.message)
        hashed = Carrier.hash_key(key)
        carrier = Carrier.objects.filter(api_key=hashed, is_active=True).first()
        if not carrier or not constant_time_compare(hashed, carrier.api_key or ''):
            raise AuthenticationFailed(self.message)
        request.carrier = carrier

        required_scope = getattr(view, 'required_scope', self.default_scope)
        if carrier.api_scopes and required_scope not in carrier.api_scopes:
            request.scope_denied = required_scope
            raise AuthenticationFailed(f'الصلاحية {required_scope} غير مفعّلة لهذه الشركة.')

        allowed = [ip.strip() for ip in (carrier.allowed_ips or []) if ip.strip()]
        if allowed:
            ip = request.META.get('REMOTE_ADDR') or ''
            if ip and ip not in allowed:
                raise AuthenticationFailed('عنوان IP غير مسموح به في بوابة التكامل.')

        if self._is_rate_limited(carrier):
            raise Throttled(detail='تجاوز حد الطلبات المسموح — حاول لاحقاً.')

        carrier.last_api_use_at = timezone.now()
        ip = request.META.get('REMOTE_ADDR')
        if ip:
            carrier.last_api_use_ip = ip
        carrier.save(update_fields=['last_api_use_at', 'last_api_use_ip', 'updated_at'])
        return True

    @staticmethod
    def _is_rate_limited(carrier):
        now = timezone.now()
        minute_key = f'nqp:rl:{carrier.id}:min:{int(time.time() // 60)}'
        day_key = f'nqp:rl:{carrier.id}:day:{now.date().isoformat()}'
        minute_count = cache.get_or_set(minute_key, 0, timeout=90)
        day_count = cache.get_or_set(day_key, 0, timeout=86400)
        if minute_count >= carrier.rate_limit_per_minute or day_count >= carrier.rate_limit_daily:
            return True
        cache.incr(minute_key)
        cache.incr(day_key)
        return False