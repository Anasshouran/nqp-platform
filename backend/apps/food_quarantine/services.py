"""الخدمات التجارية: سياسة العينات التلقائية وحساب الرسوم التلقائي للشحنات الغذائية."""

import hashlib
from decimal import ROUND_CEILING, Decimal

from .models import FoodSample, FoodShipment, SamplingPolicy

# تعرفة الرسوم الجسّمية حسب الكمية (بالطن) — «رسوم-الصادر-وارد.md»
EXPORT_TIERS = [
    (1, 25, Decimal('15000')),
    (26, 50, Decimal('20000')),
    (51, 75, Decimal('25000')),
    (76, 100, Decimal('30000')),
]
IMPORT_TIERS = [
    (1, 5, Decimal('45000')),
    (6, 10, Decimal('60000')),
    (11, 25, Decimal('100000')),
    (26, 50, Decimal('150000')),
    (51, 75, Decimal('170000')),
    (76, 100, Decimal('190000')),
]
UNLOADING_TIERS = [
    (1, 100, Decimal('55000')),
    (101, 500, Decimal('65000')),
    (501, 1000, Decimal('100000')),
    (1001, 5000, Decimal('150000')),
]


def compute_sampling(shipment) -> dict:
    """يحسب عدد وأنواع العينات المطلوبة وفق سياسات أخذ العينات النشطة.

    يطابق أولاً: سياسات «الصنف الرسمي» (product_key) المزروعة من الجدول الرسمي
    (مجموعة المخاطر 100%/75%/25% + كمية العينة) لكل صنف في الشحنة. إن لم يطابق أي
    صنف، يعود للسياسات العامة (بالوزن أو عدد العبوات).
    """
    policies = list(
        SamplingPolicy.objects.filter(is_active=True)
        .filter(scope__in=[shipment.shipment_type, SamplingPolicy.ShipmentScope.BOTH])
        .order_by('order', 'threshold')
    )
    generic = next((p for p in policies if not p.product_key), None)

    items = list(shipment.items.all())
    if items:
        required, reason, policy_names, hit_any = 0, None, set(), False
        for item in items:
            policy = _match_product_policy(item.product_name, policies)
            if not policy:
                continue
            hit_any = True
            if _risk_hit(shipment.id, policy):
                n = _policy_units(policy)
                if n and n > required:
                    required = n
                    reason = policy.default_reason
                    basis = 'RISK_GROUP'
            policy_names.add(policy.name_ar)
        if hit_any:
            return {
                'required': required,
                'reason': reason or FoodSample.SamplingReason.ROUTINE,
                'basis': 'RISK_GROUP',
                'policy': '، '.join(sorted(policy_names)) or None,
                'rate_pct': _sampling_rate_for(shipment, policies),
            }

    # المسار العام القديم (بدون مطابقة صنفية)
    if not generic:
        return {'required': 0, 'reason': 'ROUTINE', 'basis': None, 'policy': None, 'rate_pct': None}
    value = shipment.total_weight_kg if shipment.total_weight_kg else Decimal('0')
    if generic.benchmark == SamplingPolicy.Benchmark.PACKAGES:
        count = sum((i.package_count or 0) for i in shipment.items.all())
        if count < generic.threshold:
            return {'required': 0, 'reason': generic.default_reason, 'basis': 'PACKAGES', 'policy': generic.name_ar, 'rate_pct': None}
        units = Decimal(count) / generic.threshold if generic.threshold else Decimal('0')
    elif value < generic.threshold:
        return {'required': 0, 'reason': generic.default_reason, 'basis': 'WEIGHT', 'policy': generic.name_ar, 'rate_pct': None}
    else:
        units = value / generic.threshold if generic.threshold else Decimal('0')
    required = int((units * generic.samples_per_unit).to_integral_value(rounding=ROUND_CEILING))
    required = min(required, generic.max_samples) if required else 0
    return {
        'required': required,
        'reason': generic.default_reason,
        'basis': generic.benchmark,
        'policy': generic.name_ar,
        'rate_pct': None,
    }


