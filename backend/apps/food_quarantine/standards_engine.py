"""
محرك المواصفات والمطابقة (Standards & Compliance Engine).

يفصل بين:
  - المواصفة (Standard/Specification): ماذا يجب أن تكون النتيجة؟  (SSMO/GSO/Codex)
  - طريقة التحليل (AnalyticalMethod): كيف نقيس النتيجة؟           (ISO/AOAC)

وظائفه:
  1. resolve_applicable_requirement — تحديد المواصفة المطبقة وفق قواعد التطبيق
     التنظيمية (RegulatoryRule) القابلة للتهيئة (غير hard-coded).
  2. evaluate — مقارنة نتيجة التحليل بالمتطلب (حد كيميائي أو خطة n/c/m/M)
     وإصدار قرار: COMPLIANT / NON_COMPLIANT / INCONCLUSIVE.
  3. auto_evaluate_test — تطبيق كامل على فحص: تثبيت المرجع الزمني، أخذ اللقطة،
     التقييم، وتخزين القرار.

القواعد قابلة للتهيئة عبر `RegulatoryRule` (الترتيب لا يُكتب في الكود):
    priority 1 — NATIONAL_LAW
    priority 2 — SUDANESE_STANDARD
    priority 3 — REGULATORY_DECISION / CONTRACT_DESTINATION
    priority 4 — GSO_REFERENCE
    priority 5 — CODEX_REFERENCE
"""

import logging
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)

ENGINE_VERSION = 'standards-eval-1.0'

# تعيين نوع المرجع التنظيمي إلى مصدر المواصفة (Standard.Source)
_SOURCE_RULES = {
    'NATIONAL_LAW': {'SSMO'},
    'SUDANESE_STANDARD': {'SSMO'},
    'REGULATORY_DECISION': {'SSMO', 'GSO', 'CODEX', 'OTHER'},
    'CONTRACT_DESTINATION': {'SSMO', 'GSO', 'CODEX', 'OTHER'},
    'GSO_REFERENCE': {'GSO'},
    'CODEX_REFERENCE': {'CODEX'},
}

_DEFAULT_PRIORITY = 1000


def _rule_priority_for(standard_source):
    """أفضل أولوية من قواعد التطبيق النشطة لمصدر مواصفة معيّن."""
    from .models import RegulatoryRule

    rules = RegulatoryRule.objects.filter(is_active=True).order_by('priority')
    for rule in rules:
        if standard_source in _SOURCE_RULES.get(rule.source_type, set()):
            return rule.priority
    return _DEFAULT_PRIORITY


def _as_decimal(value):
    if value in (None, ''):
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def resolve_applicable_requirement(test, at=None):
    """
    يحدد المتطلب (StandardRequirement) المطبّق على فحص، حسب:
      - مطابقة المعامل (parameter)
      - نسخة المواصفة السارية في تاريخ التحليل
      - أولوية قواعد التطبيق التنظيمية القابلة للتهيئة

    يعيد dict: requirement, standard, version, method, reason
    """
    from .models import StandardRequirement

    at = at or (test.sample.received_at.date() if test.sample.received_at else timezone.now().date())

    candidates = (
        StandardRequirement.objects
        .select_related('version', 'version__standard', 'parameter', 'microorganism', 'method')
        .filter(
            Q(parameter=test.parameter) | Q(microorganism__isnull=False),
            active=True,
            version__effective_from__lte=at,
        )
        .filter(Q(version__effective_to__isnull=True) | Q(version__effective_to__gte=at))
    )

    ranked = []
    for req in candidates:
        # يفضّل متطلبات المعامل الكيميائي على الميكروبيولوجي عندما يكون التحليل كيميائياً
        score = 0
        if req.parameter_id == test.parameter_id:
            score += 100
        if req.microorganism_id and test.micro_limit_id:
            score += 50
        priority = _rule_priority_for(req.version.standard.source)
        ranked.append((priority, -score, req.version.effective_from, req))

    if not ranked:
        return None

    ranked.sort(key=lambda row: (row[0], row[1], row[2]))
    req = ranked[0][3]
    return {
        'requirement': req,
        'standard': req.version.standard,
        'version': req.version,
        'method': req.method,
        'reason': (
            f'المواصفة المطبقة وفق قواعد التطبيق: {req.version.standard.code} '
            f'(الإصدار {req.version.version}) — {req.version.standard.get_source_display()}.'
        ),
    }


