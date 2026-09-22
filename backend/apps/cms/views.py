from django.http import FileResponse
from django.db import models
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAdminUser
from rest_framework.response import Response

from apps.organization.models import Sector
from core.permissions import IsAdmin
from core.utils.response import success_response
from core.utils.scoping import resolve_user_sector

from .workflow import (
    TRANSITION_ACTIONS,
    apply_action,
    can_perform,
    content_role,
    transition_action_for,
)

from uuid import UUID as _UUID

from .models import (
    Announcement,
    Circular,
    CmsDocument,
    ContentStatus,
    DirectorProfile,
    FaqItem,
    MediaItem,
    NewsArticle,
    Page,
    SiteSetting,
    Slider,
)
from .serializers import (
    AnnouncementSerializer,
    CircularSerializer,
    CmsDocumentSerializer,
    DirectorProfileSerializer,
    FaqItemSerializer,
    MediaItemSerializer,
    NewsArticleSerializer,
    PageSerializer,
    SiteSettingSerializer,
    SliderSerializer,
)

SECTOR_ROLE_CODES = (
    'SECTOR_MANAGER',
    'SECTOR_HEAD',
    'IT_ADMIN',
    'SECTOR_IT_MANAGER',
    'SECTOR_CONTENT_CONTRIBUTOR',
    'SECTOR_CONTENT_EDITOR',
    'SECTOR_CONTENT_REVIEWER',
    'SECTOR_CONTENT_APPROVER',
    'NATIONAL_CONTENT_ADMIN',
)


def user_is_sector_manager(user):
    """معرف مسؤول محتوى قطاعي (مدير/رئيس القطاع) عبر تعيين دور فعّال."""
    from apps.accounts.models import RoleAssignment

    if not user or user.is_anonymous:
        return False
    if user.is_staff or user.is_superuser:
        return True
    return RoleAssignment.objects.filter(
        user=user,
        role__code__in=SECTOR_ROLE_CODES,
        is_active=True,
    ).exists()


def can_write_cms(user):
    return user is not None and (user.is_authenticated and user_is_sector_manager(user))


class SectorContentWritePermission(BasePermission):
    """الكتب على المحتوى فقط لمن له صلاحية كتابة المحتوى (قطعي/قومي/Staff)."""

    def has_permission(self, request, view):
        return can_write_cms(request.user)


def resolve_cms_sector(request):
    """يرجع القطاع المستهدف بناءً على الاستعلام أو نطاق المستخدم الإداري."""
    sector_param = request.query_params.get('sector_id') or request.query_params.get('sector')
    if sector_param:
        # ابحث بالرمز أولاً (آمن كسلسلة)، ثم بالمعرّف إن كان UUID صالحاً
        sector = Sector.objects.filter(code=sector_param).first()
        if sector is None:
            try:
                _UUID(str(sector_param))
                sector = Sector.objects.filter(pk=sector_param).first()
            except (ValueError, TypeError):
                sector = None
        return sector
    user = getattr(request, 'user', None)
    if user and not user.is_anonymous and not user.is_superuser:
        return resolve_user_sector(user)
    return None


def admin_can_write(user):
    """حالة الكتابة الإدارية من مسؤول نظامي أو من مسؤول قطاع."""
    return can_write_cms(user)


