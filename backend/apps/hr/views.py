"""واجهات unidade: موظفو المرحلة 0 (تشخيص) والمرحلة 1 (الملف والمسار).

`ping` نقطة تشخيص للعمّاد والمستخدم معاً: تتحقق من أن التطبيق مُسجَّل،
وأن بوابة `hr_dashboard:view` تعمل، وأن مُحلِّل النطاق يردّ كما يجب
(وطني بلا تقييد، أو نطاق محدّد، أو حجب كامل عند غياب النطاق).
"""

from datetime import timedelta

from django.db import models
from django.db.models import Count, FilteredRelation, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model

from apps.accounts.models import EmployeeProfile
from apps.organization.models import Department, OrgAssignment

from core.filters import ExactFilterBackend
from core.permissions import AdminOrPermissionAction, PermissionAction
from core.utils.response import success_response

from . import attendance_service, leave_service, performance_service, services, training_service
from .permissions import HrScopedAccessPermission
from .models import (
    AttendanceRecord,
    AttendanceStatus,
    CycleStatus,
    EmployeeTimeline,
    EnrollmentStatus,
    LeaveBalance,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
    PerformanceCycle,
    PerformanceKPI,
    PerformanceReview,
    PostingRequest,
    PostingStatus,
    ReviewStatus,
    TrainingEnrollment,
    TrainingPlan,
)
from .scoping import (
    SCOPE_LOOKUPS,
    HRScopedMixin,
    HRWriteScopeMixin,
    is_national_scope,
    resolve_hr_scope_keys,
    resolve_visible_employee_user_ids,
)
from .serializers import (
    AttendanceRecordListSerializer,
    AttendanceRecordWriteSerializer,
    EmployeeDetailSerializer,
    EmployeeListSerializer,
    EmployeeTimelineSerializer,
    HrDashboardSerializer,
    HrEstablishmentSerializer,
    HrLinkableUserSerializer,
    LeaveBalanceSerializer,
    LeaveBalanceWriteSerializer,
    LeaveRequestDetailSerializer,
    LeaveRequestListSerializer,
    LeaveRequestWriteSerializer,
    LeaveTypeSerializer,
    EnrollmentLogSerializer,
    PerformanceCycleSerializer,
    PerformanceKPISerializer,
    PerformanceReviewDetailSerializer,
    PerformanceReviewListSerializer,
    PerformanceReviewSerializer,
    TrainingEnrollmentDetailSerializer,
    TrainingEnrollmentListSerializer,
    TrainingEnrollmentWriteSerializer,
    TrainingPlanSerializer,
    PostingDecisionSerializer,
    PostingRequestDetailSerializer,
    PostingRequestListSerializer,
    PostingRequestWriteSerializer,
    PostingStatusLogSerializer,
)


class HrPingView(APIView):
    """تشخيص نطاق HR للمستخدم الحالي."""

    permission_resource = 'hr_dashboard'
    permission_action = 'view'

    def get_permissions(self):
        return [IsAuthenticated(), PermissionAction('hr_dashboard', 'view')]

    def get(self, request):
        user = request.user
        keys = resolve_hr_scope_keys(user)
        visible = resolve_visible_employee_user_ids(user)

        return Response(success_response(
            {
                'module': 'hr',
                'phase': 1,
                'national_scope': is_national_scope(user),
                'scope_count': None if keys is None else len(keys),
                'visible_employee_count': None if visible is None else len(visible),
            },
            message='وحدة شؤون الموظفين جاهزة',
        ))


class EmployeeViewSet(HRScopedMixin, HRWriteScopeMixin, viewsets.ModelViewSet):
    """ملفات الموظفين، مقصوصة على نطاق المستخدم (المرحلة 1)."""

    permission_resource = 'hr_employee'
    queryset = EmployeeProfile.objects.select_related(
        'user', 'reporting_manager',
    ).annotate(timeline_total=Count('timeline')).order_by('-updated_at')
    employee_user_field = 'user'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['employment_status', 'employment_type', 'gender']
    search_fields = [
        'employee_number', 'full_name_ar', 'full_name_en', 'job_title',
        'user__email', 'user__phone',
    ]
    ordering_fields = [
        'employee_number', 'full_name_ar', 'hire_date', 'created_at', 'updated_at',
    ]

    ordering = ['-updated_at']

    def get_queryset(self):
        qs = super().get_queryset()
        department = self.request.query_params.get('department')
        if department:
            qs = qs.filter(
                user__org_assignments__department_id=department,
                user__org_assignments__is_active=True,
            ).distinct()
        return qs

    def get_serializer_class(self):
        if self.action in ('retrieve', 'update', 'partial_update', 'create'):
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    def get_permissions(self):
        action_map = {
            'list': 'view', 'retrieve': 'view',
            'create': 'add', 'update': 'edit', 'partial_update': 'edit',
            'destroy': 'delete',
        }
        self.permission_action = action_map.get(self.action, 'view')
        return [AdminOrPermissionAction()]

    def perform_create(self, serializer):
        # `validated_data` قاموس لا كائن، فلا ينفع `_resolve_target_user`
        # عليه؛ نفرض النطاق صراحةً على المستخدم المرجعي قبل الإنشاء.
        target_user = serializer.validated_data.get('user')
        if target_user is not None:
            self.assert_within_hr_scope(target_user)
        # عند `new_user` لا يوجد حساب بعد وقت التحقق، فيُنشأ داخل
        # `serializer.create()` ضمن نفس المعاملة. الحساب الجديد بلا نطاقات
        # ولا صلاحيات، فنطاقه مستقل عن الفاعل ويُمنع توريث نطاق الفاعل.
        serializer.save()

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """المسار الوظيفي لموظف واحد (مقصوص بالنطاق عبر queryset الموظف)."""
        employee = self.get_object()
        events = EmployeeTimeline.objects.filter(employee=employee).select_related('created_by')
        return Response(success_response(
            EmployeeTimelineSerializer(events, many=True).data
        ))