def _compare(value, threshold, op):
    if value is None or threshold is None:
        return None
    return value > threshold if op == 'gt' else value >= threshold


def evaluate(requirement, result_value=None, units=None):
    """
    تقييم نتيجة تحليل مقابل متطلب مواصفة.

    requirement: StandardRequirement instance
    result_value: القيمة الكيميائية (للمحدّات الكيميائية)
    units: قائمة وحدات {unit_number, result_value, qualifier} (للخطط الميكروبيولوجية)

    يعيد dict: decision, reason, counts, plan, engine
    """
    from .models import StandardRequirement as _Req

    rule = requirement.rule()
    limit_type = rule.get('limit_type', requirement.limit_type)
    m_op = rule.get('m_op', 'gt')
    M_op = rule.get('M_op', 'gt')

    # ---- خطة ميكروبيولوجية n/c/m/M أو حضور/غياب ----
    if requirement.plan != _Req.Plan.TWO_CLASS or requirement.microorganism_id:
        plan = requirement.plan
        n = int(requirement.n or 0)
        c = int(requirement.c or 0)
        counts = {
            'total': len(units or []),
            'missing': 0,
            'below_m': 0,
            'between_m_M': 0,
            'above_M': 0,
            'positive': 0,
            'negative': 0,
            'required_n': n,
        }

        if not units:
            return {
                'decision': 'INCONCLUSIVE',
                'reason': f'لا توجد نتائج وحدات — الخطة تتطلب {n} وحدات.',
                'counts': counts,
                'plan': plan,
                'engine': ENGINE_VERSION,
            }

        presence_absence = plan == _Req.Plan.PRESENCE_ABSENCE or limit_type == 'PRESENCE_ABSENCE'

        for u in units:
            q = (u.get('qualifier') or '').upper()
            raw = u.get('result_value')
            value = _as_decimal(raw)
            if presence_absence:
                if q in ('POSITIVE', 'POS'):
                    counts['positive'] += 1
                elif q in ('NEGATIVE', 'NEG'):
                    counts['negative'] += 1
                elif value is not None and value > 0:
                    counts['positive'] += 1
                elif value is not None:
                    counts['negative'] += 1
                else:
                    counts['missing'] += 1
                continue
            if value is None:
                counts['missing'] += 1
                continue
            if _compare(value, requirement.M, M_op):
                counts['above_M'] += 1
            elif _compare(value, requirement.m, m_op):
                counts['between_m_M'] += 1
            else:
                counts['below_m'] += 1

        if counts['missing'] or counts['total'] < n:
            return {
                'decision': 'INCONCLUSIVE',
                'reason': f'نتائج غير مكتملة — كُتبت {counts["total"]} من أصل {n} وحدات (خطة أخذ العينات).',
                'counts': counts,
                'plan': plan,
                'engine': ENGINE_VERSION,
            }
        if presence_absence:
            if counts['positive'] > (c or 0):
                return {
                    'decision': 'NON_COMPLIANT',
                    'reason': f'ظهور {counts["positive"]} وحدة موجبة من أصل {n} (حدّ c = {c}) — مخالفة للمواصفة.',
                    'counts': counts,
                    'plan': plan,
                    'engine': ENGINE_VERSION,
                }
            return {
                'decision': 'COMPLIANT',
                'reason': f'جميع الوحدات ({n}) ضمن خطة الحضور/الغياب (c = {c}).',
                'counts': counts,
                'plan': plan,
                'engine': ENGINE_VERSION,
            }
        if counts['above_M'] > 0:
            return {
                'decision': 'NON_COMPLIANT',
                'reason': f'{counts["above_M"]} وحدة تتجاوز الحد الأقصى M — مخالفة مباشرة للمواصفة.',
                'counts': counts,
                'plan': plan,
                'engine': ENGINE_VERSION,
            }
        if counts['between_m_M'] > c:
            return {
                'decision': 'NON_COMPLIANT',
                'reason': f'{counts["between_m_M"]} وحدة بين m و M تتجاوز الحد المسموح c = {c}.',
                'counts': counts,
                'plan': plan,
                'engine': ENGINE_VERSION,
            }
        return {
            'decision': 'COMPLIANT',
            'reason': f'جميع الوحدات ضمن الحدود المقبولة (m ≤ النتائج ≤ M) وفق خطة {plan} (c = {c}).',
            'counts': counts,
            'plan': plan,
            'engine': ENGINE_VERSION,
        }

    # ---- حد كيميائي (max / min / range / specified) ----
    value = _as_decimal(result_value)
    if value is None:
        return {
            'decision': 'INCONCLUSIVE',
            'reason': 'لا توجد قيمة رقمية للنتيجة لإجراء التقييم.',
            'counts': None,
            'plan': 'CHEMICAL',
            'engine': ENGINE_VERSION,
        }

    limit_label = requirement.label()
    if limit_type == 'MAXIMUM':
        ok = value <= requirement.max_value
        reason = f'القيمة {value} {requirement.unit} ≤ الحد الأقصى {requirement.max_value} {requirement.unit}'
    elif limit_type == 'MINIMUM':
        ok = value >= requirement.min_value
        reason = f'القيمة {value} {requirement.unit} ≥ الحد الأدنى {requirement.min_value} {requirement.unit}'
    elif limit_type == 'RANGE':
        ok = requirement.min_value <= value <= requirement.max_value
        reason = f'القيمة {value} {requirement.unit} ضمن المدى {requirement.min_value}–{requirement.max_value} {requirement.unit}'
    elif limit_type == 'SPECIFIED':
        ok = value == requirement.min_value
        reason = f'القيمة {value} {requirement.unit} = القيمة المحددة {requirement.min_value} {requirement.unit}'
    else:
        ok = None
        reason = 'نوع حد غير مدعوم للتقييم الآلي.'

    decision = 'COMPLIANT' if ok else 'NON_COMPLIANT'
    if ok is None:
        decision = 'INCONCLUSIVE'
    return {
        'decision': decision,
        'reason': reason + (' — مطابق للمواصفة.' if decision == 'COMPLIANT'
                            else ' — مخالف للمواصفة.' if decision == 'NON_COMPLIANT' else '.'),
        'counts': None,
        'plan': 'CHEMICAL',
        'engine': ENGINE_VERSION,
    }


