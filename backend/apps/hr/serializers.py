"""مسلسلات HR: ملفات الموظفين، المسار الوظيفي، وطلبات النقل.

قاعدة العرض: الموقع التنظيمي الحالي يُشتق من `OrgAssignment` النشط (مصدر
الحقيقة للنطاق) ولا يُنسخ إلى حقول داخل الملف، حتى لا تتناقض الصلاحيات مع
المعروض. حقول `EmployeeProfile` الموسّعة (المدير المباشر، نوع العمل، الشهادة)
تُدار من الإدارة فقط.
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import EmployeeProfile
from apps.organization.models import Department, OrgAssignment

from .models import (
    AttendanceRecord,
    CycleStatus,
    EnrollmentStatusLog,
    PerformanceCycle,
    PerformanceKPI,
    PerformanceReview,
    ReviewKPIScore,
    ReviewStatus,
    TrainingEnrollment,
    TrainingPlan,
    EmployeeTimeline,
    LeaveBalance,
    LeaveRequest,
    LeaveStatusLog,
    LeaveType,
    PostingKind,
    PostingRequest,
    PostingStatus,
    PostingStatusLog,
)

User = get_user_model()


class EmployeeListSerializer(serializers.ModelSerializer):
    """صفحة قائمة الملفات: الحقول الأساسية للقائمة."""

    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True, default=None)
    manager_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    sector_name = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeProfile
        fields = (
            'id', 'employee_number', 'full_name', 'full_name_ar', 'full_name_en',
            'email', 'phone', 'gender', 'job_title', 'employment_status',
            'employment_type', 'hire_date',
            'position_name', 'department_name', 'sector_name',
            'manager_name', 'created_at',
        )
        read_only_fields = fields

    def get_full_name(self, obj):
        return (
            obj.full_name_ar
            or obj.full_name_en
            or obj.user.full_name
            or obj.user.email
        )

    def get_manager_name(self, obj):
        if not obj.reporting_manager_id:
            return None
        return obj.reporting_manager.full_name_ar or obj.reporting_manager.full_name_en or None

    def _primary_assignment(self, obj):
        qs = OrgAssignment.objects.filter(user=obj.user, is_active=True).select_related(
            'position', 'sector', 'department', 'station', 'entry_point',
        )
        return qs.first()

    def get_position_name(self, obj):
        a = self._primary_assignment(obj)
        return a.position.name_ar if a and a.position else None

    def get_department_name(self, obj):
        a = self._primary_assignment(obj)
        return a.department.name_ar if a and a.department else None

    def get_sector_name(self, obj):
        a = self._primary_assignment(obj)
        return a.sector.name_ar if a and a.sector else None


class EmployeeUserInputSerializer(serializers.Serializer):
    """بيانات الحساب المرافقة عند إنشاء ملف وظيفي جديد.

    أدوار HR لا تملك `users:add`، لذا لا يمكنها استدعاء `/api/v1/users/`.
    نتيح إنشاء حساب **plain** (بلا أدوار ولا صلاحيات) كجزء من إنشاء الملف،
    داخل نفس الطلب ومعاملة واحدة. أي منح صلاحيات يتم لاحقاً عبر واجهة
    المستخدمين.
    """

    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8,
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('يوجد حساب مسجّل بهذا البريد الإلكتروني')
        return value

    def validate(self, attrs):
        if not attrs.get('username'):
            # اشتقاق اسم مستخدم من البريد ما لم يُحدَّد صراحةً.
            attrs['username'] = attrs['email'].split('@')[0][:150]
        elif User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({'username': 'اسم المستخدم مستخدم مسبقاً'})
        return attrs


class EmployeeDetailSerializer(EmployeeListSerializer):
    """تفاصيل الملف الكامل — يتضمّن كل حقول الإدارة."""

    probation_end_date = serializers.DateField(required=False, allow_null=True)
    birth_date = serializers.DateField(required=False, allow_null=True)
    hire_date = serializers.DateField(required=False, allow_null=True)
    # للقراءة: نعرض معرّف المستخدم. للكتابة: نقبل إمّا معرّفاً موجوداً أو
    # كائن حساب جديد يُنشأ مع الملف في نفس المعاملة.
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True,
    )
    new_user = EmployeeUserInputSerializer(required=False, write_only=True)
    assignments = serializers.SerializerMethodField()
    timeline_count = serializers.SerializerMethodField()

    class Meta(EmployeeListSerializer.Meta):
        fields = EmployeeListSerializer.Meta.fields + (
            'user', 'birth_date', 'home_address',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation',
            'degree', 'specialization', 'probation_end_date',
            'reporting_manager', 'photo',
            'office', 'internal_phone', 'preferred_contact',
            'language', 'theme', 'timezone',
            'notify_email', 'notify_sms', 'notify_in_app',
            'new_user',
            'assignments', 'timeline_count', 'updated_at',
        )
        # `EmployeeListSerializer` يجعل كل حقوله للقراءة فقط لأنها جدول
        # قراءة فقط؛ لا نرث ذلك هنا أو يصبح الإنشاء مستحيلاً. نُبقي_read_only
        # فقط على ما هو محسوب أو مشتق من `OrgAssignment` لا من الملف نفسه.
        read_only_fields = (
            'id', 'created_at', 'updated_at',
            'full_name', 'email', 'phone',
            'position_name', 'department_name', 'sector_name', 'manager_name',
            'assignments', 'timeline_count',
        )

    def validate(self, attrs):
        """يشترط حساباً واحداً فقط: `user` موجود أو `new_user` جديد."""
        if self.instance is not None:
            return attrs
        target_user = attrs.get('user')
        new_user = attrs.get('new_user')
        if target_user and new_user:
            raise serializers.ValidationError(
                {'new_user': 'لا يمكن إرسال حساب جديد مع حساب موجود'}
            )
        if not target_user and not new_user:
            raise serializers.ValidationError(
                {'new_user': 'حدّد حساب الموظف (user) أو أنشئ حساباً جديداً'}
            )
        if target_user is not None:
            if EmployeeProfile.objects.filter(user=target_user).exists():
                raise serializers.ValidationError(
                    {'user': 'لهذا الحساب ملف وظيفي مسجّل مسبقاً'}
                )
            if not target_user.is_active:
                raise serializers.ValidationError({'user': 'الحساب غير نشط'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """إنشاء الملف مع حسابه في معاملة واحدة."""
        new_user = validated_data.pop('new_user', None)
        user = validated_data.get('user')
        if new_user:
            password = new_user.pop('password', '') or None
            user = User.objects.create_user(
                email=new_user['email'],
                username=new_user.get('username') or new_user['email'].split('@')[0],
                full_name=new_user.get('full_name') or '',
                phone=new_user.get('phone') or None,
                password=password,
            )
        validated_data['user'] = user
        return super().create(validated_data)

    def validate_reporting_manager(self, value):
        """يمنع الموظف من أن يكون مديره، ويحمي من حلقة في شجرة التقارير."""
        if value is None:
            return value
        if self.instance is not None and value.pk == self.instance.pk:
            raise serializers.ValidationError('لا يمكن أن يكون الموظف مديراً لنفسه')

        # نمشي صعوداً في شجرة التقارير لكشف أي حلقة قبل الحفظ.
        seen = {self.instance.pk} if self.instance else set()
        cursor = value
        while cursor is not None:
            if cursor.pk in seen:
                raise serializers.ValidationError('سيؤدي هذا إلى حلقة في هيكل التقارير')
            seen.add(cursor.pk)
            cursor = cursor.reporting_manager
        return value

    def get_assignments(self, obj):
        qs = OrgAssignment.objects.filter(user=obj.user, is_active=True).select_related(
            'position', 'sector', 'department', 'station', 'entry_point',
        )
        return [
            {
                'id': str(a.id),
                'is_primary': a.is_primary,
                'position_name': a.position.name_ar if a.position else None,
                'sector_name': a.sector.name_ar if a.sector else None,
                'department_name': a.department.name_ar if a.department else None,
                'station_name': a.station.name_ar if a.station else None,
                'entry_point_name': a.entry_point.name_ar if a.entry_point else None,
                'start_date': a.start_date,
                'end_date': a.end_date,
            }
            for a in qs
        ]

    def get_timeline_count(self, obj):
        return obj.timeline.count()


class EmployeeTimelineSerializer(serializers.ModelSerializer):
    """حدث في المسار الوظيفي."""

    event_display = serializers.CharField(source='get_event_display', read_only=True)
    employee_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.full_name', read_only=True, default=None,
    )

    class Meta:
        model = EmployeeTimeline
        fields = (
            'id', 'employee', 'employee_name', 'event', 'event_display', 'title',
            'old_position', 'new_position',
            'old_department', 'new_department',
            'old_sector', 'new_sector',
            'old_entry_point', 'new_entry_point',
            'start_date', 'end_date', 'reason',
            'created_by', 'created_by_name', 'created_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'event_display', 'employee_name')

    def get_employee_name(self, obj):
        return (
            obj.employee.full_name_ar
            or obj.employee.full_name_en
            or obj.employee.user.email
        )

    def validate(self, attrs):
        start = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        end = attrs.get('end_date') or getattr(self.instance, 'end_date', None)
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'تاريخ النهاية يسبق تاريخ البداية'})
        return attrs


class EmployeeTimelineWriteSerializer(EmployeeTimelineSerializer):
    """كتابة الحدث: `created_by` يُملأ من المستخدم الحالي، لا من العميل."""

    class Meta(EmployeeTimelineSerializer.Meta):
        read_only_fields = EmployeeTimelineSerializer.Meta.read_only_fields


# ---------------------------------------------------------------------------
# المرحلة 2: لوحة الموارد البشرية والوحدات التأسيسية
# ---------------------------------------------------------------------------

class HrDashboardSerializer(serializers.Serializer):
    """شكل استجابة لوحة HR — كل الأرقام محسوبة من نطاق المستخدم."""

    total_employees = serializers.IntegerField()
    active_employees = serializers.IntegerField()
    on_leave = serializers.IntegerField()
    suspended = serializers.IntegerField()
    terminated = serializers.IntegerField()
    new_hires_30d = serializers.IntegerField()
    probations_ending_30d = serializers.IntegerField()
    by_employment_type = serializers.ListField(child=serializers.DictField())
    by_department = serializers.ListField(child=serializers.DictField())
    by_sector = serializers.ListField(child=serializers.DictField())
    recent_events = serializers.ListField(child=serializers.DictField())
    is_national = serializers.BooleanField()
    generated_at = serializers.DateTimeField()


class HrEstablishmentSerializer(serializers.ModelSerializer):
    """وحدة هيكلية داخل نطاق HR مع عدّاد القوة العاملة."""

    parent_name = serializers.SerializerMethodField()
    sector_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    headcount = serializers.SerializerMethodField()
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = Department
        fields = (
            'id', 'code', 'name_ar', 'name_en', 'kind', 'kind_display',
            'parent', 'parent_name', 'sector', 'sector_name',
            'manager_position', 'manager_name', 'description',
            'order', 'is_active', 'headcount',
        )
        read_only_fields = fields

    def get_parent_name(self, obj):
        return obj.parent.name_ar if obj.parent else None

    def get_sector_name(self, obj):
        return obj.sector.name_ar if obj.sector else None

    def get_manager_name(self, obj):
        return obj.manager_position.name_ar if obj.manager_position else None

    def get_headcount(self, obj):
        """عدد الموظفين النشطين المعيَّنين في هذه الوحدة (أو في فروعها)."""
        cached = getattr(obj, 'hr_headcount', None)
        if cached is not None:
            return cached
        return OrgAssignment.objects.filter(
            department=obj, is_active=True,
        ).values('user_id').distinct().count()


class HrLinkableUserSerializer(serializers.ModelSerializer):
    """حساب مستخدم مختصر للقائمة المنسدلة «ربط حساب موجود»."""

    id = serializers.UUIDField(read_only=True)
    label = serializers.SerializerMethodField()

    class Meta:
        # `User` لا يحمل `full_name_ar/en` (هما على `EmployeeProfile`)، وهذا
        # مقصود: المرشح حسابٌ بلا ملف، فلا اسم عربي/إنجليزي بعد.
        model = get_user_model()
        fields = ('id', 'username', 'full_name', 'email', 'phone', 'is_active', 'label')
        read_only_fields = fields

    def get_label(self, obj):
        return obj.full_name or obj.username


class PostingStatusLogSerializer(serializers.ModelSerializer):
    """قيد واحد في تاريخ حالة الطلب."""

    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PostingStatusLog
        fields = (
            'id', 'from_status', 'to_status', 'note',
            'changed_by', 'changed_by_name', 'created_at',
        )
        read_only_fields = fields

    def get_changed_by_name(self, obj):
        return obj.changed_by.full_name if obj.changed_by else None


class PostingRequestListSerializer(serializers.ModelSerializer):
    """ملخّص للعرض في القائمة."""

    employee_name = serializers.SerializerMethodField()
    employee_number = serializers.CharField(source='employee.employee_number', read_only=True)
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    decided_by_name = serializers.SerializerMethodField()
    target_summary = serializers.SerializerMethodField()

    class Meta:
        model = PostingRequest
        fields = (
            'id', 'employee', 'employee_name', 'employee_number',
            'kind', 'kind_display', 'status', 'status_display',
            'target_summary', 'effective_date', 'is_self_service',
            'requested_by', 'requested_by_name',
            'decided_by', 'decided_by_name', 'decided_at',
            'rejection_reason', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.full_name_ar or obj.employee.full_name_en or ''

    def get_requested_by_name(self, obj):
        return obj.requested_by.full_name if obj.requested_by else None

    def get_decided_by_name(self, obj):
        return obj.decided_by.full_name if obj.decided_by else None

    def get_target_summary(self, obj):
        parts = [
            getattr(obj.target_position, 'name_ar', None),
            getattr(obj.target_department, 'name_ar', None),
            getattr(obj.target_sector, 'name_ar', None),
            getattr(obj.target_entry_point, 'name_ar', None),
        ]
        return ' ← '.join(p for p in parts if p) or '—'


class PostingRequestDetailSerializer(PostingRequestListSerializer):
    """التفاصيل الكاملة + سجل الحالات."""

    status_logs = PostingStatusLogSerializer(many=True, read_only=True)
    employee_email = serializers.EmailField(source='employee.user.email', read_only=True)

    class Meta(PostingRequestListSerializer.Meta):
        fields = PostingRequestListSerializer.Meta.fields + (
            'reason', 'decision_note', 'employee_email', 'status_logs',
        )
        read_only_fields = fields


class PostingDecisionSerializer(serializers.Serializer):
    """حمولة قرار الاعتماد/الرفض."""

    note = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    rejection_reason = serializers.CharField(
        required=False, allow_blank=True, max_length=2000,
        help_text='مطلوب عند الرفض.',
    )

    def validate(self, attrs):
        return attrs


class PostingRequestWriteSerializer(serializers.ModelSerializer):
    """إنشاء/تعديل طلب نقل.

    `requested_by` و`is_self_service` يحدّدهما الخادم من هوية المرسل، فلا
    يقبلان من الطلب: وإلا استطاع موظف أن ينسب طلبه إلى زميله.
    """

    class Meta:
        model = PostingRequest
        fields = (
            'employee', 'kind', 'target_position', 'target_department',
            'target_sector', 'target_entry_point', 'effective_date', 'reason',
        )

    def validate_employee(self, value):
        from rest_framework.exceptions import PermissionDenied
        from apps.hr.permissions import actor_has_hr_admin_access
        from apps.hr.scoping import user_within_hr_scope
        actor = self.context['request'].user
        if actor.pk == value.user_id:
            return value  # خدمة ذاتية: لنفسه
        if not actor_has_hr_admin_access(actor, 'hr_posting'):
            # نطاقه المنظّم يقرأ زملاءه، لكنه لا يفوّضه بإنشاء طلباتهم.
            raise PermissionDenied('لا تملك صلاحية إنشاء طلب نقل لهذا الموظف')
        if not user_within_hr_scope(value.user, actor):
            raise PermissionDenied('لا تملك صلاحية إنشاء طلب نقل خارج نطاقك الإداري')
        return value

    def validate_effective_date(self, value):
        if value and value < timezone.localdate():
            raise serializers.ValidationError('تاريخ النفاذ لا يمكن أن يكون في الماضي')
        return value

    def validate(self, attrs):
        instance = self.instance
        if instance and not instance.is_editable():
            raise serializers.ValidationError(
                {'status': f'لا يمكن تعديل طلب في حالة «{instance.get_status_display()}»'}
            )
        kind = attrs.get('kind', getattr(instance, 'kind', None))
        if kind in (PostingKind.PROMOTION, PostingKind.DEMOTION):
            has_target = any((
                attrs.get('target_position'), attrs.get('target_department'),
                attrs.get('target_sector'), attrs.get('target_entry_point'),
            ))
            if not has_target:
                raise serializers.ValidationError(
                    {'target_position': 'الترقية والخفض يتطلّبان هدفاً (منصباً أو قسماً)'}
                )
        return attrs


class AttendanceRecordListSerializer(serializers.ModelSerializer):
    """صفحة قائمة الحضور."""

    employee_name = serializers.SerializerMethodField()
    employee_number = serializers.CharField(source='employee.employee_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    worked_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            'id', 'employee', 'employee_name', 'employee_number',
            'date', 'status', 'status_display',
            'check_in', 'check_out', 'overtime_minutes', 'worked_minutes',
            'shift_code', 'is_approved',
            'recorded_by', 'recorded_by_name',
            'approved_by', 'approved_by_name', 'approved_at',
            'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.full_name_ar or obj.employee.full_name_en or ''

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.full_name if obj.recorded_by else None

    def get_approved_by_name(self, obj):
        return obj.approved_by.full_name if obj.approved_by else None


class AttendanceSummarySerializer(serializers.Serializer):
    """تجميع حضور موظف over a period — يغذّي بطاقة «ساعتي» للموظف."""

    period_days = serializers.IntegerField()
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    late_days = serializers.IntegerField()
    leave_days = serializers.IntegerField()
    remote_days = serializers.IntegerField()
    off_days = serializers.IntegerField()
    total_overtime_minutes = serializers.IntegerField()
    total_worked_minutes = serializers.IntegerField()
    pending_approval = serializers.IntegerField()


class AttendanceRecordWriteSerializer(serializers.ModelSerializer):
    """إدخال/تعديل سجل حضور.

    `recorded_by` و`is_approved` يحدّدهما الخادم؛ ولا يقبلان من جسم الطلب
    حتى لا يُوثَّق الحضور معتمداً من أول إدخال.
    """

    class Meta:
        model = AttendanceRecord
        fields = (
            'employee', 'date', 'status', 'check_in', 'check_out',
            'overtime_minutes', 'shift_code', 'notes', 'external_ref',
        )

    def validate_employee(self, value):
        from rest_framework.exceptions import PermissionDenied
        from apps.hr.permissions import actor_has_hr_admin_access
        from apps.hr.scoping import user_within_hr_scope
        actor = self.context['request'].user
        if actor.pk == value.user_id:
            # الموظف يسجّل حضور غيره فقط، لا حضوره هو.
            raise PermissionDenied('لا يُسجَّل الحضور الذاتي من هذه الشاشة')
        if not actor_has_hr_admin_access(actor, 'hr_attendance'):
            raise PermissionDenied('لا تملك صلاحية تسجيل الحضور لموظف آخر')
        if not user_within_hr_scope(value.user, actor):
            raise PermissionDenied('لا تملك صلاحية التسجيل لموظف خارج نطاقك')
        return value

    def validate_date(self, value):
        from django.utils import timezone as _tz
        if value > _tz.localdate():
            raise serializers.ValidationError('لا يُسجَّل حضور لتاريخ مستقبلي')
        return value

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.is_approved:
            raise serializers.ValidationError(
                {'status': 'لا يمكن تعديل سجل معتمد — اسحب الاعتماد أولاً'}
            )
        # تحقق `clean()` على القيم المُدمجة (المُرسلة مع القيم المخزّنة)
        merged = {
            'status': attrs.get('status', getattr(instance, 'status', None)),
            'check_in': attrs.get('check_in', getattr(instance, 'check_in', None)),
            'check_out': attrs.get('check_out', getattr(instance, 'check_out', None)),
        }
        probe = AttendanceRecord(**{
            k: v for k, v in merged.items()
            if v is not None and k in ('status', 'check_in', 'check_out')
        })
        probe.full_clean(exclude=['employee', 'date', 'recorded_by'])
        return attrs


class LeaveTypeSerializer(serializers.ModelSerializer):
    """نوع إجازة مرجعي."""

    class Meta:
        model = LeaveType
        fields = (
            'id', 'code', 'name_ar', 'name_en', 'is_paid', 'requires_document',
            'max_consecutive_days', 'default_entitlement_days', 'suspends_assignment',
            'is_active', 'order',
        )
        read_only_fields = ('id',)


class LeaveBalanceSerializer(serializers.ModelSerializer):
    """رصيد موظف لنوع وسنة، مع المحسوب المشتق."""

    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.CharField(source='leave_type.name_ar', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    taken_days = serializers.SerializerMethodField()
    pending_days = serializers.SerializerMethodField()
    available_days = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = (
            'id', 'employee', 'employee_name', 'leave_type', 'leave_type_name',
            'leave_type_code', 'year', 'entitled_days', 'carried_over_days',
            'taken_days', 'pending_days', 'available_days', 'note',
        )
        read_only_fields = (
            'id', 'taken_days', 'pending_days', 'available_days',
        )

    def get_employee_name(self, obj):
        return obj.employee.full_name_ar or obj.employee.full_name_en or ''

    def get_taken_days(self, obj):
        return obj.taken_days()

    def get_pending_days(self, obj):
        return obj.pending_days()

    def get_available_days(self, obj):
        return obj.available_days()


class LeaveBalanceWriteSerializer(serializers.ModelSerializer):
    """منح/تعديل استحقاق — الحقول اليدوية فقط.

    `taken`/`pending`/`available` مشتقّة ولا تُقبل في الإدخال: تمريرها
    يجعل الحفظ يفشل، وهو أفضل من تجاهلها بصمت.
    """

    class Meta:
        model = LeaveBalance
        fields = ('id', 'employee', 'leave_type', 'year', 'entitled_days',
                  'carried_over_days', 'note')

    def validate_employee(self, value):
        from rest_framework.exceptions import PermissionDenied
        from apps.hr.permissions import actor_has_hr_admin_access
        from apps.hr.scoping import user_within_hr_scope
        actor = self.context['request'].user
        if not actor_has_hr_admin_access(actor, 'hr_leave'):
            # الموظف لا يمنح أرصدة — لا لأحد.
            raise PermissionDenied('لا تملك صلاحية تحديد أرصدة الإجازات')
        if not user_within_hr_scope(value.user, actor):
            raise PermissionDenied('لا تملك صلاحية تحديد أرصدة موظف خارج نطاقك')
        return value


class LeaveStatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveStatusLog
        fields = ('id', 'from_status', 'to_status', 'note',
                  'changed_by', 'created_at')
        read_only_fields = fields


class LeaveRequestListSerializer(serializers.ModelSerializer):
    """ملخّص للعرض في القائمة."""

    employee_name = serializers.SerializerMethodField()
    employee_number = serializers.CharField(source='employee.employee_number', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name_ar', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    decided_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = (
            'id', 'employee', 'employee_name', 'employee_number',
            'leave_type', 'leave_type_name', 'status', 'status_display',
            'start_date', 'end_date', 'year', 'is_half_day', 'days',
            'is_self_service', 'requested_by', 'requested_by_name',
            'decided_by', 'decided_by_name', 'decided_at',
            'rejection_reason', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.full_name_ar or obj.employee.full_name_en or ''

    def get_requested_by_name(self, obj):
        return obj.requested_by.full_name if obj.requested_by else None

    def get_decided_by_name(self, obj):
        return obj.decided_by.full_name if obj.decided_by else None


class LeaveRequestDetailSerializer(LeaveRequestListSerializer):
    status_logs = LeaveStatusLogSerializer(many=True, read_only=True)
    leave_type_requires_document = serializers.BooleanField(
        source='leave_type.requires_document', read_only=True,
    )
    leave_type_is_paid = serializers.BooleanField(
        source='leave_type.is_paid', read_only=True,
    )

    class Meta(LeaveRequestListSerializer.Meta):
        fields = LeaveRequestListSerializer.Meta.fields + (
            'reason', 'document', 'substitute', 'decision_note',
            'leave_type_requires_document', 'leave_type_is_paid', 'status_logs',
        )
        read_only_fields = fields


class LeaveRequestWriteSerializer(serializers.ModelSerializer):
    """إنشاء/تعديل طلب إجازة.

    `year` و`days` يُشتقّان في الخادم: إرسالهما من العميل يفتح باب/day
    disagrees مع dates.
    """

    class Meta:
        model = LeaveRequest
        fields = (
            'employee', 'leave_type', 'start_date', 'end_date',
            'is_half_day', 'reason', 'document', 'substitute',
        )

    def validate_employee(self, value):
        from rest_framework.exceptions import PermissionDenied
        from apps.hr.permissions import actor_has_hr_admin_access
        actor = self.context['request'].user
        if actor.pk == value.user_id:
            return value  # خدمة ذاتية: لنفسه
        if not actor_has_hr_admin_access(actor, 'hr_leave'):
            # الموظف بلا صلاحية إدارية لا ينشئ طلباً لزميله، ولو كان في
            # نطاقه المنظّم: نطاقه الذاتي يقرأه فيرى زملاءه، وهو ما لا
            # يعني تفويضاً بإنشاء طلباتهم نيابة عنهم.
            raise PermissionDenied('لا تملك صلاحية إنشاء طلب إجازة لهذا الموظف')
        from apps.hr.scoping import user_within_hr_scope
        if not user_within_hr_scope(value.user, actor):
            raise PermissionDenied('لا تملك صلاحية إنشاء طلب إجازة خارج نطاقك الإداري')
        return value

    def validate(self, attrs):
        from .leave_service import count_days
        instance = self.instance
        if instance and not instance.is_editable():
            raise serializers.ValidationError(
                {'status': f'لا يمكن تعديل طلب في حالة «{instance.get_status_display()}»'}
            )
        start = attrs.get('start_date', getattr(instance, 'start_date', None))
        end = attrs.get('end_date', getattr(instance, 'end_date', None))
        if not (start and end):
            return attrs
        attrs['year'] = start.year
        # `is_half_day` قد يكون على نسخة معدَّلة لا في `attrs` (PATCH).
        attrs['days'] = count_days(
            start, end, attrs.get('is_half_day', getattr(instance, 'is_half_day', False)),
        )
        leave_type = attrs.get('leave_type') or getattr(instance, 'leave_type', None)
        if leave_type and leave_type.max_consecutive_days:
            if attrs['days'] > leave_type.max_consecutive_days:
                raise serializers.ValidationError({
                    'end_date': (
                        f'«{leave_type.name_ar}» لا تتجاوز '
                        f'{leave_type.max_consecutive_days} يوماً متتالياً'
                    ),
                })
        return attrs


class LeaveBalanceSummarySerializer(serializers.Serializer):
    """رصيد الموظف الحالي عبر الأنواع — لبطاقة «إجازاتي»."""

    year = serializers.IntegerField()
    items = LeaveBalanceSerializer(many=True)
    total_available = serializers.DecimalField(max_digits=8, decimal_places=1)


# ---------------------------------------------------------------------
# التدريب
# ---------------------------------------------------------------------
class TrainingPlanSerializer(serializers.ModelSerializer):
    enrollment_count = serializers.IntegerField(read_only=True, required=False)
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlan
        fields = (
            'id', 'code', 'name_ar', 'name_en', 'description', 'provider',
            'delivery_mode', 'duration_hours', 'cost', 'is_mandatory',
            'is_active', 'order', 'employee_count', 'enrollment_count',
        )
        read_only_fields = ('id', 'employee_count', 'enrollment_count')

    def get_employee_count(self, obj):
        """عدد الموظفين المسجَّلين فعلياً — ليس عدد صفوف التسجيل.

        `count()` على related_name يعيد عدد التسجيلات (قد يتكرر الموظف بدورات
        وبقيول متعددة لنفسه)، فنتركّب على `values('employee').distinct()`.
        """
        return obj.enrollments.values('employee').distinct().count()


class TrainingEnrollmentListSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_number = serializers.CharField(source='employee.employee_number', read_only=True)
    plan_name = serializers.CharField(source='plan.name_ar', read_only=True)
    plan_code = serializers.CharField(source='plan.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    decided_by_name = serializers.SerializerMethodField()
    passed = serializers.BooleanField(source='is_completed', read_only=True)

    class Meta:
        model = TrainingEnrollment
        fields = (
            'id', 'employee', 'employee_name', 'employee_number',
            'plan', 'plan_code', 'plan_name', 'status', 'status_display',
            'requested_date', 'start_date', 'end_date',
            'score', 'pass_score', 'passed', 'certificate_ref',
            'is_self_service', 'requested_by', 'requested_by_name',
            'decided_by', 'decided_by_name', 'decided_at',
            'rejection_reason', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.full_name_ar or obj.employee.full_name_en or ''

    def get_requested_by_name(self, obj):
        return obj.requested_by.full_name if obj.requested_by else None

    def get_decided_by_name(self, obj):
        return obj.decided_by.full_name if obj.decided_by else None


class EnrollmentLogSerializer(serializers.ModelSerializer):
    """قيد واحد في تاريخ حالة التسجيل."""

    class Meta:
        model = EnrollmentStatusLog
        fields = ('id', 'from_status', 'to_status', 'note', 'changed_by', 'created_at')
        read_only_fields = fields


class TrainingEnrollmentDetailSerializer(TrainingEnrollmentListSerializer):
    status_logs = EnrollmentLogSerializer(many=True, read_only=True)

    class Meta(TrainingEnrollmentListSerializer.Meta):
        fields = TrainingEnrollmentListSerializer.Meta.fields + (
            'notes', 'decision_note', 'status_logs',
        )
        read_only_fields = fields


class TrainingEnrollmentWriteSerializer(serializers.ModelSerializer):
    """إنشاء/تعديل تسجيل تدريبي.

    `is_completed` مشتق من الدرجة فلا يقبله الإدخال؛ و`requested_by`
    من هوية المرسل.
    """

    class Meta:
        model = TrainingEnrollment
        fields = (
            'employee', 'plan', 'start_date', 'end_date',
            'score', 'pass_score', 'certificate_ref', 'notes',
        )
        # `status` حالة دورة عمل لا بيانات: لا يقبلها الإدخال. لولا ذلك
        # لج�� العميل ينشئ تسجيلاً «معتمداً» متجاوزاً الاعتماد وسجل الحالة.
        read_only_fields = ('status',)

    def validate_employee(self, value):
        from rest_framework.exceptions import PermissionDenied
        from apps.hr.permissions import actor_has_hr_admin_access
        from apps.hr.scoping import user_within_hr_scope
        actor = self.context['request'].user
        if actor.pk == value.user_id:
            return value
        if not actor_has_hr_admin_access(actor, 'hr_training'):
            raise PermissionDenied('لا تملك صلاحية تسجيل زميل في دورة')
        if not user_within_hr_scope(value.user, actor):
            raise PermissionDenied('لا تملك صلاحية التسجيل خارج نطاقك الإداري')
        return value

    def validate(self, attrs):
        instance = self.instance
        if instance and not instance.is_editable():
            raise serializers.ValidationError(
                {'status': f'لا يمكن تعديل تسجيل في حالة «{instance.get_status_display()}»'}
            )
        plan = attrs.get('plan') or getattr(instance, 'plan', None)
        if plan is not None and not plan.is_active:
            raise serializers.ValidationError({'plan': 'الدورة غير نشطة'})
        score = attrs.get('score', getattr(instance, 'score', None))
        if score is not None and not (0 <= score <= 100):
            raise serializers.ValidationError({'score': 'الدرجة بين 0 و100'})
        pass_score = attrs.get('pass_score', getattr(instance, 'pass_score', None))
        if pass_score is not None and not (0 <= pass_score <= 100):
            raise serializers.ValidationError({'pass_score': 'درجة الاجتياز بين 0 و100'})
        start = attrs.get('start_date', getattr(instance, 'start_date', None))
        end = attrs.get('end_date', getattr(instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'النهاية قبل البداية'})
        return attrs


# ---------------------------------------------------------------------
# تقييم الأداء
# ---------------------------------------------------------------------
class PerformanceKPISerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceKPI
        fields = ('id', 'cycle', 'name', 'description', 'weight', 'order')
        read_only_fields = ('id',)

    def validate_weight(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError('الوزن بين 0 و100')
        return value


class PerformanceCycleSerializer(serializers.ModelSerializer):
    kpi_weight_total = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    approved_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PerformanceCycle
        fields = (
            'id', 'name', 'period_start', 'period_end', 'review_due_date',
            'status', 'status_display', 'department',
            'is_anonymous_peer_review', 'notes',
            'kpi_weight_total', 'review_count', 'approved_count',
        )
        # الانتقال بين المسودة والمفتوحة والمغلقة عبر `open`/`close` لا عبر
        # PUT: لصنع دورة «مفتوحة» فوراً يتخطّى تجهيز المؤشرات والإعلان.
        read_only_fields = ('status',)

    def get_kpi_weight_total(self, obj):
        return obj.kpi_weight_total()

    def _actor(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def get_review_count(self, obj):
        # عدّاد التقييمات إحصاء إداري عن موظفين آخرين، فلا يُعرض لمن
        # يقرأ الدورة في الخدمة الذاتية.
        from apps.hr.permissions import actor_has_hr_admin_access
        if not actor_has_hr_admin_access(self._actor(), 'hr_performance'):
            return None
        return obj.reviews.count()

    def get_approved_count(self, obj):
        from apps.hr.permissions import actor_has_hr_admin_access
        if not actor_has_hr_admin_access(self._actor(), 'hr_performance'):
            return None
        return obj.reviews.filter(status=ReviewStatus.APPROVED).count()


class ReviewKPIScoreSerializer(serializers.ModelSerializer):
    kpi_name = serializers.CharField(source='kpi.name', read_only=True)
    kpi_weight = serializers.DecimalField(source='kpi.weight', max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = ReviewKPIScore
        fields = ('id', 'kpi', 'kpi_name', 'kpi_weight', 'score', 'comment')
        read_only_fields = ('id', 'kpi_name', 'kpi_weight')

    def validate_score(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError('الدرجة بين 0 و100')
        return value

    def validate(self, attrs):
        review = self.instance.review if self.instance else self.context.get('review')
        kpi = attrs.get('kpi')
        if review and kpi and kpi.cycle_id != review.cycle_id:
            raise serializers.ValidationError({'kpi': 'المؤشر من دورة أخرى'})
        return attrs


class PerformanceReviewListSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rating_display = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    decided_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceReview
        fields = (
            'id', 'cycle', 'cycle_name', 'employee', 'employee_name',
            'status', 'status_display', 'total_score', 'rating', 'rating_display',
            'reviewed_by', 'reviewed_by_name', 'decided_by', 'decided_by_name',
            'decided_at', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.full_name_ar or obj.employee.full_name_en or ''

    def get_rating_display(self, obj):
        for _t, code, label in PerformanceReview.RATING_BANDS:
            if code == obj.rating:
                return label
        return ''

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.full_name if obj.reviewed_by else None

    def get_decided_by_name(self, obj):
        return obj.decided_by.full_name if obj.decided_by else None


class PerformanceReviewDetailSerializer(PerformanceReviewListSerializer):
    kpi_scores = ReviewKPIScoreSerializer(many=True, read_only=True)
    cycle_kpis = serializers.SerializerMethodField()

    class Meta(PerformanceReviewListSerializer.Meta):
        fields = PerformanceReviewListSerializer.Meta.fields + (
            'strengths', 'improvements', 'comments', 'decision_note',
            'rejection_reason', 'kpi_scores', 'cycle_kpis',
        )
        read_only_fields = fields

    def get_cycle_kpis(self, obj):
        """مؤشرات الدورة مع درجة هذا التقييم فيها — populates the form grid."""
        scores = {s.kpi_id: s.score for s in obj.kpi_scores.all()}
        return [
            {
                'kpi': k.pk,
                'name': k.name,
                'weight': k.weight,
                'score': scores.get(k.pk),
            }
            for k in obj.cycle.kpis.all()
        ]


class PerformanceReviewSerializer(serializers.ModelSerializer):
    """إنشاء/تعديل تقييم أداء مع درجات مؤشراته.

    الدرجات تُقبل كقائمة متداخلة `kpi_scores` وتُحفظ ذرّياً مع التقييم،
    فالكتابة الجزئية لدرجات مؤشر تنقذ التقييم من الضياع.
    """

    kpi_scores = ReviewKPIScoreSerializer(many=True, required=False)

    class Meta:
        model = PerformanceReview
        fields = (
            'id', 'cycle', 'employee', 'strengths',
            'improvements', 'comments', 'kpi_scores',
        )
        # `status` و`total_score` و`rating` مشتقّات تُحسب في الخدمة؛
        # إرسالها من العميل يجعله يصنع تقديراً لنفسه.
        read_only_fields = ('status', 'total_score', 'rating')

    def validate_employee(self, value):
        from rest_framework.exceptions import PermissionDenied
        from apps.hr.permissions import actor_has_hr_admin_access
        from apps.hr.scoping import user_within_hr_scope
        actor = self.context['request'].user
        if actor.pk == value.user_id:
            return value
        if not actor_has_hr_admin_access(actor, 'hr_performance'):
            raise PermissionDenied('لا تملك صلاحية تقييم زميل')
        if not user_within_hr_scope(value.user, actor):
            raise PermissionDenied('لا تملك صلاحية التقييم خارج نطاقك الإداري')
        return value

    def validate(self, attrs):
        instance = self.instance
        if instance and not instance.is_editable():
            raise serializers.ValidationError(
                {'status': f'لا يمكن تعديل تقييم في حالة «{instance.get_status_display()}»'}
            )
        cycle = attrs.get('cycle') or getattr(instance, 'cycle', None)
        if cycle is not None and cycle.status != CycleStatus.OPEN:
            raise serializers.ValidationError({'cycle': 'دورة التقييم ليست مفتوحة'})
        scores = attrs.get('kpi_scores')
        if cycle is not None and scores is not None:
            cycle_kpi_ids = set(cycle.kpis.values_list('pk', flat=True))
            submitted = {s['kpi'].pk if hasattr(s['kpi'], 'pk') else s['kpi'] for s in scores}
            outside = submitted - cycle_kpi_ids
            if outside:
                raise serializers.ValidationError({
                    'kpi_scores': f'مؤشرات من خارج الدورة: {outside}',
                })
        return attrs

    def create(self, validated_data):
        scores = validated_data.pop('kpi_scores', [])
        review = PerformanceReview.objects.create(**validated_data)
        for item in scores:
            ReviewKPIScore.objects.create(review=review, **item)
        return review

    def update(self, instance, validated_data):
        scores = validated_data.pop('kpi_scores', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if scores is not None:
            # استبدال كامل: الدرجة المحذوفة ل مؤشر لстанت.
            instance.kpi_scores.all().delete()
            for item in scores:
                ReviewKPIScore.objects.create(review=instance, **item)
        return instance
