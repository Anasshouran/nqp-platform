/**
 * M2-B — اختبارات المستودعات: تعيين M2-A للعقود، أخطاء موحدة، لا DTO مكرر.
 */
import { describe, expect, it } from '@jest/globals';
import { MobileApiClient, ApiContractError } from '../src/api/client';
import { createRepositories } from '../src/services/repositories';
import type { Repositories } from '../src/services/repositories';

function okJson(body: unknown): Response {
  return new Response(
    JSON.stringify({ status: 'success', data: body, message: null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function errJson(status: number, code: string): Response {
  return new Response(
    JSON.stringify({
      status: 'error',
      data: null,
      message: { code, ar: 'رسالة عربية', en: 'English message' },
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

const fetchAs = (impl: (url: string, init: RequestInit) => Promise<Response>) =>
  impl as unknown as typeof fetch;

describe('M2-A repositories map the contract faithfully', () => {
  const base = 'http://test';
  const clientFor = (handler: (url: string, init: RequestInit) => Promise<Response>) =>
    new MobileApiClient({ baseUrl: base, fetchImpl: fetchAs(handler), getAccessToken: () => 't' });

  it('profile.get returns typed profile', async () => {
    const client = clientFor(async () =>
      okJson({ id: '11111111-1111-4111-8111-111111111111', full_name: 'محمد', email: 'a@b.com', phone: '', national_id: '123', user_type: 'TRAVELER' }),
    );
    const repos = createRepositories(client);
    const profile = await repos.profile.get();
    expect(profile).toMatchObject({ full_name: 'محمد', user_type: 'TRAVELER' });
  });

  it('certificates list maps array; detail returns single', async () => {
    const cert = { id: '11111111-1111-4111-8111-111111111111', certificate_number: 'X', vaccine_name: 'V', issued_at: 'x', valid_until: 'y', status: 'ACTIVE' };
    const client = clientFor(async (url) => (url.includes('/c1/') ? okJson(cert) : okJson([cert])));
    const repos = createRepositories(client);
    await expect(repos.certificates.list()).resolves.toEqual([cert]);
    await expect(repos.certificates.detail('c1')).resolves.toEqual(cert);
  });

  it('notifications markRead returns updated', async () => {
    const client = clientFor(async () =>
      okJson({ id: '11111111-1111-4111-8111-111111111111', channel: 'push', status: 'sent', subject: 's', is_read: true, read_at: 'r', sent_at: null, created_at: 'c' }),
    );
    const repos = createRepositories(client);
    await expect(repos.notifications.markRead('n1')).resolves.toMatchObject({ is_read: true });
  });

  it('sync.status returns server meta', async () => {
    const client = clientFor(async () =>
      okJson({ last_synced_at: null, pending_count: 0, server_time: '2026-10-08T00:00:00Z', contract_version: 'v1', unread_notifications: 2 }),
    );
    const repos = createRepositories(client);
    expect((await repos.sync.status()).unread_notifications).toBe(2);
  });

  it('trips stays explicitly deferred (no invented data)', async () => {
    const client = clientFor(async () => okJson([]));
    const repos = createRepositories(client);
    await expect(repos.trips.list()).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});

describe('error normalization is safe and bilingual', () => {
  it('maps HTTP 401 envelope to ApiContractError without internals', async () => {
    const client = new MobileApiClient({
      baseUrl: 'http://test',
      fetchImpl: fetchAs(async () => errJson(401, 'AUTH_REQUIRED')),
      getAccessToken: () => 't',
    });
    const repos: Repositories = createRepositories(client);
    await expect(repos.profile.get()).rejects.toBeInstanceOf(ApiContractError);
    await expect(repos.profile.get()).rejects.toMatchObject({
      httpStatus: 401,
      message_: { code: 'AUTH_REQUIRED', ar: 'رسالة عربية' },
    });
  });

  it('network failure surfaces as transport error (no stack/url leakage in UI path)', async () => {
    const client = new MobileApiClient({
      baseUrl: 'http://test',
      fetchImpl: fetchAs(async () => {
        throw new TypeError('Network request failed');
      }),
    });
    const repos = createRepositories(client);
    await expect(repos.profile.get()).rejects.toBeInstanceOf(ApiContractError);
  });
});