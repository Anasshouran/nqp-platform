import { describe, expect, it } from 'vitest';
import { employeeSchema, emptyEmployeeForm } from './hr';

const base = () => ({ ...emptyEmployeeForm, fullNameAr: 'موظف' });

describe('employeeSchema', () => {
  it('يقبل نموذجاً صالحاً بحساب جديد', () => {
    const result = employeeSchema.safeParse({ ...base(), email: 'a@nqp.sd' });
    expect(result.success).toBe(true);
  });

  it('يرفض الاسم العربي الفارغ', () => {
    const result = employeeSchema.safeParse({ ...base(), fullNameAr: '', email: 'a@nqp.sd' });
    expect(result.success).toBe(false);
  });

  it('يرفض بريداً غير صالح', () => {
    const result = employeeSchema.safeParse({ ...base(), email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('يتطلب بريداً عند اختيار حساب جديد', () => {
    const result = employeeSchema.safeParse({ ...base(), email: '' });
    expect(result.success).toBe(false);
  });

  it('يرفض كلمة مرور أقصر من 8 أحرف', () => {
    const result = employeeSchema.safeParse({ ...base(), email: 'a@nqp.sd', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('يقبل كلمة مرور فارغة (تعيين لاحقاً)', () => {
    const result = employeeSchema.safeParse({ ...base(), email: 'a@nqp.sd', password: '' });
    expect(result.success).toBe(true);
  });

  it('يتطلب اختيار حساب عند نمط الربط', () => {
    const result = employeeSchema.safeParse({ ...base(), accountMode: 'existing', userId: '' });
    expect(result.success).toBe(false);
  });

  it('يقبل الربط بحساب موجود', () => {
    const result = employeeSchema.safeParse({
      ...base(),
      accountMode: 'existing',
      userId: '435c9204-9b2e-4c79-b75e-36989c515e91',
    });
    expect(result.success).toBe(true);
  });

  it('يرفض نهاية اختبار تسبق تاريخ التعيين', () => {
    const result = employeeSchema.safeParse({
      ...base(),
      email: 'a@nqp.sd',
      hireDate: '2026-06-01',
      probationEndDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('يرفض تاريخ ميلاد بعد تاريخ التعيين', () => {
    const result = employeeSchema.safeParse({
      ...base(),
      email: 'a@nqp.sd',
      hireDate: '2020-01-01',
      birthDate: '2021-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('يرفض جنساً خارج التعداد', () => {
    const result = employeeSchema.safeParse({ ...base(), email: 'a@nqp.sd', gender: 'X' });
    expect(result.success).toBe(false);
  });
});
