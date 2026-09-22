"""
محرك التقييم الآلي للنتائج الميكروبيولوجية (Microbiological Evaluation Engine).

يقارن نتائج وحدات العينة بخطة أخذ العينات (n/c/m/M) المنصوص عليها في المواصفة
السارية وقت التحليل، ويصدر قراراً: COMPLIANT / NON_COMPLIANT / INCONCLUSIVE.

القواعد قابلة للتهيئة لكل حد عبر `MicrobiologicalLimit.rule_json` وليست hard-coded:
    {
      "plan": "THREE_CLASS",      # TWO_CLASS | THREE_CLASS | PRESENCE_ABSENCE
      "m_op": "gt",               # تُعدّ القيمة «بين m و M» إذا تجاوزت m بهذا العامل
      "M_op": "gt",               # تُعدّ القيمة «فوق M» إذا تجاوزت M بهذا العامل
    }
"""

from decimal import Decimal

ENGINE_VERSION = 'micro-eval-1.0'

DECISIONS = ('COMPLIANT', 'NON_COMPLIANT', 'INCONCLUSIVE')


def _beyond(value, threshold, op):
    """هل القيمة تتجاوز العتبة حسب عامل المقارنة (gt/gte)؟"""
    if value is None or threshold is None:
        return None
    return value > threshold if op == 'gt' else value >= threshold


def evaluate(limit, units):
    """
    تقييم نتيجة فحص وفق حد مواصفة.

    limit:  MicrobiologicalLimit instance (مع microorganism جاهز)
    units:  قائمة من {unit_number, result_value, qualifier, result_unit}

    يُرجع dict: decision, reason, counts, plan, engine, notes
    """
    rule = limit.rule()
    plan = rule.get('plan')
    m_op = rule.get('m_op', 'gt')
    M_op = rule.get('M_op', 'gt')

    micro = getattr(limit, 'microorganism', None)
    detection_type = getattr(micro, 'detection_type', None)

    from .models import MicrobiologicalLimit as _Limit  # استيراد محلي لتجنب circular import
    presence_absence = plan == _Limit.Plan.PRESENCE_ABSENCE or detection_type == 'PRESENCE_ABSENCE'

    n = int(limit.n or 0)
    c = int(limit.c or 0)

    counts = {
        'total': len(units),
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

    for u in units:
        q = (u.get('qualifier') or '').upper()
        raw = u.get('result_value')
        try:
            value = Decimal(str(raw)) if raw not in (None, '') else None
        except Exception:
            value = None

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

        if _beyond(value, limit.M, M_op):
            counts['above_M'] += 1
        elif _beyond(value, limit.m, m_op):
            counts['between_m_M'] += 1
        else:
            counts['below_m'] += 1

    missing = counts['missing']
    if missing:
        return {
            'decision': 'INCONCLUSIVE',
            'reason': f'بانتظار نتائج الوحدات المتبقية — كُتبت {counts["total"] - missing} من أصل {n} وحدات.',
            'counts': counts,
            'plan': plan,
            'engine': ENGINE_VERSION,
        }
    if counts['total'] < n:
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
            'reason': f'جميع الوحدات ({n}) سالبة ضمن خطة الحضور/الغياب (c = {c}).',
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
