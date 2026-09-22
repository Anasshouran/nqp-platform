import base64
import io
import json
import uuid

import qrcode
from django.db import transaction
from django.db.models import Max

from apps.clinic.models import ClinicReferral
from apps.travelers.models import Traveler


def next_medical_file_no():
    latest = (
        Traveler.objects.filter(medical_file_no__startswith='MR-')
        .aggregate(m=Max('medical_file_no'))['m']
    )
    if latest:
        try:
            seq = int(latest.split('-')[1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f'MR-{seq:06d}'


def ensure_medical_file(traveler):
    """تخصيص رقم ملف طبي موحد ورمز QR للمسافر عند أول تعامل مع العيادة."""
    changed = []
    if not traveler.medical_file_no:
        with transaction.atomic():
            traveler.medical_file_no = next_medical_file_no()
            changed.append('medical_file_no')
    if not traveler.qr_token:
        traveler.qr_token = uuid.uuid4()
        changed.append('qr_token')
    if changed:
        traveler.save(update_fields=changed)
    return traveler


def find_or_create_patient(data, user=None):
    """البحث عن مسافر (جواز/رقم ملف/QR) أو إنشاؤه ببيانات التسجيل."""
    passport = (data.get('passport_number') or '').strip().upper()
    mrn = data.get('medical_file_no')
    qr_token = data.get('qr_token')

    traveler = None
    if qr_token:
        traveler = Traveler.objects.filter(qr_token=qr_token).first()
    elif mrn:
        traveler = Traveler.objects.filter(medical_file_no=str(mrn).strip().upper()).first()
    elif passport:
        traveler = Traveler.objects.filter(passport_number=passport).first()

    if traveler:
        ensure_medical_file(traveler)
        return traveler, False

    from apps.travelers.models import Country

    nationality = data.get('nationality')
    if isinstance(nationality, (dict, list)) or nationality is None:
        nationality = Country.objects.filter(code='SDN').first() or Country.objects.first()
    elif not isinstance(nationality, Country):
        nationality = Country.objects.filter(pk=nationality).first() or Country.objects.filter(code=nationality).first()

    with transaction.atomic():
        traveler = Traveler.objects.create(
            passport_number=passport or f'UNK-{uuid.uuid4().hex[:10].upper()}',
            first_name=(data.get('first_name') or '').strip() or 'غير محدد',
            last_name=(data.get('last_name') or '').strip() or 'غير محدد',
            date_of_birth=data.get('date_of_birth'),
            nationality=nationality,
            phone=data.get('phone', ''),
            email=data.get('email', ''),
            medical_history=data.get('medical_history', {}),
        )
        ensure_medical_file(traveler)
    return traveler, True


def next_queue_no(clinic):
    if not clinic:
        return None
    latest = ClinicReferral.objects.filter(clinic=clinic).aggregate(m=Max('queue_no'))['m']
    return (latest or 0) + 1


def walk_in_referral(traveler, user, clinic=None, port=None, notes=''):
    """إنشاء إحالة حضور مباشر (Walk-in) للمسافر مع رقم دور."""
    from apps.masterdata.models import EntryPoint

    if clinic and not port:
        port = clinic.entry_point
    if not port:
        port = EntryPoint.objects.filter(is_active=True).first()
    return ClinicReferral.objects.create(
        traveler=traveler,
        port=port,
        clinic=clinic,
        source=ClinicReferral.Source.WALK_IN,
        queue_no=next_queue_no(clinic),
        notes=notes or 'تسجيل حالة حضور مباشر',
        status=ClinicReferral.ReferralStatus.PENDING,
    )


def patient_qr_png(traveler):
    """صورة QR بصيغة PNG (base64) تحمل رقم الملف الطبي الموحد."""
    ensure_medical_file(traveler)
    payload = {
        'type': 'NQP_PATIENT',
        'mrn': traveler.medical_file_no,
        'name': traveler.full_name,
        'passport': traveler.passport_number,
    }
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(json.dumps(payload))
    qr.make(fit=True)
    img = qr.make_image()
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return base64.b64encode(buf.getvalue()).decode('ascii')