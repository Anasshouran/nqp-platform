import logging
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Prefetch, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from datetime import timedelta

import uuid

from django.conf import settings

from apps.carriers.models import Flight, HealthNotice
from apps.food_quarantine.models import FoodReleaseCertificate, FoodShipment
from apps.laboratory.models import Disease, LabSample, SampleTest
from apps.masterdata.models import EntryPoint as Port
from apps.notifications.models import WebPushSubscription
from apps.organization.models import Sector
from apps.travelers.models import Country, Traveler
from core.permissions import IsAdmin
from core.utils.qr_payload import make_qr_payload, verify_payload
from core.utils.response import error_response, success_response
from core.utils.vapid import get_vapid_public_key

from .models import ContactMessage, HealthCertificate, Service, ServiceCategory
from .serializers import (
    CertificateVerificationSerializer,
    ContactMessageSerializer,
    DemoQrSerializer,
    LabResultLookupSerializer,
    PublicCountrySerializer,
    PublicDiseaseSerializer,
    PublicFlightSerializer,
    PublicNoticeSerializer,
    PublicPortSerializer,
    PublicTravelRequirementSerializer,
    FoodShipmentTrackSerializer,
    QrVerificationSerializer,
    SectorSerializer,
    ServiceCategorySerializer,
    ServiceSerializer,
    TravelerLookupSerializer,
    WebPushSubscribeSerializer,
)

logger = logging.getLogger(__name__)


class ContactViewSet(viewsets.mixins.CreateModelMixin, viewsets.mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdmin()]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().order_by('-created_at')
        return Response(success_response(self.get_serializer(queryset, many=True).data))


class TravelerLookupView(APIView):
    """استعلام المسافر عن حالة تسجيله في بوابة المسافرين.

    يتطلب (رقم الجواز + تاريخ الميلاد) كعامل تحقق ثانٍ لمنع تعداد PII
    عبر رقم الجواز وحده، مع معدل طلب محدود لكل عنوان.
    """
    permission_classes = [AllowAny]
    serializer_class = TravelerLookupSerializer
    throttle_scope = 'traveler_lookup'

    def get(self, request):
        passport = (request.query_params.get('passport') or '').strip()
        dob_value = (request.query_params.get('dob') or '').strip()
        if not passport or not dob_value:
            return Response(success_response({'found': False, 'error': 'PASSPORT_AND_DOB_REQUIRED'}))
        dob = parse_date(dob_value)
        if not dob:
            return Response(success_response({'found': False, 'error': 'INVALID_DOB'}))
        traveler = Traveler.objects.filter(
            passport_number__iexact=passport,
            date_of_birth=dob,
        ).first()
        if not traveler:
            return Response(success_response({'found': False, 'error': 'NOT_FOUND'}))
        return Response(success_response({
            'found': True,
            'traveler_id': str(traveler.id),
            'passport_number': traveler.passport_number,
            'full_name': traveler.full_name,
            'nationality': traveler.nationality.name_ar if traveler.nationality_id else None,
            'registration_status': traveler.registration_status,
            'qr_issued': traveler.registration_status == Traveler.RegistrationStatus.COMPLETED,
            'rejection_reason': traveler.rejection_reason or None,
        }))


class VerifyQrView(APIView):
    permission_classes = [AllowAny]
    serializer_class = QrVerificationSerializer

    def post(self, request):
        payload = request.data or {}
        if not isinstance(payload, dict) or not verify_payload(payload):
            return Response(success_response({'valid': False, 'reason': 'INVALID_SIGNATURE'}))

        traveler = Traveler.objects.filter(id=payload.get('traveler_id')).first()
        if not traveler:
            return Response(success_response({'valid': False, 'reason': 'NOT_FOUND'}))
        if traveler.registration_status != Traveler.RegistrationStatus.COMPLETED:
            return Response(success_response({'valid': False, 'reason': 'NOT_APPROVED'}))

        issued_at = payload.get('issued_at')
        try:
            issued_dt = timezone.datetime.fromisoformat(issued_at.replace('Z', '+00:00'))
        except (ValueError, TypeError, AttributeError):
            issued_dt = None
        if issued_dt is None or issued_dt > timezone.now() or issued_dt < timezone.now() - timedelta(days=90):
            return Response(success_response({'valid': False, 'reason': 'QR_EXPIRED'}))

        return Response(success_response({
            'valid': True,
            'traveler': {
                'passport_number': traveler.passport_number,
                'full_name': traveler.full_name,
                'registration_status': traveler.registration_status,
            },
        }))


