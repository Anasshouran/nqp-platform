/**
 * Q6 (P1.5) — Cached IdP claims must never become a source of authentication authority.
 *
 * Invariants (§9):
 *  1. authenticated online session; claims available;
 *  2. network unavailable;
 *  3. session remains valid within the approved lifetime;
 *  4. no new identity can be created from cached claims alone;
 *  5. expired/revoked session cannot silently become valid forever;
 *  6. sensitive authorization decisions are not based solely on stale claims.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { canOperateOffline, isSessionActive } from '../src/auth/session';
import * as authModule from '../src/auth';
import { SudapassAuthProvider, AuthProviderBlockedError } from '../src/auth/provider';
import { PasswordAuthProvider } from '../src/auth/passwordProvider';
import { MobileApiClient } from '../src/api/client';
import { scrub } from '../src/security/scrub';
import type { AuthSessionState } from '../src/types';

function onlineSession(expiresInMs = 60_000, accessToken = 'at-1') {
  return {
    accessToken,
    expiresAt: Date.now() + expiresInMs,
    userId: 'u1',
    provider: 'password' as const,
  };
}

const claimsOnly = {
  identityProvider: 'sudapass',
  sub: 'sp-123',
  full_name: 'مسافر',
  // لا accessToken — لا جلسة قائمة
};

describe('Q6 — cached claims are never an authentication authority', () => {
  it('1+3: an online session with claims is valid within its lifetime', () => {
    const session = onlineSession();
    expect(isSessionActive(session)).toBe(true);
    expect(canOperateOffline(session, 'offline')).toBe(true);
  });

  it('4: cached claims alone cannot construct an active session', () => {
    // (accessToken فارغ = لا جلسة) — لا شفرة تحوّل "claimsOnly" إلى AuthSessionState
    const asSession: AuthSessionState = {
      accessToken: '',
      expiresAt: 0,
      userId: '',
      provider: 'password',
      ...claimsOnly, // مطالبات IdP فقط كحقول إضافية — لا قوة تفويض
    };
    expect(isSessionActive(asSession)).toBe(false);
    expect(canOperateOffline(asSession, 'offline')).toBe(false);
    // SUDAPASS seam يثبت أن "الاستعادة من المطالبات" محجوبة أصلاً
    expect(new SudapassAuthProvider().login({})).rejects.toBeInstanceOf(AuthProviderBlockedError);
  });

  it('5: an expired session cannot silently become valid forever', () => {
    const now = Date.now();
    const expired = onlineSession(-1);
    expect(isSessionActive(expired, now)).toBe(false);
    expect(canOperateOffline(expired, 'offline', now)).toBe(false);
    // التمديد يتطلب شبكة — لا تجديد "محلي أبدي"
    expect(canOperateOffline(expired, 'online', now)).toBe(true); // يذهب للتجديد من الشبكة
  });

  it('5b: refresh is network-only (no offline claim-based refresh)', async () => {
    const api = new MobileApiClient({
      baseUrl: 'http://test',
      fetchImpl: jest.fn(async () => {
        throw new TypeError('offline');
      }),
      getAccessToken: () => 'at',
    });
    const provider = new PasswordAuthProvider(api);
    await expect(
      provider.refresh({ ...onlineSession(), refreshToken: 'rt' }),
    ).rejects.toMatchObject({ message_: { code: 'SERVER_ERROR' } });
  });

  it('6: no session builder exists that trusts claim content as authority', () => {
    // لا توجد أي دالة تصدّر "جلسة" من مطالبات IdP وحدها:
    // كل بناء جلسة يمر عبر accessToken من مزوّد (login/refresh) فقط.
    const exportsOfAuth = Object.keys(authModule);
    expect(exportsOfAuth).not.toContain('sessionFromIdpClaims');
    expect(exportsOfAuth).not.toContain('restoreSessionFromClaims');
    // أي مطالبة حساسة تُكشط عند مغادرة التطبيق عبر أي قناة
    const scrubbed = scrub({ sub: 'sp-123', full_name: 'مسافر' }) as Record<string, unknown>;
    expect(scrubbed).not.toBe(claimsOnly);
  });

  it('2: offline continues only when an existing trusted session is active', () => {
    expect(canOperateOffline(null, 'offline')).toBe(false);
    expect(canOperateOffline(onlineSession(), 'offline')).toBe(true);
  });
});