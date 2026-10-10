import { describe, expect, it } from 'vitest';
import { sanitizeNextPath } from './navigation';

describe('sanitizeNextPath — تنظيف ?next= بعد تسجيل الدخول', () => {
  it('يقبل المسار الداخلي البسيط', () => {
    expect(sanitizeNextPath('/app/users')).toBe('/app/users');
    expect(sanitizeNextPath('/app')).toBe('/app');
  });

  it('يقبل مساراً بأسئلة أو مُرساة', () => {
    expect(sanitizeNextPath('/app/travelers?tab=flights')).toBe('/app/travelers?tab=flights');
    expect(sanitizeNextPath('/app/airport-director#flights')).toBe('/app/airport-director#flights');
  });

  it('يرفض الروابط الخارجية وبادئات البروتوكول', () => {
    expect(sanitizeNextPath('//evil.example/app')).toBeNull();
    expect(sanitizeNextPath('https://evil.example/app')).toBeNull();
    expect(sanitizeNextPath('http://evil.example/app')).toBeNull();
    expect(sanitizeNextPath('/\\evil.example')).toBeNull();
  });

  it('يرفض المسارات النسبية', () => {
    expect(sanitizeNextPath('app/users')).toBeNull();
    expect(sanitizeNextPath('')).toBeNull();
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath(undefined)).toBeNull();
  });

  it('يرفض مسارات الدخول حتى لا ينشأ توجيه دائري مع /login', () => {
    expect(sanitizeNextPath('/login')).toBeNull();
    expect(sanitizeNextPath('/login?next=/app')).toBeNull();
    expect(sanitizeNextPath('/forgot-password')).toBeNull();
    expect(sanitizeNextPath('/reset-password')).toBeNull();
  });

  it('يرفض قفز المسارات ..', () => {
    expect(sanitizeNextPath('/app/../../etc/passwd')).toBeNull();
    expect(sanitizeNextPath('/../login')).toBeNull();
  });

  it('يقصّ المسافة المحيطة قبل التقييم', () => {
    expect(sanitizeNextPath('  /app/users  ')).toBe('/app/users');
  });
});