class VerifyCertificateView(APIView):
    permission_classes = [AllowAny]
    serializer_class = CertificateVerificationSerializer

    def post(self, request):
        cert_number = (request.data.get('certificate_number') or '').strip()
        if not cert_number:
            return Response(success_response({'valid': False, 'reason': 'CERTIFICATE_REQUIRED'}))

        certificate = HealthCertificate.objects.filter(certificate_number__iexact=cert_number).first()
        if not certificate:
            return Response(success_response({'valid': False, 'reason': 'NOT_FOUND'}))
        if not certificate.is_valid:
            return Response(success_response({'valid': False, 'reason': 'REVOKED'}))
        if certificate.expiry_date and certificate.expiry_date < timezone.localdate():
            return Response(success_response({'valid': False, 'reason': 'EXPIRED'}))

        return Response(success_response({
            'valid': True,
            'certificate': {
                'certificate_number': certificate.certificate_number,
                'traveler_name': certificate.traveler_name,
                'passport_number': certificate.passport_number,
                'certificate_type': certificate.certificate_type,
                'disease': certificate.disease,
                'issued_date': certificate.issued_date,
                'expiry_date': certificate.expiry_date,
            },
        }))


class VapidKeyView(APIView):
    """مفتاح VAPID العام لدعم إشعارات الويب المدفوعة في المتصفح."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(success_response({'vapid_public_key': get_vapid_public_key()}))


class WebPushSubscribeView(APIView):
    """تسجيل اشتراك إشعارات الويب من المتصفح."""

    permission_classes = [AllowAny]
    serializer_class = WebPushSubscribeSerializer

    def post(self, request):
        serializer = WebPushSubscribeSerializer(data=request.data or {})
        if not serializer.is_valid():
            return Response(
                error_response('بيانات الاشتراك غير صالحة'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        p256dh = (data['keys'] or {}).get('p256dh', '')
        auth = (data['keys'] or {}).get('auth', '')
        if not p256dh or not auth:
            return Response(
                error_response('مفاتيح الاشتراك غير مكتملة'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        subscription, _ = WebPushSubscription.objects.update_or_create(
            endpoint=data['endpoint'],
            defaults={
                'p256dh': p256dh,
                'auth': auth,
                'user': request.user if getattr(request.user, 'is_authenticated', False) else None,
            },
        )
        return Response(
            success_response({'subscribed': True, 'id': str(subscription.id)}),
            status=status.HTTP_201_CREATED,
        )


class DemoQrView(APIView):
    """حمولة QR تجريبية موقّعة لمسافر مكتمل، تتيح تجربة التحقق بشكل واقعي."""

    permission_classes = [AllowAny]
    serializer_class = DemoQrSerializer

    DEMO_TRAVELER_ID = uuid.UUID('00000000-0000-0000-0000-000000000001')
    DEMO_PASSPORT = 'P1234567'

    def get(self, request):
        if not settings.ENABLE_DEMO_QR:
            raise NotFound('الدالة التجريبية غير مفعّلة')
        traveler = Traveler.objects.filter(id=self.DEMO_TRAVELER_ID).first()
        if traveler is None:
            traveler = Traveler.objects.filter(passport_number=self.DEMO_PASSPORT).first()
        if traveler is None:
            country, _ = Country.objects.get_or_create(
                code='SDN',
                defaults={'name': 'Sudan', 'name_ar': 'السودان'},
            )
            traveler = Traveler.objects.create(
                id=self.DEMO_TRAVELER_ID,
                passport_number=self.DEMO_PASSPORT,
                first_name='محمد',
                last_name='أحمد',
                date_of_birth='1990-01-01',
                nationality=country,
                registration_status=Traveler.RegistrationStatus.COMPLETED,
            )
        elif traveler.registration_status != Traveler.RegistrationStatus.COMPLETED:
            traveler.registration_status = Traveler.RegistrationStatus.COMPLETED
            traveler.save(update_fields=['registration_status', 'updated_at'])

        return Response(success_response({
            'qr_data': make_qr_payload(traveler),
            'passport_number': traveler.passport_number,
            'full_name': traveler.full_name,
        }))


class LabResultLookupView(APIView):
    """استعلام عام عن نتائج التحاليل المعتمدة برقم مرجعي + رمز تحقق.

    الرمز (LNC-XXXXXX) يُنشأ تلقائياً عندما تكتمل نتائج العينة وتُعتمد،
    ويُسلَّم لصاحب العينة عبر القناة الرسمية المعتمدة فقط.
    """

    permission_classes = [AllowAny]
    serializer_class = LabResultLookupSerializer

    def post(self, request):
        serializer = LabResultLookupSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        reference = serializer.validated_data['reference'].strip()
        code = serializer.validated_data['code'].strip()

        sample = (
            LabSample.objects.select_related('sector', 'section')
            .filter(
                Q(sample_number__iexact=reference) | Q(sample_barcode__iexact=reference),
                public_result_code__iexact=code,
            )
            .first()
        )
        if not sample or sample.status != LabSample.SampleStatus.COMPLETED:
            return Response(success_response({'found': False, 'error': 'NOT_FOUND'}))

        tests = sample.tests.select_related('disease', 'approved_by').filter(
            status__in=[SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED]
        )
        return Response(success_response({
            'found': True,
            'sample': {
                'sample_number': sample.sample_number,
                'verification_code': sample.public_result_code,
                'sample_type': sample.sample_type,
                'sample_type_label': sample.get_sample_type_display(),
                'collected_at': sample.collected_at,
                'public_issued_at': sample.public_issued_at,
                'sector_name': sample.sector.name_ar if sample.sector_id else None,
                'section_name': sample.section.name_ar if sample.section_id else None,
            },
            'tests': [
                {
                    'test_name': test.test_name,
                    'disease_name': test.disease.name_ar if test.disease_id else '',
                    'outcome': test.outcome,
                    'outcome_label': test.get_outcome_display() if test.outcome else '',
                    'result_value': test.result_value,
                    'result_text': test.result_text,
                    'unit': test.unit,
                    'reference_range': test.reference_range,
                    'is_critical': False,
                    'approved_at': test.approved_at,
                }
                for test in tests
            ],
        }))


class SectorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sector.objects.prefetch_related('entry_points').filter(is_active=True)
    serializer_class = SectorSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'ports':
            return PublicPortSerializer
        return SectorSerializer

    @action(detail=True, methods=['get'], url_path='ports')
    def ports(self, request, pk=None):
        sector = self.get_object()
        from core.utils.ports import sector_entry_points

        return Response(
            success_response(PublicPortSerializer(sector_entry_points(sector), many=True).data)
        )

    @action(detail=True, methods=['get'], url_path='statistics')
    def statistics(self, request, pk=None):
        sector = self.get_object()
        from apps.screening.models import HealthScreening
        from apps.food_quarantine.models import FoodShipment
        from apps.laboratory.models import LabSample
        from .models import HealthCertificate

        from core.utils.ports import sector_entry_points
        ports = sector_entry_points(sector)

        data = {
            'sector': sector.code,
            'entry_points': ports.count(),
            'screenings': HealthScreening.objects.filter(port__in=ports).count(),
            'certificates': HealthCertificate.objects.count(),
            'food_shipments': FoodShipment.objects.filter(port__in=ports).count(),
            'lab_samples': LabSample.objects.count(),
        }
        return Response(success_response(data))

    @action(detail=True, methods=['get'], url_path='news')
    def news(self, request, pk=None):
        sector = self.get_object()
        from apps.cms.models import NewsArticle

        articles = NewsArticle.objects.filter(
            is_published=True,
            sector=sector,
        ).order_by('-published_at')[:10]

        data = [
            {
                'id': str(a.id),
                'title': a.title,
                'content': a.content[:300] if a.content else '',
                'category': a.category,
                'image': a.image.url if a.image else None,
                'published_at': a.published_at.isoformat() if a.published_at else None,
            }
            for a in articles
        ]
        return Response(success_response(data))


class PublicPortViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Port.objects.select_related('state', 'state__sector').filter(is_active=True)
    serializer_class = PublicPortSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    filterset_fields = ['kind']

    @action(detail=False, methods=['get'], url_path='map')
    def map(self, request):
        features = []
        for port in self.get_queryset():
            features.append({
                'type': 'Feature',
                'geometry': {'type': 'Point', 'coordinates': [0, 0]},
                'properties': {
                    'id': str(port.id),
                    'code': port.code,
                    'name_ar': port.name_ar,
                    'name_en': port.name_en,
                    'type': port.kind,
                    'sector': port.state.sector.name_ar if port.state_id else None,
                },
            })
        return Response(success_response({'type': 'FeatureCollection', 'features': features}))

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        port = self.get_object()
        from apps.emergency_eoc.models import EmergencyAlert
        from apps.screening.models import HealthScreening

        data = {
            'port_id': str(port.id),
            'screenings_total': HealthScreening.objects.filter(port=port).count(),
            'active_alerts': EmergencyAlert.objects.filter(port=port, status=EmergencyAlert.AlertStatus.NEW).count(),
            'flights_total': port.flights.count(),
        }
        return Response(success_response(data))


class PublicDiseaseViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    serializer_class = PublicDiseaseSerializer

    def list(self, request):
        diseases = Disease.objects.filter(is_active=True)
        data = [
            {
                'id': str(d.id),
                'icd_11_code': d.icd_11_code,
                'name_ar': d.name_ar,
                'name_en': d.name_en,
                'description': d.description,
                'symptoms': d.symptoms,
                'incubation_period_min': d.incubation_period_min,
                'incubation_period_max': d.incubation_period_max,
                'transmission_methods': d.transmission_methods,
                'ihr_category': d.ihr_category,
            }
            for d in diseases
        ]
        return Response(success_response(data))


class PublicStatisticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.cms.models import FaqItem, NewsArticle
        from apps.food_quarantine.models import FoodShipment
        from apps.laboratory.models import Disease, LabSample
        from apps.masterdata.models import EntryPoint
        from apps.organization.models import Sector
        from apps.screening.models import HealthScreening
        from apps.travelers.models import Traveler
        from apps.vector_control.models import VectorRegistry

        from .models import HealthCertificate

        sector_code = (request.query_params.get('sector') or '').strip()
        period = request.query_params.get('period') or 'all'

        ports = EntryPoint.objects.filter(is_active=True)
        sectors = Sector.objects.filter(is_active=True)
        if sector_code:
            sec = sectors.filter(code=sector_code).first()
            if sec:
                ports = sec.entry_points.filter(is_active=True)

        def count(qs):
            return qs.count()

        screenings = HealthScreening.objects.filter(port__in=ports) if sector_code else HealthScreening.objects.all()
        food_shipments = FoodShipment.objects.filter(port__in=ports) if sector_code else FoodShipment.objects.all()

        data = {
            'period': period,
            'sector': sector_code or None,
            'entry_points': count(ports),
            'sectors': count(sectors),
            'travelers': count(Traveler.objects.all()),
            'screenings': count(screenings),
            'certificates': count(HealthCertificate.objects.all()),
            'food_shipments': count(food_shipments),
            'lab_samples': count(LabSample.objects.all()),
            'diseases': count(Disease.objects.filter(is_active=True)),
            'vector_activities': count(VectorRegistry.objects.all()),
            'notices': count(HealthNotice.objects.filter(is_active=True)),
            'news': count(NewsArticle.objects.filter(is_published=True)),
            'faq': count(FaqItem.objects.filter(is_active=True)),
        }
        return Response(success_response(data))


class PublicNoticeViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    serializer_class = PublicNoticeSerializer

    def list(self, request):
        notices = HealthNotice.objects.filter(is_active=True).order_by('-published_at')
        data = [
            {
                'id': str(n.id),
                'title': n.title,
                'description': n.description,
                'category': n.category,
                'priority': n.priority,
                'published_at': n.published_at,
                'expiry_date': n.expiry_date,
            }
            for n in notices
        ]
        return Response(success_response(data))


class PublicCountryViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    serializer_class = PublicCountrySerializer

    def list(self, request):
        countries = Country.objects.order_by('name_ar')
        data = [
            {
                'code': country.code,
                'name': country.name,
                'name_ar': country.name_ar,
                'risk_level': country.risk_level,
            }
            for country in countries
        ]
        return Response(success_response(data))


class TravelRequirementsViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    serializer_class = PublicTravelRequirementSerializer

    def list(self, request):
        country_code = request.query_params.get('country')
        countries = Country.objects.all()
        if country_code:
            countries = countries.filter(code__iexact=country_code)

        requirements = [
            {'title': n.title, 'description': n.description, 'priority': n.priority}
            for n in HealthNotice.objects.filter(
                is_active=True,
                category__in=[
                    HealthNotice.NoticeCategory.ENTRY_REQUIREMENTS,
                    HealthNotice.NoticeCategory.EPIDEMIC_ALERT,
                ],
            ).order_by('-published_at')[:10]
        ]

        data = [
            {
                'country_code': country.code,
                'country_name_ar': country.name_ar,
                'country_name_en': country.name,
                'risk_level': country.risk_level,
                'requirements': requirements,
            }
            for country in countries.order_by('name_ar')[:200]
        ]
        return Response(success_response(data))


class ServiceCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """فئات الخدمات الإلكترونية مع خدماتها الفرعية (بوابة /services)."""

    queryset = ServiceCategory.objects.filter(is_active=True).order_by('sort_order')
    serializer_class = ServiceCategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()

        sector_code = self.request.query_params.get('sector')
        if sector_code:
            sector = Sector.objects.filter(code__iexact=sector_code).first()
            if sector is not None:
                qs = qs.filter(sectors=sector).distinct()

        active_services = Service.objects.filter(is_active=True)
        return qs.prefetch_related(Prefetch('services', queryset=active_services))


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """كتالوج الخدمات الإلكترونية الموحّد."""

    queryset = Service.objects.select_related('category').filter(is_active=True).order_by('sort_order')
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    lookup_field = 'code'

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        search = (self.request.query_params.get('search') or '').strip()
        if category:
            qs = qs.filter(category__code=category)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name_ar__icontains=search)
                | Q(name_en__icontains=search)
                | Q(description_ar__icontains=search)
            )
        return qs


class AssistantViewSet(viewsets.ViewSet):
    """NQP Smart Assistant — المساعد الذكي (Public Information Service).

    يجيب من المحتوى الرسمي المنشور (FAQ + متطلبات السفر + الإشعارات + خدمات المنصة)
    دون الوصول إلى أي بيانات شخصية. لا مصادقة مطلوبة للاستفسارات العامة.
    """

    permission_classes = [AllowAny]

    def chat(self, request):
        from .assistant import answer_question
        from .serializers import AssistantChatSerializer

        serializer = AssistantChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        context = (data.get('context') or {}) or {}
        result = answer_question(
            message=data['message'],
            language=data.get('language') or None,
            context=context,
        )
        return Response(success_response(result))

    def suggestions(self, request):
        from .assistant import suggestions as assistant_suggestions
        return Response(success_response(assistant_suggestions()))

    def topics(self, request):
        from .assistant import topics as assistant_topics
        return Response(success_response(assistant_topics()))


class PublicFlightView(APIView):
    """استعلام عام عن حالة رحلات الناقلين (غير حساس — بدون كشوف المسافرين)."""

    permission_classes = [AllowAny]
    serializer_class = PublicFlightSerializer

    _STATUS_LABELS = {
        'SCHEDULED': 'مجدولة',
        'MANIFEST_UPLOADED': 'تم رفع الكشف',
        'IN_TRANSIT': 'في الطريق',
        'ARRIVED': 'وصلت',
        'CANCELLED': 'ملغاة',
    }

    def get(self, request):
        flight_number = (request.query_params.get('flight_number') or '').strip()
        if not flight_number:
            return Response(error_response('يرجى إدخال رقم الرحلة'), status=status.HTTP_400_BAD_REQUEST)

        flights = (
            Flight.objects.select_related('carrier', 'destination_port')
            .filter(flight_number__icontains=flight_number)
            .order_by('-scheduled_arrival')[:10]
        )

        data = [
            {
                'flight_number': f.flight_number,
                'carrier_code': f.carrier.iata_code or f.carrier.icao_code or '',
                'carrier_name': f.carrier.name_en or f.carrier.name,
                'flight_type': f.flight_type,
                'origin_code': f.origin_code,
                'destination_code': f.destination_port.code,
                'destination_name': f.destination_port.name_ar or f.destination_port.name_en,
                'scheduled_departure': f.scheduled_departure,
                'scheduled_arrival': f.scheduled_arrival,
                'status': f.status,
                'status_label': self._STATUS_LABELS.get(f.status, f.status),
            }
            for f in flights
        ]

        if not data:
            return Response(
                error_response('لا توجد رحلة بهذا الرقم'),
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(success_response(data))


class FoodShipmentTrackView(APIView):
    """استعلام عام عن حالة شحنة غذائية برقم البيان أو رقم شهادة الإفراج."""

    permission_classes = [AllowAny]
    serializer_class = FoodShipmentTrackSerializer

    _STATUS_LABELS = {
        'DRAFT': 'مسودة',
        'RECEIVED': 'تم الاستلام',
        'FEES_DUE': 'مستحقة الرسوم',
        'AWAITING_INSPECTION': 'بانتظار التفتيش',
        'UNDER_INSPECTION': 'قيد التفتيش',
        'AWAITING_LAB_RESULTS': 'بانتظار النتائج',
        'AWAITING_DECISION': 'بانتظار القرار',
        'RELEASED': 'تم الإفراج',
        'CONDITIONAL_RELEASE': 'إفراج مشروط',
        'REJECTED': 'مرفوض',
        'HOLD': 'محجوزة',
        'RE_EXPORT': 'إعادة تصدير',
        'DESTROYED': 'إتلاف',
    }

    def _products(self, shipment):
        items = shipment.product_list or []
        out = []
        for item in items[:5]:
            if not isinstance(item, dict):
                continue
            name = (
                item.get('name_ar')
                or item.get('product_name')
                or item.get('name')
                or item.get('description')
                or '—'
            )
            out.append({'name': name, 'quantity': item.get('quantity', '') or item.get('qty', '')})
        return out

    def get(self, request):
        reference = (request.query_params.get('reference') or '').strip()
        if not reference:
            return Response(error_response('يرجى إدخال رقم البيان أو رقم الشهادة'), status=status.HTTP_400_BAD_REQUEST)

        shipment = FoodShipment.objects.select_related('port').filter(manifest_number__iexact=reference).first()
        release_number = ''
        if shipment is None:
            cert = (
                FoodReleaseCertificate.objects.select_related('shipment__port')
                .filter(certificate_number__iexact=reference)
                .first()
            )
            if cert is not None:
                shipment = cert.shipment
                release_number = cert.certificate_number

        if shipment is None:
            return Response(
                error_response('لم يُعثر على شحنة بهذا الرقم'),
                status=status.HTTP_404_NOT_FOUND,
            )

        if not release_number:
            release_cert = FoodReleaseCertificate.objects.filter(shipment=shipment).first()
            release_number = release_cert.certificate_number if release_cert else ''

        data = {
            'manifest_number': shipment.manifest_number,
            'status': shipment.status,
            'status_label': self._STATUS_LABELS.get(shipment.status, shipment.status),
            'decision': shipment.final_decision or '',
            'port_code': shipment.port.code,
            'port_name': shipment.port.name_ar or shipment.port.name_en,
            'arrival_date': shipment.arrival_date,
            'supplier_name': shipment.supplier_name,
            'origin_country': shipment.origin_country,
            'vessel_name': shipment.vessel_name or '',
            'total_weight_kg': shipment.total_weight_kg,
            'products': self._products(shipment),
            'release_certificate': release_number,
            'decided_at': shipment.decided_at,
        }
        return Response(success_response(data))
