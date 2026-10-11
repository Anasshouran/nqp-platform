/**
 * Regression: API_BASE_URL at module load must derive from
 * process.env.EXPO_PUBLIC_API_URL. The previous version called
 * resolveApiUrl() with no argument, silently ignoring the env var
 * and throwing at module load in release builds.
 */

describe('config module-load call-site', () => {
  const KEY = 'EXPO_PUBLIC_API_URL';
  const original = process.env[KEY];
  const globalRef = globalThis as unknown as { __DEV__?: boolean };
  const originalDev = globalRef.__DEV__;

  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
    globalRef.__DEV__ = originalDev;
    jest.resetModules();
  });

  it('derives API_BASE_URL from EXPO_PUBLIC_API_URL', () => {
    process.env[KEY] = 'https://staging.example.com/api/v1';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require('../src/config');
    expect(cfg.API_BASE_URL).toBe('https://staging.example.com/api/v1');
  });

  it('rejects placeholder / missing in release', () => {
    globalRef.__DEV__ = false;
    process.env[KEY] = '__SET_VIA_CLI_OR_DASHBOARD__';
    jest.resetModules();
    expect(() => require('../src/config')).toThrow(/EXPO_PUBLIC_API_URL/);
  });
});
