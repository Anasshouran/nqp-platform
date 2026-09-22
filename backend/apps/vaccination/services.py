import uuid
from datetime import date, timedelta

from django.db import transaction
from django.db.models import F, Max

from apps.travelers.models import Country, Traveler
from .models import InventoryTransaction, VaccinationCertificate, VaccinationRecord, VaccineBatch


def next_certificate_number():
    latest = (
        VaccinationCertificate.objects.filter(certificate_number__startswith='AFY-VAC-')
        .aggregate(m=Max('certificate_number'))['m']
    )
    if latest:
        try:
            seq = int(latest.rsplit('-', 1)[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f'AFY-VAC-{seq:06d}'


def find_traveler(passport=None, qr_token=None, traveler_id=None, **extra):
    """البحث عن مسافر أو إنشاؤه ببيانات تسجيل مبسّطة."""
    passport = (passport or '').strip().upper()
    if traveler_id:
        return Traveler.objects.filter(pk=traveler_id).first(), False
    if qr_token:
        return Traveler.objects.filter(qr_token=qr_token).first(), False
    if passport:
        return Traveler.objects.filter(passport_number=passport).first(), False
    return None, False


def record_vaccination(data, user):
    """تسجيل جرعة لقاح مع خصم الجرعة من المخزون وحفظ حركة الصرف."""
    from apps.vaccination.models import VaccinationSite

    traveler = data.get('traveler')
    vaccine = data.get('vaccine')
    if not traveler or not vaccine:
        raise ValueError('المسافر واللقاح مطلوبان')

    batch = data.get('batch')
    with transaction.atomic():
        if batch is not None:
            fresh = VaccineBatch.objects.filter(pk=batch.pk, available_quantity__gte=1).first()
            if not fresh:
                raise ValueError('الكمية غير كافية في هذه التشغيلة')
            VaccineBatch.objects.filter(pk=batch.pk).update(available_quantity=F('available_quantity') - 1)

        record = VaccinationRecord.objects.create(
            traveler=traveler,
            vaccine=vaccine,
            batch=batch,
            dose_type=data.get('dose_type', VaccinationRecord.DoseType.FIRST),
            dose_number=data.get('dose_number', 1),
            administered_at=data.get('administered_at', date.today()),
            site=data.get('site'),
            vaccinator=data.get('vaccinator'),
            recorded_by=user,
            notes=data.get('notes', ''),
            status=VaccinationRecord.Status.GIVEN,
        )

        if batch is not None:
            InventoryTransaction.objects.create(
                batch=batch,
                type=InventoryTransaction.Type.OUT,
                quantity=1,
                reference_record=record,
                created_by=user,
                note=f'صرف جرعة {vaccine.code} لمسافر {traveler.passport_number}',
            )
    return record


def issue_certificate(record, issued_by, validity_days=None):
    """إصدار شهادة تطعيم دولية للجرعة المعطاة."""
    if record.status != VaccinationRecord.Status.GIVEN:
        raise ValueError('لا يمكن إصدار شهادة لجرعة ملغاة')
    existing = VaccinationCertificate.objects.filter(record=record, status=VaccinationCertificate.Status.ACTIVE).first()
    if existing:
        return existing

    vaccine = record.vaccine
    if validity_days is None:
        rule = vaccine.rules.filter(required=True).first()
        validity_days = vaccine.validity_days or (rule.validity_days if rule else 3650)
    if not validity_days:
        validity_days = 3650

    number = next_certificate_number()
    cert = VaccinationCertificate.objects.create(
        traveler=record.traveler,
        record=record,
        vaccine=vaccine,
        certificate_number=number,
        issued_by=issued_by,
        valid_until=date.today() + timedelta(days=validity_days),
        validity_days=validity_days,
        qr_token=uuid.uuid4(),
        verification_path=f'/verify/vaccination/{number}',
    )
    return cert


def revoke_certificate(certificate):
    if certificate.status == VaccinationCertificate.Status.REVOKED:
        return False, 'الشهادة ملغاة بالفعل'
    certificate.status = VaccinationCertificate.Status.REVOKED
    certificate.save(update_fields=['status'])
    return True, 'تم الإلغاء'


def adjust_batch(batch, delta, user=None, reason='تسوية'):
    """تسوية الرصيد المتاح للتشغيلة مع تسجيل حركة المخزون."""
    new_value = max(0, batch.available_quantity + delta)
    with transaction.atomic():
        VaccineBatch.objects.filter(pk=batch.pk).update(available_quantity=new_value)
        InventoryTransaction.objects.create(
            batch=batch,
            type=InventoryTransaction.Type.ADJUST,
            quantity=abs(delta),
            created_by=user,
            note=f'{reason} ({delta:+,})',
        )
    return new_value


def assess_traveler(traveler):
    """تقييم احتياج المسافر للتطعيمات حسب القواعد مقابل سجل جرعاته."""
    from apps.vaccination.models import VaccinationRule

    today = date.today()
    age_days = None
    if traveler.date_of_birth:
        age_days = (today - traveler.date_of_birth).days

    given_by_vaccine = {}
    for r in VaccinationRecord.objects.filter(
        traveler=traveler, status=VaccinationRecord.Status.GIVEN
    ).select_related('vaccine'):
        given_by_vaccine.setdefault(r.vaccine_id, 0)
        if r.dose_number > given_by_vaccine[r.vaccine_id]:
            given_by_vaccine[r.vaccine_id] = r.dose_number

    assessment = []
    for rule in VaccinationRule.objects.filter(required=True).select_related('vaccine').order_by('vaccine__name_ar'):
        if age_days is not None:
            if rule.min_age_days and age_days < rule.min_age_days:
                continue
            if rule.max_age_days and age_days > rule.max_age_days:
                continue
        given = given_by_vaccine.get(rule.vaccine_id, 0)
        missing = max(0, rule.doses_required - given)
        assessment.append(
            {
                'vaccine_id': str(rule.vaccine_id),
                'vaccine_code': rule.vaccine.code,
                'vaccine_name_ar': rule.vaccine.name_ar,
                'required': True,
                'doses_required': rule.doses_required,
                'doses_given': given,
                'missing': missing,
                'status': 'COMPLETE' if missing == 0 else ('PARTIAL' if given > 0 else 'MISSING'),
                'validity_days': rule.validity_days,
                'note': rule.note,
            }
        )
    return assessment


def traveler_summary(traveler):
    """الجرعات الممنوحة وشهاداته النشطة (للعرض في لوحة المسافر)."""
    records = []
    for r in VaccinationRecord.objects.filter(
        traveler=traveler, status=VaccinationRecord.Status.GIVEN
    ).select_related('vaccine', 'batch', 'site').order_by('vaccine__name_ar', '-administered_at'):
        records.append(
            {
                'id': str(r.id),
                'vaccine_code': r.vaccine.code,
                'vaccine_name_ar': r.vaccine.name_ar,
                'dose_number': r.dose_number,
                'dose_type': r.get_dose_type_display(),
                'administered_at': r.administered_at.isoformat(),
                'lot_number': r.batch.lot_number if r.batch else '',
                'site_name': r.site.name_ar if r.site else '',
                'vaccinator_name': getattr(r.vaccinator, 'full_name', '') or '',
                'notes': r.notes,
            }
        )
    certificates = []
    for c in VaccinationCertificate.objects.filter(
        traveler=traveler, status=VaccinationCertificate.Status.ACTIVE
    ).order_by('-issued_at'):
        certificates.append(
            {
                'id': str(c.id),
                'certificate_number': c.certificate_number,
                'vaccine_name_ar': c.vaccine.name_ar if c.vaccine else '',
                'valid_until': c.valid_until.isoformat(),
                'verification_path': c.verification_path,
            }
        )
    return {'records': records, 'certificates': certificates}


def ensure_country(code='SDN'):
    return Country.objects.filter(code=code).first() or Country.objects.first()