class EmployeeTimelineViewSet(HRScopedMixin, HRWriteScopeMixin, viewsets.ModelViewSet):
    """أحداث المسار الوظيفي لكل الموظفين داخل نطاق المستخدم."""

    permission_resource = 'hr_employee'
    queryset = EmployeeTimeline.objects.select_related(
        'employee', 'employee__user', 'created_by',
    ).order_by('-start_date')
    serializer_class = EmployeeTimelineSerializer
    employee_user_field = 'employee__user'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['event', 'employee']
    search_fields = [
        'title', 'reason',
        'old_position', 'new_position',
        'old_department', 'new_department',
        'employee__full_name_ar', 'employee__full_name_en',
    ]
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-start_date']

    def get_queryset(self):
        qs = super().get_queryset()
        employee = self.request.query_params.get('employee')
        if employee:
            qs = qs.filter(employee_id=employee)
        return qs

    def get_permissions(self):
        action_map = {
            'list': 'view', 'retrieve': 'view',
            'create': 'add', 'update': 'edit', 'partial_update': 'edit',
            'destroy': 'delete',
        }
        self.permission_action = action_map.get(self.action, 'view')
        return [AdminOrPermissionAction()]

    def perform_create(self, serializer):
        # `HRWriteScopeMixin.perform_create` لا يصلح هنا: `validated_data`
        # قاموس لا كائن، فنقرأ الموظف صراحةً ونفرض النطاق قبل الحفظ.
        employee = serializer.validated_data.get('employee')
        if employee is not None:
            self.assert_within_hr_scope(employee.user)
        serializer.save(created_by=self.request.user)



class HrLinkableUserViewSet(viewsets.ReadOnlyModelViewSet):
    """حسابات قابلة للربط بملف وظيفي جديد.

    نموذج الموظف يقبل `user` لحساب **بلا** `EmployeeProfile` فقط
    (`EmployeeDetailSerializer` يرفض الحساب الذي له ملف مسبقاً). لذلك هذه
    القائمة هي مصدر مرشّحي «ربط حساب موجود»؛ فقائمة الموظفين تعيد من
    ملفاتهم موجودة أصلاً، فيرفضها الخادم كلها عند الربط.
    """

    permission_resource = 'hr_employee'
    serializer_class = HrLinkableUserSerializer
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ['username', 'email', 'full_name']
    ordering_fields = ['full_name', 'username', 'email']
    ordering = ['full_name']

    def get_permissions(self):
        action_map = {'list': 'view', 'retrieve': 'view'}
        self.permission_action = action_map.get(self.action, 'view')
        return [IsAuthenticated(), AdminOrPermissionAction()]

    def get_queryset(self):
        # النشطون بلا ملف وظيفي فقط، ضمن نطاق مُنشئ الملف.
        qs = get_user_model().objects.filter(
            is_active=True, profile__isnull=True,
        )
        keys = resolve_hr_scope_keys(self.request.user)
        if keys is None:
            return qs
        # لا نطاق → لا مرشحين. الربط يخلق توظيفاً، فلا يجوز أن يجلب
        # موظفاً من خارج نطاقه ليُدرج في سجلّه.
        if not keys:
            return qs.none()
        visible = resolve_visible_employee_user_ids(self.request.user)
        if not visible:
            return qs.none()
        return qs.filter(org_assignments__is_active=True, org_assignments__user_id__in=visible).distinct()


class HrDashboardView(APIView):
    """لوحة الموارد البشرية — كل رقم فيها محسوب من نطاق المستخدم.

    تُبنى الاستعلامات من `scope_employee_queryset()` (المقصوصة بالنطاق)
    بدل `EmployeeProfile.objects` مباشرةً، وإلا رأى مدير قسم أرقاماً
    وطنية تخصّ أقساماً لا يملكها.
    """

    permission_resource = 'hr_dashboard'

    def get_permissions(self):
        self.permission_action = 'view'
        return [IsAuthenticated(), PermissionAction('hr_dashboard', 'view')]

    def scope_employee_queryset(self):
        """قاعدة الموظفين المرئية للمستخدم.

        بلا `select_related` عن قصد: التجميعات هنا تمرّ عبر `values()`،
        و`select_related` يتعارض معها فيلتفظ `annotate` حقلاً نصياً.
        """
        visible = resolve_visible_employee_user_ids(self.request.user)
        if visible is None:
            return EmployeeProfile.objects.all()
        if not visible:
            return EmployeeProfile.objects.none()
        return EmployeeProfile.objects.filter(user_id__in=visible)

    @staticmethod
    def _label_counts(qs, field, limit=8):
        """عدّ الموظفين لكل قيمة في `field`.

        نستعمل `values(field)` ثم نسمّي المفتاح في بايثون بدل
        `values(label=field)`: صيغة الاسم المستعار ترفضه Django عندما
        `label` يصادف اسم حقل في النموذج (و`field` هو اسم حقل هنا).

        `Count('pk', distinct=True)` ضروري لأن الحقول العابرة لعلاقة
        (`user__org_assignments__department__...`) تكرّر الموظف الواحد بعدد
        تعييناته، فالعدّ العادي يضخّم الأرقام.
        """
        rows = (
            qs.exclude(**{f'{field}__isnull': True})
            .values(field)
            .annotate(total=Count('pk', distinct=True))
            .order_by('-total')[:limit]
        )
        return [{'label': r[field], 'value': r['total']} for r in rows]

    def get(self, request):
        today = timezone.localdate()
        window_start = today - timedelta(days=30)
        employees = self.scope_employee_queryset()

        by_status = {
            row['employment_status']: row['n']
            for row in employees.values('employment_status').annotate(n=Count('pk'))
        }
        total = sum(by_status.values())
        active = by_status.get(EmployeeProfile.EmploymentStatus.ACTIVE, 0)

        by_type = self._label_counts(employees, 'employment_type')

        # تجميعات القسم/القطاع تمرّ عبر `org_assignments` الوسيطة. بلا
        # `FilteredRelation` يسلك الـJOIN كل التعيينات بما فيها المنتهية، فيظهر
        # في لوحة مدير قسم أقسامٌ لا يملكها (موظف نُقل منها قبل أشهر).
        # `FilteredRelation` يقصر العلاقة المرشّحة `assign_org` على النشطة فقط،
        # فنعدّ الموظف ضمن تعيينه الحالي حصراً.
        org_qs = self.scope_employee_queryset().annotate(
            assign_org=FilteredRelation(
                'user__org_assignments', condition=Q(user__org_assignments__is_active=True),
            ),
        )
        by_department = self._label_counts(org_qs, 'assign_org__department__name_ar')
        by_sector = self._label_counts(org_qs, 'assign_org__sector__name_ar')

        # المسار الوظيفي مقصوص بالنطاق أيضاً: نمرّ عبر الموظفين المرئيين.
        visible_ids = employees.values('id')
        recent_events = list(
            EmployeeTimeline.objects.filter(employee_id__in=visible_ids)
            .select_related('employee', 'created_by')
            .order_by('-start_date')[:8]
        )
        events_payload = [
            {
                'id': str(e.id),
                'employee': str(e.employee_id),
                'employee_name': e.employee.full_name_ar or e.employee.full_name_en or '',
                'event': e.event,
                'title': e.title,
                'start_date': e.start_date,
                'created_by_name': e.created_by.full_name if e.created_by else None,
            }
            for e in recent_events
        ]

        payload = {
            'total_employees': total,
            'active_employees': active,
            'on_leave': by_status.get(EmployeeProfile.EmploymentStatus.ON_LEAVE, 0),
            'suspended': by_status.get(EmployeeProfile.EmploymentStatus.SUSPENDED, 0),
            'terminated': by_status.get(EmployeeProfile.EmploymentStatus.TERMINATED, 0),
            'new_hires_30d': employees.filter(hire_date__gte=window_start).count(),
            'probations_ending_30d': employees.filter(
                probation_end_date__gte=today, probation_end_date__lte=today + timedelta(days=30),
            ).count(),
            'by_employment_type': by_type,
            'by_department': by_department,
            'by_sector': by_sector,
            'recent_events': events_payload,
            'is_national': is_national_scope(request.user),
            'generated_at': timezone.now(),
        }
        return Response(success_response(payload, message='لوحة الموارد البشرية'))


