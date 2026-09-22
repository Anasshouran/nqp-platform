from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.port_health.models import (
    CargoInspection,
    CrewMember,
    HealthCertificate,
    HealthDeclaration,
    IsolationRecord,
    Passenger,
    PortEmergency,
    SanitationCertificate,
    SeaPort,
    ShipInspection,
    SurveillanceCase,
    VectorControl,
    Vessel,
    VesselVisit,
    WasteInspection,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'بذر بيانات مبدئية لنظام صحة الموانئ (موانئ، سفن، تفتيش، شهادات)'

    PORTS = [
        {'code': 'PSC', 'name_ar': 'ميناء بورتسودان', 'name_en': 'Port Sudan Port', 'location': 'بورتسودان', 'capacity': 100},
        {'code': 'NP', 'name_ar': 'الميناء الشمالي', 'name_en': 'North Port', 'location': 'بورتسودان', 'capacity': 80},
        {'code': 'SP', 'name_ar': 'الميناء الجنوبي', 'name_en': 'South Port', 'location': 'بورتسودان', 'capacity': 70},
        {'code': 'OD', 'name_ar': 'ميناء عثمان دقنة (سواكن)', 'name_en': 'Osman Digna Port', 'location': 'سواكن', 'capacity': 40},
        {'code': 'OSF', 'name_ar': 'ميناء أوسيف', 'name_en': 'Osief Port', 'location': 'سواكن', 'capacity': 30},
    ]

    VESSELS = [
        {'name': 'MSV الصداقة', 'imo': 'IMO9301234', 'flag': 'السودان', 'company': 'الخطوط البحرية السودانية', 'type': 'COMMERCIAL'},
        {'name': 'نجمة البحر', 'imo': 'IMO9405678', 'flag': 'السودان', 'company': 'الشركة السودانية للملاحة', 'type': 'FISHING'},
        {'name': 'سيف السلام 1', 'imo': 'IMO9501122', 'flag': 'الأردن', 'company': 'سيف السلام', 'type': 'CONTAINER'},
        {'name': 'خالد التجارية', 'imo': 'IMO8704456', 'flag': 'اليمن', 'company': 'الملاحة الخليجية', 'type': 'TANKER'},
    ]

    def handle(self, *args, **options):
        ports = {}
        for p in self.PORTS:
            obj, _ = SeaPort.objects.update_or_create(
                code=p['code'], defaults=p
            )
            ports[p['code']] = obj

        users = list(User.objects.filter(is_staff=True)[:1])
        inspector = users[0] if users else None

        for i, v in enumerate(self.VESSELS):
            vessel, _ = Vessel.objects.update_or_create(
                imo_number=v['imo'],
                defaults={
                    'vessel_name': v['name'],
                    'flag_state': v['flag'],
                    'shipping_company': v['company'],
                    'vessel_type': v['type'],
                    'arrival_date': date.today() - timedelta(days=3),
                    'last_port_of_call': 'جدة' if i % 2 else 'ميناء الحديدة',
                    'status': Vessel.VesselStatus.ARRIVED,
                },
            )
            port = ports['PSC']

            visit, _ = VesselVisit.objects.update_or_create(
                vessel=vessel, port=port,
                defaults={
                    'arrival_date': date.today() - timedelta(days=3),
                    'status': Vessel.VesselStatus.ARRIVED,
                },
            )

            HealthDeclaration.objects.get_or_create(
                vessel=vessel, declaration_date=date.today() - timedelta(days=2),
                defaults={'captain_name': 'ربان السفينة', 'status': HealthDeclaration.DeclarationStatus.APPROVED},
            )

            CrewMember.objects.get_or_create(
                vessel=vessel, full_name=f'طاقم {v["name"]}',
                defaults={'nationality': 'السودان', 'job_title': 'ملاح', 'health_status': 'FIT'},
            )

            Passenger.objects.get_or_create(
                vessel=vessel, full_name=f'راكب {i + 1}',
                defaults={'nationality': 'السودان', 'cabin_number': f'C-{i}1', 'health_status': 'FIT'},
            )

            if inspector and i % 2 == 0:
                ShipInspection.objects.get_or_create(
                    vessel=vessel, visit=visit, inspector=inspector,
                    defaults={'overall_status': 'PASSED', 'certificate_issued': True},
                )
                HealthCertificate.objects.get_or_create(
                    certificate_number=f'SHP-{vessel.imo_number}-{i}',
                    defaults={
                        'certificate_type': 'SHIP_HEALTH', 'vessel': vessel,
                        'issue_date': date.today(), 'status': 'ISSUED',
                    },
                )
            if i == 3:
                SanitationCertificate.objects.get_or_create(
                    certificate_number=f'SCC-{vessel.imo_number}',
                    defaults={'certificate_type': 'SSCC', 'vessel': vessel, 'issue_date': date.today(), 'expiry_date': date.today() + timedelta(days=180), 'status': 'ISSUED'},
                )
            if i == 1:
                SurveillanceCase.objects.get_or_create(
                    vessel=vessel, disease_name='حمى الضنك', person_name='مشتبه',
                    defaults={'status': 'SUSPECTED'},
                )
                IsolationRecord.objects.get_or_create(
                    vessel=vessel, person_name='مشتبه',
                    defaults={
                        'person_type': 'CREW', 'start_date': date.today(),
                        'status': 'ACTIVE', 'notes': 'اشتباه إكلينيكي — حمى ضنك',
                    },
                )
                CargoInspection.objects.get_or_create(
                    vessel=vessel, declaration_number=f'CAR-{i}',
                    defaults={'cargo_type': 'FOOD', 'country_of_origin': 'الهند', 'status': 'PENDING'},
                )
            if i % 2 == 1:
                waste_defaults = {
                    'medical_waste_status': 'NON_COMPLIANT' if i == 3 else 'COMPLIANT',
                    'food_waste_status': 'COMPLIANT',
                    'wastewater_status': 'NON_COMPLIANT' if i == 1 else 'COMPLIANT',
                    'findings': 'خزان النفايات الطبية غير مغلق بإحكام' if i == 3 else '',
                }
                if inspector:
                    waste_defaults['inspector'] = inspector
                WasteInspection.objects.get_or_create(vessel=vessel, defaults=waste_defaults)
                VectorControl.objects.get_or_create(
                    vessel=vessel,
                    defaults={
                        'control_type': 'MOSQUITO',
                        'evidence_found': True,
                        'treatment_applied': True,
                        'campaign_name': 'حملة مكافحة البعوض — رش مبيد آمن',
                        'notes': 'لا يوجد نشاط نواقل بعد المعالجة',
                    },
                )

        PortEmergency.objects.get_or_create(
            title='بلاغ حالة صحية طارئة على متن سفينة قادمة من منطقة موبوءة',
            defaults={
                'port': ports['PSC'],
                'vessel': Vessel.objects.filter(imo_number='IMO8704456').first(),
                'severity': PortEmergency.EmergencySeverity.HIGH,
                'description': 'إقرار صحي يفيد بوجود حالتي حمى على المتن — تم تقييد الحركة ريثما يصل الفريق الطبي.',
                'vessel_restricted': True,
                'status': PortEmergency.EmergencyStatus.OPEN,
            },
        )

        counts = {
            'seaports': SeaPort.objects.count(),
            'vessels': Vessel.objects.count(),
            'visits': VesselVisit.objects.count(),
            'crew': CrewMember.objects.count(),
            'passengers': Passenger.objects.count(),
            'declarations': HealthDeclaration.objects.count(),
            'inspections': ShipInspection.objects.count(),
            'sanitation_certificates': SanitationCertificate.objects.count(),
            'health_certificates': HealthCertificate.objects.count(),
            'surveillance': SurveillanceCase.objects.count(),
            'cargo': CargoInspection.objects.count(),
            'isolation': IsolationRecord.objects.count(),
            'waste_inspections': WasteInspection.objects.count(),
            'vector_controls': VectorControl.objects.count(),
            'emergencies': PortEmergency.objects.count(),
        }
        self.stdout.write(self.style.SUCCESS(f'تم بذر صحة الموانئ: {counts}'))