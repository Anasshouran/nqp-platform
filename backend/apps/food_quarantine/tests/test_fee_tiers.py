"""اختبارات تعرفة الرسوم الشرائحية حسب الكمية (وارد/صادر) وحساب كسر الرسوم.

تغطي: جداول الشرائح، قوانين الزيادة فوق 100 طن (وزن) و5000 طن (إنزال)،
إعفاءات الإغاثة/الإعفاء، والإضافات المرتبطة بالقرار النهائي.
"""

from decimal import Decimal
from types import SimpleNamespace

import pytest

from ..models import FoodShipment
from ..services import (
    _decision_addons,
    _export_weight_fee,
    _import_weight_fee,
    _tier_fee,
    _unloading_fee,
    compute_fee_breakdown,
    EXPORT_TIERS,
    IMPORT_TIERS,
    UNLOADING_TIERS,
)

IMPORT = FoodShipment.ShipmentType.IMPORT
EXPORT = FoodShipment.ShipmentType.EXPORT
RELIEF = FoodShipment.MessageType.RELIEF
EXEMPT = FoodShipment.MessageType.EXEMPT
COMMERCIAL = FoodShipment.MessageType.COMMERCIAL


def shipment(**overrides):
    defaults = dict(
        message_type=COMMERCIAL,
        total_weight_kg=Decimal('10000'),
        shipment_type=IMPORT,
        final_decision=FoodShipment.FinalDecision.COMPLIANT,
        samples_required=2,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def total(breakdown):
    return Decimal(breakdown['total'])


def line(breakdown, name):
    return next((l for l in breakdown['lines'] if l['name'] == name), None)


# ---------- جداول الشرائح ----------

@pytest.mark.parametrize('tons,expected', [
    (Decimal('1'), Decimal('15000')),
    (Decimal('25'), Decimal('15000')),
    (Decimal('26'), Decimal('20000')),
    (Decimal('50'), Decimal('20000')),
    (Decimal('51'), Decimal('25000')),
    (Decimal('75'), Decimal('25000')),
    (Decimal('76'), Decimal('30000')),
    (Decimal('100'), Decimal('30000')),
])
def test_export_tier_boundaries(tons, expected):
    assert _export_weight_fee(tons) == expected


@pytest.mark.parametrize('tons,expected', [
    (Decimal('101'), Decimal('30000')),
    (Decimal('199.9'), Decimal('30000')),
    (Decimal('200'), Decimal('50000')),
    (Decimal('300'), Decimal('70000')),
    (Decimal('1000'), Decimal('210000')),
])
def test_export_over_100_rule(tons, expected):
    assert _export_weight_fee(tons) == expected


@pytest.mark.parametrize('tons,expected', [
    (Decimal('1'), Decimal('45000')),
    (Decimal('5'), Decimal('45000')),
    (Decimal('6'), Decimal('60000')),
    (Decimal('10'), Decimal('60000')),
    (Decimal('11'), Decimal('100000')),
    (Decimal('25'), Decimal('100000')),
    (Decimal('26'), Decimal('150000')),
    (Decimal('51'), Decimal('170000')),
    (Decimal('76'), Decimal('190000')),
    (Decimal('99.9'), Decimal('190000')),
])
def test_import_tier_boundaries(tons, expected):
    assert _import_weight_fee(tons) == expected


@pytest.mark.parametrize('tons,expected', [
    (Decimal('101'), Decimal('190000')),
    (Decimal('200'), Decimal('250000')),
    (Decimal('300'), Decimal('310000')),
    (Decimal('700'), Decimal('550000')),
    (Decimal('1000'), Decimal('730000')),
])
def test_import_over_100_rule(tons, expected):
    assert _import_weight_fee(tons) == expected


@pytest.mark.parametrize('tons,expected', [
    (Decimal('1'), Decimal('55000')),
    (Decimal('100'), Decimal('55000')),
    (Decimal('101'), Decimal('65000')),
    (Decimal('500'), Decimal('65000')),
    (Decimal('501'), Decimal('100000')),
    (Decimal('1000'), Decimal('100000')),
    (Decimal('1001'), Decimal('150000')),
    (Decimal('5000'), Decimal('150000')),
])
def test_unloading_tier_boundaries(tons, expected):
    assert _unloading_fee(tons) == expected


@pytest.mark.parametrize('tons,expected', [
    (Decimal('5000.1'), Decimal('150000')),
    (Decimal('6000'), Decimal('210000')),
    (Decimal('10000'), Decimal('450000')),
])
def test_unloading_over_5000_rule(tons, expected):
    assert _unloading_fee(tons) == expected


def test_tier_fee_selects_highest_eligible():
    assert _tier_fee(Decimal('60'), EXPORT_TIERS) == Decimal('25000')
    assert _tier_fee(Decimal('0'), EXPORT_TIERS) == Decimal('15000')


# ---------- كسر الرسوم الكامل ----------

def test_import_commercial_breakdown_lines_and_total():
    b = compute_fee_breakdown(shipment(total_weight_kg=Decimal('60000'), samples_required=4))
    assert b['exempt'] is False
    names = [l['name'] for l in b['lines']]
    assert 'رسوم الوزن' in names
    assert 'رسوم الإنزال' in names
    assert 'دعم الشهادة الصحية' in names
    # 60 طن: وزن 170000 (شريحة 51-75)، إنزال 55000 (شريحة 1-100)، شهادة 10000
    expected = Decimal('170000') + Decimal('55000') + Decimal('10000')
    assert total(b) == expected
    assert b['samples'] == 4


def test_export_commercial_breakdown_lines_and_total():
    b = compute_fee_breakdown(shipment(
        shipment_type=EXPORT, total_weight_kg=Decimal('30000')
    ))
    # 30 طن: وزن 20000، مراقبة 12000، شهادة 7000
    assert total(b) == Decimal('20000') + Decimal('12000') + Decimal('7000')
    names = [l['name'] for l in b['lines']]
    assert 'رسوم المراقبة' in names


def test_import_over_100_uses_law_and_addons():
    b = compute_fee_breakdown(shipment(
        total_weight_kg=Decimal('300000'),
        final_decision=FoodShipment.FinalDecision.DESTROY,
    ))
    # 300 طن: وزن = 190000 + 2*60000 = 310000، إنزال 65000 (شريحة 101-500)، شهادة 10000، إبادة 10000
    assert line(b, 'رسوم الوزن')['fee'] == '310000'
    assert total(b) == Decimal('310000') + Decimal('65000') + Decimal('10000') + Decimal('10000')


def test_relief_exempts_everything():
    b = compute_fee_breakdown(shipment(message_type=RELIEF))
    assert b['exempt'] is True
    assert total(b) == Decimal('0')


def test_exempt_drops_certificate_fee_only():
    b = compute_fee_breakdown(shipment(message_type=EXEMPT, total_weight_kg=Decimal('20000')))
    assert line(b, 'دعم الشهادة الصحية') is None
    # 20 طن وارد: وزن 100000 + إنزال 55000 (شريحة 1-100)
    assert total(b) == Decimal('100000') + Decimal('55000')


@pytest.mark.parametrize('decision,expected_fee,fee_type', [
    (FoodShipment.FinalDecision.DESTROY, Decimal('10000'), 'DESTRUCTION'),
    (FoodShipment.FinalDecision.TRANSFER, Decimal('15000'), 'ADJUSTMENT'),
    (FoodShipment.FinalDecision.PARTIAL_RELEASE, Decimal('15000'), 'ADJUSTMENT'),
    (FoodShipment.FinalDecision.TEMPORARY_RELEASE, Decimal('15000'), 'ADJUSTMENT'),
    (FoodShipment.FinalDecision.COMPLIANT, Decimal('0'), None),
])
def test_decision_addons(decision, expected_fee, fee_type):
    addons = _decision_addons(decision)
    if fee_type is None:
        assert addons == []
    else:
        assert addons == [{'name': 'رسوم الإبادة' if decision == FoodShipment.FinalDecision.DESTROY else 'رسوم التعديل', 'fee': str(expected_fee), 'fee_type': fee_type}]