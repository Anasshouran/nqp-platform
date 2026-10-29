import { describe, expect, it } from 'vitest';
import { createEmployeeSchema, emptyEmployeeForm } from './hr';
import type { TFunction } from 'i18next';

const base = () => ({ ...emptyEmployeeForm, fullNameAr: 'موظف' });

// Minimal t mock for schema validation tests
const t = ((key: string, opts?: Record<string, string | number>) => {
  const messages: Record<string, string> = {
    'hr.employeeSchema.validation.maxLength': 'الحد الأقصى {max} حرفاً',
    'hr.employeeSchema.validation.invalidEmail': 'بريد إلكتروني غير صالح',
    'hr.employeeSchema.validation.fullNameArRequired': 'الاسم بالعربية مطلوب',
    'hr.employeeSchema.validation.emailRequired': 'البريد الإلكتروني مطلوب',
    'hr.employeeSchema.validation.passwordMinLength': 'كلمة المرور 8 أحرف على الأقل',
    'hr.employeeSchema.validation.selectUserAccount': 'اختر حساب الموظف',
    'hr.employeeSchema.validation.probationBeforeHire': 'نهاية فترة الاختبار لا تسبق تاريخ التعيين',
    'hr.employeeSchema.validation.birthDateBeforeHire': 'تاريخ الميلاد يجب أن يسبق تاريخ التعيين',
  };
  let msg = messages[key] || key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}) as unknown as TFunction;

const schema = createEmployeeSchema(t);

describe('employeeSchema', () => {
  it('يقبل نموذجاً صالحاً بحساب جديد', () => {
    const result = schema.safeParse({ ...base(), email: 'a@nqp.sd' });
    expect(result.success).toBe(true);
  });

  it('يرفض الاسم العربي الفارغ', () => {
    const result = schema.safeParse({ ...base(), fullNameAr: '', email: 'a@nqp.sd' });
    expect(result.success).toBe(false);
  });

  it('يرفض بريداً غير صالح', () => {
    const result = schema.safeParse({ ...base(), email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('يتطلب بريداً عند اختيار حساب جديد', () => {
    const result = schema.safeParse({ ...base(), email: '' });
    expect(result.success).toBe(false);
  });

  it('يرفض كلمة مرور أقصر من 8 أحرف', () => {
    const result = schema.safeParse({ ...base(), email: 'a@nqp.sd', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('يقبل كلمة مرور فارغة (تعيين لاحقاً)', () => {
    const result = schema.safeParse({ ...base(), email: 'a@nqp.sd', password: '' });
    expect(result.success).toBe(true);
  });

  it('يتطلب اختيار حساب عند نمط الربط', () => {
    const result = schema.safeParse({ ...base(), accountMode: 'existing', userId: '' });
    expect(result.success).toBe(false);
  });

  it('يقبل الربط بحساب موجود', () => {
    const result = schema.safeParse({
      ...base(),
      accountMode: 'existing',
      userId: '435c9204-9b2e-4c79-b75e-36989c515e91',
    });
    expect(result.success).toBe(true);
  });

  it('يرفض نهاية اختبار تسبق تاريخ التعيين', () => {
    const result = schema.safeParse({
      ...base(),
      email: 'a@nqp.sd',
      hireDate: '2026-06-01',
      probationEndDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('يرفض تاريخ ميلاد بعد تاريخ التعيين', () => {
    const result = schema.safeParse({
      ...base(),
      email: 'a@nqp.sd',
      hireDate: '2020-01-01',
      birthDate: '2021-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('يرفض جنساً خارج التعداد', () => {
    const result = schema.safeParse({ ...base(), email: 'a@nqp.sd', gender: 'X' });
    expect(result.success).toBe(false);
  });
});
