from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import PermissionAction
from core.utils.response import error_response, success_response

from .models import (
    Fee,
    Invoice,
    InvoiceStatus,
    PaymentAttempt,
    PaymentMethod,
    Receipt,
    Reconciliation,
    ReconciliationChannel,
    ReconciliationStatus,
    FinancialAuditLog,
)
from .serializers import (
    FeeSerializer,
    InvoiceSerializer,
    PaymentAttemptSerializer,
    ReceiptSerializer,
    ReconciliationSerializer,
    FinancialAuditLogSerializer,
)
from .services import (
    FinanceServiceError,
    build_reconciliation,
    cancel_invoice,
    confirm_payment,
    create_reconciliation,
    reconcile_invoice,
    refund_invoice,
    resolve_reconciliation,
    seal_reconciliation,
)


def _may(user, action):
    """سماحية الواجهة/الإجراءات المالية — المشرف مسموح له دائماً."""
    if not user or user.is_anonymous:
        return False
    if user.is_superuser:
        return True
    return user.can_resource('finance', action)


class FinancePermissionMixin:
    """يفرض صلاحية `finance:<action>` على كل واجهات النظام المالي (مفتاحية وطنية)."""

    permission_resource = 'finance'
    permission_classes = [PermissionAction]
    action_to_permission = {}
    default_permission = 'reports'

    def get_permissions(self):
        action = self.action or 'list'
        self.permission_action = self.action_to_permission.get(action, self.default_permission)
        return super().get_permissions()


class FeeViewSet(FinancePermissionMixin, viewsets.ModelViewSet):
    """بنود الرسوم (Master Data) — لا حذف نهائي، تُلغى عبر is_active."""

    action_to_permission = {
        'create': 'fee_manage',
        'update': 'fee_manage',
        'partial_update': 'fee_manage',
        'destroy': 'fee_manage',
    }

    queryset = Fee.objects.all()
    serializer_class = FeeSerializer
    filterset_fields = ['service_type', 'currency', 'year', 'is_active']
    search_fields = ['name_ar', 'code', 'legal_reference']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return error_response({'message': 'لا يُحذف بند الرسوم نهائياً؛ تم تعطيله'})

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get('year')
        service_type = self.request.query_params.get('service_type')
        if year:
            qs = qs.filter(year=year)
        if service_type:
            qs = qs.filter(service_type=service_type)
        return qs

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method in ('POST', 'PATCH', 'PUT', 'DELETE') and not _may(request.user, 'fee_manage'):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('إدارة بنود الرسوم تتطلب صلاحية مدير الحسابات.')