class HrEstablishmentViewSet(viewsets.ReadOnlyModelViewSet):
    """الوحدات التأسيسية داخل نطاق HR.

    لا ننشئ نماذج جديدة: الوحدات (`Department`) والقطاعات مُعرَّفة أصلاً في
    `apps.organization` ومصدر الحقيقة للنطاق. نعرضها هنا تحت صلاحية
    `hr_establishment` لأن موظف HR يحتاج قراءة هيكل نطاقه دون امتلاك
    صلاحية `organization` (فصل المهام).
    """

    permission_resource = 'hr_establishment'
    serializer_class = HrEstablishmentSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['sector', 'kind', 'is_active']
    search_fields = ['code', 'name_ar', 'name_en']
    ordering_fields = ['code', 'name_ar', 'order', 'created_at']
    ordering = ['order', 'name_ar']

    def get_permissions(self):
        # `ReadOnlyModelViewSet` لا يضع `AdminOrPermissionAction` افتراضياً،
        # فبلا هذا يقرأ أي مستخدم مصادَق الوحدات بلا `hr_establishment:view`.
        action_map = {'list': 'view', 'retrieve': 'view'}
        self.permission_action = action_map.get(self.action, 'view')
        return [IsAuthenticated(), AdminOrPermissionAction()]

    def get_queryset(self):
        user = self.request.user
        keys = resolve_hr_scope_keys(user)
        visible = resolve_visible_employee_user_ids(user)

        base = Department.objects.select_related('parent', 'sector', 'manager_position')

        # بلا أي نطاق → حجب كامل. النطاق الوطني (keys is None) → الكل.
        if keys is None:
            qs = base.all()
        elif not keys:
            return base.none()
        else:
            # مفاتيح النطاق أزواج `(scope_type, scope_id)`؛ نجمع معرّفات كل نوع.
            ids = {scope_type: set() for scope_type in SCOPE_LOOKUPS}
            for scope_type, scope_id in keys:
                ids.setdefault(scope_type, set()).add(scope_id)
            sector_ids = ids['SECTOR'] | ids['REGION']
            department_ids = ids['DEPARTMENT']
            station_ids = ids['STATION']
            point_ids = ids['POINT'] | ids['PORT']

            qs = base.filter(
                models.Q(sector_id__in=sector_ids)
                | models.Q(id__in=department_ids)
                | models.Q(stations__id__in=station_ids)
            ).distinct()

            # `POINT`/`PORT` وحدهما يصفان نقاط الدخول، وترتبط بالوحدات عبر
            # التعيينات النشطة لا عبر علاقة مباشرة على `Department`.
            # `REGION` ليس منها: هو قطاع إداري (`organization.Sector`) joining
            # في `sector_ids` أعلاه — انظر `hr.scoping.SCOPE_LOOKUPS`.
            if point_ids:
                via_point = OrgAssignment.objects.filter(
                    entry_point_id__in=point_ids, is_active=True,
                ).values_list('department_id', flat=True)
                qs = qs.filter(models.Q(id__in=via_point)).distinct()

        if visible is not None:
            # لا نكشف وحدة خارج نطاق الموظف ولا وحدة بلا موظفين مرئيين.
            if not visible:
                return base.none()
            in_scope = qs.filter(
                assignments__is_active=True, assignments__user_id__in=visible,
            ).values('id')
            qs = qs.filter(models.Q(id__in=in_scope))

        # `qs` مقصور مسبقاً بـ`in_scope` (تعيينات نشطة × مرئية)، فالعدّاد
        # لا يخرج عن النطاق ما دام ذلك الشرط مستقراً. نكرّر مرشّح `visible`
        # هنا أيضاً امتثالاً لمبدأ أقل صلاحية: لو أُزيل `in_scope` يوماً
        # لما تسرّب العدّاد وحده.
        active_assignment = models.Q(assignments__is_active=True)
        if visible is not None:
            active_assignment &= models.Q(assignments__user_id__in=visible)
        return qs.annotate(
            hr_headcount=Count('assignments', filter=active_assignment, distinct=True),
        )


