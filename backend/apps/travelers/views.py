import base64
import io
import json

import qrcode
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import PermissionAction
from core.utils.qr_payload import make_qr_payload, sign_payload, verify_payload
from core.utils.response import success_response

from .models import Traveler, TravelerStatusLog
from .serializers import (
    TravelerDocumentSerializer,
    TravelerSerializer,
    TravelerStatusLogSerializer,
    TravelerStatusSerializer,
)


def record_status_log(traveler, to_status, note='', changed_by=None, from_status=None):
    TravelerStatusLog.objects.create(
        traveler=traveler,
        from_status=from_status or '',
        to_status=to_status,
        note=note,
        changed_by=changed_by,
    )


class TravelerPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 500


PUBLIC_REGISTRATION_ACTIONS = {'create', 'register'}

SELF_SERVICE_ACTIONS = {
    'retrieve', 'personal_info', 'submit', 'documents', 'delete_document',
    'download_document', 'qr_code', 'qr_download', 'qr_refresh', 'status',
    'declaration', 'timeline', 'profile',
}

STAFF_ACTION_PERMS = {
    'list': 'view',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
    'review': 'review',
    'qr_verify': 'view',
}


class TravelerViewSet(viewsets.ModelViewSet):
    queryset = Traveler.objects.select_related('nationality').all()
    serializer_class = TravelerSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    lookup_field = 'pk'
    pagination_class = TravelerPagination
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['passport_number', 'first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['created_at', 'full_name', 'registration_status']
    filter_fields = ['registration_status', 'nationality']
    permission_resource = 'travelers'

    def _staff_traveler_access(self, user):
        """صلاحيات موظف على سجلات المسافرين (عرض/تعديل/مراجعة/حذف)."""
        if user.is_superuser:
            return True
        codes = set(user.effective_permission_codes())
        return bool(codes & {'travelers:view', 'travelers:edit', 'travelers:review', 'travelers:delete'})

    def get_permissions(self):
        action = self.action or 'list'
        self.permission_resource = 'travelers'
        self.permission_action = STAFF_ACTION_PERMS.get(action, 'view')
        if action in PUBLIC_REGISTRATION_ACTIONS or action in SELF_SERVICE_ACTIONS:
            return [AllowAny()]
        return [PermissionAction('travelers', self.permission_action)]

    def get_object(self):
        traveler = super().get_object()
        if self.action not in SELF_SERVICE_ACTIONS:
            return traveler
        user = self.request.user
        if traveler.user_id is None:
            return traveler
        if user.is_authenticated and (user.is_superuser or traveler.user_id == user.id):
            return traveler
        if user.is_authenticated and self._staff_traveler_access(user):
            return traveler
        raise NotFound('المسافر غير موجود')

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.user_type == user.UserType.TRAVELER and not self._staff_traveler_access(user):
            return qs.filter(user=user)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        traveler = serializer.save()
        if request.user.is_authenticated and not traveler.user and request.user.user_type == 'TRAVELER':
            traveler.user = request.user
            traveler.save(update_fields=['user'])
        return Response(
            success_response(TravelerSerializer(traveler).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='register', serializer_class=TravelerSerializer)
    def register(self, request):
        return self.create(request)

    @action(detail=True, methods=['put', 'patch'], url_path='personal-info', serializer_class=TravelerSerializer)
    def personal_info(self, request, pk=None):
        traveler = self.get_object()
        serializer = self.get_serializer(traveler, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        traveler = serializer.save()
        return Response(success_response(TravelerSerializer(traveler).data))

    @action(detail=True, methods=['post'], url_path='submit', serializer_class=TravelerStatusSerializer)
    def submit(self, request, pk=None):
        traveler = self.get_object()
        if traveler.registration_status == Traveler.RegistrationStatus.PENDING_DOCUMENTS:
            record_status_log(traveler, Traveler.RegistrationStatus.UNDER_REVIEW,
                              from_status=traveler.registration_status)
            traveler.registration_status = Traveler.RegistrationStatus.UNDER_REVIEW
            traveler.save(update_fields=['registration_status'])
        data = {
            'registration_status': traveler.registration_status,
            'qr_code_issued': traveler.registration_status == Traveler.RegistrationStatus.COMPLETED,
            'rejection_reason': traveler.rejection_reason or None,
            'action_required': traveler.registration_status == Traveler.RegistrationStatus.ACTION_REQUIRED,
        }
        return Response(success_response(data))

    @action(detail=True, methods=['post'], url_path='review', serializer_class=TravelerStatusSerializer)
    def review(self, request, pk=None):
        traveler = self.get_object()
        new_status = request.data.get('registration_status')
        note = request.data.get('note', '')
        allowed = {
            Traveler.RegistrationStatus.UNDER_REVIEW,
            Traveler.RegistrationStatus.ACTION_REQUIRED,
            Traveler.RegistrationStatus.COMPLETED,
            Traveler.RegistrationStatus.REJECTED,
        }
        if new_status not in allowed:
            return Response(success_response({'detail': 'حالة غير صالحة'}), status=status.HTTP_400_BAD_REQUEST)
        rejection_reason = request.data.get('rejection_reason', '')
        if new_status == Traveler.RegistrationStatus.REJECTED and not rejection_reason:
            return Response(
                success_response({'detail': 'سبب الرفض مطلوب'}),
                status=status.HTTP_400_BAD_REQUEST,
            )
        from_status = traveler.registration_status
        traveler.registration_status = new_status
        if new_status == Traveler.RegistrationStatus.REJECTED:
            traveler.rejection_reason = rejection_reason
        traveler.save(update_fields=['registration_status', 'rejection_reason'])
        record_status_log(traveler, new_status, note=note, changed_by=request.user, from_status=from_status)
        return Response(success_response({'detail': 'تم تحديث حالة الطلب'}))

    @action(detail=True, methods=['get'], url_path='timeline', serializer_class=TravelerStatusLogSerializer)
    def timeline(self, request, pk=None):
        logs = self.get_object().status_logs.all()
        return Response(success_response(TravelerStatusLogSerializer(logs, many=True).data))

    @action(detail=True, methods=['get', 'post'], url_path='documents', serializer_class=TravelerDocumentSerializer)
    def documents(self, request, pk=None):
        traveler = self.get_object()
        if request.method == 'GET':
            docs = traveler.documents.all()
            return Response(success_response(TravelerDocumentSerializer(docs, many=True).data))
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save(traveler=traveler)
        if traveler.registration_status == Traveler.RegistrationStatus.PENDING_DOCUMENTS:
            traveler.registration_status = Traveler.RegistrationStatus.UNDER_REVIEW
            traveler.save(update_fields=['registration_status'])
        return Response(
            success_response(TravelerDocumentSerializer(document).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'], url_path=r'documents/(?P<doc_id>[^/.]+)')
    def delete_document(self, request, pk=None, doc_id=None):
        traveler = self.get_object()
        document = traveler.documents.filter(pk=doc_id).first()
        if not document:
            return Response(success_response({'detail': 'المستند غير موجود'}), status=status.HTTP_404_NOT_FOUND)
        document.delete()
        return Response(success_response({'detail': 'تم حذف المستند'}), status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path=r'documents/(?P<doc_id>[^/.]+)/download')
    def download_document(self, request, pk=None, doc_id=None):
        traveler = self.get_object()
        document = traveler.documents.filter(pk=doc_id).first()
        if not document:
            return Response(success_response({'detail': 'المستند غير موجود'}), status=status.HTTP_404_NOT_FOUND)
        url = document.file.url if document.file else None
        return Response(success_response({
            'doc_id': str(document.id),
            'name': document.file.name,
            'download_url': url,
        }))

    def _sign_payload(self, payload: dict) -> str:
        return sign_payload(payload)

    def _make_qr_payload(self, traveler) -> dict:
        return make_qr_payload(traveler)

    def _qr_image_data(self, payload: dict) -> str:
        encoded = base64.urlsafe_b64encode(json.dumps(payload, ensure_ascii=False).encode()).decode()
        qr_image = qrcode.make(encoded)
        buffer = io.BytesIO()
        qr_image.save(buffer, format='PNG')
        return f'data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode("utf-8")}'

    @action(detail=True, methods=['get'], url_path='qr-code')
    def qr_code(self, request, pk=None):
        traveler = self.get_object()
        payload = self._make_qr_payload(traveler)
        return Response(success_response({
            'qr_code': self._qr_image_data(payload),
            'qr_data': payload,
        }))

    @action(detail=True, methods=['get'], url_path='qr-code/download')
    def qr_download(self, request, pk=None):
        traveler = self.get_object()
        payload = self._make_qr_payload(traveler)
        encoded = base64.urlsafe_b64encode(json.dumps(payload, ensure_ascii=False).encode()).decode()
        qr_image = qrcode.make(encoded)
        buffer = io.BytesIO()
        qr_image.save(buffer, format='PNG')
        buffer.seek(0)
        filename = f'qrcode-{traveler.passport_number}.png'
        response = HttpResponse(
            buffer.getvalue(),
            content_type='image/png',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'], url_path='qr-code/refresh')
    def qr_refresh(self, request, pk=None):
        traveler = self.get_object()
        payload = self._make_qr_payload(traveler)
        return Response(success_response({
            'qr_code': self._qr_image_data(payload),
            'qr_data': payload,
            'detail': 'تم إصدار رمز QR جديد بنجاح',
        }))

    @action(detail=False, methods=['post'], url_path='qr-code/verify')
    def qr_verify(self, request):
        encoded = request.data.get('payload')
        if not encoded:
            return Response(success_response({'valid': False, 'reason': 'PAYLOAD_REQUIRED'}), status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = json.loads(base64.urlsafe_b64decode(encoded).decode())
        except Exception:
            return Response(success_response({'valid': False, 'reason': 'INVALID_PAYLOAD'}))
        if not verify_payload(payload):
            return Response(success_response({'valid': False, 'reason': 'BAD_SIGNATURE'}))
        try:
            expires_at = timezone.datetime.fromisoformat(payload['expires_at'])
        except (KeyError, ValueError):
            return Response(success_response({'valid': False, 'reason': 'INVALID_EXPIRY'}))
        if timezone.now() > expires_at:
            return Response(success_response({'valid': False, 'reason': 'EXPIRED'}))
        return Response(success_response({'valid': True}))

    @action(detail=True, methods=['get'], url_path='status', serializer_class=TravelerStatusSerializer)
    def status(self, request, pk=None):
        traveler = self.get_object()
        data = {
            'registration_status': traveler.registration_status,
            'qr_code_issued': traveler.registration_status == Traveler.RegistrationStatus.COMPLETED,
            'rejection_reason': traveler.rejection_reason or None,
            'action_required': traveler.registration_status == Traveler.RegistrationStatus.ACTION_REQUIRED,
        }
        return Response(success_response(data))

    @action(detail=True, methods=['get'], url_path='declaration')
    def declaration(self, request, pk=None):
        traveler = self.get_object()
        declaration = (traveler.medical_history or {}).get('health_declaration') or {}
        declared = bool(declaration)
        return Response(
            success_response(
                {
                    'declared': declared,
                    'submitted_at': getattr(traveler, 'updated_at', None),
                    'risk_score': declaration.get('risk_score'),
                    'risk_level': declaration.get('risk_level'),
                    'symptoms': (declaration.get('symptoms') or {}) if declared else None,
                    'trip': (traveler.medical_history or {}).get('trip'),
                    'purpose': (traveler.medical_history or {}).get('purpose'),
                }
            )
        )

    @action(detail=True, methods=['put', 'patch'], url_path='profile', serializer_class=TravelerSerializer)
    def profile(self, request, pk=None):
        traveler = self.get_object()
        serializer = self.get_serializer(traveler, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        traveler = serializer.save()
        return Response(success_response(TravelerSerializer(traveler).data))
