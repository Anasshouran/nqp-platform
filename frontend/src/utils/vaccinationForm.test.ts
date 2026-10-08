import { describe, expect, it } from 'vitest';
import { doseTypeLabel, validateDoseForm } from './vaccinationForm';

const valid = {
  vaccine: 'v1',
  batch: '',
  dose_number: '2',
  administered_at: '2026-10-01',
  eligibleBatchIds: ['b1', 'b2'],
};

describe('doseTypeLabel', () => {
  it('يعرض التسمية العربية للأنواع المعروفة', () => {
    expect(doseTypeLabel('FIRST')).toBe('الجرعة الأولى');
    expect(doseTypeLabel('SECOND')).toBe('الجرعة الثانية');
    expect(doseTypeLabel('THIRD')).toBe('الجرعة الثالثة');
    expect(doseTypeLabel('BOOSTER')).toBe('جرعة تنشيطية');
  });

  it('يرجع القيمة الأصلية للأنواع غير المعروفة', () => {
    expect(doseTypeLabel('UNKNOWN_CODE')).toBe('UNKNOWN_CODE');
  });
});

describe('validateDoseForm', () => {
  it('يقبل نموذجاً صحيحاً', () => {
    expect(validateDoseForm(valid)).toBeNull();
  });

  it('يرفض عدم اختيار اللقاح', () => {
    expect(validateDoseForm({ ...valid, vaccine: '' })).toBe('اختر اللقاح');
  });

  it('يرفض رقم جرعة خارج المدى', () => {
    expect(validateDoseForm({ ...valid, dose_number: '0' })).toBe('رقم الجرعة يجب أن يكون بين 1 و 20');
    expect(validateDoseForm({ ...valid, dose_number: '21' })).toBe('رقم الجرعة يجب أن يكون بين 1 و 20');
    expect(validateDoseForm({ ...valid, dose_number: '' })).toBe('رقم الجرعة يجب أن يكون بين 1 و 20');
  });

  it('يرفض تشغيلة غير تابعة للقاح المحدد', () => {
    expect(validateDoseForm({ ...valid, batch: 'b9' })).toBe('التشغيلة غير متاحة لهذا اللقاح');
  });

  it('يرفض تاريخاً فارغاً أو غير صحيح', () => {
    expect(validateDoseForm({ ...valid, administered_at: '' })).toBe('حدد تاريخ التطعيم');
    expect(validateDoseForm({ ...valid, administered_at: 'not-a-date' })).toBe('تاريخ التطعيم غير صحيح');
  });

  it('يرفض تاريخاً في المستقبل', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(validateDoseForm({ ...valid, administered_at: future })).toBe('تاريخ التطعيم لا يمكن أن يكون في المستقبل');
  });
});