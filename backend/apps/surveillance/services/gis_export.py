import json
import logging
from datetime import date, timedelta
from io import BytesIO

from django.db.models import Count, Q, Sum, F
from django.utils import timezone

from apps.surveillance.models.case import HealthCase, CaseClassification
from apps.surveillance.models.contact import ContactTrace
from apps.surveillance.models.specimen import Specimen, SpecimenStatus
from apps.surveillance.models.alert import SurveillanceAlert
from apps.surveillance.models.outbreak import Outbreak

logger = logging.getLogger(__name__)


class GISExportService:
    """خدمة تصدير البيانات الجغرافية للخرائط والتحليلات المكانية."""

    @staticmethod
    def _scope_qs(qs, port_ids, sector_ids):
        """يقصّر النطاق على منافذ/قطاعات المستخدم (فشل-آمن).

        port_ids=None يعني نطاق وطني بلا تقييد؛ port_ids=[] يُحجب كل شيء.
        """
        q = Q()
        applied = False
        if port_ids is not None:
            applied = True
            if port_ids:
                q |= Q(port_id__in=port_ids)
        if sector_ids:
            applied = True
            q |= Q(sector_id__in=sector_ids)
        if not applied:
            return qs
        return qs.filter(q) if q else qs.none()

    @classmethod
    def export_cases_geojson(cls, sector=None, locality=None, port=None,
                             disease=None, date_from=None, date_to=None,
                             port_ids=None, sector_ids=None) -> dict:
        """تصدير الحالات كـ GeoJSON."""
        qs = HealthCase.objects.select_related('sector', 'locality', 'port', 'disease')
        if sector:
            qs = qs.filter(sector=sector)
        if locality:
            qs = qs.filter(locality=locality)
        if port:
            qs = qs.filter(port=port)
        if disease:
            qs = qs.filter(disease=disease)
        if date_from:
            qs = qs.filter(reported_date__gte=date_from)
        if date_to:
            qs = qs.filter(reported_date__lte=date_to)
        qs = cls._scope_qs(qs, port_ids, sector_ids)

        features = []
        for case in qs:
            coords = cls._get_case_coords(case)
            if not coords:
                continue
            features.append({
                'type': 'Feature',
                'geometry': {'type': 'Point', 'coordinates': coords},
                'properties': {
                    'id': str(case.id),
                    'case_number': case.case_number,
                    'disease': case.disease.name_ar if case.disease else '',
                    'case_type': case.case_type,
                    'workflow_state': case.workflow_state,
                    'status': case.status,
                    'reported_date': case.reported_date.isoformat() if case.reported_date else '',
                    'sector': case.sector.name_ar if case.sector else '',
                    'locality': case.locality.name_ar if case.locality else '',
                    'port': case.port.name_ar if case.port else '',
                    'person_name': case.person_name,
                    'person_age': case.person_age,
                    'person_sex': case.person_sex,
                    'clinical_status': case.status,
                },
            })

        return {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'count': len(features),
                'generated_at': timezone.now().isoformat(),
                'filters': {'sector': sector, 'locality': locality, 'port': port,
                            'disease': disease, 'date_from': date_from, 'date_to': date_to},
            },
        }

    @classmethod
    def export_outbreaks_geojson(cls, status=None, port_ids=None, sector_ids=None) -> dict:
        """تصدير التفشي النشطة كـ GeoJSON."""
        qs = Outbreak.objects.select_related('sector', 'locality', 'disease')
        if status:
            qs = qs.filter(status=status)
        else:
            qs = qs.exclude(status='CLOSED')
        qs = cls._scope_qs(qs, port_ids, sector_ids)

        features = []
        for ob in qs:
            coords = cls._get_outbreak_coords(ob)
            features.append({
                'type': 'Feature',
                'geometry': {'type': 'Point', 'coordinates': coords} if coords else None,
                'properties': {
                    'id': str(ob.id),
                    'outbreak_number': ob.outbreak_number,
                    'name': ob.name,
                    'disease': ob.disease.name_ar if ob.disease else '',
                    'status': ob.status,
                    'total_cases': ob.total_cases,
                    'deaths': ob.deaths,
                    'cfr': float(ob.case_fatality_rate) if ob.case_fatality_rate else 0,
                    'onset_date': ob.onset_date.isoformat() if ob.onset_date else '',
                    'sector': ob.sector.name_ar if ob.sector else '',
                    'locality': ob.locality.name_ar if ob.locality else '',
                    'transmission_route': ob.transmission_route,
                },
            })

        return {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'count': len(features),
                'generated_at': timezone.now().isoformat(),
            },
        }

    @classmethod
    def export_alerts_geojson(cls, level=None, status=None, port_ids=None, sector_ids=None) -> dict:
        """تصدير الإنذارات كـ GeoJSON."""
        qs = SurveillanceAlert.objects.select_related('sector', 'locality', 'port', 'disease')
        if level:
            qs = qs.filter(level=level)
        if status:
            qs = qs.filter(status=status)
        else:
            qs = qs.exclude(status__in=['CLOSED', 'FALSE_POSITIVE'])
        qs = cls._scope_qs(qs, port_ids, sector_ids)

        features = []
        for alert in qs:
            coords = cls._get_alert_coords(alert)
            features.append({
                'type': 'Feature',
                'geometry': {'type': 'Point', 'coordinates': coords} if coords else None,
                'properties': {
                    'id': str(alert.id),
                    'alert_number': alert.alert_number,
                    'title': alert.title,
                    'alert_type': alert.alert_type,
                    'level': alert.level,
                    'disease': alert.disease.name_ar if alert.disease else '',
                    'sector': alert.sector.name_ar if alert.sector else '',
                    'locality': alert.locality.name_ar if alert.locality else '',
                    'port': alert.port.name_ar if alert.port else '',
                    'case_count': alert.case_count,
                    'status': alert.status,
                    'created_at': alert.created_at.isoformat(),
                },
            })

        return {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'count': len(features),
                'generated_at': timezone.now().isoformat(),
            },
        }

    @classmethod
    def generate_heatmap_data(cls, disease=None, date_from=None, date_to=None,
                              port_ids=None, sector_ids=None) -> dict:
        """بيانات خريطة حرارية للحالات."""
        qs = HealthCase.objects.filter(
            port__isnull=False,
            port__location__isnull=False,
        )
        if disease:
            qs = qs.filter(disease=disease)
        if date_from:
            qs = qs.filter(reported_date__gte=date_from)
        if date_to:
            qs = qs.filter(reported_date__lte=date_to)
        qs = cls._scope_qs(qs, port_ids, sector_ids)

        points = []
        for case in qs:
            coords = cls._get_case_coords(case)
            if coords:
                points.append({
                    'lat': coords[1],
                    'lng': coords[0],
                    'weight': 1,
                })

        return {
            'points': points,
            'metadata': {
                'count': len(points),
                'generated_at': timezone.now().isoformat(),
            },
        }

    @classmethod
    def generate_summary_stats(cls, sector=None, date_from=None, date_to=None,
                               port_ids=None, sector_ids=None) -> dict:
        """إحصائيات ملخصة للخرائط."""
        today = timezone.localdate()
        if not date_from:
            date_from = today - timedelta(days=30)
        if not date_to:
            date_to = today

        qs = HealthCase.objects.filter(reported_date__gte=date_from, reported_date__lte=date_to)
        if sector:
            qs = qs.filter(sector=sector)
        qs = cls._scope_qs(qs, port_ids, sector_ids)

        cases_by_disease = list(qs.values('disease__name_ar', 'disease__name_en').annotate(
            count=Count('id')
        ).order_by('-count')[:10])

        cases_by_locality = list(qs.values('locality__name_ar').annotate(
            count=Count('id')
        ).order_by('-count'))

        cases_by_port = list(qs.values('port__name_ar', 'port__code').annotate(
            count=Count('id')
        ).order_by('-count'))

        cases_by_status = list(qs.values('workflow_state').annotate(
            count=Count('id')
        ))

        confirmed = qs.filter(case_type=CaseClassification.CONFIRMED).count()
        deaths = qs.filter(status='DEAD').count()

        return {
            'period': {'from': date_from.isoformat(), 'to': date_to.isoformat()},
            'total_cases': qs.count(),
            'confirmed_cases': confirmed,
            'deaths': deaths,
            'cfr': round(deaths / confirmed * 100, 1) if confirmed > 0 else 0,
            'by_disease': cases_by_disease,
            'by_locality': cases_by_locality,
            'by_port': cases_by_port,
            'by_status': cases_by_status,
        }

    # ---- coordinate helpers ----

    @classmethod
    def _get_case_coords(cls, case):
        if hasattr(case, 'gps_longitude') and case.gps_longitude and hasattr(case, 'gps_latitude') and case.gps_latitude:
            return [float(case.gps_longitude), float(case.gps_latitude)]
        if case.port and hasattr(case.port, 'location') and case.port.location:
            loc = case.port.location
            if hasattr(loc, 'geometry') and loc.geometry:
                return [loc.geometry.x, loc.geometry.y]
        if case.health_facility and hasattr(case.health_facility, 'location') and case.health_facility.location:
            loc = case.health_facility.location
            if hasattr(loc, 'geometry') and loc.geometry:
                return [loc.geometry.x, loc.geometry.y]
        return None

    @classmethod
    def _get_outbreak_coords(cls, ob):
        if ob.sector and hasattr(ob.sector, 'center_point') and ob.sector.center_point:
            return [ob.sector.center_point.x, ob.sector.center_point.y]
        return None

    @classmethod
    def _get_alert_coords(cls, alert):
        if alert.port and hasattr(alert.port, 'location') and alert.port.location:
            loc = alert.port.location
            if hasattr(loc, 'geometry') and loc.geometry:
                return [loc.geometry.x, loc.geometry.y]
        return None