import uuid

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.screening.models import HealthScreening
from apps.laboratory.models import LabSample, LabResult
from apps.travelers.models import Traveler
from core.filters import ExactFilterBackend
from core.permissions import PermissionAction
from core.utils.response import success_response
from core.utils.scoping import resolve_user_port_ids

from .models import (
    CaseStatusLog,
    ContactFollowUp,
    ContactTrace,
    CrisisTeamMember,
    EmergencyAlert,
    EmergencyEvent,
    HealthCase,
    Investigation,
    KillSwitch,
    ReportableDisease,
    ResponsePlan,
    SurveillanceAlert,
    WeeklySurveillanceReport,
)
from .serializers import (
    CaseStatusLogSerializer,
    ContactFollowUpSerializer,
    ContactFollowUpWriteSerializer,
    ContactTraceSerializer,
    ContactTraceWriteSerializer,
    CrisisTeamMemberSerializer,
    EmergencyAlertSerializer,
    EmergencyEventSerializer,
    HealthCaseSerializer,
    HealthCaseWriteSerializer,
    InvestigationSerializer,
    InvestigationWriteSerializer,
    KillSwitchSerializer,
    ReportableDiseaseSerializer,
    ResponsePlanSerializer,
    SurveillanceAlertSerializer,
    SurveillanceAlertUpdateSerializer,
    WeeklySurveillanceReportSerializer,
    WeeklySurveillanceReportWriteSerializer,
)
from .services import (
    compute_ewars,
    generate_case_number,
    generate_contact_number,
    generate_investigation_number,
)


class AlertViewSet(viewsets.ModelViewSet):
    queryset = EmergencyAlert.objects.select_related('traveler', 'port').all()
    serializer_class = EmergencyAlertSerializer
    http_method_names = ['get', 'patch', 'post']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['description', 'traveler__first_name', 'traveler__last_name']
    ordering_fields = ['triggered_at']
    filter_fields = ['status', 'alert_type', 'port']

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        alert = self.get_object()
        alert.status = EmergencyAlert.AlertStatus.RESOLVED
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['status', 'resolved_at'])
        return Response(success_response(EmergencyAlertSerializer(alert).data))