class PostingRequestViewSet(HRScopedMixin, HRWriteScopeMixin, viewsets.ModelViewSet):
    """طلبات النقل/الترقية/الخفض.

    النطاق مزدوج: موظف HR يرى طلبات نطاقه الإداري، والموظف يرى طلباته
    الذاتية فقط (قاعدة `is_own` في `get_queryset`). أي موظف آخر غير مرئي
    حتى لو كان له دور إداري.
    """

    permission_resource = 'hr_posting'
    employee_user_field = 'employee__user'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['status', 'kind', 'employee', 'is_self_service']
    search_fields = ['employee__full_name_ar', 'employee__full_name_en', 'employee__employee_number']
    ordering_fields = ['created_at', 'decided_at', 'effective_date', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PostingRequestWriteSerializer
        if self.action in ('approve', 'reject', 'submit', 'cancel', 'timeline'):
            return PostingDecisionSerializer
        return PostingRequestDetailSerializer if self.action == 'retrieve' else PostingRequestListSerializer

    def get_permissions(self):
        # `approve`/`reject` تحتاج `hr_posting:approve|reject` لا `edit`:
        # من له `edit` يعدّل، أما القرار فمسار بصلاحية منفصلة. ولا تُفتح
        # البوابة للخدمة الذاتية أبداً: يعتمد الموظفُ ولا يعتمد نفسه.
        if self.action == 'approve':
            return [IsAuthenticated(), PermissionAction('hr_posting', 'approve')]
        if self.action == 'reject':
            return [IsAuthenticated(), PermissionAction('hr_posting', 'reject')]
        # الخدمة الذاتية: موظف بلا `hr_posting:*` يرسل طلبه ويلغيه
        # ويقرأ طلباته، و`get_queryset` يحصرها في طلباته هو. أما
        # `approve`/`reject` فلا تُفتح لهما أبداً.
        return [IsAuthenticated(), HrScopedAccessPermission()]

    #: لا نستخدم `queryset` بل `get_queryset()` لأن التقييد يختلف بين
    #: HR الإداري والموظف (خدمة ذاتية)، و`HRScopedMixin` يبني فوق
    #: `super().get_queryset()` الذي يقرأ `self.queryset`.
    base_queryset = PostingRequest.objects.select_related(
        'employee', 'employee__user', 'target_position', 'target_department',
        'target_sector', 'target_entry_point', 'requested_by', 'decided_by',
    )

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return self.base_queryset.none()
        # الخدمة الذاتية: صاحب الملف يرى طلباته هو فقط.
        if self._is_self_service_request():
            return self.base_queryset.filter(employee__user=user)
        # إدارة HR: تقييد النطاق الإداري. نطبّق `HRScopedMixin` يدوياً على
        # `base_queryset` لأن `super()` سيرجع إلى `self.queryset` الفارغ.
        if user.is_superuser:
            return self.base_queryset
        visible = resolve_visible_employee_user_ids(user)
        if visible is None:
            return self.base_queryset
        if not visible:
            return self.base_queryset.none()
        return self.base_queryset.filter(employee__user_id__in=list(visible)).distinct()

    def _is_self_service_request(self):
        """هل هذا المستخدم موظف بلا أي صلاحية إدارية على `hr_posting`؟

        لا يصحّ الفحص بـ`add` وحدها: `HR_APPROVER` يحمل
        `view/approve/reject` بلا `add`، فمعه يظنّ خطأً من لا يملك صلاحية
        إدارية فيراه على أنه صاحب طلباته هو — فلا يجد طلباً يعتمدُه.
        """
        user = self.request.user
        if not user or user.is_anonymous:
            return False
        if user.is_superuser or user.is_staff:
            return False
        return not any(
            user.can(f'hr_posting:{action}')
            for action in ('view', 'add', 'edit', 'delete', 'approve', 'reject')
        )

    def perform_create(self, serializer):
        employee = serializer.validated_data['employee']
        actor = self.request.user
        # الخدمة الذاتية: الموظف يُنشئ طلباً لنفسه فيُوسم `is_self_service`.
        is_self = actor.pk == employee.user_id
        serializer.save(requested_by=actor, is_self_service=is_self)

    def perform_update(self, serializer):
        posting = serializer.instance
        # لا تعديل إلا للمسودة: `SUBMITTED` معروض على المعتمد، وتعديله بعد
        # العرض يجعل المُعتمد يوافق على غير ما قُدم له.
        if not posting.is_editable():
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'status': f'لا يمكن تعديل طلب في حالة «{posting.get_status_display()}»'}
            )
        self.assert_within_hr_scope(posting.employee.user)
        return super().perform_update(serializer)

    def perform_destroy(self, instance):
        self.assert_within_hr_scope(instance.employee.user)
        if instance.status not in (PostingStatus.DRAFT,):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'يُحذف الطلب في حالة المسودة فقط'})
        return super().perform_destroy(instance)

    # ------------------------------------------------------------------
    # إجراءات دورة الحالة
    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        posting = self.get_object()
        posting = services.submit_posting(posting, request.user)
        return Response(success_response(self.get_detail(posting), message='تم إرسال الطلب للاعتماد'))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        posting = self.get_object()
        posting = services.cancel_posting(posting, request.user, note=request.data.get('note', ''))
        return Response(success_response(self.get_detail(posting), message='تم إلغاء الطلب'))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        posting = self.get_object()
        posting = services.approve_posting(posting, request.user, note=request.data.get('note', ''))
        return Response(success_response(self.get_detail(posting), message='تم اعتماد الطلب وتطبيق النقل'))

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        posting = self.get_object()
        posting = services.reject_posting(
            posting, request.user,
            reason=request.data.get('rejection_reason', ''),
            note=request.data.get('note', ''),
        )
        return Response(success_response(self.get_detail(posting), message='تم رفض الطلب'))

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        posting = self.get_object()
        logs = posting.status_logs.select_related('changed_by')
        return Response(success_response(
            PostingStatusLogSerializer(logs, many=True).data,
            message='سجل حالة الطلب',
        ))

    def get_detail(self, posting):
        return PostingRequestDetailSerializer(posting).data


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """سجلات الحضور والانصراف اليومية.

    النطاق مزدوج كسجلات النقل: HR يرى نطاقه الإداري، والموظف سجلاته
    هو فقط. الاعتماد مسار منفصل بصلاحية `hr_attendance:approve`، والمُسجِّل
    لا يعتمد سجله (`AttendanceRecord.can_approve`).
    """

    permission_resource = 'hr_attendance'
    employee_user_field = 'employee__user'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['status', 'employee', 'is_approved', 'date', 'shift_code']
    search_fields = ['employee__full_name_ar', 'employee__full_name_en', 'employee__employee_number']
    ordering_fields = ['date', 'created_at', 'status']
    ordering = ['-date']

    base_queryset = AttendanceRecord.objects.select_related(
        'employee', 'employee__user', 'recorded_by', 'approved_by',
    )

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return AttendanceRecordWriteSerializer
        return AttendanceRecordListSerializer

    def get_permissions(self):
        if self.action == 'approve':
            return [IsAuthenticated(), PermissionAction('hr_attendance', 'approve')]
        if self.action == 'unapprove':
            return [IsAuthenticated(), PermissionAction('hr_attendance', 'approve')]
        return [IsAuthenticated(), HrScopedAccessPermission()]

    def _is_self_service_user(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return False
        if user.is_superuser or user.is_staff:
            return False
        return not any(
            user.can(f'hr_attendance:{action}')
            for action in ('view', 'add', 'edit', 'delete', 'approve')
        )

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return self.base_queryset.none()
        if self._is_self_service_user():
            # الموظف يقرأ سجلاته هو فقط.
            return self.base_queryset.filter(employee__user=user)
        if user.is_superuser:
            return self.base_queryset
        visible = resolve_visible_employee_user_ids(user)
        if visible is None:
            return self.base_queryset
        if not visible:
            return self.base_queryset.none()
        return self.base_queryset.filter(employee__user_id__in=list(visible)).distinct()

    def perform_create(self, serializer):
        # `recorded_by` من هوية المرسل لا من جسم الطلب.
        serializer.save(recorded_by=self.request.user)

    def perform_update(self, serializer):
        record = serializer.instance
        if record.is_approved:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'status': 'لا يمكن تعديل سجل معتمد — اسحب الاعتماد أولاً'})
        self.assert_within_hr_scope(record.employee.user)

    def perform_destroy(self, instance):
        # سجل معتمد واقعة محاسبية: لا يُحذف.
        if instance.is_approved:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'لا يُحذف سجل حضور معتمد'})
        self.assert_within_hr_scope(instance.employee.user)
        return super().perform_destroy(instance)

    def assert_within_hr_scope(self, target_user):
        from rest_framework.exceptions import PermissionDenied
        from .scoping import user_within_hr_scope
        if not user_within_hr_scope(target_user, self.request.user):
            raise PermissionDenied('لا تملك صلاحية الكتابة خارج نطاقك الإداري')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        record = self.get_object()
        record = attendance_service.approve_record(
            record, request.user, note=request.data.get('note', ''),
        )
        return Response(success_response(
            AttendanceRecordListSerializer(record).data,
            message='تم اعتماد سجل الحضور',
        ))

    @action(detail=True, methods=['post'])
    def unapprove(self, request, pk=None):
        record = self.get_object()
        record = attendance_service.unapprove_record(
            record, request.user, note=request.data.get('note', ''),
        )
        return Response(success_response(
            AttendanceRecordListSerializer(record).data,
            message='تم سحب اعتماد السجل',
        ))

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """تجميع حضور الموظف الحالي over فترة — لبطاقة «ساعتي»."""
        employee = getattr(request.user, 'profile', None)
        if employee is None:
            return Response(
                success_response({}, message='لا يوجد ملف وظيفي'),
            )
        days = int(request.query_params.get('days', 30))
        days = max(1, min(days, 365))
        today = timezone.localdate()
        window_start = today - timedelta(days=days - 1)
        rows = AttendanceRecord.objects.filter(
            employee=employee, date__gte=window_start, date__lte=today,
        )
        counts = {row['status']: row['n'] for row in rows.values('status').annotate(n=Count('pk'))}
        worked = sum(
            r.worked_minutes() + (r.overtime_minutes or 0)
            for r in rows.only('check_in', 'check_out', 'overtime_minutes')
        )
        return Response(success_response({
            'period_days': days,
            'present_days': counts.get(AttendanceStatus.PRESENT, 0),
            'absent_days': counts.get(AttendanceStatus.ABSENT, 0),
            'late_days': counts.get(AttendanceStatus.LATE, 0),
            'leave_days': counts.get(AttendanceStatus.ON_LEAVE, 0),
            'remote_days': counts.get(AttendanceStatus.REMOTE, 0),
            'off_days': counts.get(AttendanceStatus.OFF_DAY, 0),
            'total_overtime_minutes': sum(rows.values_list('overtime_minutes', flat=True)),
            'total_worked_minutes': worked,
            'pending_approval': rows.filter(is_approved=False).count(),
        }, message='ملخص الحضور'))


