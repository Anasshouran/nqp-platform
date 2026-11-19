import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../index';

// M5-D-J2B Phase 4-C — the five food.ops.notify keys used by FoodOpsPage
// were missing from ar.json, so Arabic operators saw raw key strings.
const EXPECTED: Record<string, string> = {
  'food.ops.notify.assigned': 'تم تعيين المفتش',
  'food.ops.notify.decisionFailed': 'تعذر اتخاذ القرار',
  'food.ops.notify.feeCollected': 'تم تحصيل الرسوم',
  'food.ops.notify.paymentFailed': 'تعذر الدفع',
  'food.ops.notify.selectInspector': 'اختر المفتش',
};

describe('M5-D-J2B Phase 4-C — food.ops.notify Arabic keys', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('food.ops.notify.assigned', () => {
    expect(i18n.t('food.ops.notify.assigned')).toBe(EXPECTED['food.ops.notify.assigned']);
  });

  it('food.ops.notify.decisionFailed', () => {
    expect(i18n.t('food.ops.notify.decisionFailed')).toBe(EXPECTED['food.ops.notify.decisionFailed']);
  });

  it('food.ops.notify.feeCollected', () => {
    expect(i18n.t('food.ops.notify.feeCollected')).toBe(EXPECTED['food.ops.notify.feeCollected']);
  });

  it('food.ops.notify.paymentFailed', () => {
    expect(i18n.t('food.ops.notify.paymentFailed')).toBe(EXPECTED['food.ops.notify.paymentFailed']);
  });

  it('food.ops.notify.selectInspector', () => {
    expect(i18n.t('food.ops.notify.selectInspector')).toBe(EXPECTED['food.ops.notify.selectInspector']);
  });
});