def _norm_key(value) -> str:
    return ' '.join((value or '').lower().split())


def _match_product_policy(item_name, policies):
    """مطابقة اسم الصنف الحر مع product_key (تطابق جزئي بعد التطبيع).

    عند تعدّد المطابقات (نفس الصنف بعدة أحجام عبوات) يُفضَّل الأكثر تحفظاً
    (أكبر كمية عينة) حفاظاً على سلامة الرقابة.
    """
    name = _norm_key(item_name)
    if not name:
        return None
    candidates = []
    for policy in policies:
        key = _norm_key(policy.product_key)
        if key and (key in name or name in key):
            candidates.append(policy)
    if not candidates:
        return None
    return max(candidates, key=lambda p: _policy_units(p))


def _risk_hit(shipment_id, policy) -> bool:
    """قرار سحب ثابت قابل للتكرار حسب مجموعة المخاطر.

    R1 (100%): كل الرسائل. R2/R3: سحب شبه عشوائي حاسم (Hash) بنسبة المجموعة،
    وفرض السحب عند سبب اشتباه/أول ورود عبر default_reason.
    """
    if policy.risk_group == SamplingPolicy.RiskGroup.R1:
        return True
    if policy.rate_pct <= 0:
        return True
    if policy.default_reason in (FoodSample.SamplingReason.SUSPECTED, FoodSample.SamplingReason.FIRST_ENTRY):
        return True
    digest = int(hashlib.md5(f'{shipment_id}{policy.id}'.encode('utf-8')).hexdigest(), 16)
    return (digest % 100) < policy.rate_pct


def _policy_units(policy) -> int:
    """عدد وحدات العينة من كمية العينة (العدد أو الكيلو) أو من samples_per_unit."""
    if policy.quantity_num is not None:
        return int(policy.quantity_num)
    if policy.samples_per_unit and policy.samples_per_unit > 0:
        return int(policy.samples_per_unit)
    return 5


def _sampling_rate_for(shipment, policies):
    first = _match_product_policy(shipment.items.first().product_name if shipment.items.first() else None, policies)
    return first.rate_pct if first else None


def apply_sampling(shipment, policy=None) -> dict:
    """يطبق سياسة العينات على الشحنة ويحفظ العدد المطلوب."""
    result = compute_sampling(shipment)
    shipment.samples_required = result['required']
    shipment.save(update_fields=['samples_required'])
    return result


def compute_fee_breakdown(shipment) -> dict:
    """يحسب الرسوم الجسّمية حسب الكمية (تعرفة الوارد/الصادر).

    المرجع: «رسوم-الصادر-وارد.md». أساس الحساب هو الكمية بالطن عبر شرائح وزن،
    مع قانون الزيادة فوق 100 طن (وزن) و5000 طن (إنزال)، وإضافات ثابتة (دعم شهادة،
    مراقبة) وإضافات اختيارية مرتبطة بالقرار النهائي (إبادة/تعديل/فرز).

    رسائل الإغاثة (RELIEF) معفاة كلياً; رسائل الإعفاء (EXEMPT) تُعفى من رسوم دعم
    الشهادة فقط.
    """
    samples = shipment.samples_required or 0
    relief = shipment.message_type == FoodShipment.MessageType.RELIEF
    exempt = shipment.message_type == FoodShipment.MessageType.EXEMPT
    if relief:
        return {
            'exempt': True,
            'basis': 'PHYSICAL_WEIGHT',
            'lines': [{'name': 'إعفاء كلي (رسالة إغاثة)', 'fee': '0', 'fee_type': 'ADMIN'}],
            'total': '0',
            'samples': samples,
        }

    tons = Decimal(shipment.total_weight_kg or 0) / Decimal('1000')
    lines = []
    if shipment.shipment_type == FoodShipment.ShipmentType.EXPORT:
        lines.append({'name': 'رسوم الوزن', 'fee': '{}'.format(_export_weight_fee(tons)), 'fee_type': 'WEIGHT'})
        if not exempt:
            lines.append({'name': 'دعم الشهادة الصحية', 'fee': '7000', 'fee_type': 'CERTIFICATE'})
        lines.append({'name': 'رسوم المراقبة', 'fee': '12000', 'fee_type': 'MONITORING'})
    else:
        lines.append({'name': 'رسوم الوزن', 'fee': '{}'.format(_import_weight_fee(tons)), 'fee_type': 'WEIGHT'})
        lines.append({'name': 'رسوم الإنزال', 'fee': '{}'.format(_unloading_fee(tons)), 'fee_type': 'UNLOADING'})
        if not exempt:
            lines.append({'name': 'دعم الشهادة الصحية', 'fee': '10000', 'fee_type': 'CERTIFICATE'})
        lines.extend(_decision_addons(shipment.final_decision))

    total = sum(Decimal(line['fee']) for line in lines)
    return {
        'exempt': False,
        'basis': 'PHYSICAL_WEIGHT',
        'lines': lines,
        'total': '{}'.format(total),
        'samples': samples,
    }


