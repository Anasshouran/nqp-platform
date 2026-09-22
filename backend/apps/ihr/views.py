from functools import partial

from django.db.models import Avg, Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import RoleAssignment
from core.permissions import ActionPermissionMixin, PermissionAction

from .models import IHREvent, NationalFocalPoint, RiskAssessment, SPARAssessment, SPARIndicator
from .serializers import (
    IHREventSerializer,
    NationalFocalPointSerializer,
    RiskAssessmentSerializer,
    SPARAssessmentSerializer,
    SPARIndicatorSerializer,
)

ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
    'submit': 'submit',
    'assess': 'assess',
    'approve': 'approve',
    'notify_who': 'notify',
    'close': 'close',
    'year_report': 'view',
}

SECTOR_SCOPE_TYPES = {RoleAssignment.ScopeType.SECTOR}
PORT_SCOPE_TYPES = {
    RoleAssignment.ScopeType.PORT,
    RoleAssignment.ScopeType.POINT,
    RoleAssignment.ScopeType.STATION,
}


def _active_scope_ids(user, resource):
    """يعيد (معرّفات القطاع، معرّفات المنفذ) المسموحة للمستخدم ضمن النطاق الحالي."""
    scopes = user.active_scopes(resource)
    sector_ids = {
        s['scope_id'] for s in scopes
        if s['scope_type'] in SECTOR_SCOPE_TYPES and s['scope_id'] is not None
    }
    port_ids = {
        s['scope_id'] for s in scopes
        if s['scope_type'] in PORT_SCOPE_TYPES and s['scope_id'] is not None
    }
    return sector_ids, port_ids


def _scope_q(resource, sector_field='sector_id', port_field='port_id', user=None):
    if user is None:
        return partial(_scope_q, resource, sector_field, port_field)
    if user.is_superuser or not user.is_authenticated:
        return Q()
    sector_ids, port_ids = _active_scope_ids(user, resource)
    q = Q()
    if sector_ids:
        q |= Q(**{f'{sector_field}__in': sector_ids})
    if port_ids:
        q |= Q(**{f'{port_field}__in': port_ids})
    if not sector_ids and not port_ids:
        return Q(pk__isnull=True) if user.active_scopes(resource) else Q()
    return q


class IHREventViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """إدارة أحداث IHR: نقابة إنشاء ← مراجعة ← تقييم ← موافقة NFP ← إرسال لمنظمة الصحة."""

    serializer_class = IHREventSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'ihr_event'
    action_permission_map = ACTION_TO_PERMISSION
    queryset = IHREvent.objects.select_related('disease', 'sector', 'port', 'disease').all()
    scope_q = _scope_q('ihr_event')

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.filter(self.scope_q(self.request.user))
        search = self.request.query_params.get('search')
        status_filter = self.request.query_params.get('status')
        risk = self.request.query_params.get('risk')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(event_number__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)
        if risk:
            qs = qs.filter(risk_level=risk)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        data = {'reported_by': user}
        if not user.is_superuser:
            sector_ids, port_ids = _active_scope_ids(user, 'ihr_event')
            if len(port_ids) == 1:
                data['port_id'] = next(iter(port_ids))
            if len(sector_ids) == 1:
                data['sector_id'] = next(iter(sector_ids))
        serializer.save(**data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """إرسال الحدث للمراجعة الوطنية."""
        event = self.get_object()
        allowed = {IHREvent.Status.DRAFT, IHREvent.Status.UNDER_REVIEW}
        if event.status not in allowed:
            return Response({'status': 'error', 'message': 'الحدث غير قابل للإرسال في حالته الحالية.'}, status=400)
        event.status = IHREvent.Status.UNDER_REVIEW
        event.reviewed_by = None
        event.save(update_fields=['status', 'reviewed_by'])
        return Response({'status': 'success', 'message': 'أُرسل الحدث للمراجعة.', 'data': IHREventSerializer(event).data})

    @action(detail=True, methods=['post'])
    def assess(self, request, pk=None):
        """إنشاء/تحديث تقييم المخاطر للحدث."""
        event = self.get_object()
        if event.status == IHREvent.Status.CLOSED:
            return Response({'status': 'error', 'message': 'لا يمكن تقييم حدث مغلق.'}, status=400)
        serializer = RiskAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assessment, _ = RiskAssessment.objects.update_or_create(
            event=event,
            defaults={**serializer.validated_data, 'assessed_by': request.user},
        )
        event.status = IHREvent.Status.NATIONAL_ASSESSMENT
        event.save(update_fields=['status'])
        return Response({'status': 'success', 'message': 'تم تقييم المخاطر.', 'data': RiskAssessmentSerializer(assessment).data})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """اعتماد NFP — يصبح الحدث واجب الإبلاغ."""
        event = self.get_object()
        allowed = {IHREvent.Status.NATIONAL_ASSESSMENT, IHREvent.Status.NFP_REVIEW, IHREvent.Status.UNDER_REVIEW}
        if event.status not in allowed:
            return Response({'status': 'error', 'message': 'لا يمكن الاعتماد في الحالة الحالية.'}, status=400)
        nfp = NationalFocalPoint.objects.filter(user=request.user, is_active=True).first()
        if not nfp:
            return Response({'status': 'error', 'message': 'صلاحية نقطة الاتصال الوطنية مطلوبة للاعتماد.'}, status=403)
        event.status = IHREvent.Status.NOTIFIABLE
        event.nfp_approved_by = request.user
        event.date_verified = event.date_verified or event.date_detected
        event.save(update_fields=['status', 'nfp_approved_by', 'date_verified'])
        return Response({'status': 'success', 'message': 'اعتمد الحدث كواجب الإبلاغ.', 'data': IHREventSerializer(event).data})

    @action(detail=True, methods=['post'], url_path='notify-who')
    def notify_who(self, request, pk=None):
        """جدولة الإرسال لمنظمة الصحة عبر Celery."""
        from apps.who.tasks import submit_ihr_event

        event = self.get_object()
        if event.status != IHREvent.Status.NOTIFIABLE:
            return Response({'status': 'error', 'message': 'الحدث يجب أن يكون واجب الإبلاغ أولاً.'}, status=400)
        task = submit_ihr_event.delay(str(event.id))
        event.status = IHREvent.Status.SUBMITTED
        event.submitted_to_who_at = timezone.now()
        event.save(update_fields=['status', 'submitted_to_who_at'])
        return Response(
            {'status': 'success', 'message': 'جُدول الإرسال لمنظمة الصحة.', 'data': {'task_id': task.id}},
        )

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        event = self.get_object()
        event.status = IHREvent.Status.CLOSED
        event.save(update_fields=['status'])
        return Response({'status': 'success', 'message': 'أُغلق الحدث.', 'data': IHREventSerializer(event).data})


class RiskAssessmentViewSet(ActionPermissionMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = RiskAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'ihr_risk'
    queryset = RiskAssessment.objects.select_related('event', 'assessed_by').all()
    scope_q = _scope_q('ihr_risk', sector_field='event__sector_id', port_field='event__port_id')

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(self.scope_q(self.request.user))


class NationalFocalPointViewSet(ActionPermissionMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = NationalFocalPointSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'ihr_nfp'
    action_permission_map = {**ACTION_TO_PERMISSION, 'assign': 'assign'}
    queryset = NationalFocalPoint.objects.select_related('user').filter(is_active=True).all()

    @action(detail=False, methods=['post'])
    def assign(self, request):
        """تعيين نقطة اتصال وطنية."""
        serializer = NationalFocalPointSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj, _ = NationalFocalPoint.objects.update_or_create(
            user=serializer.validated_data['user'],
            defaults=serializer.validated_data,
        )
        return Response({'status': 'success', 'message': 'عُيّنت نقطة الاتصال.', 'data': NationalFocalPointSerializer(obj).data})


class SPARIndicatorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SPARIndicatorSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'ihr_spar'
    queryset = SPARIndicator.objects.all()


class SPARAssessmentViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    serializer_class = SPARAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'ihr_spar'
    action_permission_map = ACTION_TO_PERMISSION
    queryset = SPARAssessment.objects.select_related('indicator', 'assessed_by').all()

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=int(year))
        return qs

    def perform_create(self, serializer):
        serializer.save(assessed_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='report/(?P<year>[0-9]{4})')
    def year_report(self, request, year=None):
        assessments = self.get_queryset().filter(year=int(year))
        if not assessments.exists():
            return Response({'status': 'error', 'message': 'لا توجد تقييمات لهذه السنة.'}, status=404)
        overall = assessments.aggregate(avg=Avg('score'))['avg']
        items = SPARAssessmentSerializer(assessments, many=True).data
        return Response({'status': 'success', 'message': '', 'data': {
            'year': int(year),
            'overall_score': round(float(overall), 2),
            'assessment_count': len(items),
            'indicators': items,
        }})