class SectorContentMixin:
    """خلاصات شائعة: تصفية القطاع، صلاحيات الكتابة، وفرض القطاع للكتّاب القطاعيين."""

    sector_public = False

    def get_sector(self):
        return resolve_cms_sector(self.request)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user is None or user.is_anonymous:
            qs = self._apply_public_filter(qs)
            return qs
        if user.is_staff or user.is_superuser:
            sector = resolve_cms_sector(self.request)
            if self.action in ('list', 'retrieve') and sector is not None:
                qs = qs.filter(sector=sector)
            elif self.action in ('list', 'retrieve') and not self.sector_public:
                # إدارة عامة: يعرض كل شيء لمن ليس له نطاق قطاع
                pass
            else:
                sector = resolve_user_sector(user)
                if sector is not None:
                    qs = qs.filter(sector=sector)
            return qs
        # مستخدم قطاعي (إدارة محتوى القطاع)
        sector = resolve_user_sector(user)
        if sector is not None:
            qs = qs.filter(sector=sector)
        else:
            qs = qs.none()
        return qs

    def _apply_public_filter(self, qs):
        sector = resolve_cms_sector(self.request)
        has_published = any(f.name == 'is_published' for f in qs.model._meta.get_fields())
        if sector is None:
            return qs.filter(is_published=True) if has_published else qs
        # محتوى القطاع إن وُجد، وإلا المحتوى الوطني كخلفية
        sector_rows = qs.filter(sector=sector, is_published=True) if has_published else qs.filter(sector=sector)
        if sector_rows.exists():
            return sector_rows
        return qs.filter(sector__isnull=True, is_published=True) if has_published else qs.filter(sector__isnull=True)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [SectorContentWritePermission()]

    def _can_write(self):
        return can_write_cms(self.request.user)

    def perform_create(self, serializer):
        write = self._can_write()
        if not write:
            self.permission_denied(self.request)
        user = self.request.user
        sector = resolve_user_sector(user) if not user.is_superuser else None
        if sector is not None:
            serializer.save(sector=sector)
        else:
            serializer.save()

    def perform_update(self, serializer):
        write = self._can_write()
        if not write:
            self.permission_denied(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        write = self._can_write()
        if not write:
            self.permission_denied(self.request)
        instance.delete()


class WorkflowMixin:
    """إجراءات دورة حياة المحتوى وحماية مستوى الحالة عبر واجهات HTML.

    منع التعديل المباشر للحالة: أي تغيير عبر PATCH يجب أن يكون انتقالاً قانونياً
    (submit/reject/approve/publish/archive) وباستحقاق الدور المناسب.
    """

    def _role(self):
        return content_role(self.request.user)

    def _owns_sector(self, instance):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return True
        sector = resolve_user_sector(user)
        if sector is None:
            return False
        return instance.sector_id is None or instance.sector_id == sector.id

    def _guard_action(self, instance, action):
        if not can_perform(self.request.user, action):
            self.permission_denied(self.request)
        if not self._owns_sector(instance):
            self.permission_denied(self.request)

    def _transition(self, request, action, expected_from=None):
        instance = self.get_object()
        self._guard_action(instance, action)
        allowed_from = {f for (f, _t), a in TRANSITION_ACTIONS.items() if a == action}
        if expected_from is not None:
            allowed_from = {expected_from}
        if instance.status not in allowed_from:
            return Response(
                {'detail': f'لا يمكن تنفيذ "{action}" من الحالة الحالية.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        apply_action(instance, action, request.user)
        instance.save()
        return Response(success_response(self.get_serializer(instance).data))

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_workflow(self, request, pk=None):
        return self._transition(request, 'submit', ContentStatus.DRAFT)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_workflow(self, request, pk=None):
        return self._transition(request, 'reject', ContentStatus.REVIEW)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_workflow(self, request, pk=None):
        return self._transition(request, 'approve', ContentStatus.REVIEW)

    @action(detail=True, methods=['post'], url_path='publish')
    def publish_workflow(self, request, pk=None):
        return self._transition(request, 'publish', ContentStatus.APPROVED)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive_workflow(self, request, pk=None):
        return self._transition(request, 'archive')

    def perform_create(self, serializer):
        role = self._role()
        if role != 'approver':
            if 'status' in serializer.validated_data and serializer.validated_data['status'] not in (
                ContentStatus.DRAFT,
                ContentStatus.REVIEW,
            ):
                serializer.validated_data['status'] = ContentStatus.DRAFT
            serializer.validated_data['is_published'] = False
        super().perform_create(serializer)

    def perform_update(self, serializer):
        write = self._can_write()
        if not write:
            self.permission_denied(self.request)
        instance = serializer.instance
        new_status = serializer.validated_data.get('status')
        if new_status is not None and new_status != instance.status:
            action = transition_action_for(instance.status, new_status)
            if action is None or not can_perform(self.request.user, action):
                self.permission_denied(self.request)
        if serializer.validated_data.get('is_published') and self._role() != 'approver':
            self.permission_denied(self.request)
        serializer.save()


class NewsViewSet(WorkflowMixin, SectorContentMixin, viewsets.ModelViewSet):
    queryset = NewsArticle.objects.all()
    serializer_class = NewsArticleSerializer
    search_fields = ['title', 'title_en', 'content', 'summary']
    filterset_fields = ['category', 'status', 'is_published', 'is_urgent', 'is_featured']

    def _apply_public_filter(self, qs):
        qs = super()._apply_public_filter(qs)
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = qs.filter(status__in=[ContentStatus.APPROVED, ContentStatus.PUBLISHED])
        return qs

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = qs.filter(is_published=True).filter(
                status__in=[ContentStatus.APPROVED, ContentStatus.PUBLISHED]
            )
        return qs


class CircularViewSet(WorkflowMixin, SectorContentMixin, viewsets.ModelViewSet):
    queryset = Circular.objects.all()
    serializer_class = CircularSerializer
    search_fields = ['title', 'body', 'reference_number']
    filterset_fields = ['category', 'priority', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = qs.filter(status=ContentStatus.PUBLISHED)
        return qs


class AnnouncementViewSet(WorkflowMixin, SectorContentMixin, viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    search_fields = ['title', 'title_en', 'body']
    filterset_fields = ['priority', 'status', 'is_published']

    def _apply_public_filter(self, qs):
        now = timezone.now()
        return (
            qs.filter(is_published=True, status=ContentStatus.PUBLISHED)
            .filter(models.Q(start_at__isnull=True) | models.Q(start_at__lte=now))
            .filter(models.Q(end_at__isnull=True) | models.Q(end_at__gte=now))
        )

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = self._apply_public_filter(qs)
        return qs


class PageViewSet(SectorContentMixin, viewsets.ModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'
    search_fields = ['title', 'content']

    def _apply_public_filter(self, qs):
        return qs.filter(is_published=True)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = qs.filter(is_published=True)
        return qs


class FaqViewSet(SectorContentMixin, viewsets.ModelViewSet):
    queryset = FaqItem.objects.all()
    serializer_class = FaqItemSerializer
    search_fields = ['question', 'answer']
    filterset_fields = ['is_active']

    def _apply_public_filter(self, qs):
        return qs.filter(is_active=True)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = qs.filter(is_active=True)
        return qs


class DocumentViewSet(SectorContentMixin, viewsets.ModelViewSet):
    queryset = CmsDocument.objects.all()
    serializer_class = CmsDocumentSerializer
    search_fields = ['title', 'description']
    filterset_fields = ['category', 'is_active']

    def _apply_public_filter(self, qs):
        return qs.filter(is_active=True)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        document = self.get_object()
        return FileResponse(document.file.open('rb'), as_attachment=True, filename=document.file.name)


class SliderViewSet(SectorContentMixin, viewsets.ModelViewSet):
    queryset = Slider.objects.all()
    serializer_class = SliderSerializer
    filterset_fields = ['is_active']
    ordering_fields = ['sort_order']

    def _apply_public_filter(self, qs):
        return qs.filter(is_active=True)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve') and self.request.user.is_anonymous:
            qs = qs.filter(is_active=True)
        return qs


class MediaViewSet(SectorContentMixin, viewsets.ModelViewSet):
    queryset = MediaItem.objects.all()
    serializer_class = MediaItemSerializer
    filterset_fields = ['kind']
    search_fields = ['title']

    def perform_create(self, serializer):
        write = self._can_write()
        if not write:
            self.permission_denied(self.request)
        user = self.request.user
        sector = resolve_user_sector(user) if not user.is_superuser else None
        instance = serializer.save(
            uploaded_by=user if user.is_authenticated else None,
            mime_type=getattr(serializer.validated_data.get('file'), 'content_type', '') or '',
            file_size=getattr(serializer.validated_data.get('file'), 'size', 0) or 0,
            sector=sector,
        )

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        item = self.get_object()
        return FileResponse(item.file.open('rb'), as_attachment=True, filename=item.file.name)


class SettingsViewSet(SectorContentMixin, viewsets.ModelViewSet):
    queryset = SiteSetting.objects.all()
    serializer_class = SiteSettingSerializer
    lookup_field = 'key'

    def get_queryset(self):
        qs = super().get_queryset()
        sector = resolve_cms_sector(self.request)
        if self.action == 'list' and sector is not None:
            qs = qs.filter(sector=sector)
        return qs

    def perform_create(self, serializer):
        write = self._can_write()
        if not write:
            self.permission_denied(self.request)
        user = self.request.user
        sector = resolve_user_sector(user) if not user.is_superuser else None
        serializer.save(sector=sector)


class DirectorProfileViewSet(viewsets.ModelViewSet):
    """بيانات المدير القومي: عام للقراءة، إداري للتعديل."""

    queryset = DirectorProfile.objects.all()
    serializer_class = DirectorProfileSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'current'):
            return [AllowAny()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve'):
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        queryset = DirectorProfile.objects.filter(is_active=True)

        sector_code = request.query_params.get('sector')
        if sector_code:
            from apps.organization.models import Sector
            try:
                sector = Sector.objects.get(code__iexact=sector_code)
                profile = queryset.filter(sector=sector).first()
            except Sector.DoesNotExist:
                profile = None
            if profile is None:
                # إرجاع المدير القومي كاحتياطي عند غياب مدير القطاع
                profile = queryset.filter(sector__isnull=True).first()
        else:
            profile = queryset.filter(sector__isnull=True).first()

        return Response(success_response(DirectorProfileSerializer(profile).data if profile else None))
