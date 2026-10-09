/**
 * M1.7 — اختبارات تجريد المزوّد: SUDAPASS محجوب، لا انتحال، حد المسافر فقط.
 */
import { AuthProviderBlockedError, SudapassAuthProvider } from '../src/auth/provider';
import { assertTravelerProvider } from '../src/auth/session';
import { PasswordAuthProvider } from '../src/auth/passwordProvider';
import { MobileApiClient } from '../src/api/client';

describe('SUDAPASS provider is a blocked seam (D-P0-1 BLOCKED)', () => {
  it('throws BLOCKED on login — never fakes an identity', async () => {
    const provider = new SudapassAuthProvider();
    await expect(provider.login({})).rejects.toBeInstanceOf(AuthProviderBlockedError);
    await expect(provider.login({})).rejects.toMatchObject({
      reason: 'SUDAPASS_IMPLEMENTATION',
    });
  });

  it('throws BLOCKED on refresh', async () => {
    const provider = new SudapassAuthProvider();
    const session = {
      accessToken: 'x',
      expiresAt: Date.now(),
      userId: 'u',
      provider: 'sudapass' as const,
    };
    await expect(provider.refresh(session)).rejects.toMatchObject({
      reason: 'SUDAPASS_IMPLEMENTATION',
    });
  });

  it('logout is safe without network', async () => {
    const session = {
      accessToken: 'x',
      expiresAt: Date.now(),
      userId: 'u',
      provider: 'sudapass' as const,
    };
    await expect(new SudapassAuthProvider().logout(session)).resolves.toBeUndefined();
  });
});

describe('traveler-only provider boundary (§1.1)', () => {
  it('accepts traveler providers', () => {
    expect(() => assertTravelerProvider('password')).not.toThrow();
    expect(() => assertTravelerProvider('sudapass')).not.toThrow();
  });

  it('rejects institutional/internal providers', () => {
    expect(() => assertTravelerProvider('employee')).toThrow(/traveler-identity-only/);
    expect(() => assertTravelerProvider('carrier')).toThrow(/traveler-identity-only/);
    expect(() => assertTravelerProvider('eoc')).toThrow(/traveler-identity-only/);
  });
});

describe('interim password provider talks to the real existing endpoint', () => {
  const api = new MobileApiClient({
    baseUrl: 'http://localhost',
    fetchImpl: jest.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            access_token: 'at',
            refresh_token: 'rt',
            expires_in: 1800,
            user: { id: 'u1' },
          },
          message: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch,
  });

  it('logs in and maps expiry', async () => {
    const provider = new PasswordAuthProvider(api);
    const before = Date.now();
    const session = await provider.login({ identifier: 'a@b.c', password: 'x' });
    expect(session.accessToken).toBe('at');
    expect(session.provider).toBe('password');
    expect(session.expiresAt).toBeGreaterThanOrEqual(before + 1800 * 1000);
  });

  it('fails validation locally without network call', async () => {
    const provider = new PasswordAuthProvider(api);
    await expect(provider.login({})).rejects.toMatchObject({ message_: { code: 'VALIDATION_ERROR' } });
  });
});
