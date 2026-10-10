import re
import uuid
from datetime import date, timedelta

from django.db import IntegrityError, transaction
from django.db.models import F, Max
from django.utils import timezone

from apps.travelers.models import Country, Traveler
from .models import (
    InventoryTransaction,
    VaccinationAuditLog,
    VaccinationCertificate,
    VaccinationRecord,
    VaccineBatch,
)


CERTIFICATE_PREFIX = 'AFY-VAC-'
CERTIFICATE_WIDTH = 6
_MAX_SEQUENCE = 10 ** CERTIFICATE_WIDTH - 1
_NUMBER_ALLOCATION_ATTEMPTS = 5


def _lifecycle_audit(action, certificate, *, record=None, source=None, user=None, details=None):
    """حدث تدقيق لدورة حياة الشهادة — يُستدعى داخل معاملة التغيير ذاتها.

    لا يبتلع الاستثناءات عمداً: أي فشل في كتابة التدقيق يُرجِع التغيير
    بأكمله فيفشل الالتفاف على المعاملة (لماذا: التدقيق والتغيير إما أن
    يُثبَّتا معاً أو لا يُثبَّت أيٌّ منهما)."""
    VaccinationAuditLog.objects.create(
        action=action,
        certificate=certificate,
        source_certificate=source,
        record=record if record is not None else certificate.record,
        user=user if getattr(user, 'is_authenticated', False) else None,
        details=details or {},
    )