class InvoiceViewSet(FinancePermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related('food_shipment', 'food_sample', 'issued_by')
    serializer_class = InvoiceSerializer
    filterset_fields = ['status', 'source_type', 'currency', 'service_type']
    search_fields = ['invoice_number', 'request_ref', 'applicant_name']

    action_to_permission = {
        'pay': 'collect',
        'review': 'review',
        'cancel': 'cancel_refund',
        'refund': 'cancel_refund',
    }

    def get_queryset(self):
        qs = super().get_queryset()
        status_ = self.request.query_params.get('status')
        sector = self.request.query_params.get('sector')
        point = self.request.query_params.get('point')
        service_type = self.request.query_params.get('service_type')
        if status_:
            qs = qs.filter(status=status_)
        if sector:
            qs = qs.filter(food_shipment__port__sector_id=sector)
        if point:
            qs = qs.filter(food_shipment__port_id=point)
        if service_type:
            qs = qs.filter(service_type=service_type)
        return qs

    def _invoice_or_error(self, request):
        invoice = self.get_object()
        return invoice

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        invoice = self.get_object()
        if not _may(request.user, 'collect'):
            return Response(error_response('لا تملك صلاحية التحصيل'), status=status.HTTP_403_FORBIDDEN)
        try:
            invoice, payment, receipt = confirm_payment(
                invoice, request.user,
                method=request.data.get('method') or 'CASH',
                amount=request.data.get('amount'),
                gateway_ref=request.data.get('gateway_ref', ''),
                notes=request.data.get('notes', ''),
                gateway_status=request.data.get('gateway_status', 'CONFIRMED'),
                request=request,
            )
        except FinanceServiceError as exc:
            return Response(error_response(str(exc)), status=status.HTTP_400_BAD_REQUEST)
        return Response(success_response(InvoiceSerializer(invoice).data))

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        invoice = self.get_object()
        if not _may(request.user, 'review'):
            return Response(error_response('لا تملك صلاحية المراجعة المالية'), status=status.HTTP_403_FORBIDDEN)
        last_payment = invoice.payments.filter(gateway_status='CONFIRMED').order_by('-collected_at').first()
        collector_id = last_payment.collected_by_id if last_payment else None
        try:
            reconcile_invoice(invoice, request.user, collector_id=collector_id, request=request)
        except FinanceServiceError as exc:
            return Response(error_response(str(exc)), status=status.HTTP_400_BAD_REQUEST)
        return Response(success_response(InvoiceSerializer(invoice).data))

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if not _may(request.user, 'cancel_refund'):
            return Response(error_response('لا تملك صلاحية الإلغاء/الاسترداد'), status=status.HTTP_403_FORBIDDEN)
        try:
            cancel_invoice(invoice, request.user, request.data.get('reason', ''), request=request)
        except FinanceServiceError as exc:
            return Response(error_response(str(exc)), status=status.HTTP_400_BAD_REQUEST)
        return Response(success_response(InvoiceSerializer(invoice).data))

    @action(detail=True, methods=['post'], url_path='refund')
    def refund(self, request, pk=None):
        invoice = self.get_object()
        if not _may(request.user, 'cancel_refund'):
            return Response(error_response('لا تملك صلاحية الإلغاء/الاسترداد'), status=status.HTTP_403_FORBIDDEN)
        try:
            refund_invoice(
                invoice, request.user,
                reason=request.data.get('reason', ''),
                amount=request.data.get('amount'),
                request=request,
            )
        except FinanceServiceError as exc:
            return Response(error_response(str(exc)), status=status.HTTP_400_BAD_REQUEST)
        return Response(success_response(InvoiceSerializer(invoice).data))


class PaymentAttemptViewSet(FinancePermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PaymentAttempt.objects.select_related('invoice', 'collected_by')
    serializer_class = PaymentAttemptSerializer
    filterset_fields = ['method', 'gateway_status', 'currency']
    search_fields = ['gateway_ref', 'invoice__invoice_number']

    def get_queryset(self):
        qs = super().get_queryset()
        from_date = self.request.query_params.get('from')
        to_date = self.request.query_params.get('to')
        if from_date:
            qs = qs.filter(collected_at__date__gte=from_date)
        if to_date:
            qs = qs.filter(collected_at__date__lte=to_date)
        return qs


class ReceiptViewSet(FinancePermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Receipt.objects.select_related('invoice', 'payment', 'issued_by')
    serializer_class = ReceiptSerializer
    search_fields = ['receipt_number', 'invoice__invoice_number']

    @action(detail=True, methods=['get'], url_path='print', url_name='print')
    def print_receipt(self, request, pk=None):
        """نسخة قابلة للطباعة من الإيصال الإلكتروني (إيصال استلام النقدية)."""
        receipt = self.get_object()
        invoice = receipt.invoice
        payment = receipt.payment

        def person_name(user):
            if not user:
                return '—'
            return (
                (user.full_name.strip() if user.full_name else '')
                or (user.email or '')
                or str(user)
            )

        def item_shaped(item):
            name = item.get('name') or item.get('name_ar') or '—'
            qty = item.get('quantity') if item.get('quantity') is not None else item.get('qty', 1)
            unit_price = item.get('unit_price')
            if unit_price is None:
                unit_price = item.get('unit_amount')
            amount = item.get('amount')
            if amount is None:
                amount = item.get('total')
            if amount is None and unit_price is not None:
                try:
                    amount = Decimal(str(unit_price)) * Decimal(str(qty))
                except Exception:
                    amount = unit_price
            return {
                'name': name,
                'quantity': qty,
                'unit_price': float(unit_price) if unit_price is not None else None,
                'amount': float(amount) if amount is not None else None,
            }

        payload = {
            'receipt': {
                'number': receipt.receipt_number,
                'issued_at': receipt.issued_at.isoformat(),
                'verification_code': receipt.verification_code,
                'issued_by': person_name(receipt.issued_by),
            },
            'invoice': {
                'number': invoice.invoice_number,
                'request_ref': invoice.request_ref or '',
                'source_type': invoice.get_source_type_display(),
                'service_type': invoice.get_service_type_display(),
                'currency': receipt.currency,
                'gross_amount': float(invoice.gross_amount),
                'discount_amount': float(invoice.discount_amount or 0),
                'discount_reason': invoice.discount_reason or '',
                'net_amount': float(invoice.net_amount),
                'items': [item_shaped(i) for i in (invoice.items or [])],
            },
            'payment': {
                'amount': float(receipt.amount),
                'method': payment.get_method_display(),
                'method_code': payment.method,
                'gateway_ref': payment.gateway_ref or '',
                'gateway_status': payment.get_gateway_status_display(),
                'notes': payment.notes or '',
                'collected_at': payment.collected_at.isoformat(),
                'collected_by': person_name(payment.collected_by),
            },
            'customer': {
                'name': invoice.applicant_name or '',
                'id_number': invoice.applicant_id_number or '',
                'phone': invoice.applicant_phone or '',
            },
        }
        return Response(success_response(payload))


class ReconciliationViewSet(FinancePermissionMixin, viewsets.ModelViewSet):
    queryset = Reconciliation.objects.select_related('reconciled_by')
    serializer_class = ReconciliationSerializer
    filterset_fields = ['channel', 'status']
    search_fields = ['investigation_notes']

    def _recon(self, request):
        reconciliation = self.get_object()
        if not _may(request.user, 'reports'):
            return None
        return reconciliation

    def perform_create(self, serializer):
        serializer.save(
            reconciled_by=self.request.user if serializer.validated_data.get('status') == 'RESOLVED' else None
        )

    @action(detail=False, methods=['get'], url_path='preview')
    def preview(self, request):
        """معاينة التسوية: حساب إجماليات النظام للفترة/القناة قبل الحفظ."""
        if not _may(request.user, 'reports'):
            return error_response({'message': 'لا تملك صلاحية المطابقات المالية'}, status.HTTP_403_FORBIDDEN)
        period_start = request.query_params.get('period_start')
        period_end = request.query_params.get('period_end')
        channel = request.query_params.get('channel')
        if not (period_start and period_end and channel):
            return error_response({'message': 'ابدأ الفترة والقناة'}, status.HTTP_400_BAD_REQUEST)
        try:
            data = build_reconciliation(
                period_start,
                period_end,
                ReconciliationChannel(channel),
                request=request,
            )
        except FinanceServiceError as exc:
            return error_response({'message': str(exc)}, status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return error_response({'message': 'قناة تسوية غير صالحة'}, status.HTTP_400_BAD_REQUEST)
        return Response(success_response(data))

    @action(detail=True, methods=['post'], url_path='seal')
    def seal(self, request, pk=None):
        """إغلاق التسوية: DRAFT → MATCHED/DISCREPANCY → RESOLVED."""
        reconciliation = self._recon(request)
        if reconciliation is None:
            return error_response({'message': 'لا تملك صلاحية المطابقات المالية'}, status.HTTP_403_FORBIDDEN)
        try:
            result = seal_reconciliation(
                reconciliation, request.user,
                system_total=request.data.get('system_total'),
                channel_total=request.data.get('channel_total'),
                investigation_notes=request.data.get('investigation_notes', ''),
                request=request,
            )
        except FinanceServiceError as exc:
            return error_response({'message': str(exc)}, status.HTTP_400_BAD_REQUEST)
        return Response(success_response(ReconciliationSerializer(result).data))

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        """الحسم النهائي للتسوية (RESOLVED) — فصل الاختصاص عند الإغلاق."""
        reconciliation = self._recon(request)
        if reconciliation is None:
            return error_response({'message': 'لا تملك صلاحية المطابقات المالية'}, status.HTTP_403_FORBIDDEN)
        try:
            result = resolve_reconciliation(
                reconciliation, request.user,
                system_total=request.data.get('system_total'),
                channel_total=request.data.get('channel_total'),
                investigation_notes=request.data.get('investigation_notes', ''),
                request=request,
            )
        except FinanceServiceError as exc:
            return error_response({'message': str(exc)}, status.HTTP_400_BAD_REQUEST)
        return Response(success_response(ReconciliationSerializer(result).data))

    def create(self, request, *args, **kwargs):
        if not _may(request.user, 'reports'):
            return error_response({'message': 'لا تملك صلاحية المطابقات المالية'}, status.HTTP_403_FORBIDDEN)

        from django.utils.dateparse import parse_date

        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        channel = request.data.get('channel')
        if not (period_start and period_end and channel):
            return error_response({'message': 'ابدأ الفترة والقناة'}, status.HTTP_400_BAD_REQUEST)
        channel_total = request.data.get('channel_total')
        try:
            reconciliation = create_reconciliation(
                request.user,
                period_start,
                period_end,
                ReconciliationChannel(channel),
                channel_total=channel_total,
                investigation_notes=request.data.get('investigation_notes', ''),
                request=request,
            )
        except FinanceServiceError as exc:
            return error_response({'message': str(exc)}, status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return error_response({'message': 'قناة تسوية غير صالحة أو تاريخ غير صالح'}, status.HTTP_400_BAD_REQUEST)
        return Response(
            success_response(ReconciliationSerializer(reconciliation).data),
            status=status.HTTP_201_CREATED,
        )


class FinancialAuditLogViewSet(FinancePermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = FinancialAuditLog.objects.select_related('actor')
    serializer_class = FinancialAuditLogSerializer
    filterset_fields = ['action', 'resource_type', 'actor', 'invoice']
    search_fields = ['invoice_ref', 'resource_id', 'new_value', 'old_value']
    default_permission = 'audit'

    def get_queryset(self):
        qs = super().get_queryset()
        resource_type = self.request.query_params.get('resource_type')
        action_ = self.request.query_params.get('action')
        if resource_type:
            qs = qs.filter(resource_type=resource_type)
        if action_:
            qs = qs.filter(action=action_)
        return qs


class FinanceReportViewSet(FinancePermissionMixin, viewsets.ViewSet):
    """التقارير المالية: يومي، شهري، قومي، متأخرات، بمحاور الإيرادات والطباعة/التصدير."""

    def _gate(self, request):
        if not _may(request.user, 'reports'):
            return Response(
                error_response({'message': 'لا تملك صلاحية التقارير المالية'}),
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def _revenue_qs(self, request):
        qs = Invoice.objects.filter(status__in=[InvoiceStatus.PAID, InvoiceStatus.RECONCILED])
        sector = request.query_params.get('sector')
        point = request.query_params.get('point')
        service_type = request.query_params.get('service_type')
        channel = request.query_params.get('channel')
        year = request.query_params.get('year')
        if sector:
            qs = qs.filter(food_shipment__port__sector_id=sector)
        if point:
            qs = qs.filter(food_shipment__port_id=point)
        if service_type:
            qs = qs.filter(service_type=service_type)
        if channel:
            qs = qs.filter(payments__method=channel)
        if year:
            qs = qs.filter(payments__collected_at__year=year, payments__gateway_status='CONFIRMED')
        return qs.distinct()

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        now = timezone.now()
        today = now.date()
        revenue_qs = self._revenue_qs(request)
        paid_today = PaymentAttempt.objects.filter(collected_at__date=today).aggregate(
            total=Sum('amount'), count=Count('id')
        )
        overdue = Invoice.objects.filter(
            status=InvoiceStatus.OVERDUE
        ).aggregate(total=Sum('net_amount'), count=Count('id'))
        pending = Invoice.objects.filter(
            status__in=[InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL]
        ).count()
        funnel = {}
        for each in Invoice.objects.values('status').annotate(n=Count('id')).order_by():
            funnel[each['status']] = each['n']
        data = {
            'today': {
                'collected': float(paid_today['total'] or 0),
                'count': paid_today['count'] or 0,
            },
            'revenue': {
                'total': float(revenue_qs.aggregate(t=Sum('net_amount'))['t'] or 0),
                'count': revenue_qs.count(),
            },
            'pending_count': pending,
            'overdue': {
                'count': overdue['count'] or 0,
                'amount': float(overdue['total'] or 0),
            },
            'funnel': funnel,
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='monthly')
    def monthly(self, request):
        qs = self._revenue_qs(request)
        end = timezone.now()
        start = end - timedelta(days=365)
        series = (
            qs.filter(created_at__date__gte=start.date())
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(amount=Sum('net_amount'), count=Count('id'))
            .order_by('month')
        )
        by_sector = (
            qs.values('food_shipment__port__sector__name_ar')
            .annotate(amount=Sum('net_amount'))
            .order_by('-amount')
        )
        return Response(success_response({
            'series': [
                {'month': r['month'].strftime('%Y-%m') if r['month'] else None,
                 'amount': float(r['amount'] or 0), 'count': r['count']}
                for r in series
            ],
            'by_sector': [{'name': r['food_shipment__port__sector__name_ar'] or 'غير مصنّف',
                           'amount': float(r['amount'] or 0)} for r in by_sector],
        }))

    @action(detail=False, methods=['get'], url_path='national')
    def national(self, request):
        qs = self._revenue_qs(request)
        rows = qs.select_related('food_shipment__port__sector').values(
            'food_shipment__port__sector__name_ar',
            'food_shipment__port__name_ar',
            'service_type',
        ).annotate(amount=Sum('net_amount'), count=Count('id')).order_by('-amount')
        tree = {}
        for r in rows:
            sector = r['food_shipment__port__sector__name_ar'] or 'غير مصنّف'
            port = r['food_shipment__port__name_ar'] or '—'
            service = r['service_type'] or 'OTHER'
            tree.setdefault(sector, {})
            tree[sector].setdefault(port, {})
            tree[sector][port][service] = {'amount': float(r['amount'] or 0), 'count': r['count']}
        return Response(success_response(tree))

    @action(detail=False, methods=['get'], url_path='by-channel')
    def by_channel(self, request):
        """الإيراد المحصّل حسب وسيلة الدفع (نقدي/بطاقة/تحويل/إلكتروني)."""
        denied = self._gate(request)
        if denied:
            return denied
        year = request.query_params.get('year')
        payments = PaymentAttempt.objects.filter(gateway_status='CONFIRMED')
        if year:
            payments = payments.filter(collected_at__year=year)
        rows = list(payments.values('method').annotate(
            amount=Sum('amount'), count=Count('id')
        ).order_by('-amount'))
        return Response(success_response({
            'items': [
                {
                    'method': r['method'],
                    'method_label': dict(PaymentMethod.choices).get(r['method'], r['method']),
                    'amount': float(r['amount'] or 0),
                    'count': r['count'],
                }
                for r in rows
            ],
            'total': float(payments.aggregate(t=Sum('amount'))['t'] or 0),
        }))

    @action(detail=False, methods=['get'], url_path='variation')
    def variation(self, request):
        """تحليل الاستردادات: ملغاة/مسترَدّة مقابل الفواتير المسددة."""
        denied = self._gate(request)
        if denied:
            return denied
        paid = Invoice.objects.filter(status__in=[InvoiceStatus.PAID, InvoiceStatus.RECONCILED])
        refunded = Invoice.objects.filter(status=InvoiceStatus.REFUNDED)
        cancelled = Invoice.objects.filter(status=InvoiceStatus.CANCELLED)
        data = {
            'issued': {
                'count': Invoice.objects.exclude(status=InvoiceStatus.DRAFT).count(),
            },
            'paid': {'count': paid.count(), 'amount': float(paid.aggregate(t=Sum('net_amount'))['t'] or 0)},
            'refunded': {'count': refunded.count(), 'amount': float(refunded.aggregate(t=Sum('net_amount'))['t'] or 0)},
            'cancelled': {'count': cancelled.count(), 'amount': float(cancelled.aggregate(t=Sum('net_amount'))['t'] or 0)},
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='matrix')
    def matrix(self, request):
        """مصفوفة قطاع × منفذ (عبر شحنات رقابة الأغذية) — جاهزة للعرض والتصدير."""
        denied = self._gate(request)
        if denied:
            return denied
        qs = self._revenue_qs(request).select_related('food_shipment__port__sector')
        rows = list(qs.values(
            'food_shipment__port__sector__name_ar',
            'food_shipment__port__name_ar',
        ).annotate(amount=Sum('net_amount'), count=Count('id')).order_by('-amount'))
        return Response(success_response({
            'rows': [
                {
                    'sector': r['food_shipment__port__sector__name_ar'] or 'غير مصنّف',
                    'port': r['food_shipment__port__name_ar'] or '—',
                    'amount': float(r['amount'] or 0),
                    'count': r['count'],
                }
                for r in rows
            ]
        }))

    @action(detail=False, methods=['get'], url_path='arrears-aging')
    def arrears_aging(self, request):
        """توزيع المتأخرات حسب فترات التأخير (0-30 / 31-60 / 61-90 / >90)."""
        denied = self._gate(request)
        if denied:
            return denied
        today = timezone.now().date()
        buckets = {
            '0_30': {'label': '0-30 يوم', 'count': 0, 'amount': 0},
            '31_60': {'label': '31-60 يوم', 'count': 0, 'amount': 0},
            '61_90': {'label': '61-90 يوم', 'count': 0, 'amount': 0},
            '90_plus': {'label': 'أكثر من 90 يوم', 'count': 0, 'amount': 0},
        }
        for inv in Invoice.objects.filter(status=InvoiceStatus.OVERDUE):
            late = (today - inv.due_date).days if inv.due_date else 0
            key = ('0_30' if late <= 30 else '31_60' if late <= 60 else '61_90' if late <= 90 else '90_plus')
            buckets[key]['count'] += 1
            buckets[key]['amount'] += float(inv.net_amount)
        return Response(success_response({
            'buckets': list(buckets.values()),
            'total_count': sum(b['count'] for b in buckets.values()),
            'total_amount': float(sum(b['amount'] for b in buckets.values())),
        }))

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        """تصدير CSV للإيرادات القومية: قطاع، منفذ، خدمة، المبلغ، العدد."""
        denied = self._gate(request)
        if denied:
            return denied
        import csv as _csv
        import io

        from django.http import HttpResponse

        qs = self._revenue_qs(request).select_related('food_shipment__port__sector')
        rows = list(qs.values(
            'food_shipment__port__sector__name_ar',
            'food_shipment__port__name_ar',
            'service_type',
        ).annotate(amount=Sum('net_amount'), count=Count('id')).order_by('-amount'))
        buf = io.StringIO()
        writer = _csv.writer(buf)
        writer.writerow(['القطاع', 'المنفذ', 'الخدمة', 'المبلغ', 'عدد الفواتير'])
        for r in rows:
            writer.writerow([
                r['food_shipment__port__sector__name_ar'] or 'غير مصنّف',
                r['food_shipment__port__name_ar'] or '—',
                r['service_type'] or 'OTHER',
                float(r['amount'] or 0),
                r['count'],
            ])
        response = HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="nqp_revenue.csv"'
        return response

    @action(detail=False, methods=['get'], url_path='arrears')
    def arrears(self, request):
        today = timezone.now().date()
        rows = Invoice.objects.filter(status=InvoiceStatus.OVERDUE).order_by('due_date')
        data = [
            {
                'id': str(i.id),
                'invoice_number': i.invoice_number,
                'request_ref': i.request_ref or '',
                'customer': i.applicant_name or '',
                'amount': float(i.net_amount),
                'currency': i.currency,
                'due_date': i.due_date.isoformat() if i.due_date else None,
                'late_days': (today - i.due_date).days if i.due_date else 0,
            }
            for i in rows
        ]
        return Response(success_response({'items': data, 'total': float(rows.aggregate(t=Sum('net_amount'))['t'] or 0)}))