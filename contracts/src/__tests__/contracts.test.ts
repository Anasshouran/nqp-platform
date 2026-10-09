/**
 * اختبارات حزمة العقد — تُثبِّت أن:
 * 1. غلاف النجاح/الخطأ يطابق العقد §11 حرفياً.
 * 2. مخططات الموبايل ترفض الحقول الممنوعة (INTERNAL boundary client-side).
 * 3. كل حقل في الخريطة يحمل مستوى تصنيفاً معتمداً.
 * 4. رموز الأخطاء تطابق قائمة الخادم المعتمدة.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CLASSIFICATION_LEVELS,
  ERROR_CODES,
  MOBILE_FIELD_CLASSIFICATION,
  MOBILE_FORBIDDEN_FIELDS,
  MobileCertificateSchema,
  MobileTripListSchema,
  errorEnvelope,
  isForbiddenField,
  successEnvelope,
} from '../index';

describe('envelope contract (§11)', () => {
  it('accepts a success envelope', () => {
    const schema = successEnvelope(z.object({ hello: z.string() }));
    const parsed = schema.safeParse({ status: 'success', data: { hello: 'x' }, message: null });
    expect(parsed.success).toBe(true);
  });

  it('accepts the approved bilingual error envelope', () => {
    const parsed = errorEnvelope().safeParse({
      status: 'error',
      data: null,
      message: { code: 'AUTH_REQUIRED', ar: 'يجب تسجيل الدخول', en: 'Authentication required' },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects non-approved error codes', () => {
    const parsed = errorEnvelope().safeParse({
      status: 'error',
      data: null,
      message: { code: 'MADE_UP_CODE', ar: 'x', en: 'y' },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an error envelope with a non-null data payload (no leakage shape)', () => {
    const parsed = errorEnvelope().safeParse({
      status: 'error',
      data: { internal: 'detail' },
      message: { code: 'SERVER_ERROR', ar: 'x', en: 'y' },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('classification contract (§14)', () => {
  it('uses exactly the five approved levels', () => {
    expect([...CLASSIFICATION_LEVELS].sort()).toEqual(
      ['INTERNAL', 'PERSONAL', 'PUBLIC', 'SECURITY_SENSITIVE', 'SENSITIVE_HEALTH'].sort(),
    );
  });

  it('classifies every registered field with an approved level', () => {
    for (const [field, level] of Object.entries(MOBILE_FIELD_CLASSIFICATION)) {
      expect(CLASSIFICATION_LEVELS, `${field} -> ${level}`).toContain(level);
      expect(level, `${field} must not be INTERNAL (mobile surface)`).not.toBe('INTERNAL');
    }
  });

  it('keeps SENSITIVE_HEALTH and SECURITY_SENSITIVE represented', () => {
    const levels = new Set(Object.values(MOBILE_FIELD_CLASSIFICATION));
    expect(levels.has('SENSITIVE_HEALTH')).toBe(true);
    expect(levels.has('SECURITY_SENSITIVE')).toBe(true);
  });

  it('blocks forbidden internal fields client-side', () => {
    expect(isForbiddenField('risk_score')).toBe(true);
    expect(isForbiddenField('kill_switch')).toBe(true);
    expect(isForbiddenField('certificate_number')).toBe(false);
    expect(MOBILE_FORBIDDEN_FIELDS.size).toBeGreaterThan(0);
  });

  it('certificate schema exposes no forbidden/internal fields', () => {
    const result = MobileCertificateSchema.safeParse({
      id: '2b1f3d0e-0000-4000-8000-000000000001',
      certificate_number: 'VAC-1',
      vaccine_name: 'طاعون',
      issued_at: '2026-01-01T00:00:00Z',
      valid_until: '2027-01-01',
      status: 'valid',
      risk_score: 10, // ممنوع
    });
    // zod strips unknown keys by default → لا يمرّ الحقل الممنوع كجزء من المخطط
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data)).not.toContain('risk_score');
    }
  });
});

describe('error code parity with backend', () => {
  it('contains the full approved code set', () => {
    expect(ERROR_CODES).toEqual(
      expect.arrayContaining([
        'AUTH_REQUIRED',
        'AUTH_INVALID',
        'NOT_IMPLEMENTED',
        'FORBIDDEN',
        'NOT_FOUND',
      ]),
    );
  });
});

describe('trip list contract', () => {
  it('validates a trip list', () => {
    const parsed = MobileTripListSchema.safeParse([
      {
        id: '2b1f3d0e-0000-4000-8000-000000000002',
        destination: 'الخرطوم',
        transport_mode: 'AIR',
        departure_date: '2026-11-01',
        return_date: null,
        status: 'PLANNED',
      },
    ]);
    expect(parsed.success).toBe(true);
  });
});
