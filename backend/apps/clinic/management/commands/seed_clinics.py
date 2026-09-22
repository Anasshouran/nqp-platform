from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import Role, RoleAssignment, ScopeType
from apps.clinic.models import Clinic, ClinicStaff, ClinicType
from apps.masterdata.models import EntryPoint


CLINIC_TYPES = [
    ('QC-01', 'الفحص العام', 'General Examination', 'GENERAL', ['فحص طبي عام', 'تخطيط الرحلة العلاجية']),
    ('QC-02', 'الفرز والتصنيف', 'Triage', 'GENERAL', ['فرز الحالات', 'قياس العلامات الحيوية', 'تصنيف الخطورة']),
    ('QC-03', 'العلاج', 'Treatment', 'GENERAL', ['صرف وصفات', 'حقن وخلع', 'متابعة علاجية']),
    ('QC-04', 'الملاحظة', 'Observation', 'GENERAL', ['ملاحظة سريرية', 'متابعة الحالات الوسيطة']),
    ('QC-05', 'المختبر', 'Laboratory', 'GENERAL', ['سحب عينات', 'فحص نتائج', 'إصدار نتائج']),
    ('QC-06', 'الأشعة', 'Radiology', 'GENERAL', ['أشعة سينية', 'موجات فوق صوتية']),
    ('QC-07', 'التمريض', 'Nursing Care', 'GENERAL', ['رعاية تمريضية', 'تمريض مقيم']),
    ('QC-08', 'الأمومة والطفولة', 'Maternal & Child Health', 'GENERAL', ['متابعة حمل', 'صحة طفل']),
    ('QC-09', 'صحة الفم والأسنان', 'Dental', 'GENERAL', ['كشف أسنان', 'إجراءات سنية']),
    ('QC-10', 'التغذية', 'Nutrition', 'GENERAL', ['تقييم غذائي', 'برامج تغذية علاجية']),
    ('QC-11', 'الصحة النفسية', 'Mental Health', 'GENERAL', ['استشارة نفسية', 'دعم نفسي']),
    ('QC-12', 'الأمراض المزمنة', 'Chronic Diseases', 'GENERAL', ['متابعة مزمنة', 'صرف أدوية مزمنة']),
    ('QC-13', 'الصحة المهنية', 'Occupational Health', 'GENERAL', ['فحص مهني', 'لياقة عمل']),
    ('QC-14', 'وحدة الإحالة الطبية', 'Medical Referral Unit', 'GENERAL', ['إحالة خارجية', 'تنسيق نقل طبي']),
]


def _primary_type(kind):
    mapping = {
        EntryPoint.Kind.AIRPORT: 'QC-01',
        EntryPoint.Kind.SEAPORT: 'QC-02',
        EntryPoint.Kind.LAND_PORT: 'QC-04',
    }
    return mapping.get(kind, 'QC-01')


class Command(BaseCommand):
    help = 'زرع البنية التحتية لعيادات الحجر الصحي: أنواع الوحدات QC-01..14 والأعيادات لكل منفذ والكادر.'

    def handle(self, *args, **options):
        User = get_user_model()

        created_types = 0
        for code, name_ar, name_en, kind, services in CLINIC_TYPES:
            _, created = ClinicType.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'kind': kind,
                    'services': services,
                    'order': int(code.split('-')[1]),
                    'is_active': True,
                },
            )
            created_types += 1 if created else 0

        created_clinics = 0
        clinics_by_kind = {}
        for ep in EntryPoint.objects.filter(is_active=True).order_by('order'):
            type_code = _primary_type(ep.kind)
            clinic_type = ClinicType.objects.filter(code=type_code).first()
            if not clinic_type:
                continue
            code = f'QH-{ep.code}'
            clinic, created = Clinic.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': f'عيادة الحجر الصحي - {ep.name_ar}',
                    'name_en': f'Quarantine Clinic - {ep.name_en or ep.name_ar}',
                    'entry_point': ep,
                    'sector': ep.sector,
                    'clinic_type': clinic_type,
                    'location': ep.location,
                    'phone': ep.phone,
                    'email': ep.email,
                    'services': clinic_type.services,
                    'order': ep.order,
                    'is_active': True,
                },
            )
            if created:
                created_clinics += 1
            clinics_by_kind.setdefault(ep.kind, []).append(clinic)

        extra_types = {
            EntryPoint.Kind.AIRPORT: [],
            EntryPoint.Kind.SEAPORT: ['QC-05', 'QC-14'],
            EntryPoint.Kind.LAND_PORT: [],
        }
        for kind, type_codes in extra_types.items():
            for clinic in clinics_by_kind.get(kind, []):
                for type_code in type_codes:
                    ctype = ClinicType.objects.filter(code=type_code).first()
                    if not ctype:
                        continue
                    code = f'{clinic.code}-{ctype.code}'
                    _, created = Clinic.objects.update_or_create(
                        code=code,
                        defaults={
                            'name_ar': f'{ctype.name_ar} - {clinic.entry_point.name_ar}',
                            'name_en': f'{ctype.name_en} - {clinic.entry_point.name_en or clinic.entry_point.name_ar}',
                            'entry_point': clinic.entry_point,
                            'sector': clinic.sector,
                            'clinic_type': ctype,
                            'location': clinic.location,
                            'phone': clinic.phone,
                            'email': clinic.email,
                            'services': ctype.services,
                            'order': clinic.order + int(type_code.split('-')[1]),
                            'is_active': True,
                        },
                    )
                    if created:
                        created_clinics += 1

        doctor, doctor_created = User.objects.get_or_create(
            email='clinic.doctor@nqp.gov.sd',
            defaults={'full_name': 'علي عبدالله', 'is_staff': True},
        )
        if doctor_created:
            doctor.set_password('Surv@2026!')
            doctor.save()

        clinic_role = Role.objects.filter(code='CLINIC_DOCTOR').first()
        assigned = 0
        if clinic_role:
            redsea_sector = None
            for c in Clinic.objects.all():
                if c.sector_id and c.sector.code in ('RED_SEA', 'BHR'):  # noqa: SIM118
                    redsea_sector = c.sector
                    break
            scope_id = redsea_sector.id if redsea_sector else None
            _, created = RoleAssignment.objects.get_or_create(
                user=doctor,
                role=clinic_role,
                scope_type=ScopeType.SECTOR,
                defaults={
                    'scope_id': scope_id,
                    'is_active': True,
                    'assigned_by': doctor,
                },
            )
            assigned += 1 if created else 0

        assigned_staff = 0
        target_sector = redsea_sector.id if redsea_sector else None
        for clinic in Clinic.objects.filter(is_active=True):
            if not (target_sector and clinic.sector_id == target_sector):
                continue
            _, created = ClinicStaff.objects.get_or_create(
                clinic=clinic,
                user=doctor,
                defaults={'role': ClinicStaff.Role.DOCTOR, 'is_active': True},
            )
            assigned_staff += 1 if created else 0

        self.stdout.write(self.style.SUCCESS(
            f'تم زرع العيادات: {created_types} نوع، {created_clinics} وحدة، '
            f'كادر {assigned_staff} ربط، تعيين دور {assigned}.'
        ))