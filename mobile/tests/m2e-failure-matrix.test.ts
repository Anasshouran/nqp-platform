/**
 * M2-E Gate L — Failure Matrix (API-client/state level).
 * كل حالة فشل → معالجة آمنة بلا تسريب داخلي، بلا كسر غلاف.
 */
import { describe, expect, it } from '@jest/globals';
import { MobileProfileSchema } from '@afyatna/contracts';
import { ApiContractError, MobileApiClient } from '../src/api/client';
import { normalizeError } from '../src/services/errors';
import { createRepositories } from '../src/services/repositories';
import { errorMessageFor, t } from '../src/i18n';

function clientWith(status: number, body: string, headers = { 'Content-Type': 'application/json' }) {
  return new MobileApiClient({
    baseUrl: 'http://t',
    fetchImpl: (async () => new Response(body, { status, headers })) as unknown as typeof fetch,
    getAccessToken: () => 'tok',
  });
}

function envelope(code: string) {
  return JSON.stringify({
    status: 'error',
    data: null,
    message: { code, ar: 'رسالة عربية', en: 'English message' },
  });
}

describe('failure matrix', () => {
  it('network unavailable → transport error (httpStatus 0, offline-safe)', async () => {
    const c = new MobileApiClient({
      baseUrl: 'http://t',
      fetchImpl: (async () => {
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch,
      getAccessToken: () => 'tok',
    });
    await expect(c.request('GET', '/x/', { schema: MobileProfileSchema })).rejects.toMatchObject({
      httpStatus: 0,
      message_: { code: 'SERVER_ERROR' },
    });
  });

  it('401 → AUTH envelope', async () => {
    await expect(
      clientWith(401, envelope('AUTH_REQUIRED')).request('GET', '/x/', { schema: MobileProfileSchema }),
    ).rejects.toMatchObject({ httpStatus: 401, message_: { code: 'AUTH_REQUIRED' } });
  });

  it('403 → FORBIDDEN envelope', async () => {
    await expect(
      clientWith(403, envelope('FORBIDDEN')).request('GET', '/x/', { schema: MobileProfileSchema }),
    ).rejects.toMatchObject({ message_: { code: 'FORBIDDEN' } });
  });

  it('404 → NOT_FOUND envelope (no object data leak)', async () => {
    await expect(
      clientWith(404, envelope('NOT_FOUND')).request('GET', '/x/', { schema: MobileProfileSchema }),
    ).rejects.toMatchObject({ httpStatus: 404, message_: { code: 'NOT_FOUND' } });
  });

  it('429 → RATE_LIMITED envelope (bounded retry contract upstream)', async () => {
    await expect(
      clientWith(429, envelope('RATE_LIMITED')).request('GET', '/x/', { schema: MobileProfileSchema }),
    ).rejects.toMatchObject({ message_: { code: 'RATE_LIMITED' } });
  });

  it('500 → generic SERVER_ERROR, non-sensitive', async () => {
    await expect(
      clientWith(500, envelope('SERVER_ERROR')).request('GET', '/x/', { schema: MobileProfileSchema }),
    ).rejects.toBeInstanceOf(ApiContractError);
  });

  it('malformed response body → safe contract failure (no raw body preserved)', async () => {
    await expect(
      clientWith(200, '<html>Traceback ... internal</html>', {
        'Content-Type': 'text/html',
      }).request('GET', '/x/', { schema: MobileProfileSchema }),
    ).rejects.toMatchObject({ message_: { code: 'SERVER_ERROR' } });
  });

  it('raw DRF detail body (non-envelope) → normalized error, no detail preserved', async () => {
    try {
      await clientWith(500, JSON.stringify({ detail: 'SQL failure at /usr/lib/db' })).request(
        'GET',
        '/x/',
        { schema: MobileProfileSchema },
      );
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiContractError);
      const normalized = normalizeError(e);
      expect(normalized.code).toBe('SERVER_ERROR');
      expect(normalized.en.toLowerCase()).not.toContain('sql');
      expect(JSON.stringify(normalized)).not.toContain('/usr/lib');
    }
  });

  it('bilingual user messaging remains available for failures', () => {
    expect(errorMessageFor('ar', 'x', 'y')).toBe('x');
    expect(errorMessageFor('en', 'x', 'y')).toBe('y');
    expect(t('retry', 'ar')).toBe('إعادة المحاولة');
  });

  it('repositories surface deferred 501 as NOT_IMPLEMENTED (no fake data)', async () => {
    const repos = createRepositories(clientWith(501, envelope('NOT_IMPLEMENTED')));
    await expect(repos.profile.get()).rejects.toMatchObject({
      httpStatus: 501,
      message_: { code: 'NOT_IMPLEMENTED' },
    });
  });
});