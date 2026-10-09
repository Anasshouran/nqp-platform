/**
 * اختبارات حراسة رابط API (M3-0, G3):
 * - تسمح بروابط http/محلية في وضع التطوير (تحذير فقط).
 * - ترفض أي رابط غير آمن/محلي/مشبوه/غير مطلق في الإصدار.
 * لا تُطبع قيمة الرابط في أي خطأ — فقط اسم المتغير والسبب.
 */
import { resolveApiUrl } from '../src/config';

describe('API URL guard — development mode (allow + warn only)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows http://localhost in dev', () => {
    expect(resolveApiUrl('http://localhost:8000/api/v1', true)).toBe('http://localhost:8000/api/v1');
  });

  it('allows http://10.0.2.2 in dev', () => {
    expect(resolveApiUrl('http://10.0.2.2:8000/api/v1', true)).toBe('http://10.0.2.2:8000/api/v1');
  });

  it('keeps dev fallback when unset', () => {
    expect(resolveApiUrl(undefined, true)).toBe('http://localhost:8000/api/v1');
  });
});

describe('API URL guard — release mode (reject unsafe values)', () => {
  const expectRejected = (value: string | null | undefined, reason: string) => {
    expect(() => resolveApiUrl(value, false)).toThrow('EXPO_PUBLIC_API_URL');
    expect(() => resolveApiUrl(value, false)).toThrow(reason);
  };

  it('accepts a valid absolute https URL', () => {
    expect(resolveApiUrl('https://api.nqp.gov.sd/api/v1', false)).toBe('https://api.nqp.gov.sd/api/v1');
  });

  it('rejects plain http', () => {
    expectRejected('http://api.nqp.gov.sd/api/v1', 'INSECURE_HTTP');
  });

  it('rejects http://localhost', () => {
    expectRejected('http://localhost:8000/api/v1', 'LOCALHOST');
  });

  it('rejects http://10.0.2.2', () => {
    expectRejected('http://10.0.2.2:8000/api/v1', 'LOCALHOST');
  });

  it('rejects https://10.0.2.2 too', () => {
    expectRejected('https://10.0.2.2/api/v1', 'LOCALHOST');
  });

  it('rejects empty string', () => {
    expectRejected('', 'MISSING');
  });

  it('rejects undefined', () => {
    expectRejected(undefined, 'MISSING');
  });

  it('rejects the EAS placeholder', () => {
    expectRejected('__SET_VIA_CLI_OR_DASHBOARD__', 'PLACEHOLDER');
  });

  it('rejects a non-URL string', () => {
    expectRejected('not-a-url', 'INVALID_URL');
  });

  it('never leaks the URL value in any error', () => {
    let message = '';
    let thrown = false;
    try {
      resolveApiUrl('http://localhost:8000/api/v1', false);
    } catch (error) {
      thrown = true;
      message = (error as Error).message;
    }
    expect(thrown).toBe(true);
    expect(message).not.toContain('localhost:8000');
    expect(message).not.toContain('10.0.2.2');
  });
});