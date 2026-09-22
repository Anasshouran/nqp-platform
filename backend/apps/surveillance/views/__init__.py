import uuid

from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import PermissionAction
from core.utils.response import success_response
from core.utils.scoping import resolve_user_port_ids

from apps.surveillance.models import (
    AlertRule,
    ContactTrace,
    DailySurveillanceReport,
    HealthCase,
    HealthEvent,
    Investigation,
    InvestigationAxis,
    InvestigationReport,
    MonthlySurveillanceReport,
    Notification,
    Outbreak,
    OutbreakReport,
    Specimen,
    SpecimenLabResult,
    SurveillanceAlert,
    VectorSurveillanceLink,
    WeeklySurveillanceReport,
)
from apps.surveillance.serializers.cases import (
    CaseExposureSerializer,
    CaseStatusLogSerializer,
    CaseSymptomSerializer,
    CaseTransitionSerializer,
    CaseTravelHistorySerializer,
    HealthCaseDetailSerializer,
    HealthCaseListSerializer,
    HealthCaseWriteSerializer,
)
from apps.surveillance.serializers.contacts import (
    ContactFollowUpSerializer,
    ContactFollowUpWriteSerializer,
    ContactTraceSerializer,
    ContactTraceWriteSerializer,
)
from apps.surveillance.serializers.alerts import (
    AlertAcknowledgeSerializer,
    AlertCloseSerializer,
    AlertEscalateOutbreakSerializer,
    AlertEvaluateSerializer,
    AlertRuleSerializer,
    SurveillanceAlertSerializer,
    SurveillanceAlertWriteSerializer,
)
from apps.surveillance.serializers.investigations import (
    InvestigationAxisSerializer,
    InvestigationAxisWriteSerializer,
    InvestigationCloseSerializer,
    InvestigationFindingSerializer,
    InvestigationSerializer,
    InvestigationStartSerializer,
    InvestigationWriteSerializer,
)
from apps.surveillance.serializers.specimens import (
    SpecimenLabResultCreateSerializer,
    SpecimenResultWriteSerializer,
    SpecimenSerializer,
    SpecimenTransitionSerializer,
    SpecimenWriteSerializer,
)
from apps.surveillance.serializers.outbreaks import (
    OutbreakActionSerializer,
    OutbreakResponseActionSerializer,
    OutbreakResponseTeamSerializer,
    OutbreakSerializer,
    OutbreakStatusSerializer,
    OutbreakWriteSerializer,
)
from apps.surveillance.serializers.events import (
    EventReportSerializer,
    HealthEventSerializer,
    HealthEventWriteSerializer,
)
from apps.surveillance.serializers.reports import (
    DailyReportSerializer,
    DailyReportWriteSerializer,
    OutbreakReportSerializer,
    ReportLineSerializer,
)
from apps.surveillance.services.workflows import (
    AlertWorkflowService,
    CaseWorkflowService,
    InvestigationWorkflowService,
    OutbreakWorkflowService,
    SpecimenWorkflowService,
)

from apps.surveillance.models.specimen import SpecimenStatus
from apps.surveillance.models.contact import ContactStatus
from apps.surveillance.models.investigation import InvestigationStatus
from apps.surveillance.models.event import HealthEventStatus

SURVEILLANCE_EDIT_ACTIONS = {
    'transition', 'acknowledge', 'evaluate', 'close', 'escalate', 'start_response',
    'follow_up', 'add_follow_up', 'verify', 'add_report', 'complete_axis', 'add_finding',
    'start', 'confirm', 'activate', 'control', 'add_action', 'add_team', 'submit',
    'approve', 'add_result', 'transition_specimen', 'add_line', 'mark_read',
}
ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
}


def _surveillance_scope_q(user, port_field='port', sector_field='sector',
                          relation_links=(), entry_links=()):
    """يبني Q نطاق الترصد (نقاط دخول المستخدم أو قطاعاته) أو None إن لم يحتج تقييداً.

    - port_field/sector_field: مسارا حقلي المنفذ/القطاع مباشرة على النموذج (الافتراضي port/sector).
    - relation_links: قائمة مسارات علاقات تحمل حقلي port/sector خاصين بها
      (مثل 'case'، 'event'، 'outbreak') تُستخدم حين لا يملك النموذج حقلاً مباشراً.
    - entry_links: قائمة مسارات علاقات تصل مباشرة إلى EntryPoint (تُفلتر بمعرفات المنافذ مباشرة).
    """
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

    port_filter_paths = [port_field] if port_field else []
    port_filter_paths += [f'{link}__port' for link in relation_links]
    port_filter_paths += list(entry_links)

    sector_filter_paths = [sector_field] if sector_field else []
    sector_filter_paths += [f'{link}__sector' for link in relation_links]

    q = Q()
    restricted = False
    if port_ids is not None:
        restricted = True
        if port_ids:
            for path in port_filter_paths:
                q |= Q(**{f'{path}__in': port_ids})
    if sector_ids:
        restricted = True
        for path in sector_filter_paths:
            q |= Q(**{f'{path}__in': sector_ids})
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