class LeaveTypeViewSet(viewsets.ModelViewSet):
    """أنواع الإجازات — جدول مرجعي.

    الكتابة إدارية فقط: نوع إجازة جدول نظام لا بيانات موظف، فلا يحتاج تقييد
    نطاق (لا يرتبط بموظف). أمّا القراءة فليست إدارية: الموظف يحتاج قائمة
    الأنواع ليملأ طلب إجازته، فتمرّ عبر البوابة المشتركة.
    """

    permission_resource = 'hr_leave'
    queryset = LeaveType.objects.all()
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['is_paid', 'requires_document', 'is_active']
    search_fields = ['code', 'name_ar', 'name_en']
    ordering_fields = ['order', 'code', 'name_ar']
    ordering = ['order', 'name_ar']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return LeaveTypeSerializer
        return LeaveTypeSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            # الموظف يقرأ الأنواع ليملأ طلبه؛ الكتابة تبقى إدارية.
            return [IsAuthenticated(), HrScopedAccessPermission()]
        return [IsAuthenticated(), PermissionAction('hr_leave', 'add' if self.action == 'create' else 'edit')]

    def perform_destroy(self, instance):
        # نوع مستخدَم في طلبات لا يُحذف؛ يُعطَّل.
        if instance.requests.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'النوع مستخدَم في طلبات — عطّله بدل حذفه'})
        return super().perform_destroy(instance)


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    """أرصدة الإجازات: منح الاستحقاق للموظفين.

    لا تقييد نطاق على الجدول كله (فقد يُسأل عن أي رصيد) — بل يُقيَّد كل سجل
    عند القراءة والكتابة بموظفه ضمن نطاق المستخدم.
    """

    permission_resource = 'hr_leave'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['year', 'leave_type', 'employee']
    search_fields = ['employee__full_name_ar', 'employee__full_name_en']
    ordering_fields = ['year', 'entitled_days', 'carried_over_days']
    ordering = ['-year', 'leave_type__order']

    def get_queryset(self):
        user = self.request.user
        qs = LeaveBalance.objects.select_related('employee', 'employee__user', 'leave_type')
        if not user or user.is_anonymous:
            return qs.none()
        if user.is_superuser:
            return qs
        if not any(
            user.can(f'hr_leave:{a}') for a in ('view', 'add', 'edit', 'delete')
        ):
            # موظف عادي: أرصدته هو فقط.
            return qs.filter(employee__user=user)
        visible = resolve_visible_employee_user_ids(user)
        if visible is None:
            return qs
        if not visible:
            return qs.none()
        return qs.filter(employee__user_id__in=list(visible)).distinct()

    def get_serializer_class(self):
        return (LeaveBalanceWriteSerializer if self.action in
                ('create', 'update', 'partial_update') else LeaveBalanceSerializer)

    def get_permissions(self):
        # القراءة متاحة للخدمة الذاتية: الموظف يرى رصيده هو (و`get_queryset`
        # يحصره فيه). الكتابة ممنوعة على الموظف عمداً: nobody يمنح
        # entitlements — therefore `PermissionAction` لا `HrScopedAccessPermission`.
        if self.action in ('list', 'retrieve', 'summary'):
            return [IsAuthenticated(), HrScopedAccessPermission()]
        if self.action == 'create':
            return [IsAuthenticated(), PermissionAction('hr_leave', 'add')]
        if self.action in ('update', 'partial_update'):
            return [IsAuthenticated(), PermissionAction('hr_leave', 'edit')]
        return [IsAuthenticated(), PermissionAction('hr_leave', 'delete')]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """أرصدة الموظف الحالي — لبطاقة «إجازاتي»."""
        employee = getattr(request.user, 'profile', None)
        if employee is None:
            return Response(success_response({}, message='لا يوجد ملف وظيفي'))
        year = int(request.query_params.get('year', timezone.localdate().year))
        items = list(
            LeaveBalance.objects.filter(employee=employee, year=year)
            .select_related('leave_type').order_by('leave_type__order')
        )
        return Response(success_response({
            'year': year,
            'items': LeaveBalanceSerializer(items, many=True).data,
            'total_available': sum((i.available_days() for i in items), start=0),
        }, message='أرصدة الإجازات'))


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """طلبات الإجازة.

    موظف HR يرى طلبات نطاقه الإداري، والموظف يرى طلباته هو ويرى رصيده
    عبر `summary`. الاعتماد والرفض مسارات بصلاحيات منفصلة، والمُقدِّم لا
    يعتمد طلبه (`LeaveRequest.can_decide`).
    """

    permission_resource = 'hr_leave'
    employee_user_field = 'employee__user'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['status', 'leave_type', 'employee', 'year', 'is_self_service']
    search_fields = ['employee__full_name_ar', 'employee__full_name_en', 'employee__employee_number']
    ordering_fields = ['created_at', 'start_date', 'status', 'days']
    ordering = ['-created_at']

    base_queryset = LeaveRequest.objects.select_related(
        'employee', 'employee__user', 'leave_type', 'substitute',
        'requested_by', 'decided_by',
    )

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return LeaveRequestWriteSerializer
        return LeaveRequestDetailSerializer if self.action == 'retrieve' else LeaveRequestListSerializer

    def create(self, request, *args, **kwargs):
        """ينشئ الطلب ثم يردّ بالشكل المقروء.

        `get_serializer_class` يجب أن يبقى ماسكلَل الإدخال والتحقق؛ الردّ
        يُبنى صراحةً بـ`LeaveRequestListSerializer` لأن حقول القراءة
        (`id`, `year`, `days`) غير موجودة في مسلسل الكتابة.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.validated_data['employee']
        instance = serializer.save(
            requested_by=request.user,
            is_self_service=request.user.pk == employee.user_id,
        )
        return Response(
            success_response(LeaveRequestListSerializer(instance).data),
            status=status.HTTP_201_CREATED,
        )

    def get_permissions(self):
        if self.action == 'approve':
            return [IsAuthenticated(), PermissionAction('hr_leave', 'approve')]
        if self.action == 'reject':
            return [IsAuthenticated(), PermissionAction('hr_leave', 'reject')]
        return [IsAuthenticated(), HrScopedAccessPermission()]

    def _is_self_service_user(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return False
        if user.is_superuser or user.is_staff:
            return False
        return not any(
            user.can(f'hr_leave:{a}')
            for a in ('view', 'add', 'edit', 'delete', 'approve', 'reject')
        )

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return self.base_queryset.none()
        if self._is_self_service_user():
            return self.base_queryset.filter(employee__user=user)
        if user.is_superuser:
            return self.base_queryset
        visible = resolve_visible_employee_user_ids(user)
        if visible is None:
            return self.base_queryset
        if not visible:
            return self.base_queryset.none()
        return self.base_queryset.filter(employee__user_id__in=list(visible)).distinct()

    def perform_update(self, serializer):
        leave = serializer.instance
        if not leave.is_editable():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'status': 'يُعدَّل الطلب في حالة المسودة فقط'})
        self.assert_within_hr_scope(leave.employee.user)

    def perform_destroy(self, instance):
        if instance.status != LeaveRequestStatus.DRAFT:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'يُحذف الطلب في حالة المسودة فقط'})
        self.assert_within_hr_scope(instance.employee.user)
        return super().perform_destroy(instance)

    def assert_within_hr_scope(self, target_user):
        from rest_framework.exceptions import PermissionDenied
        from .scoping import user_within_hr_scope
        if not user_within_hr_scope(target_user, self.request.user):
            raise PermissionDenied('لا تملك صلاحية الكتابة خارج نطاقك الإداري')

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        leave = self.get_object()
        leave = leave_service.submit_leave(leave, request.user)
        return Response(success_response(self.get_detail(leave), message='تم إرسال الطلب'))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        leave = self.get_object()
        leave = leave_service.cancel_leave(leave, request.user, note=request.data.get('note', ''))
        return Response(success_response(self.get_detail(leave), message='تم إلغاء الطلب'))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave = leave_service.approve_leave(leave, request.user, note=request.data.get('note', ''))
        return Response(success_response(self.get_detail(leave), message='تم اعتماد الإجازة'))

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave = leave_service.reject_leave(
            leave, request.user,
            reason=request.data.get('rejection_reason', ''),
            note=request.data.get('note', ''),
        )
        return Response(success_response(self.get_detail(leave), message='تم رفض الطلب'))

    def get_detail(self, leave):
        return LeaveRequestDetailSerializer(leave).data


class TrainingPlanViewSet(viewsets.ModelViewSet):
    """كتالوج الدورات التدريبية.

    مرجع إداري لا يرتبط بموظف، فلا يحتاج تقييد نطاق. الكتابة محصورة في
    `hr_training:edit`/`add`؛ الموظف يقرأ فقط.
    """

    permission_resource = 'hr_training'
    serializer_class = TrainingPlanSerializer
    queryset = TrainingPlan.objects.all()
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['is_active', 'is_mandatory', 'delivery_mode', 'provider']
    search_fields = ['code', 'name_ar', 'name_en', 'provider']
    ordering_fields = ['order', 'code', 'name_ar', 'duration_hours', 'cost']
    ordering = ['order', 'name_ar']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            # الموظف يقرأ الدورات ليختار ما يشترك فيه؛ الإنشاء إداري.
            return [IsAuthenticated(), HrScopedAccessPermission()]
        if self.action == 'create':
            return [IsAuthenticated(), PermissionAction('hr_training', 'add')]
        if self.action in ('update', 'partial_update'):
            return [IsAuthenticated(), PermissionAction('hr_training', 'edit')]
        return [IsAuthenticated(), PermissionAction('hr_training', 'delete')]

    def perform_destroy(self, instance):
        # دورة لها تسجيلات لا تُحذف؛ تُعطَّل.
        if instance.enrollments.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'الدورة لها تسجيلات — عطّلها بدل حذفها'})
        return super().perform_destroy(instance)


class TrainingEnrollmentViewSet(viewsets.ModelViewSet):
    """تسجيل الموظفين في الدورات التدريبية."""

    permission_resource = 'hr_training'
    employee_user_field = 'employee__user'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['status', 'plan', 'employee', 'is_self_service']
    search_fields = ['employee__full_name_ar', 'employee__employee_number', 'plan__name_ar']
    ordering_fields = ['created_at', 'requested_date', 'start_date', 'status']
    ordering = ['-created_at']

    base_queryset = TrainingEnrollment.objects.select_related(
        'employee', 'employee__user', 'plan', 'requested_by', 'decided_by',
    )

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TrainingEnrollmentWriteSerializer
        return (TrainingEnrollmentDetailSerializer if self.action == 'retrieve'
                else TrainingEnrollmentListSerializer)

    def get_permissions(self):
        if self.action == 'approve':
            return [IsAuthenticated(), PermissionAction('hr_training', 'approve')]
        if self.action == 'complete':
            return [IsAuthenticated(), PermissionAction('hr_training', 'edit')]
        return [IsAuthenticated(), HrScopedAccessPermission()]

    def _is_self_service_user(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return False
        if user.is_superuser or user.is_staff:
            return False
        return not any(
            user.can(f'hr_training:{a}')
            for a in ('view', 'add', 'edit', 'delete', 'approve')
        )

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return self.base_queryset.none()
        if self._is_self_service_user():
            return self.base_queryset.filter(employee__user=user)
        if user.is_superuser:
            return self.base_queryset
        visible = resolve_visible_employee_user_ids(user)
        if visible is None:
            return self.base_queryset
        if not visible:
            return self.base_queryset.none()
        return self.base_queryset.filter(employee__user_id__in=list(visible)).distinct()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.validated_data['employee']
        instance = serializer.save(
            requested_by=request.user,
            is_self_service=request.user.pk == employee.user_id,
        )
        return Response(
            success_response(TrainingEnrollmentListSerializer(instance).data),
            status=status.HTTP_201_CREATED,
        )

    def perform_update(self, serializer):
        enrollment = serializer.instance
        if not enrollment.is_editable():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'status': 'التسجيل غير قابل للتعديل في حالته'})
        self.assert_within_hr_scope(enrollment.employee.user)

    def perform_destroy(self, instance):
        if instance.status not in (EnrollmentStatus.DRAFT, EnrollmentStatus.REQUESTED):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'لا يُحذف تسجيل بعد اعتماده'})
        self.assert_within_hr_scope(instance.employee.user)
        return super().perform_destroy(instance)

    def assert_within_hr_scope(self, target_user):
        from rest_framework.exceptions import PermissionDenied
        from .scoping import user_within_hr_scope
        if not user_within_hr_scope(target_user, self.request.user):
            raise PermissionDenied('لا تملك صلاحية الكتابة خارج نطاقك الإداري')

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        enrollment = training_service.submit_enrollment(self.get_object(), request.user)
        return Response(success_response(
            TrainingEnrollmentDetailSerializer(enrollment).data, message='تم إرسال الطلب',
        ))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        enrollment = training_service.approve_enrollment(
            self.get_object(), request.user, note=request.data.get('note', ''),
        )
        return Response(success_response(
            TrainingEnrollmentDetailSerializer(enrollment).data, message='تم اعتماد الاشتراك',
        ))

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        enrollment = training_service.reject_enrollment(
            self.get_object(), request.user,
            reason=request.data.get('rejection_reason', ''),
            note=request.data.get('note', ''),
        )
        return Response(success_response(
            TrainingEnrollmentDetailSerializer(enrollment).data, message='تم رفض الطلب',
        ))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        enrollment = training_service.cancel_enrollment(
            self.get_object(), request.user, note=request.data.get('note', ''),
        )
        return Response(success_response(
            TrainingEnrollmentDetailSerializer(enrollment).data, message='تم إلغاء الاشتراك',
        ))

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """تسجيل الدرجة والإتمام — الحالة تُشتق من درجة الاجتياز."""
        score = request.data.get('score')
        enrollment = training_service.record_completion(
            self.get_object(), request.user,
            score=score,
            certificate_ref=request.data.get('certificate_ref', ''),
        )
        return Response(success_response(
            TrainingEnrollmentDetailSerializer(enrollment).data,
            message='اجتاز' if enrollment.status == EnrollmentStatus.COMPLETED else 'لم يجتز',
        ))

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        enrollment = self.get_object()
        return Response(success_response(
            EnrollmentLogSerializer(enrollment.status_logs.all(), many=True).data,
            message='سجل الحالة',
        ))


class PerformanceCycleViewSet(viewsets.ModelViewSet):
    """دورات تقييم الأداء ومؤشراتها."""

    permission_resource = 'hr_performance'
    serializer_class = PerformanceCycleSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['status', 'department']
    search_fields = ['name']
    ordering_fields = ['period_start', 'name', 'status']
    ordering = ['-period_start']

    def get_queryset(self):
        return PerformanceCycle.objects.select_related('department').prefetch_related('kpis')

    def get_permissions(self):
        # فتح/إغلاق الدورة قرار المعتمد؛ `status` غير قابل للكتابة في
        # الـAPI فلا بد من مسار صريح، وصلاحية صريحة لا البوابة المشتركة
        # حتى لا تسقط في فرع الخدمة الذاتية.
        if self.action in ('open', 'close'):
            return [IsAuthenticated(), PermissionAction('hr_performance', 'approve')]
        if self.action in ('kpis', 'kpi_detail'):
            # كتابة المؤشرات تتطلّب `edit`، وقراءتها `view`؛ البوابة
            # المشتركة تختار بالطريقة وتسمح للخدمة الذاتية بالقراءة.
            return [IsAuthenticated(), HrScopedAccessPermission()]
        if self.action in ('list', 'retrieve'):
            # الموظف يقرأ الدورة المفتوحة ليعرف ما يُقيَّم به؛ أمّا عدّاد
            # التقييمات المعتمدة فلا يخصّه، فيُخفى عنه (انظر
            # `PerformanceCycleSerializer`).
            return [IsAuthenticated(), HrScopedAccessPermission()]
        if self.action == 'create':
            return [IsAuthenticated(), PermissionAction('hr_performance', 'add')]
        if self.action in ('update', 'partial_update'):
            return [IsAuthenticated(), PermissionAction('hr_performance', 'edit')]
        return [IsAuthenticated(), PermissionAction('hr_performance', 'delete')]

    def perform_update(self, serializer):
        if not serializer.instance.is_editable():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'الدورة المفتوحة أو المغلقة لا تُعدَّل'})
        return super().perform_update(serializer)

    def perform_destroy(self, instance):
        if instance.reviews.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'الدورة لها تقييمات — أرشفها بدل حذفها'})
        return super().perform_destroy(instance)

    @action(detail=True, methods=['get', 'post'], url_path='kpis')
    def kpis(self, request, pk=None):
        """مؤشرات الدورة. الكتابة متاحة ما دامت مسودة."""
        cycle = self.get_object()
        if request.method == 'GET':
            return Response(success_response(
                PerformanceKPISerializer(cycle.kpis.all(), many=True).data,
                message='مؤشرات الدورة',
            ))
        if not cycle.is_editable():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'لا تُضاف مؤشرات لدورة غير مسودة'})
        serializer = PerformanceKPISerializer(data={**request.data, 'cycle': cycle.pk})
        serializer.is_valid(raise_exception=True)
        kpi = serializer.save()
        return Response(
            success_response(PerformanceKPISerializer(kpi).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get', 'patch', 'delete'], url_path='kpis/(?P<kpi_id>[^/.]+)')
    def kpi_detail(self, request, pk=None, kpi_id=None):
        """مؤشر واحد داخل الدورة — تصحيح وزن أو حذف مؤشر أُدخل بالخطأ.

        لا يوجد مسار مستقل لـ`PerformanceKPI`، فمن يملك صلاحية الدورة
        يستطيع قراءة مؤشرها وتعديله.
        """
        cycle = self.get_object()
        kpi = get_object_or_404(PerformanceKPI, pk=kpi_id, cycle=cycle)
        if request.method == 'GET':
            return Response(success_response(PerformanceKPISerializer(kpi).data))
        if not cycle.is_editable():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'لا تُعدَّل مؤشرات دورة غير مسودة'})
        if request.method == 'DELETE':
            kpi.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = PerformanceKPISerializer(kpi, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(success_response(serializer.data, message='حُفظ المؤشر'))

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        """فتح دورة مسودة للتقييم."""
        cycle = performance_service.open_cycle(self.get_object(), request.user)
        return Response(success_response(
            PerformanceCycleSerializer(cycle).data, message='فُتحت الدورة',
        ))

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        cycle = performance_service.close_cycle(self.get_object(), request.user)
        return Response(success_response(
            PerformanceCycleSerializer(cycle).data, message='تم إغلاق الدورة',
        ))


class PerformanceReviewViewSet(viewsets.ModelViewSet):
    """تقييمات أداء الموظفين داخل الدورات."""

    permission_resource = 'hr_performance'
    employee_user_field = 'employee__user'
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['status', 'cycle', 'employee', 'rating']
    search_fields = ['employee__full_name_ar', 'employee__employee_number', 'cycle__name']
    ordering_fields = ['created_at', 'total_score', 'status']
    ordering = ['-created_at']

    base_queryset = PerformanceReview.objects.select_related(
        'employee', 'employee__user', 'cycle', 'reviewed_by', 'decided_by',
    ).prefetch_related('kpi_scores__kpi')

    def get_serializer_class(self):
        if self.action == 'create':
            return PerformanceReviewSerializer
        return (PerformanceReviewDetailSerializer if self.action == 'retrieve'
                else PerformanceReviewListSerializer)

    def create(self, request, *args, **kwargs):
        """ينشئ التقييم ويسجّل المُقيِّم من هوية المرسل.

        `reviewed_by` ليست في `Meta.fields` (لا يقبلها العميل)، فلا بد من
        تمريرها هنا؛ لولا ذلك لكانت `NOT NULL` عند الحفظ.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.validated_data['employee']
        review = serializer.save(
            reviewed_by=request.user,
            is_self_service=request.user.pk == employee.user_id,
        )
        return Response(
            success_response(PerformanceReviewDetailSerializer(review).data),
            status=status.HTTP_201_CREATED,
        )

    def get_permissions(self):
        # قرارات المعتمد: الاعتماد والرفض وإعادة للتقييم. صلاحية صريحة لا
        # البوابة المشتركة، وإلا سقط الموظف العادي في فرع الخدمة الذاتية
        # وأعاد تقييمَه إلى مسودة.
        if self.action in ('approve', 'reject', 'return_for_revision'):
            return [IsAuthenticated(), PermissionAction('hr_performance', 'approve')]
        # `submit` للمُقيِّم أو للموظف على تقييم نفسه، فيمرّ عبر البوابة
        # المشتركة التي تفهم الإدارة والخدمة الذاتية.
        return [IsAuthenticated(), HrScopedAccessPermission()]

    def _is_self_service_user(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return False
        if user.is_superuser or user.is_staff:
            return False
        return not any(
            user.can(f'hr_performance:{a}')
            for a in ('view', 'add', 'edit', 'delete', 'approve')
        )

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return self.base_queryset.none()
        if self._is_self_service_user():
            return self.base_queryset.filter(employee__user=user)
        if user.is_superuser:
            return self.base_queryset
        visible = resolve_visible_employee_user_ids(user)
        if visible is None:
            return self.base_queryset
        if not visible:
            return self.base_queryset.none()
        return self.base_queryset.filter(employee__user_id__in=list(visible)).distinct()

    def assert_within_hr_scope(self, target_user):
        from rest_framework.exceptions import PermissionDenied
        from .scoping import user_within_hr_scope
        if not user_within_hr_scope(target_user, self.request.user):
            raise PermissionDenied('لا تملك صلاحية الكتابة خارج نطاقك الإداري')

    def perform_update(self, serializer):
        review = serializer.instance
        if not review.is_editable():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'التقييم غير قابل للتعديل في حالته'})
        self.assert_within_hr_scope(review.employee.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        review, _from = performance_service.submit_review(self.get_object(), request.user)
        return Response(success_response(
            PerformanceReviewDetailSerializer(review).data, message='تم إرسال التقييم',
        ))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        review, _from = performance_service.approve_review(
            self.get_object(), request.user, note=request.data.get('note', ''),
        )
        return Response(success_response(
            PerformanceReviewDetailSerializer(review).data, message='تم اعتماد التقييم',
        ))

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        review, _from = performance_service.reject_review(
            self.get_object(), request.user,
            reason=request.data.get('rejection_reason', ''),
            note=request.data.get('note', ''),
        )
        return Response(success_response(
            PerformanceReviewDetailSerializer(review).data, message='تم رفض التقييم',
        ))

    @action(detail=True, methods=['post'])
    def return_for_revision(self, request, pk=None):
        review, _from = performance_service.return_review(
            self.get_object(), request.user, note=request.data.get('note', ''),
        )
        return Response(success_response(
            PerformanceReviewDetailSerializer(review).data, message='أُعيد التقييم للتعديل',
        ))