def next_certificate_number():
    """الرقم التالي المتوقّع. لا يُحجز مسبقاً، لذلك يقرر المقرّئ أن يعيد حسابه
    عند التصادم، والـ INSERT هو الذي يحسم التزاحم (انظر `issue_certificate`)."""
    latest = (
        VaccinationCertificate.objects.filter(certificate_number__startswith=CERTIFICATE_PREFIX)
        .aggregate(m=Max('certificate_number'))['m']
    )
    if latest:
        try:
            seq = int(latest.rsplit('-', 1)[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f'{CERTIFICATE_PREFIX}{seq:0{CERTIFICATE_WIDTH}d}'


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
    """إصدار شهادة تطعيم دولية للجرعة المعطاة.

    السلامة ضد التزامن: قفل صف الجرعة نفسها (`select_for_update`) يُسلسل كل
    محاولة إصدار لنفس المجال `traveler + vaccine + record` تحت PostgreSQL —
    القفل يعمل حتى لو لم توجد أي شهادة سابقاً (القفل على الجرعة لا على
    الشهادة)، وبعد حصول القفل تُعاد القراءة بمعاينة جديدة، فترى المُنشأة
    مسبقاً وتعيدها بدل إنشاء ثانية. فحص `exists()` وحده غير كافٍ هنا."""
    if record.status != VaccinationRecord.Status.GIVEN:
        raise ValueError('لا يمكن إصدار شهادة لجرعة ملغاة')

    vaccine = record.vaccine
    if validity_days is None:
        rule = vaccine.rules.filter(required=True).first()
        validity_days = vaccine.validity_days or (rule.validity_days if rule else 3650)
    if not validity_days:
        validity_days = 3650

    with transaction.atomic():
        # قفل صف الجرعة: يُسلسل المُنافسين على المجال نفسه قبل أي قراءة.
        locked_record = VaccinationRecord.objects.select_for_update().get(pk=record.pk)
        if locked_record.status != VaccinationRecord.Status.GIVEN:
            raise ValueError('لا يمكن إصدار شهادة لجرعة ملغاة')

        # منع إصدار شهادة نشطة مكررة لنفس traveler + vaccine + record.
        # تستخدم `.active()` أي `effective_status == ACTIVE`: الشهادة المنتهية
        # (status=ACTIVE وبdate.today() > valid_until) لا تحجب إصداراً جديداً.
        duplicate = (
            VaccinationCertificate.objects
            .filter(traveler=locked_record.traveler, vaccine=locked_record.vaccine, record=locked_record)
            .active()
            .first()
        )
        if duplicate:
            return duplicate

        existing = VaccinationCertificate.objects.filter(record=locked_record).active().first()
        if existing:
            return existing

        # الرقم يُقرأ ثم يُحجز عبر INSERT؛ قيد `unique` على certificate_number هو
        # القاضي. تحت التزامن يقرأ طرفان الرقم نفسه فيفشل أحدهما، فيعيد الحساب
        # على الرقم المُدرج فعلاً ويحاول مرة أخرى بدل رمي 500. (الatomic الداخلي
        # savepoint داخل معاملة القفل، فالتعافي من IntegrityError آمن.)
        last_error = None
        for _ in range(_NUMBER_ALLOCATION_ATTEMPTS):
            number = next_certificate_number()
            if int(number.rsplit('-', 1)[-1]) > _MAX_SEQUENCE:
                raise ValueError('تجاوز عدد شهادات التلعيم الحد المسموح')
            try:
                with transaction.atomic():
                    created = VaccinationCertificate.objects.create(
                        traveler=locked_record.traveler,
                        record=locked_record,
                        vaccine=vaccine,
                        certificate_number=number,
                        issued_by=issued_by,
                        valid_until=date.today() + timedelta(days=validity_days),
                        validity_days=validity_days,
                        qr_token=uuid.uuid4(),
                        verification_path=f'/verify/vaccination/{number}',
                    )
                    _lifecycle_audit(
                        VaccinationAuditLog.Action.ISSUE,
                        created,
                        record=locked_record,
                        user=issued_by,
                        details={'certificate_number': number},
                    )
                    return created
            except IntegrityError as exc:
                if not VaccinationCertificate.objects.filter(certificate_number=number).exists():
                    raise
                last_error = exc
        raise ValueError('تعذّر حجز رقم شهادة فريد — أعد المحاولة') from last_error


def replace_certificate(certificate_id, replacement_reason, issued_by):
    """استبدال شهادة فعّالة (effective_status == ACTIVE) بشهادة جديدة برقم جديد.

    يُلغى الأصل (REVOKED) ويُنشأ الجديد مرتبطاً به عبر `replaces` وفيه نفس
    `record` حتى يبقى مفتاح المجال مكتملاً. الإصدار والإلغاء والتدقيق
    داخل معاملة واحدة: لا حالة وسيطة تُثبَّت شهادتين حاليتين معاً."""
    with transaction.atomic():
        original = VaccinationCertificate.objects.select_for_update().get(
            pk=certificate_id
        )
        if original.effective_status != VaccinationCertificate.Status.ACTIVE:
            raise ValueError('لا يمكن استبدال شهادة ليست فعالة ACTIVE')

        # Generate new certificate number
        number = next_certificate_number()

        # Create new certificate — inherits record from the source (domain key).
        new_cert = VaccinationCertificate.objects.create(
            traveler=original.traveler,
            record=original.record,
            vaccine=original.vaccine,
            certificate_number=number,
            status=VaccinationCertificate.Status.ACTIVE,
            replaces=original,
            replacement_reason=replacement_reason or '',
            replaced_at=None,  # NOT on new cert; only on old
            qr_token=uuid.uuid4(),
            verification_path=f'/verify/vaccination/{number}',
            issued_by=issued_by,
            valid_until=original.valid_until,
        )

        # Mark original as revoked
        original.status = VaccinationCertificate.Status.REVOKED
        original.replaced_at = timezone.now()
        original.save(update_fields=['status', 'replaced_at'])

        _lifecycle_audit(
            VaccinationAuditLog.Action.REPLACE,
            new_cert,
            record=new_cert.record,
            source=original,
            user=issued_by,
            details={
                'certificate_number': number,
                'replacement_reason': replacement_reason or '',
            },
        )

        return new_cert


def reissue_certificate(certificate_id, issued_by):
    """إعادة إصدار شهادة سابقة غير فعّالة (REVOKED أو EXPIRED بالاشتقاق).

    الأحادية: لكل مصدر طفل مباشر واحد (`MAX_DIRECT_REISSUE_CHILDREN = 1`).
    بحث الطفل لا ينظر إلى حالته إطلاقاً: وجوده يكفي لاسترجاعه (idempotent) —
    طفل ملغى أو منتهٍ يبقى الطفل الوحيد ولا يُنشأ شقيق له (A→B ثم A→C ممنوع).
    السلسلة A→B→C ممكنة: يُعاد إصدار B فقط حين يصبح B نفسه مؤهلاً."""
    with transaction.atomic():
        original = VaccinationCertificate.objects.select_for_update().get(
            pk=certificate_id
        )

        # Validate: effective_status must be non-ACTIVE (REVOKED or EXPIRED)
        if original.effective_status == VaccinationCertificate.Status.ACTIVE:
            raise ValueError('لا يمكن إعادة إصدار شهادة ACTIVE')

        # MAX_DIRECT_REISSUE_CHILDREN = 1: أي طفل مباشر موجود — مهما كانت
        # حالته — يُرجَع كما هو ولا يُنشأ آخر.
        existing_child = VaccinationCertificate.objects.filter(
            replaces=original
        ).first()

        if existing_child:
            # Return existing child - idempotent (no mutation, no audit)
            return existing_child

        # Generate new certificate number
        number = next_certificate_number()

        # Create new certificate — inherits record from the source (domain key).
        new_cert = VaccinationCertificate.objects.create(
            traveler=original.traveler,
            record=original.record,
            vaccine=original.vaccine,
            certificate_number=number,
            status=VaccinationCertificate.Status.ACTIVE,
            replaces=original,
            replacement_reason='',
            replaced_at=None,
            qr_token=uuid.uuid4(),
            verification_path=f'/verify/vaccination/{number}',
            issued_by=issued_by,
            valid_until=date.today() + timedelta(days=3650),
        )

        _lifecycle_audit(
            VaccinationAuditLog.Action.REISSUE,
            new_cert,
            record=new_cert.record,
            source=original,
            user=issued_by,
            details={'certificate_number': number},
        )

        return new_cert


def revoke_certificate(certificate, user=None):
    """إلغاء شهادة — قفل صفها ثم تغييرها وتدقيقها في معاملة واحدة.

    التكرار آمن: الإلغاء المتكرر يعيد `(False, رسالة)` دون تغيير أو تدقيق."""
    with transaction.atomic():
        locked = VaccinationCertificate.objects.select_for_update().get(pk=certificate.pk)
        if locked.status == VaccinationCertificate.Status.REVOKED:
            return False, 'الشهادة ملغاة بالفعل'
        locked.status = VaccinationCertificate.Status.REVOKED
        locked.save(update_fields=['status'])
        _lifecycle_audit(
            VaccinationAuditLog.Action.REVOKE,
            locked,
            record=locked.record,
            user=user,
            details={'certificate_number': locked.certificate_number},
        )
        # مزامنة الكائن لدى النادي (يُسلَّم للعرض) بعد الإلغاء المُثبَّت.
        certificate.status = locked.status
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


def _normalize(text):
    return ' '.join((text or '').split()).casefold()


def rule_applies_to(rule, destination):
    """`(منطبقة, مؤكدة)` لقاعدة تقييم أمام وجهة معروفة.
    قاعدة بلا `destination_region` عامّة ⇒ منطبقة ومؤكدة.
    قاعدة مرتبطة بوجهة والوجهة غير معروفة ⇒ تُحتسب لكن غير مؤكدة: الاحتراط أماناً أفضل
    من أن نُعرض «قد يلزمك» على أن نُخفي اشتراطاً فعلياً.
    والوجهة المعروفة تُصفّي القواعد المرتبطة بغيرها.
    """
    regions = [r for r in re.split(r'[,،;]', rule.destination_region or '') if r.strip()]
    if not regions:
        return True, True
    if not destination:
        return True, False
    dest = _normalize(destination)
    for region in regions:
        region_norm = _normalize(region)
        if region_norm == '*' or dest == region_norm or region_norm in dest or dest in region_norm:
            return True, True
    return False, True


def assess_traveler(traveler, destination=None):
    """تقييم احتياج المسافر للتطعيمات حسب القواعد مقابل سجل جرعاته.

    `destination` نصّ الوجهة («السعودية»). تمريره يجعل القواعد المرتبطة
    بوجهة معيّنة تنطبق على ما يطابقها فقط؛ وغيابه لا يُسقط أي قاعدة.
    """
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
        applies, confirmed = rule_applies_to(rule, destination)
        if not applies:
            continue
        if age_days is not None:
            if rule.min_age_days and age_days < rule.min_age_days:
                continue
            if rule.max_age_days and age_days > rule.max_age_days:
                continue
        given = given_by_vaccine.get(rule.vaccine_id, 0)
        missing = max(0, rule.doses_required - given)
        note = rule.note
        if not confirmed:
            note = (
                f'{note} — ينطبق على وجهة محددة ({rule.destination_region}) والوجهة غير محددة'
            ).strip(' —')
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
                'destination_region': rule.destination_region,
                'destination_confirmed': confirmed,
                'note': note,
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
    for c in VaccinationCertificate.objects.filter(traveler=traveler).active().order_by('-issued_at'):
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