from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.airport_health.models import (
    AircraftInspection,
    AirportScreening,
    AirportTerminal,
    CrewHealthRecord,
    ScreeningPoint,
)
from apps.carriers.models import Carrier, Flight
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country, Traveler


class Command(BaseCommand):
    help = 'زرع بيانات تجريبية لصحة المطارات (صالات، نقاط، فحوصات، تفتيش، أطقم)'

    def handle(self, *args, **options):
        User = get_user_model()
        officer = User.objects.filter(is_staff=True).order_by('created_at').first()
        if not officer:
            self.stderr.write('لا يوجد مستخدم موظف (is_staff).')
            return

        port = Port.objects.filter(kind=Port.Kind.AIRPORT).first() or Port.objects.first()
        if not port:
            self.stderr.write('لا يوجد منفذ مسجل.')
            return

        created_terminal = 0
        created_point = 0
        created_screening = 0
        created_inspection = 0
        created_crew = 0
        created_flight = 0

        terminal, t_created = AirportTerminal.objects.get_or_create(
            port=port,
            terminal_code='T1',
            defaults={
                'name_ar': 'صالة الوصول الدولي',
                'name_en': 'International Arrivals',
                'capacity': 300,
            },
        )
        created_terminal += 1 if t_created else 0

        for code, ptype in [('P-ARR-1', 'ARRIVAL'), ('P-DEP-1', 'DEPARTURE'), ('P-TR-1', 'TRANSIT')]:
            _, created = ScreeningPoint.objects.get_or_create(
                terminal=terminal,
                point_code=code,
                defaults={'point_type': ptype},
            )
            created_point += 1 if created else 0

        carriers = list(Carrier.objects.all())
        if not carriers:
            carriers = [Carrier.objects.create(name='سودانير', iata_code='SDN', icao_code='SUD')]
        flight = Flight.objects.filter(flight_number='SD-101').first()
        if not flight:
            flight = Flight.objects.create(
                flight_number='SD-101',
                carrier=carriers[0],
                flight_type='AIR',
                origin_country=Country.objects.filter(name_ar__icontains='مصر').first(),
                origin_code='CAI',
                destination_port=port,
                scheduled_arrival=__import__('datetime').datetime.now(),
                status='ARRIVED',
                notes='',
            )
            created_flight += 1

        arrivals = ScreeningPoint.objects.filter(point_code='P-ARR-1').first()
        for idx, traveler in enumerate(Traveler.objects.all()[:5]):
            if AirportScreening.objects.filter(traveler=traveler, screening_point=arrivals).exists():
                continue
            temp = 36.8 + idx * 0.35
            spo2 = 97 - idx
            symptoms = ['cough'] if idx in (1, 3) else []
            screening = AirportScreening.objects.create(
                traveler=traveler,
                screening_point=arrivals,
                flight=flight,
                screening_type='ARRIVAL',
                body_temperature=temp,
                oxygen_saturation=spo2,
                symptoms=symptoms,
                screened_by=officer,
            )
            if temp > 39 or spo2 < 93:
                screening.risk_level = 'RED'
            elif (temp - 37.0) * 10 + (100 - spo2) * 2 + len(symptoms) * 5 >= 15:
                screening.risk_level = 'YELLOW'
            else:
                screening.risk_level = 'GREEN'
            screening.status = 'CLEARED' if screening.risk_level == 'GREEN' else 'REFERRED'
            screening.save(update_fields=['risk_level', 'status'])
            created_screening += 1

        if not AircraftInspection.objects.exists():
            AircraftInspection.objects.create(
                aircraft_registration='ST-SUA',
                flight=flight,
                inspector=officer,
                cleanliness_status='COMPLIANT',
                water_quality_status='COMPLIANT',
                toilets_status='COMPLIANT',
                medical_waste_status='COMPLIANT',
                pest_control_status='COMPLIANT',
                rodent_control_status='COMPLIANT',
                food_safety_status='COMPLIANT',
                findings='لا توجد ملاحظات',
                overall_status='PASSED',
                certificate_issued=True,
            )
            created_inspection += 1

        if not CrewHealthRecord.objects.exists():
            CrewHealthRecord.objects.create(
                crew=officer,
                flight=flight,
                health_status='FIT',
                temperature=36.6,
                symptoms=[],
                medical_clearance_date=__import__('datetime').date.today(),
                next_clearance_date=__import__('datetime').date.today(),
            )
            created_crew += 1

        self.stdout.write(self.style.SUCCESS(
            f'تم الزرع: رحلات {created_flight}، صالات {created_terminal}، نقاط {created_point}، '
            f'فحوصات {created_screening}، تفتيش {created_inspection}، أطقم {created_crew}.'
        ))
