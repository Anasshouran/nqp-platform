from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Role
from apps.carriers.models import Carrier, CarrierCompanyType, CarrierMember, Flight, HealthNotice
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country

User = get_user_model()


class Command(BaseCommand):
    help = 'بذر بيانات بوابة شركات الطيران: شركات + مستخدم تجريبي + إشعارات + رحلات'

    def handle(self, *args, **options):
        now = timezone.now()

        carrier_eg, _ = Carrier.objects.get_or_create(
            iata_code='MS',
            defaults={
                'name': 'مصر للطيران',
                'icao_code': 'MSR',
                'email': 'ops@egyptair.example',
                'phone': '+20 2 25908000',
                'address': 'القاهرة، مصر',
                'is_active': True,
            },
        )
        carrier_sd = Carrier.objects.filter(iata_code='SU').first() or Carrier.objects.filter(icao_code='SUD').first()
        created_sd = carrier_sd is None
        if carrier_sd is None:
            carrier_sd = Carrier.objects.create(
                name='سودان إير',
                iata_code='SU',
                icao_code='SUD',
                email='ops@sudanair.example',
                phone='+249 187 555000',
                address='الخرطوم، السودان',
                is_active=True,
            )
        if not carrier_sd.has_api_key or created_sd:
            carrier_sd.generate_api_key()
            carrier_sd.save()

        country_sd = Country.objects.filter(code='SD').first()
        pzu = Port.objects.filter(code='EP_PZU_AIRPORT').first()
        carrier_badr, created_badr = Carrier.objects.update_or_create(
            iata_code='J4',
            defaults={
                'name': 'بدر للطيران',
                'name_en': 'Badr Airlines',
                'icao_code': 'BDR',
                'company_type': CarrierCompanyType.NATIONAL,
                'country': country_sd,
                'email': 'ops@badrair.example',
                'phone': '+249 9 555 0000',
                'address': 'الخرطوم، السودان',
                'is_active': True,
            },
        )
        if pzu and pzu.pk not in carrier_badr.ports.values_list('pk', flat=True):
            carrier_badr.ports.add(pzu)

        user, created_u = User.objects.get_or_create(
            email='carrier@nqp.gov.sd',
            defaults={'full_name': 'منسق سودان إير'},
        )
        if created_u or not user.check_password('CarrierDev123!'):
            user.set_password('CarrierDev123!')
            user.is_active = True
            user.save()
        carrier_role, _ = Role.objects.get_or_create(
            code='CARRIER',
            defaults={'name': 'Carrier Representative', 'name_ar': 'ممثل شركة نقل', 'description': 'دخول بوابة شركات الطيران'},
        )
        if user.role_id != carrier_role.id:
            user.role = carrier_role
            user.save(update_fields=['role'])
        CarrierMember.objects.get_or_create(
            user=user, defaults={'carrier': carrier_sd, 'is_primary': True, 'is_active': True},
        )

        notices = [
            {
                'title': 'تحديث الدول المصنفة عالية الخطورة',
                'category': HealthNotice.NoticeCategory.EPIDEMIC_ALERT,
                'priority': HealthNotice.NoticePriority.MEDIUM,
                'description': 'تم تحديث قائمة الدول المصنفة ذات الخطورة العالية وفق آخر تقارير الترصد الوبائي.',
            },
        ]
        for item in notices:
            HealthNotice.objects.get_or_create(
                title=item['title'], defaults={'category': item['category'], 'priority': item['priority'], 'description': item['description']},
            )

        country_sd = Country.objects.filter(code='SD').first()
        port = Port.objects.filter(code__in=['EP_PORT_SUDAN', 'EP_SUAKIN', 'EP_KRT_AIRPORT']).first()
        dep = now + timezone.timedelta(hours=3)
        arr = now + timezone.timedelta(hours=5)
        for flight in [
            {'flight_number': 'SUD234', 'carrier': carrier_sd, 'departure': dep, 'arrival': arr, 'origin_code': 'KRT'},
            {'flight_number': 'MSR845', 'carrier': carrier_eg, 'departure': dep, 'arrival': arr, 'origin_code': 'CAI'},
        ]:
            if country_sd and port:
                Flight.objects.get_or_create(
                    flight_number=flight['flight_number'], carrier=flight['carrier'],
                    defaults={
                        'flight_type': Flight.FlightType.AIR,
                        'origin_code': flight['origin_code'],
                        'origin_country': country_sd,
                        'destination_port': port,
                        'scheduled_departure': flight['departure'],
                        'scheduled_arrival': flight['arrival'],
                        'status': Flight.FlightStatus.SCHEDULED,
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            f'بوابة شركات الطيران: بدر للطيران (J4/BDR) + سودان إير (مفتاح: {carrier_sd.api_key_display or "غير مولّد"}) + مصر للطيران، '
            f'مستخدم: carrier@nqp.gov.sd / CarrierDev123!، {len(notices)} إشعار'
        ))