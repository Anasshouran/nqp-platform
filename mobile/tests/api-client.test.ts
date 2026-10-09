/**
 * M1.5 (جانب العميل) — العميل يرفض ما خارج الغلاف المعتمد §11،
 * ويتعامل مع الأخطاء ثنائية اللغة بلا تسرّب داخلي.
 */
import { MobileApiClient, ApiContractError } from '../src/api/client';
import { z } from 'zod';

const okTrips = z.array(z.object({ id: z.string() }));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeClient(handler: ReturnType<typeof jest.fn>) {
  return new MobileApiClient({
    baseUrl: 'http://test',
    fetchImpl: handler as unknown as typeof fetch,
    getAccessToken: () => 'token-1',
  });
}

describe('mobile api client envelope discipline', () => {
  it('returns data from a valid success envelope', async () => {
    const handler = jest.fn(async () =>
      jsonResponse({ status: 'success', data: [{ id: '1' }], message: null }),
    );
    const client = makeClient(handler);
    const data = await client.request('GET', '/api/v1/mobile/trips/', { schema: okTrips });
    expect(data).toEqual([{ id: '1' }]);
    const [, init] = handler.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
  });

  it('throws bilingual ApiContractError on approved error envelope', async () => {
    const handler = jest.fn(async () =>
      jsonResponse(
        {
          status: 'error',
          data: null,
          message: { code: 'AUTH_REQUIRED', ar: 'يجب تسجيل الدخول', en: 'Authentication required' },
        },
        401,
      ),
    );
    const client = makeClient(handler);
    await expect(
      client.request('GET', '/api/v1/mobile/profile/', { schema: okTrips }),
    ).rejects.toMatchObject({
      httpStatus: 401,
      message_: { code: 'AUTH_REQUIRED', ar: 'يجب تسجيل الدخول' },
    });
  });

  it('rejects a payload outside the envelope contract', async () => {
    const handler = jest.fn(async () => jsonResponse({ detail: 'raw DRF error' }, 500));
    const client = makeClient(handler);
    await expect(
      client.request('GET', '/api/v1/mobile/profile/', { schema: okTrips }),
    ).rejects.toBeInstanceOf(ApiContractError);
  });

  it('fails locally with AUTH_REQUIRED when no token', async () => {
    const handler = jest.fn(async () => jsonResponse({}));
    const client = new MobileApiClient({
      baseUrl: 'http://test',
      fetchImpl: handler as unknown as typeof fetch,
      getAccessToken: () => null,
    });
    await expect(
      client.request('GET', '/api/v1/mobile/profile/', { schema: okTrips }),
    ).rejects.toMatchObject({ message_: { code: 'AUTH_REQUIRED' } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes idempotency key header when provided', async () => {
    const handler = jest.fn(async () => jsonResponse({ status: 'error', data: null, message: { code: 'NOT_IMPLEMENTED', ar: 'x', en: 'y' } }, 501));
    const client = makeClient(handler);
    await expect(
      client.request('POST', '/api/v1/mobile/declarations/', {
        schema: okTrips,
        idempotencyKey: 'abc-123',
      }),
    ).rejects.toMatchObject({ httpStatus: 501 });
    const [, init] = handler.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('abc-123');
  });
});