class KillSwitchViewSet(viewsets.ModelViewSet):
    queryset = KillSwitch.objects.all()
    serializer_class = KillSwitchSerializer
    http_method_names = ['get', 'post', 'patch']

    @action(detail=False, methods=['post'], url_path='activate')
    def activate(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        active = KillSwitch.objects.filter(port=serializer.validated_data['port'], deactivated_at__isnull=True).exists()
        if active:
            return Response({'status': 'error', 'message': 'المفتاح مفعل بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        switch = serializer.save(activated_by=request.user)
        return Response(success_response(KillSwitchSerializer(switch).data), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='deactivate')
    def deactivate(self, request):
        port_id = request.data.get('port')
        switch = KillSwitch.objects.filter(port_id=port_id, deactivated_at__isnull=True).order_by('-activated_at').first()
        if not switch:
            return Response({'status': 'error', 'message': 'لا يوجد مفتاح نشط'}, status=status.HTTP_400_BAD_REQUEST)
        switch.deactivated_at = timezone.now()
        switch.save(update_fields=['deactivated_at'])
        return Response(success_response(KillSwitchSerializer(switch).data))

    @action(detail=False, methods=['get'], url_path='status')
    def status(self, request):
        port_id = request.query_params.get('port')
        qs = KillSwitch.objects.filter(deactivated_at__isnull=True)
        if port_id:
            qs = qs.filter(port_id=port_id)
        active = qs.order_by('-activated_at').first()
        return Response(success_response({
            'active': active is not None,
            'switch': KillSwitchSerializer(active).data if active else None,
        }))


class ResponsePlanViewSet(viewsets.ModelViewSet):
    queryset = ResponsePlan.objects.all()
    serializer_class = ResponsePlanSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name']
    ordering_fields = ['name']
    filter_fields = ['is_active']


class EmergencyEventViewSet(viewsets.ModelViewSet):
    queryset = EmergencyEvent.objects.select_related('location_port', 'response_plan', 'reported_by').all()
    serializer_class = EmergencyEventSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'event_number']
    ordering_fields = ['reported_at']
    filter_fields = ['status', 'severity', 'source_type']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(reported_by=request.user)
        event.event_number = f'E-{event.pk.hex[:6].upper()}'
        event.save(update_fields=['event_number'])
        return Response(
            success_response(EmergencyEventSerializer(event).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        event = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ('VERIFIED', 'REJECTED'):
            return Response({'status': 'error', 'message': 'حالة غير صالحة'}, status=status.HTTP_400_BAD_REQUEST)
        event.status = new_status
        event.save(update_fields=['status'])
        return Response(success_response(EmergencyEventSerializer(event).data))

    @action(detail=True, methods=['post'], url_path='activate-plan')
    def activate_plan(self, request, pk=None):
        event = self.get_object()
        plan_id = request.data.get('response_plan_id')
        try:
            plan = ResponsePlan.objects.get(id=plan_id)
        except ResponsePlan.DoesNotExist:
            return Response({'status': 'error', 'message': 'خطة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        event.response_plan = plan
        event.status = EmergencyEvent.EventStatus.RESPONDING
        event.save(update_fields=['response_plan', 'status'])
        return Response(success_response(EmergencyEventSerializer(event).data))

    @action(detail=True, methods=['post'], url_path='team', serializer_class=CrisisTeamMemberSerializer)
    def add_team(self, request, pk=None):
        event = self.get_object()
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        members = serializer.save(event=event)
        return Response(
            success_response(CrisisTeamMemberSerializer(members, many=True).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='close')
    def close_event(self, request, pk=None):
        event = self.get_object()
        event.summary = request.data.get('summary', event.summary)
        event.lessons_learned = request.data.get('lessons_learned', '')
        event.recommendations = request.data.get('recommendations', '')
        event.status = EmergencyEvent.EventStatus.CLOSED
        event.closed_at = timezone.now()
        event.save()
        return Response(success_response(EmergencyEventSerializer(event).data))


class DashboardViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer

    def stats(self, request):
        from django.db.models import Count

        data = {
            'active_alerts': EmergencyAlert.objects.filter(status=EmergencyAlert.AlertStatus.NEW).count(),
            'open_events': EmergencyEvent.objects.exclude(status=EmergencyEvent.EventStatus.CLOSED).count(),
            'screenings_today': HealthScreening.objects.filter(screened_at__date=timezone.localdate()).count(),
            'positive_results_today': LabResult.objects.filter(
                result=LabResult.Result.POSITIVE, result_date__date=timezone.localdate()
            ).count(),
            'samples_in_process': LabSample.objects.filter(status=LabSample.SampleStatus.PROCESSING).count(),
            'ports_with_alerts': EmergencyAlert.objects.filter(
                status=EmergencyAlert.AlertStatus.NEW
            ).values('port').distinct().count(),
        }
        return Response(success_response(data))


SURVEILLANCE_EDIT_ACTIONS = {
    'transition', 'ack', 'close', 'respond', 'review', 'add_follow_up', 'run_ewars',
}
ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
}


def _surveillance_scope_q(user, port_field='port'):
    """يبني Q نطاق الترصد (نقاط دخول المستخدم أو قطاعاته) أو None إن لم يحتج تقييداً."""
    if not user or user.is_anonymous or user.is_superuser:
        return None
    from apps.accounts.models import RoleAssignment

    port_ids = resolve_user_port_ids(user)
    scopes = user.active_scopes('surveillance')
    sector_ids = {
        s['scope_id'] for s in scopes
        if s['scope_type'] in (RoleAssignment.ScopeType.SECTOR, RoleAssignment.ScopeType.REGION)
        and s['scope_id']
    }
    q = Q()
    restricted = False
    if port_ids is not None:
        restricted = True
        if port_ids:
            q |= Q(**{f'{port_field}__in': port_ids})
    if sector_ids:
        restricted = True
        q |= Q(sector_id__in=sector_ids)
    if not restricted:
        return None
    return q or Q(pk=None)


class SurveillanceAccessMixin:
    permission_resource = 'surveillance'
    permission_classes = [PermissionAction]

    def get_permissions(self):
        action = self.action
        if action in SURVEILLANCE_EDIT_ACTIONS:
            self.permission_action = 'edit'
        else:
            self.permission_action = ACTION_TO_PERMISSION.get(action, 'view')
        return super().get_permissions()


class SurveillanceScopeMixin:
    port_field = 'port'

    def get_queryset(self):
        qs = super().get_queryset()
        q = _surveillance_scope_q(self.request.user, self.port_field)
        return qs.filter(q) if q is not None else qs


class ReportableDiseaseViewSet(SurveillanceAccessMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ReportableDisease.objects.select_related('disease').filter(is_enabled=True).all()
    serializer_class = ReportableDiseaseSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['disease__name_ar', 'disease__name_en', 'disease__icd_11_code']
    ordering_fields = ['disease__name_ar', 'ewars_threshold']
    filter_fields = ['is_enabled', 'notification_timeline', 'surveillance_mode', 'disease']


def _log_case_changes(case, old_type, old_status, user, note=''):
    if old_type != case.case_type:
        CaseStatusLog.objects.create(
            case=case, field=CaseStatusLog.Field.CASE_TYPE, old_value=old_type,
            new_value=case.case_type, note=note, changed_by=user,
        )
    if old_status != case.status:
        CaseStatusLog.objects.create(
            case=case, field=CaseStatusLog.Field.STATUS, old_value=old_status,
            new_value=case.status, note=note, changed_by=user,
        )


class HealthCaseViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = HealthCase.objects.select_related(
        'disease', 'traveler', 'port', 'sector', 'locality', 'health_facility', 'event'
    ).all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = [
        'case_number', 'person_name', 'traveler__first_name', 'traveler__last_name',
        'passport_number', 'phone', 'nationality',
    ]
    ordering_fields = ['reported_date', 'created_at', 'confirmation_date']
    filter_fields = [
        'disease', 'case_type', 'status', 'severity', 'source', 'port', 'sector',
        'locality', 'health_facility',
    ]

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update'):
            return HealthCaseWriteSerializer
        return HealthCaseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save(case_number=generate_case_number(), reported_by=request.user)
        return Response(
            success_response(HealthCaseSerializer(case).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_type, old_status = instance.case_type, instance.status
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        if old_type != case.case_type and case.case_type == HealthCase.CaseType.CONFIRMED and not case.confirmation_date:
            case.confirmation_date = timezone.localdate()
            case.save(update_fields=['confirmation_date'])
        _log_case_changes(case, old_type, old_status, request.user, request.data.get('note', ''))
        return Response(success_response(HealthCaseSerializer(case).data))

    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, pk=None):
        case = self.get_object()
        old_type, old_status = case.case_type, case.status
        if request.data.get('case_type'):
            case.case_type = request.data['case_type']
        if request.data.get('status'):
            case.status = request.data['status']
        if case.case_type == HealthCase.CaseType.CONFIRMED and not case.confirmation_date:
            case.confirmation_date = timezone.localdate()
        case.save(update_fields=['case_type', 'status', 'confirmation_date'])
        _log_case_changes(case, old_type, old_status, request.user, request.data.get('note', ''))
        return Response(success_response(HealthCaseSerializer(case).data))

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        case = self.get_object()
        logs = case.status_logs.order_by('-changed_at')
        return Response(success_response(CaseStatusLogSerializer(logs, many=True).data))


class SurveillanceAlertViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = SurveillanceAlert.objects.select_related(
        'disease', 'sector', 'locality', 'port', 'event', 'resolved_by'
    ).all()
    http_method_names = ['get', 'patch', 'post']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['alert_number', 'title', 'disease__name_ar']
    ordering_fields = ['generated_at']
    filter_fields = ['alert_type', 'level', 'status', 'disease', 'port', 'sector', 'locality']

    def create(self, request, *args, **kwargs):
        return Response(
            {'status': 'error', 'message': 'الإنذارات تُولَّد تلقائياً.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return SurveillanceAlertUpdateSerializer
        return SurveillanceAlertSerializer

    @action(detail=True, methods=['post'], url_path='ack')
    def ack(self, request, pk=None):
        alert = self.get_object()
        if alert.status == SurveillanceAlert.Status.NEW:
            alert.status = SurveillanceAlert.Status.ACKNOWLEDGED
            alert.save(update_fields=['status'])
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='respond')
    def respond(self, request, pk=None):
        alert = self.get_object()
        if alert.status in (SurveillanceAlert.Status.NEW, SurveillanceAlert.Status.ACKNOWLEDGED):
            alert.status = SurveillanceAlert.Status.RESPONDING
            alert.save(update_fields=['status'])
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        alert = self.get_object()
        alert.status = SurveillanceAlert.Status.CLOSED
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.save(update_fields=['status', 'resolved_at', 'resolved_by'])
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    @action(detail=False, methods=['post'], url_path='run-ewars')
    def run_ewars(self, request):
        created = compute_ewars()
        return Response(success_response({'created': len(created)}))


class ContactTraceViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = ContactTrace.objects.select_related('index_case', 'port', 'sector').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['contact_number', 'person_name', 'phone', 'index_case__case_number']
    ordering_fields = ['created_at', 'follow_up_start']
    filter_fields = ['status', 'contact_type', 'index_case', 'port', 'sector', 'sex']

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update'):
            return ContactTraceWriteSerializer
        return ContactTraceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save(contact_number=generate_contact_number())
        return Response(
            success_response(ContactTraceSerializer(contact).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='follow-up')
    def add_follow_up(self, request, pk=None):
        contact = self.get_object()
        serializer = ContactFollowUpWriteSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        follow_up = serializer.save(contact=contact, checked_by=request.user)
        if follow_up.status == ContactFollowUp.Status.CONVERTED and contact.status != ContactTrace.Status.CONVERTED_CASE:
            contact.status = ContactTrace.Status.CONVERTED_CASE
            contact.save(update_fields=['status'])
        elif follow_up.status == ContactFollowUp.Status.SYMPTOMATIC and contact.status == ContactTrace.Status.UNDER_MONITORING:
            contact.status = ContactTrace.Status.SYMPTOMATIC
            contact.save(update_fields=['status'])
        return Response(
            success_response(ContactFollowUpSerializer(follow_up).data),
            status=status.HTTP_201_CREATED,
        )


class InvestigationViewSet(SurveillanceAccessMixin, viewsets.ModelViewSet):
    queryset = Investigation.objects.select_related('case', 'event', 'lead_investigator').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['investigation_number', 'title', 'case__case_number', 'event__event_number']
    ordering_fields = ['started_at', 'completed_at']
    filter_fields = ['status', 'case', 'event']

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update'):
            return InvestigationWriteSerializer
        return InvestigationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        investigation = serializer.save(investigation_number=generate_investigation_number())
        if not investigation.lead_investigator_id:
            investigation.lead_investigator = request.user
            investigation.save(update_fields=['lead_investigator'])
        return Response(
            success_response(InvestigationSerializer(investigation).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        investigation = serializer.save()
        if investigation.status in (
            Investigation.Status.COMPLETED, Investigation.Status.CLOSED
        ) and not investigation.completed_at:
            investigation.completed_at = timezone.localdate()
            investigation.save(update_fields=['completed_at'])
        return Response(success_response(InvestigationSerializer(investigation).data))


class WeeklySurveillanceReportViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = WeeklySurveillanceReport.objects.select_related(
        'health_facility', 'port', 'sector', 'submitted_by', 'reviewed_by'
    ).prefetch_related('lines', 'lines__disease').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['report_number', 'port__code', 'health_facility__name_ar']
    ordering_fields = ['period_start', 'submitted_at']
    filter_fields = ['is_on_time', 'port', 'sector', 'health_facility']

    def get_serializer_class(self):
        if self.action == 'create':
            return WeeklySurveillanceReportWriteSerializer
        return WeeklySurveillanceReportSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(submitted_by=request.user)
        return Response(
            success_response(WeeklySurveillanceReportSerializer(report).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        report = self.get_object()
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        if 'is_on_time' in request.data:
            report.is_on_time = bool(request.data['is_on_time'])
        report.save(update_fields=['reviewed_by', 'reviewed_at', 'is_on_time'])
        return Response(success_response(WeeklySurveillanceReportSerializer(report).data))


class SurveillanceDashboardViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer
    permission_classes = [PermissionAction]
    permission_resource = 'surveillance'
    permission_action = 'view'

    def _apply_scope(self, qs, port_field='port'):
        q = _surveillance_scope_q(self.request.user, port_field)
        return qs.filter(q) if q is not None else qs

    def stats(self, request):
        from django.db.models import Count
        from datetime import timedelta

        today = timezone.localdate()
        cases_qs = self._apply_scope(HealthCase.objects.all())
        alerts_qs = self._apply_scope(SurveillanceAlert.objects.all())

        active_statuses = [
            SurveillanceAlert.Status.NEW,
            SurveillanceAlert.Status.ACKNOWLEDGED,
            SurveillanceAlert.Status.RESPONDING,
        ]
        data = {
            'total_cases': cases_qs.count(),
            'cases_today': cases_qs.filter(reported_date=today).count(),
            'cases_this_week': cases_qs.filter(
                reported_date__gte=today - timedelta(days=6)
            ).count(),
            'confirmed_cases': cases_qs.filter(case_type=HealthCase.CaseType.CONFIRMED).count(),
            'dead_cases': cases_qs.filter(status=HealthCase.Status.DEAD).count(),
            'active_alerts': alerts_qs.filter(status__in=active_statuses).count(),
            'new_alerts': alerts_qs.filter(status=SurveillanceAlert.Status.NEW).count(),
            'level_counts': {
                level: alerts_qs.filter(level=level).count()
                for level in ('LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3')
            },
            'cases_by_disease': list(
                cases_qs.exclude(disease__isnull=True)
                .values('disease__name_ar')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
            'cases_by_source': list(
                cases_qs.values('source').annotate(count=Count('id')).order_by('-count')
            ),
            'cases_by_sector': list(
                cases_qs.exclude(sector__isnull=True)
                .values('sector__name_ar')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
            'cases_by_port': list(
                cases_qs.exclude(port__isnull=True)
                .values('port__code', 'port__name_ar')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
            'cases_by_locality': list(
                cases_qs.exclude(locality__isnull=True)
                .values('locality__name_ar')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
            'open_events': EmergencyEvent.objects.exclude(
                status=EmergencyEvent.EventStatus.CLOSED
            ).count(),
        }
        return Response(success_response(data))
