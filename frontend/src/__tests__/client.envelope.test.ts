/**
 * F5 — the API envelope can report a business/authorization failure with
 * HTTP 200. The response interceptor must reject those instead of letting
 * callers read `data` as a success (preview previously rendered 0).
 *
 * `axios-mock-adapter` is not a dependency; use a per-request AxiosAdapter
 * like the existing client.test.ts does.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AxiosHeaders, type AxiosAdapter } from 'axios';
import apiClient from '../api/client';

const adapterFor = (data: unknown): AxiosAdapter => async (config) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders(),
  config,
});

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('F5 — envelope error interceptor', () => {
  it('rejects when status=error even on HTTP 200', async () => {
    await expect(
      apiClient.get('/finance/reports/matrix/', {
        adapter: adapterFor({ status: 'error', message: 'لا تملك صلاحية المطابقات المالية' }),
      }),
    ).rejects.toThrow('لا تملك صلاحية المطابقات المالية');
  });

  it('passes through when status=ok', async () => {
    const response = await apiClient.get('/finance/reports/matrix/', {
      adapter: adapterFor({ status: 'ok', data: { system_total: 5 } }),
    });
    expect(response.data.status).toBe('ok');
    expect(response.data.data.system_total).toBe(5);
  });
});
