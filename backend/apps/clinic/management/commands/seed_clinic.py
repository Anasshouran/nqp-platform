from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.clinic.models import ClinicReferral, ClinicVisit, EMRRecord, Medication, Prescription
from apps.masterdata.models import EntryPoint as Port
from apps.screening.models import HealthScreening
from apps.travelers.models import Traveler


class Command(BaseCommand):
    help = 'زرع بيانات تجريبية لعيادات (إحالات، زيارات، أدوية، وصفات)'

    def handle(self, *args, **options):
        User = get_user_model()
        officer = User.objects.filter(is_staff=True).order_by('created_at').first()
        if not officer:
            self.stderr.write('لا يوجد مستخدم موظف (is_staff) لاستخدامه كطبيب.')
            return

        port = Port.objects.first()
        if not port:
            self.stderr.write('لا يوجد منفذ مسجل.')
            return

        travelers = list(Traveler.objects.all())
        if len(travelers) < 3:
            self.stderr.write('توجد بيانات مسافرين قليلة (أقل من 3).')
            return

        med_data = [
            ('باراسيتامول', 'Acetaminophen', 'قرص'),
            ('أموكسيسيلين', 'Amoxicillin', 'كبسولة'),
            ('مضاد حيوي أزيثروميسين', 'Azithromycin', 'قرص'),
            ('محلول معالجة جفاف', 'Oral Rehydration Salts', 'كيس'),
            ('سيروم فيتامين سي', 'Vitamin C', 'أمبولة'),
        ]

        created_meds = 0
        for name, generic, unit in med_data:
            _, created = Medication.objects.get_or_create(name=name, defaults={'generic_name': generic, 'unit': unit})
            created_meds += 1 if created else 0

        created_screenings = 0
        created_referrals = 0
        created_visits = 0

        for idx, traveler in enumerate(travelers[:5]):
            if HealthScreening.objects.filter(traveler=traveler).exists():
                continue
            screening = HealthScreening.objects.create(
                traveler=traveler,
                port=port,
                officer=officer,
                body_temperature=38.5 + idx * 0.3,
                oxygen_saturation=94 - idx,
                systolic_bp=120 + idx * 5,
                diastolic_bp=80,
                observed_symptoms=['حمى', 'صداع'],
                officer_notes='فحص وصول تجريبي',
                screened_at=__import__('datetime').datetime.now(),
            )
            created_screenings += 1
            referral = ClinicReferral.objects.create(
                screening=screening,
                traveler=traveler,
                port=port,
                status=ClinicReferral.ReferralStatus.PENDING if idx % 3 != 0 else ClinicReferral.ReferralStatus.ACCEPTED,
                notes='إحالة بسبب ارتفاع درجة الحرارة' if idx % 2 == 0 else '',
            )
            created_referrals += 1
            if referral.status == ClinicReferral.ReferralStatus.ACCEPTED:
                visit = ClinicVisit.objects.create(
                    referral=referral,
                    traveler=traveler,
                    doctor=officer,
                    visit_status=ClinicVisit.VisitStatus.OPEN,
                )
                EMRRecord.objects.create(
                    visit=visit,
                    clinical_notes={'chief_complaint': 'حمى وصداع'},
                    vital_signs={'temperature': screening.body_temperature, 'spo2': screening.oxygen_saturation},
                    physical_exam={'general': 'في حالة عامة متوسطة'},
                )
                created_visits += 1

        for visit in ClinicVisit.objects.filter(visit_status=ClinicVisit.VisitStatus.OPEN, prescriptions__isnull=True):
            med = Medication.objects.order_by('?').first()
            if med:
                Prescription.objects.create(
                    visit=visit,
                    medication=med,
                    dosage='500mg',
                    frequency='مرة كل 8 ساعات',
                    duration_days=5,
                    instructions='يؤخذ بعد الأكل',
                )

        self.stdout.write(self.style.SUCCESS(
            f'تم الزرع: أدوية {created_meds} (+{Medication.objects.count()} إجمالي)، '
            f'فحوصات {created_screenings}، إحالات {created_referrals}، زيارات {created_visits}.'
        ))
