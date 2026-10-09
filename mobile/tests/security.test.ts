/**
 * اختبارات أمن التطبيق — الإثبات المطلوب صراحةً (§18):
 *     SENSITIVE_HEALTH -> SCRUBBED
 * قبل مغادرة التطبيق، مع التحقق من الحقول الممنوعة ومسار التلمترية.
 */
import {
  SCRUBBED,
  isScrubbedField,
  levelOfField,
  scrub,
} from '../src/security/scrub';
import { SECURITY_CONTROLS, controlStatus } from '../src/security/status';
import { Telemetry, createEvent } from '../src/utils/telemetry';

describe('scrubbing boundary: SENSITIVE_HEALTH -> SCRUBBED', () => {
  it('scrubs classified sensitive-health fields', () => {
    expect(levelOfField('vaccine_name')).toBe('SENSITIVE_HEALTH');
    expect(levelOfField('status')).toBe('SENSITIVE_HEALTH'); // certificate/declaration status
    const out = scrub({
      vaccine_name: 'طاعون',
      status: 'valid',
      certificate_number: 'VAC-9',
    });
    expect(out.vaccine_name).toBe(SCRUBBED);
    expect(out.status).toBe(SCRUBBED);
    expect(out.certificate_number).toBe(SCRUBBED); // SECURITY_SENSITIVE
  });

  it('scrubs security-sensitive credential fields', () => {
    expect(levelOfField('access_token')).toBe('SECURITY_SENSITIVE');
    const out = scrub({ access_token: 'eyJhbGciOi...', expires_in: 1800 });
    expect(out.access_token).toBe(SCRUBBED);
    expect(out.expires_in).toBe(1800); // PUBLIC يبقى
  });

  it('drops forbidden internal fields entirely', () => {
    const out = scrub({ risk_score: 87, kill_switch: true, ok: 1 }) as Record<string, unknown>;
    expect('risk_score' in out).toBe(false);
    expect('kill_switch' in out).toBe(false);
    expect(out.ok).toBe(1);
  });

  it('scrubs nested objects and arrays', () => {
    const out = scrub({
      items: [{ vaccine_name: 'شلل أطفال' }, { vaccine_name: 'أنفلونزا' }],
      meta: { password: 'x', id: 1 },
    });
    expect(out.items.every((i: { vaccine_name: string }) => i.vaccine_name === SCRUBBED)).toBe(true);
    expect('password' in out.meta).toBe(false);
    expect(out.meta.id).toBe(1);
  });

  it('classifies unclassified fields as keep (سجل الحقول هو مصدر الحقيقة)', () => {
    expect(isScrubbedField('some_new_field')).toBe(false);
    expect(levelOfField('some_new_field')).toBe('UNCLASSIFIED');
  });
});

describe('telemetry never emits raw sensitive payloads', () => {
  it('createEvent scrubs props before the event exists', () => {
    const event = createEvent('declaration_submission', {
      symptom: 'حمى',
      duration_ms: 420,
    });
    // symptom ليس في السجل → يبقى، لكن أي حقل مسجَّل حسّاس يُكشط
    expect(event.props.duration_ms).toBe(420);
    const event2 = createEvent('app_error', { vaccine_name: 'طاعون' });
    expect(event2.props.vaccine_name).toBe(SCRUBBED);
  });

  it('Telemetry transport only ever sees scrubbed events', async () => {
    const seen: unknown[] = [];
    const telemetry = new Telemetry((event) => {
      seen.push(event);
    });
    await telemetry.emit('app_error', { access_token: 'secret', certificate_number: 'C-1' });
    expect(seen).toHaveLength(1);
    const payload = JSON.stringify(seen[0]);
    expect(payload).not.toContain('secret');
    expect(payload).toContain(SCRUBBED);
  });

  it('measures api latency and records failure codes without leaking', async () => {
    const seen: Record<string, unknown>[] = [];
    const telemetry = new Telemetry((e) => {
      seen.push(e.props as Record<string, unknown>);
    });
    await telemetry.measureApiLatency('/api/v1/mobile/trips/', async () => 1);
    await expect(
      telemetry.measureApiLatency('/api/v1/mobile/profile/', async () => {
        const err = new Error('boom') as Error & { message_?: { code: string } };
        err.message_ = { code: 'FORBIDDEN' };
        throw err;
      }),
    ).rejects.toThrow('boom');
    expect(seen[0]).toMatchObject({ path: '/api/v1/mobile/trips/' });
    expect(seen[1]).toMatchObject({ failed: true, error_code: 'FORBIDDEN' });
  });
});

describe('security control status registry is honest', () => {
  it('reports the M3-0 CONFIRMED states without overclaiming', () => {
    expect(controlStatus('log-scrubbing')).toBe('IMPLEMENTED');
    expect(controlStatus('token-storage')).toBe('IMPLEMENTED');
    expect(controlStatus('qr-signature-verification')).toBe('IMPLEMENTED');
    expect(controlStatus('certificate-pinning')).toBe('SCAFFOLDED');
    expect(controlStatus('device-risk-signals')).toBe('NOT STARTED');
    const implemented = SECURITY_CONTROLS.filter((c) => c.status === 'IMPLEMENTED');
    expect(implemented.map((c) => c.id)).toEqual([
      'token-storage',
      'qr-signature-verification',
      'log-scrubbing',
    ]);
  });
});

describe('M2-D2 — sensitive identifiers are never emitted by telemetry', () => {
  it('passport number is dropped from any outgoing payload', () => {
    const out = scrub({ passport_number: 'SD123456', ok: 1 }) as Record<string, unknown>;
    expect('passport_number' in out).toBe(false);
    expect(out.ok).toBe(1);
  });

  it('medical history / declaration contents are never transmissible', () => {
    const out = scrub({
      medical_history: { diabetes: true },
      health_declaration: { symptoms: ['x'] },
      passport_hash: 'abc',
    }) as Record<string, unknown>;
    expect('medical_history' in out).toBe(false);
    expect('health_declaration' in out).toBe(false);
    expect('passport_hash' in out).toBe(false);
  });

  it('verification private material is redacted', () => {
    const out = scrub({
      verification_signature: 's3cr3t',
      qr_token: 'tok',
      certificate_signature: 'sig',
    }) as Record<string, unknown>;
    expect('verification_signature' in out).toBe(false);
    expect('qr_token' in out).toBe(false);
    expect('certificate_signature' in out).toBe(false);
  });

  it('authorization header values are never logged', () => {
    const out = scrub({ authorization: 'Bearer eyJ…', ok: true }) as Record<string, unknown>;
    expect('authorization' in out).toBe(false);
  });
});