def auto_evaluate_test(test, force=False):
    """
    تطبيق كامل: تثبيت المواصفة المطبقة + اللقطة الزمنية + التقييم + تخزين القرار.

    يعيد dict النتيجة أو None إذا لم تكن هناك مواصفة مطبقة.
    """
    if test.result_value is None and not test.unit_results.exists():
        return None

    resolved = resolve_applicable_requirement(test)
    if not resolved:
        return None

    requirement = resolved['requirement']
    units = [
        {
            'unit_number': u.unit_number,
            'result_value': u.result_value,
            'qualifier': u.qualifier,
        }
        for u in test.unit_results.all()
    ]
    result = evaluate(requirement, test.result_value, units)
    if not result:
        return None

    test.applied_standard = resolved['standard']
    test.applied_standard_version = resolved['version']
    test.applied_requirement = requirement
    test.applied_method = resolved['method']
    test.evaluation = result['decision']
    test.evaluation_reason = f"{resolved['reason']} {result['reason']}"
    test.evaluated_at = timezone.now()
    test.spec_snapshot = {
        'standard_code': resolved['standard'].code,
        'standard_title': resolved['standard'].title_ar,
        'standard_source': resolved['standard'].get_source_display(),
        'version': resolved['version'].version,
        'effective_from': resolved['version'].effective_from.isoformat(),
        'effective_to': resolved['version'].effective_to.isoformat() if resolved['version'].effective_to else None,
        'requirement_label': requirement.label(),
        'method_code': resolved['method'].code if resolved['method'] else None,
        'method_name': resolved['method'].name_ar if resolved['method'] else None,
        'engine': result['engine'],
    }
    test.save(update_fields=[
        'applied_standard', 'applied_standard_version', 'applied_requirement',
        'applied_method', 'evaluation', 'evaluation_reason', 'evaluated_at', 'spec_snapshot',
    ])
    return result