def _export_weight_fee(tons: Decimal) -> Decimal:
    """رسوم الوزن (صادر): شرائح ≤100 طن، وفوقها قانون 30,000 + (مئات إضافية × 20,000)."""
    if tons <= 100:
        return _tier_fee(tons, EXPORT_TIERS)
    return Decimal('30000') + Decimal(int(tons // 100) - 1) * Decimal('20000')


def _import_weight_fee(tons: Decimal) -> Decimal:
    """رسوم الوزن (وارد): شرائح ≤100 طن، وفوقها قانون 190,000 + (مئات إضافية × 60,000)."""
    if tons <= 100:
        return _tier_fee(tons, IMPORT_TIERS)
    return Decimal('190000') + Decimal(int(tons // 100) - 1) * Decimal('60000')


def _unloading_fee(tons: Decimal) -> Decimal:
    """رسوم الإنزال (وارد): شرائح ≤5000 طن، وفوقها قانون 150,000 + (ألفيات إضافية × 60,000)."""
    if tons <= 5000:
        return _tier_fee(tons, UNLOADING_TIERS)
    return Decimal('150000') + Decimal(int(tons // 1000) - 5) * Decimal('60000')


def _tier_fee(value: Decimal, tiers) -> Decimal:
    """يختار أعلى شريحة لا يتجاوز حدُّها الأدنى القيمةَ (افتراضياً أصغر شريحة للصفر)."""
    for min_ton, max_ton, fee in tiers:
        if value <= max_ton:
            return fee
    return tiers[-1][2]


def _decision_addons(final_decision) -> list:
    """إضافات ثابتة اختيارية مرتبطة بالقرار النهائي (إبادة/تعديل/فرز)."""
    mapping = {
        'DESTROY': ('رسوم الإبادة', '10000', 'DESTRUCTION'),
        'TRANSFER': ('رسوم التعديل', '15000', 'ADJUSTMENT'),
        'PARTIAL_RELEASE': ('رسوم التعديل', '15000', 'ADJUSTMENT'),
        'TEMPORARY_RELEASE': ('رسوم التعديل', '15000', 'ADJUSTMENT'),
    }
    addon = mapping.get(final_decision)
    if not addon:
        return []
    name, fee, fee_type = addon
    return [{'name': name, 'fee': fee, 'fee_type': fee_type}]


def _clean(value):
    """يحوّل القيم الفارغة إلى None لتفادي عرض حقول فارغة في الاستمارة."""
    if value in (None, ''):
        return None
    return value


def _iso(value):
    return value.isoformat() if value else None


def build_export_inspection_form(shipment) -> dict:
    """يجمع كل بيانات «استمارة كشف الموارد الغذائية الصادرة» في استجابة واحدة.

    الاستمارة سجل إلكتروني واحد قابل للتتبع: بيانات الطلب ← بيانات المصدر ← الموارد
    الغذائية ← الكشف والتفتيش ← العينات والفحص المخبري ← القرار ← الشهادة. البيانات
    كلها تُقرأ من الارتباطات القائمة (FoodShipment/items/inspection/samples/
    decision_certificate) دون إدخال مكرر.
    """
    inspection = getattr(shipment, 'inspection', None)
    samples = inspection.samples.all() if inspection else FoodSample.objects.none()
    certificate = shipment.decision_certificates.first()
    port = shipment.port

    return {
        'shipment': {
            'manifest_number': shipment.manifest_number,
            'customs_number': _clean(shipment.customs_number),
            'certificate_no': _clean(shipment.certificate_no),
            'created_at': _iso(shipment.created_at),
            'submitted_at': _iso(shipment.submitted_at),
            'arrival_date': _iso(shipment.arrival_date),
            'shipment_type': shipment.shipment_type,
            'message_type': shipment.message_type,
            'status': shipment.status,
            'port_name': port.name_ar if port else None,
            'port_type': port.kind if port else None,
            'supplier_name': shipment.supplier_name,
            'origin_country': shipment.origin_country,
            'vessel_name': _clean(shipment.vessel_name),
            'loading_port': _clean(shipment.loading_port),
            'bill_of_lading': _clean(shipment.bill_of_lading),
            'clearing_agent': _clean(shipment.clearing_agent),
            'exporter_name': _clean(shipment.exporter_name),
            'total_weight_kg': str(shipment.total_weight_kg or 0),
            'samples_required': shipment.samples_required or 0,
            'inspection_required': shipment.inspection_required,
        },
        'items': [
            {
                'product_name': item.product_name,
                'brand': _clean(item.brand),
                'origin': _clean(item.origin),
                'weight_kg': str(item.weight_kg or 0),
                'package_count': item.package_count or 0,
                'package_type': _clean(item.package_type),
            }
            for item in shipment.items.all()
        ],
        'inspection': (
            {
                'inspector_name': _clean(inspection.inspector.full_name if inspection.inspector else None),
                'inspected_at': _iso(inspection.inspected_at),
                'decision': inspection.decision,
                'temperature': str(inspection.temperature) if inspection.temperature is not None else None,
                'production_date': _iso(inspection.production_date),
                'expiry_date': _iso(inspection.expiry_date),
                'batch_number': _clean(inspection.batch_number),
                'container_condition': _clean(inspection.container_condition),
                'container_status': _clean(inspection.container_status),
                'package_condition': _clean(inspection.package_condition),
                'damaged_count': inspection.damaged_count,
                'sound_count': inspection.sound_count,
                'damaged_weight_kg': str(inspection.damaged_weight or 0),
                'sound_weight_kg': str(inspection.sound_weight or 0),
                'notes': _clean(inspection.notes),
            }
            if inspection
            else None
        ),
        'samples': [
            {
                'sample_number': sample.sample_number or sample.sample_barcode,
                'sample_barcode': sample.sample_barcode,
                'sample_type': sample.sample_type,
                'sampling_reason': sample.sampling_reason,
                'bench': sample.bench,
                'status': sample.status,
                'approval_status': sample.approval_status,
                'received_at': _iso(sample.received_at),
            }
            for sample in samples
        ],
        'decision': (
            {
                'final_decision': shipment.final_decision,
                'decision_reason': _clean(shipment.decision_reason),
                'decided_by_name': _clean(shipment.decided_by.full_name if shipment.decided_by else None),
                'decided_at': _iso(shipment.decided_at),
            }
            if shipment.final_decision
            else None
        ),
        'certificate': (
            {
                'certificate_number': certificate.certificate_number,
                'certificate_type': certificate.certificate_type,
                'status': certificate.status,
                'issued_at': _iso(certificate.issued_at),
            }
            if certificate
            else None
        ),
    }