/**
 * تطابق العقد عبر اللغات: مسارات TS والتصنيفات تطابق لقطة الخادم المعتمدة.
 * يقرأ لقطة OpenAPI المُثبَّتة من باكند (مرجع الطرف الخادمي).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CLASSIFICATION_LEVELS,
  ERROR_CODES,
  MOBILE_API_PATHS,
  MOBILE_FIELD_CLASSIFICATION,
  MOBILE_FORBIDDEN_FIELDS,
} from '@afyatna/contracts';

const SNAPSHOT = resolve(__dirname, '../../backend/apps/mobile_api/tests/snapshots/mobile_v1.json');

interface MobileSnapshot {
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, { properties?: Record<string, unknown> }>;
}

function loadSnapshot(): MobileSnapshot {
  return JSON.parse(readFileSync(SNAPSHOT, 'utf-8')) as MobileSnapshot;
}

describe('TS contract mirrors backend snapshot', () => {
  const snapshot = loadSnapshot();

  it('every TS path exists in the backend OpenAPI snapshot', () => {
    const tsPaths = [
      MOBILE_API_PATHS.authLogin,
      MOBILE_API_PATHS.authRefresh,
      MOBILE_API_PATHS.profile,
      MOBILE_API_PATHS.trips,
      MOBILE_API_PATHS.requirements,
      MOBILE_API_PATHS.certificates,
      MOBILE_API_PATHS.declarations,
      MOBILE_API_PATHS.notifications,
      '/api/v1/mobile/notifications/{id}/read/',
      MOBILE_API_PATHS.syncStatus,
      // مسارات التفاصيل بصيغة OpenAPI {id}
      '/api/v1/mobile/trips/{id}/',
      '/api/v1/mobile/certificates/{id}/',
    ];
    for (const path of tsPaths) {
      if (!(path in snapshot.paths)) {
        throw new Error(`missing in backend snapshot: ${path}`);
      }
    }
  });

  it('classification map fields exist in snapshot components', () => {
    for (const [key, level] of Object.entries(MOBILE_FIELD_CLASSIFICATION)) {
      const [component, field] = key.split('.');
      expect(CLASSIFICATION_LEVELS).toContain(level);
      const spec = snapshot.components[component!];
      if (!spec) throw new Error(`component missing in snapshot: ${component}`);
      if (!spec.properties || !(field! in spec.properties)) {
        throw new Error(`${key} missing in snapshot`);
      }
    }
  });

  it('error codes cover the backend envelope codes used by the app', () => {
    expect(ERROR_CODES).toContain('AUTH_REQUIRED');
    expect(ERROR_CODES).toContain('NOT_IMPLEMENTED');
    expect(ERROR_CODES.length).toBeGreaterThanOrEqual(8);
  });
});

describe('M2-E Gate B/E — client/server forbidden-set sync', () => {
  it('MOBILE_FORBIDDEN_FIELDS matches backend classification.py exactly', () => {
    const pyPath = resolve(
      __dirname,
      '../../backend/apps/mobile_api/classification.py',
    );
    const py = readFileSync(pyPath, 'utf-8');
    const block = py.slice(py.indexOf('MOBILE_FORBIDDEN_FIELDS'));
    const pyKeys = new Set(
      [...block.slice(0, block.indexOf('})')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1] as string),
    );
    const clientKeys = MOBILE_FORBIDDEN_FIELDS;
    const missingOnClient = [...pyKeys].filter((k) => !clientKeys.has(k));
    const missingOnServer = [...clientKeys].filter((k) => !pyKeys.has(k));
    expect(missingOnClient).toEqual([]);
    expect(missingOnServer).toEqual([]);
  });
});
