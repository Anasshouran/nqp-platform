/**
 * client.ts — request interceptor behavior.
 *
 * The interceptor skips the Authorization header on GET reads of /public/
 * and /cms/ paths (to avoid 401 churn on public content), but attaches it
 * for writes and for authenticated paths.
 *
 * `axios-mock-adapter` is not a dependency, so a per-request custom adapter
 * captures the outgoing config instead.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AxiosHeaders, type AxiosAdapter } from 'axios';
import apiClient from '../client';

let capture: { authorization?: string };

const adapter: AxiosAdapter = async (config) => {
  capture.authorization = config.headers.Authorization as string | undefined;
  return {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  };
};

beforeEach(() => {
  capture = {};
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('client request interceptor — Authorization header', () => {
  it('attaches the header on authenticated paths', async () => {
    localStorage.setItem('access_token', 'tok');

    await apiClient.get('/trips/', { adapter });

    expect(capture.authorization).toBe('Bearer tok');
  });

  it('skips the header on GET /public/*', async () => {
    localStorage.setItem('access_token', 'tok');

    await apiClient.get('/public/diseases/', { adapter });

    expect(capture.authorization).toBeUndefined();
  });

  it('skips the header on GET /cms/*', async () => {
    localStorage.setItem('access_token', 'tok');

    await apiClient.get('/cms/news/', { adapter });

    expect(capture.authorization).toBeUndefined();
  });

  it('still attaches the header on POST /public/* (webpush subscribe)', async () => {
    localStorage.setItem('access_token', 'tok');

    await apiClient.post('/public/webpush/subscribe/', {}, { adapter });

    expect(capture.authorization).toBe('Bearer tok');
  });

  it('still attaches the header on POST /cms/* writes', async () => {
    localStorage.setItem('access_token', 'tok');

    await apiClient.post('/cms/news/', {}, { adapter });

    expect(capture.authorization).toBe('Bearer tok');
  });

  it('sends no header when there is no stored token', async () => {
    await apiClient.get('/trips/', { adapter });

    expect(capture.authorization).toBeUndefined();
  });
});