class SurveillanceRelatedScopeMixin:
    """يقصّر نطاق الترصد عبر علاقات تحمل حقلي port/sector خاصين بها.

    للنماذج التي تربط نفسها بحالات/أحداث/تفشيات (تحقيقات، عينات، روابط نواقل)
    بدل حمل حقلي port/sector مباشرة على النموذج.
    """

    scope_relation_links = ()
    scope_entry_links = ()

    def get_queryset(self):
        qs = super().get_queryset()
        q = _surveillance_scope_q(
            self.request.user,
            port_field=None,
            sector_field=None,
            relation_links=self.scope_relation_links,
            entry_links=self.scope_entry_links,
        )
        return qs.filter(q) if q is not None else qs


# ==============================================================================
# لوحة التحكم
# ==============================================================================
class SurveillanceDashboardViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer
    permission_classes = [PermissionAction]
    permission_resource = 'surveillance'
    permission_action = 'view'

    def _apply_scope(self, qs, port_field='port'):
        q = _surveillance_scope_q(self.request.user, port_field)
        return qs.filter(q) if q is not None else qs

    def stats(self, request):
        today = timezone.localdate()
        cases_qs = self._apply_scope(HealthCase.objects.all())
        alerts_qs = self._apply_scope(SurveillanceAlert.objects.all())
        outbreaks_qs = self._apply_scope(Outbreak.objects.all())
        contacts_qs = self._apply_scope(ContactTrace.objects.all())

        active_alert_statuses = ['NEW', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESPONDING']
        data = {
            'total_cases': cases_qs.count(),
            'cases_today': cases_qs.filter(reported_date=today).count(),
            'confirmed_cases': cases_qs.filter(case_type='CONFIRMED').count(),
            'active_cases': cases_qs.exclude(workflow_state__in=['CLOSED', 'CONFIRMED']).count(),
            'deaths': cases_qs.filter(status='DEAD').count(),
            'active_alerts': alerts_qs.filter(status__in=active_alert_statuses).count(),
            'new_alerts': alerts_qs.filter(status='NEW').count(),
            'active_outbreaks': outbreaks_qs.exclude(
                status__in=['CLOSED', 'REJECTED']
            ).count(),
            'under_monitoring_contacts': contacts_qs.filter(
                status=ContactStatus.UNDER_MONITORING
            ).count(),
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
            'cases_by_sector': list(
                cases_qs.exclude(sector__isnull=True)
                .values('sector__name_ar')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
        }
        return Response(success_response(data))

    def timeline(self, request):
        cases_qs = self._apply_scope(HealthCase.objects.all())
        alerts_qs = self._apply_scope(SurveillanceAlert.objects.all())
        data = {
            'cases_last_14_days': list(
                cases_qs.filter(reported_date__gte=timezone.localdate())
                .extra(select={'day': "date(reported_date)"})
                .values('day')
                .annotate(count=Count('id'))
                .order_by('day')
            ),
            'alerts_last_14_days': list(
                alerts_qs.filter(generated_at__date__gte=timezone.localdate())
                .extra(select={'day': "date(generated_at)"})
                .values('day')
                .annotate(count=Count('id'))
                .order_by('day')
            ),
        }
        return Response(success_response(data))


# ==============================================================================
# الحالات
# ==============================================================================
class HealthCaseViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = HealthCase.objects.select_related(
        'disease', 'traveler', 'port', 'sector', 'locality', 'health_facility',
        'event', 'outbreak', 'reported_by', 'assigned_to'
    ).prefetch_related('case_symptoms', 'case_exposures', 'travel_history', 'status_logs').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = [
        'case_number', 'person_name', 'traveler__first_name', 'traveler__last_name',
        'passport_number', 'phone', 'nationality', 'national_id',
    ]
    ordering_fields = ['reported_date', 'created_at', 'confirmation_date', 'onset_date']
    filter_fields = [
        'disease', 'case_type', 'workflow_state', 'status', 'severity', 'source',
        'port', 'sector', 'locality', 'health_facility', 'outbreak', 'assigned_to',
    ]

    def get_serializer_class(self):
        if self.action == 'transition':
            return CaseTransitionSerializer
        if self.action == 'add_symptom':
            return CaseSymptomSerializer
        if self.action == 'add_exposure':
            return CaseExposureSerializer
        if self.action == 'add_travel':
            return CaseTravelHistorySerializer
        if self.action in ('create', 'partial_update'):
            return HealthCaseWriteSerializer
        if self.action == 'retrieve':
            return HealthCaseDetailSerializer
        return HealthCaseListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = HealthCaseListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = HealthCaseListSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save(reported_by=request.user)
        if not case.reported_date:
            case.reported_date = timezone.localdate()
            case.save(update_fields=['reported_date'])
        return Response(
            success_response(HealthCaseDetailSerializer(case).data),
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        case = self.get_object()
        return Response(success_response(HealthCaseDetailSerializer(case).data))

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        return Response(success_response(HealthCaseDetailSerializer(case).data))

    @action(detail=True, methods=['post'], url_path='transition', serializer_class=CaseTransitionSerializer)
    def transition(self, request, pk=None):
        case = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseWorkflowService.transition(
                case,
                serializer.validated_data['new_state'],
                request.user,
                serializer.validated_data.get('note', ''),
            )
        except ValueError as exc:
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(success_response(HealthCaseDetailSerializer(case).data))

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        case = self.get_object()
        logs = case.status_logs.all()
        return Response(success_response(CaseStatusLogSerializer(logs, many=True).data))

    @action(detail=True, methods=['post'], url_path='symptoms', serializer_class=CaseSymptomSerializer)
    def add_symptom(self, request, pk=None):
        case = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        symptom = serializer.save(case=case)
        return Response(
            success_response(CaseSymptomSerializer(symptom).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='exposures', serializer_class=CaseExposureSerializer)
    def add_exposure(self, request, pk=None):
        case = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exposure = serializer.save(case=case)
        return Response(
            success_response(CaseExposureSerializer(exposure).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='travel', serializer_class=CaseTravelHistorySerializer)
    def add_travel(self, request, pk=None):
        case = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        travel = serializer.save(case=case)
        return Response(
            success_response(CaseTravelHistorySerializer(travel).data),
            status=status.HTTP_201_CREATED,
        )


# ==============================================================================
# المخالطون
# ==============================================================================
class ContactTraceViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = ContactTrace.objects.select_related(
        'index_case', 'port', 'sector', 'assigned_to', 'converted_case'
    ).prefetch_related('follow_ups').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['contact_number', 'person_name', 'phone', 'national_id', 'index_case__case_number']
    ordering_fields = ['created_at', 'follow_up_start', 'last_exposure_date']
    filter_fields = ['status', 'contact_type', 'index_case', 'port', 'sector', 'sex']

    def get_serializer_class(self):
        if self.action == 'add_follow_up':
            return ContactFollowUpWriteSerializer
        if self.action in ('create', 'partial_update'):
            return ContactTraceWriteSerializer
        return ContactTraceSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ContactTraceSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ContactTraceSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        contact = self.get_object()
        return Response(success_response(ContactTraceSerializer(contact).data))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()
        return Response(
            success_response(ContactTraceSerializer(contact).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='follow-up', serializer_class=ContactFollowUpWriteSerializer)
    def add_follow_up(self, request, pk=None):
        contact = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        follow_up = serializer.save(contact=contact, checked_by=request.user)

        if follow_up.status == 'CONVERTED' and contact.status != ContactStatus.CONVERTED_CASE:
            contact.status = ContactStatus.CONVERTED_CASE
            contact.save(update_fields=['status'])
        elif follow_up.status == 'SYMPTOMATIC' and contact.status == ContactStatus.UNDER_MONITORING:
            contact.status = ContactStatus.SYMPTOMATIC
            contact.save(update_fields=['status'])
        elif follow_up.status == 'REFUSED' and contact.status == ContactStatus.UNDER_MONITORING:
            contact.status = ContactStatus.REFUSED
            contact.save(update_fields=['status'])

        return Response(
            success_response(ContactFollowUpSerializer(follow_up).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='follow-ups')
    def follow_ups(self, request, pk=None):
        contact = self.get_object()
        ups = contact.follow_ups.all()
        return Response(success_response(ContactFollowUpSerializer(ups, many=True).data))


# ==============================================================================
# التحقيقات
# ==============================================================================
class InvestigationViewSet(SurveillanceAccessMixin, SurveillanceRelatedScopeMixin, viewsets.ModelViewSet):
    scope_relation_links = ('case', 'event', 'outbreak')
    queryset = Investigation.objects.select_related(
        'case', 'event', 'outbreak', 'lead_investigator', 'supervisor'
    ).prefetch_related('axes', 'detailed_findings').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['investigation_number', 'title', 'case__case_number', 'event__event_number']
    ordering_fields = ['started_at', 'completed_at']
    filter_fields = ['status', 'priority', 'case', 'event', 'outbreak', 'lead_investigator']

    def get_serializer_class(self):
        if self.action in ('add_axis', 'complete_axis'):
            return InvestigationAxisWriteSerializer
        if self.action == 'add_finding':
            return InvestigationFindingSerializer
        if self.action == 'close':
            return InvestigationCloseSerializer
        if self.action in ('create', 'partial_update'):
            return InvestigationWriteSerializer
        return InvestigationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        investigation = serializer.save()
        if not investigation.lead_investigator_id:
            investigation.lead_investigator = request.user
            investigation.save(update_fields=['lead_investigator'])
        return Response(
            success_response(InvestigationSerializer(investigation).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='axes', serializer_class=InvestigationAxisWriteSerializer)
    def add_axis(self, request, pk=None):
        investigation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        axis = serializer.save(investigation=investigation)
        return Response(
            success_response(InvestigationAxisSerializer(axis).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='complete-axis', serializer_class=InvestigationAxisWriteSerializer)
    def complete_axis(self, request, pk=None):
        investigation = self.get_object()
        axis_id = request.data.get('id') or request.data.get('axis_id')
        if not axis_id:
            return Response(
                {'status': 'error', 'message': 'معرف المحور مطلوب'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            axis = investigation.axes.get(id=axis_id)
        except InvestigationAxis.DoesNotExist:
            return Response(
                {'status': 'error', 'message': 'المحور غير موجود'},
                status=status.HTTP_404_NOT_FOUND,
            )
        InvestigationWorkflowService.complete_axis(
            axis, request.user, request.data.get('findings', '')
        )
        return Response(success_response(InvestigationAxisSerializer(axis).data))

    @action(detail=True, methods=['post'], url_path='findings', serializer_class=InvestigationFindingSerializer)
    def add_finding(self, request, pk=None):
        investigation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        finding = serializer.save(investigation=investigation, created_by=request.user)
        return Response(
            success_response(InvestigationFindingSerializer(finding).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='close', serializer_class=InvestigationCloseSerializer)
    def close(self, request, pk=None):
        investigation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        InvestigationWorkflowService.close_investigation(
            investigation, request.user, serializer.validated_data.get('notes', '')
        )
        return Response(success_response(InvestigationSerializer(investigation).data))


# ==============================================================================
# العينات
# ==============================================================================
class SpecimenViewSet(SurveillanceAccessMixin, SurveillanceRelatedScopeMixin, viewsets.ModelViewSet):
    scope_relation_links = ('case', 'outbreak', 'investigation__case')
    queryset = Specimen.objects.select_related(
        'case', 'laboratory', 'collected_by', 'received_by', 'lab_sample'
    ).prefetch_related('lab_result_detail', 'movements').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['specimen_number', 'case__case_number']
    ordering_fields = ['collected_at', 'created_at', 'received_at']
    filter_fields = ['status', 'specimen_type', 'priority', 'case', 'laboratory', 'outbreak']

    def get_serializer_class(self):
        if self.action == 'transition_specimen':
            return SpecimenTransitionSerializer
        if self.action == 'add_result':
            return SpecimenLabResultCreateSerializer
        if self.action in ('create', 'partial_update'):
            return SpecimenWriteSerializer
        return SpecimenSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = SpecimenSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SpecimenSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        specimen = serializer.save()
        return Response(
            success_response(SpecimenSerializer(specimen).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='transition', serializer_class=SpecimenTransitionSerializer)
    def transition_specimen(self, request, pk=None):
        specimen = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            specimen = SpecimenWorkflowService.transition(
                specimen,
                serializer.validated_data['new_status'],
                request.user,
                serializer.validated_data.get('note', ''),
            )
        except ValueError as exc:
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        specimen = Specimen.objects.select_related(
            'case', 'laboratory', 'collected_by', 'received_by'
        ).get(pk=specimen.pk)
        return Response(success_response(SpecimenSerializer(specimen).data))

    @action(detail=True, methods=['post'], url_path='result', serializer_class=SpecimenLabResultCreateSerializer)
    def add_result(self, request, pk=None):
        specimen = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = SpecimenLabResult.objects.create(
            specimen=specimen,
            disease_id=serializer.validated_data['disease'],
            test_name=serializer.validated_data.get('test_name', ''),
            test_method=serializer.validated_data.get('test_method', ''),
            result_qualitative=serializer.validated_data.get('result_qualitative', 'POSITIVE'),
            result_value=serializer.validated_data.get('result_value', ''),
            interpretation=serializer.validated_data.get('interpretation', ''),
            is_critical=serializer.validated_data.get('is_critical', False),
            entered_by=request.user,
        )
        return Response(
            success_response({'result_id': str(result.pk), 'message': 'تم تسجيل النتيجة'}),
            status=status.HTTP_201_CREATED,
        )


# ==============================================================================
# الإنذارات المبكرة (EWARS)
# ==============================================================================
class AlertRuleViewSet(SurveillanceAccessMixin, viewsets.ModelViewSet):
    queryset = AlertRule.objects.select_related('disease').all()
    serializer_class = AlertRuleSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'disease__name_ar']
    ordering_fields = ['name']
    filter_fields = ['rule_type', 'is_active', 'is_global', 'disease', 'alert_level']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AlertRuleSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AlertRuleSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        rule = self.get_object()
        return Response(success_response(AlertRuleSerializer(rule).data))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rule = serializer.save(is_system=False)
        return Response(
            success_response(AlertRuleSerializer(rule).data),
            status=status.HTTP_201_CREATED,
        )


class SurveillanceAlertViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = SurveillanceAlert.objects.select_related(
        'disease', 'sector', 'locality', 'port', 'event', 'outbreak',
        'trigger_rule', 'evaluated_by', 'resolved_by', 'assigned_to'
    ).prefetch_related('cases', 'evaluations').all()
    http_method_names = ['get', 'patch', 'post']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['alert_number', 'title', 'disease__name_ar']
    ordering_fields = ['generated_at']
    filter_fields = ['alert_type', 'level', 'status', 'evaluation_status', 'disease', 'port', 'sector', 'locality']

    def get_serializer_class(self):
        if self.action == 'acknowledge':
            return AlertAcknowledgeSerializer
        if self.action == 'evaluate':
            return AlertEvaluateSerializer
        if self.action == 'close':
            return AlertCloseSerializer
        if self.action == 'escalate':
            return AlertEscalateOutbreakSerializer
        if self.action == 'partial_update':
            return SurveillanceAlertWriteSerializer
        return SurveillanceAlertSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = SurveillanceAlertSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SurveillanceAlertSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        alert = self.get_object()
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='acknowledge', serializer_class=AlertAcknowledgeSerializer)
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            alert = AlertWorkflowService.acknowledge(
                alert, request.user, serializer.validated_data.get('note', '')
            )
        except ValueError as exc:
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='evaluate', serializer_class=AlertEvaluateSerializer)
    def evaluate(self, request, pk=None):
        alert = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            alert = AlertWorkflowService.evaluate(
                alert,
                request.user,
                serializer.validated_data['decision'],
                serializer.validated_data.get('risk_level', 'MODERATE'),
                serializer.validated_data.get('justification', ''),
                serializer.validated_data.get('recommended_actions', []),
            )
        except ValueError as exc:
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='close', serializer_class=AlertCloseSerializer)
    def close(self, request, pk=None):
        alert = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        alert = AlertWorkflowService.close(
            alert, request.user, serializer.validated_data.get('reason', '')
        )
        return Response(success_response(SurveillanceAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='escalate', serializer_class=AlertEscalateOutbreakSerializer)
    def escalate(self, request, pk=None):
        alert = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        outbreak = OutbreakWorkflowService.create_from_alert(
            alert, request.user, serializer.validated_data
        )
        return Response(
            success_response(OutbreakSerializer(outbreak).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='start-response')
    def start_response(self, request, pk=None):
        alert = self.get_object()
        alert.start_response(request.user)
        return Response(success_response(SurveillanceAlertSerializer(alert).data))


# ==============================================================================
# التفشيات
# ==============================================================================
class OutbreakViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = Outbreak.objects.select_related(
        'disease', 'sector', 'locality', 'port', 'health_facility',
        'lead_epidemiologist', 'response_coordinator', 'origin_alert'
    ).prefetch_related('response_actions', 'response_teams', 'outbreak_cases').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['outbreak_number', 'name', 'disease__name_ar']
    ordering_fields = ['detection_date', 'onset_date']
    filter_fields = ['status', 'severity', 'disease', 'sector', 'locality', 'port', 'mode']

    def get_serializer_class(self):
        if self.action == 'transition':
            return OutbreakStatusSerializer
        if self.action == 'add_action':
            return OutbreakActionSerializer
        if self.action == 'add_team':
            return OutbreakResponseTeamSerializer
        if self.action in ('create', 'partial_update'):
            return OutbreakWriteSerializer
        return OutbreakSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = OutbreakSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = OutbreakSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        outbreak = self.get_object()
        outbreak.update_statistics()
        outbreak.save(update_fields=['total_cases', 'confirmed_cases', 'probable_cases',
                                     'suspected_cases', 'deaths', 'recovered',
                                     'case_fatality_rate', 'updated_at'])
        return Response(success_response(OutbreakSerializer(outbreak).data))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        outbreak = serializer.save()
        return Response(
            success_response(OutbreakSerializer(outbreak).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='transition', serializer_class=OutbreakStatusSerializer)
    def transition(self, request, pk=None):
        outbreak = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            outbreak = OutbreakWorkflowService.transition(
                outbreak, serializer.validated_data['new_status'], request.user
            )
        except ValueError as exc:
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(success_response(OutbreakSerializer(outbreak).data))

    @action(detail=True, methods=['post'], url_path='actions', serializer_class=OutbreakActionSerializer)
    def add_action(self, request, pk=None):
        outbreak = self.get_object()
        serializer = self.get_serializer(data=request.data, context={
            'request': request, 'outbreak': outbreak
        })
        serializer.is_valid(raise_exception=True)
        action = serializer.save()
        return Response(
            success_response(OutbreakResponseActionSerializer(action).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='teams', serializer_class=OutbreakResponseTeamSerializer)
    def add_team(self, request, pk=None):
        outbreak = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        team = serializer.save(outbreak=outbreak)
        return Response(
            success_response(OutbreakResponseTeamSerializer(team).data),
            status=status.HTTP_201_CREATED,
        )


# ==============================================================================
# الأحداث الصحية (EBS)
# ==============================================================================
class HealthEventViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    queryset = HealthEvent.objects.select_related(
        'sector', 'locality', 'port', 'health_facility', 'suspected_disease',
        'reported_by', 'investigation', 'outbreak'
    ).prefetch_related('reports').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['event_number', 'title', 'description']
    ordering_fields = ['reported_at', 'event_date']
    filter_fields = ['event_type', 'status', 'priority', 'source', 'sector',
                     'locality', 'port', 'suspected_disease', 'public_health_risk']

    def get_serializer_class(self):
        if self.action == 'add_report':
            return EventReportSerializer
        if self.action in ('create', 'partial_update'):
            return HealthEventWriteSerializer
        return HealthEventSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = HealthEventSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = HealthEventSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        event = self.get_object()
        return Response(success_response(HealthEventSerializer(event).data))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(reported_by=request.user)
        return Response(
            success_response(HealthEventSerializer(event).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        event = self.get_object()
        if event.status != HealthEventStatus.REPORTED:
            return Response(
                {'status': 'error', 'message': 'فقط الحالات المبلغ عنها تُحقَّق'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        event.verify(request.user)
        return Response(success_response(HealthEventSerializer(event).data))

    @action(detail=True, methods=['post'], url_path='reports', serializer_class=EventReportSerializer)
    def add_report(self, request, pk=None):
        event = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event_report = serializer.save(event=event, reported_by=request.user)
        return Response(
            success_response(EventReportSerializer(event_report).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='mark-investigating')
    def mark_investigating(self, request, pk=None):
        event = self.get_object()
        event.status = HealthEventStatus.INVESTIGATING
        event.save(update_fields=['status'])
        return Response(success_response(HealthEventSerializer(event).data))


# ==============================================================================
# التقارير
# ==============================================================================
class ReportViewSet(SurveillanceAccessMixin, SurveillanceScopeMixin, viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['report_number', 'title']
    ordering_fields = ['period_start', 'period_end', 'created_at']
    filter_fields = ['status', 'sector', 'locality', 'port', 'health_facility']

    def get_queryset(self):
        report_model = self.model
        return report_model.objects.select_related(
            'sector', 'locality', 'port', 'health_facility', 'prepared_by', 'reviewed_by', 'approved_by'
        ).all()

    def get_serializer_class(self):
        if self.action == 'add_line':
            return ReportLineSerializer
        if self.action in ('create', 'partial_update'):
            return self.write_serializer_class
        return self.read_serializer_class

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.read_serializer_class(page, many=True) if page else \
            self.read_serializer_class(queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()
        return Response(success_response(self.read_serializer_class(report).data))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(prepared_by=request.user)
        return Response(
            success_response(self.read_serializer_class(report).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        report = self.get_object()
        report.submit(request.user)
        return Response(success_response(self.read_serializer_class(report).data))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        report = self.get_object()
        report.approve(request.user)
        return Response(success_response(self.read_serializer_class(report).data))

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        report = self.get_object()
        report.publish(request.user)
        return Response(success_response(self.read_serializer_class(report).data))

    @action(detail=True, methods=['post'], url_path='lines', serializer_class=ReportLineSerializer)
    def add_line(self, request, pk=None):
        report = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        line = serializer.save(
            report_content_type=ContentType.objects.get_for_model(report),
            report_object_id=report.pk,
        )
        return Response(
            success_response(ReportLineSerializer(line).data),
            status=status.HTTP_201_CREATED,
        )


class DailyReportViewSet(ReportViewSet):
    model = DailySurveillanceReport
    queryset = DailySurveillanceReport.objects.select_related('sector', 'prepared_by').all()
    read_serializer_class = DailyReportSerializer
    write_serializer_class = DailyReportWriteSerializer


class WeeklyReportViewSet(ReportViewSet):
    model = WeeklySurveillanceReport
    queryset = WeeklySurveillanceReport.objects.select_related('sector', 'prepared_by').all()
    read_serializer_class = serializers.Serializer
    write_serializer_class = DailyReportWriteSerializer

    def _serialize(self, report):
        from apps.surveillance.serializers.reports import WeeklyReportSerializer
        return WeeklyReportSerializer(report).data

    def get_serializer_class(self):
        if self.action == 'add_line':
            return ReportLineSerializer
        if self.action in ('create', 'partial_update'):
            return self.write_serializer_class
        return serializers.Serializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        from apps.surveillance.serializers.reports import WeeklyReportSerializer
        serializer = WeeklyReportSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()
        return Response(success_response(self._serialize(report)))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(prepared_by=request.user)
        return Response(
            success_response(self._serialize(report)),
            status=status.HTTP_201_CREATED,
        )

    def submit(self, request, pk=None):
        report = self.get_object()
        report.submit(request.user)
        return Response(success_response(self._serialize(report)))

    def approve(self, request, pk=None):
        report = self.get_object()
        report.approve(request.user)
        return Response(success_response(self._serialize(report)))

    def publish(self, request, pk=None):
        report = self.get_object()
        report.publish(request.user)
        return Response(success_response(self._serialize(report)))


class MonthlyReportViewSet(ReportViewSet):
    model = MonthlySurveillanceReport
    queryset = MonthlySurveillanceReport.objects.select_related('sector', 'prepared_by').all()
    read_serializer_class = serializers.Serializer
    write_serializer_class = DailyReportWriteSerializer

    def _serialize(self, report):
        from apps.surveillance.serializers.reports import MonthlyReportSerializer
        return MonthlyReportSerializer(report).data

    def get_serializer_class(self):
        if self.action == 'add_line':
            return ReportLineSerializer
        if self.action in ('create', 'partial_update'):
            return self.write_serializer_class
        return serializers.Serializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        from apps.surveillance.serializers.reports import MonthlyReportSerializer
        serializer = MonthlyReportSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()
        return Response(success_response(self._serialize(report)))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(prepared_by=request.user)
        return Response(
            success_response(self._serialize(report)),
            status=status.HTTP_201_CREATED,
        )

    def submit(self, request, pk=None):
        report = self.get_object()
        report.submit(request.user)
        return Response(success_response(self._serialize(report)))

    def approve(self, request, pk=None):
        report = self.get_object()
        report.approve(request.user)
        return Response(success_response(self._serialize(report)))

    def publish(self, request, pk=None):
        report = self.get_object()
        report.publish(request.user)
        return Response(success_response(self._serialize(report)))


class OutbreakReportViewSet(ReportViewSet):
    model = OutbreakReport
    queryset = OutbreakReport.objects.select_related('outbreak', 'sector', 'prepared_by').all()
    read_serializer_class = serializers.Serializer
    write_serializer_class = serializers.Serializer

    def _serialize(self, report):
        from apps.surveillance.serializers.reports import OutbreakReportSerializer
        return OutbreakReportSerializer(report).data

    def get_serializer_class(self):
        if self.action == 'add_line':
            return ReportLineSerializer
        return serializers.Serializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        from apps.surveillance.serializers.reports import OutbreakReportSerializer
        serializer = OutbreakReportSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()
        return Response(success_response(self._serialize(report)))

    def create(self, request, *args, **kwargs):
        return Response(
            {'status': 'error', 'message': 'يُرجى إنشاء التقارير من نظام إدارة التقارير الرئيسي'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def submit(self, request, pk=None):
        report = self.get_object()
        report.submit(request.user)
        return Response(success_response(self._serialize(report)))


class InvestigationReportViewSet(ReportViewSet):
    model = InvestigationReport
    queryset = InvestigationReport.objects.select_related('investigation', 'sector', 'prepared_by').all()
    read_serializer_class = serializers.Serializer
    write_serializer_class = serializers.Serializer

    def _serialize(self, report):
        from apps.surveillance.serializers.reports import InvestigationReportSerializer
        return InvestigationReportSerializer(report).data

    def get_serializer_class(self):
        if self.action == 'add_line':
            return ReportLineSerializer
        return serializers.Serializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        from apps.surveillance.serializers.reports import InvestigationReportSerializer
        serializer = InvestigationReportSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()
        return Response(success_response(self._serialize(report)))

    def create(self, request, *args, **kwargs):
        return Response(
            {'status': 'error', 'message': 'يُرجى إنشاء التقارير من نظام إدارة التقارير الرئيسي'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


# ==============================================================================
# الإشعارات
# ==============================================================================
class NotificationViewSet(SurveillanceAccessMixin, viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    http_method_names = ['get', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'message']
    ordering_fields = ['-created_at']
    filter_fields = ['notification_type', 'priority', 'is_read']

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            return Notification.objects.none()
        if not user.is_superuser:
            self._scope_user = user
            return Notification.objects.filter(recipient=user).all()
        return Notification.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        from apps.surveillance.serializers.notifications import NotificationSerializer
        serializer = NotificationSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        notification = self.get_object()
        from apps.surveillance.serializers.notifications import NotificationSerializer
        return Response(success_response(NotificationSerializer(notification).data))

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_read()
        from apps.surveillance.serializers.notifications import NotificationSerializer
        return Response(success_response(NotificationSerializer(notification).data))

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        count = request.user.surveillance_notifications.filter(is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response(success_response({'marked': count}))

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = request.user.surveillance_notifications.filter(is_read=False).count()
        return Response(success_response({'unread': count}))


# ==============================================================================
# ربط النواقل
# ==============================================================================
class VectorLinkViewSet(SurveillanceAccessMixin, SurveillanceRelatedScopeMixin, viewsets.ModelViewSet):
    scope_relation_links = ('health_case', 'outbreak', 'health_event')
    scope_entry_links = ('vector_focus__entry_point', 'vector_survey__entry_point')
    queryset = VectorSurveillanceLink.objects.select_related(
        'health_case', 'outbreak', 'health_event', 'vector_focus'
    ).all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vector_focus__focus_number', 'health_case__case_number']
    ordering_fields = ['created_at']
    filter_fields = ['status', 'link_type', 'association_strength', 'health_case', 'outbreak']

    def get_serializer_class(self):
        from apps.surveillance.serializers.vector_integration import (
            VectorSurveillanceLinkSerializer, VectorSurveillanceLinkWriteSerializer,
        )
        if self.action in ('create', 'partial_update'):
            return VectorSurveillanceLinkWriteSerializer
        return VectorSurveillanceLinkSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        from apps.surveillance.serializers.vector_integration import VectorSurveillanceLinkSerializer
        serializer = VectorSurveillanceLinkSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    def retrieve(self, request, *args, **kwargs):
        link = self.get_object()
        from apps.surveillance.serializers.vector_integration import VectorSurveillanceLinkSerializer
        return Response(success_response(VectorSurveillanceLinkSerializer(link).data))

    def create(self, request, *args, **kwargs):
        from apps.surveillance.serializers.vector_integration import VectorSurveillanceLinkSerializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        link = serializer.save(created_by=request.user)
        return Response(
            success_response(VectorSurveillanceLinkSerializer(link).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        link = self.get_object()
        link.confirm_link(
            request.user,
            request.data.get('association_strength', 'MODERATE'),
            request.data.get('notes', ''),
        )
        from apps.surveillance.serializers.vector_integration import VectorSurveillanceLinkSerializer
        return Response(success_response(VectorSurveillanceLinkSerializer(link).data))

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        link = self.get_object()
        link.reject_link(request.user, request.data.get('reason', ''))
        from apps.surveillance.serializers.vector_integration import VectorSurveillanceLinkSerializer
        return Response(success_response(VectorSurveillanceLinkSerializer(link).data))