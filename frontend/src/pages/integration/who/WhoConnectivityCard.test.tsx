import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhoConnectivityCard, { buildEvidenceRows, WHO_STATE_LABELS } from './WhoConnectivityCard';
import type { WhoConnectionStatus, WhoConnectivityState } from '../../../types/who';
import { WHO_UNVERIFIED_STATES, isWhoVerified } from '../../../types/who';

/**
 * اختبارات بطاقة حالة WHO.
 *
 * القاعدة المحروسة: **لا يُعرض دليل إلا بدليل حقيقي من الـ backend**.
 * أي حقل غير مُرجَع يجب ألا يُخترع له سطر، وأي «نجاح» لا بد أن يكون
 * مبنياً على `verified_at` + `state`.
 */

const readyStatus: WhoConnectionStatus = {
  state: 'READY',
  configured: true,
  connected: true,
  verified: true,
  enabled: true,
  environment: 'PRODUCTION',
  verified_at: '2026-09-29T09:30:00Z',
  verified_endpoint: '/icd/entity',
  verified_http_status: 200,
  verified_latency_ms: 1124.1,
  oauth_verified: true,
  api_verified: true,
  api_version: 'v2',
  ihr_state: 'UNCONFIGURED',
  ihr_configured: false,
  verification_message: '',
};

const errorStatus: WhoConnectionStatus = {
  state: 'ERROR',
  configured: true,
  connected: false,
  verified: false,
  enabled: true,
  environment: 'SANDBOX',
  verified_at: '2026-09-29T09:31:00Z',
  verified_http_status: 401,
  oauth_verified: false,
  api_verified: false,
  ihr_state: 'UNCONFIGURED',
  ihr_configured: false,
  verification_message: 'رفضت WHO بيانات الاعتماد (HTTP 401).',
};

const configuredStatus: WhoConnectionStatus = {
  state: 'CONFIGURED',
  configured: true,
  connected: false,
  verified: false,
  enabled: true,
  environment: 'SANDBOX',
  verified_at: null,
  ihr_state: 'UNCONFIGURED',
  ihr_configured: false,
  verification_message: 'الإعدادات مكتملة — لم يُجرَ فحص شبكي بعد.',
};

const rowFor = (rows: ReturnType<typeof buildEvidenceRows>, label: string) =>
  rows.find((r) => r.label === label);

describe('isWhoVerified', () => {
  it('treats only READY as verified', () => {
    expect(isWhoVerified('READY')).toBe(true);
  });

  it('never treats an unconfigured state as verified', () => {
    for (const state of WHO_UNVERIFIED_STATES) {
      expect(isWhoVerified(state)).toBe(false);
    }
  });

  it('never treats ERROR as verified', () => {
    expect(isWhoVerified('ERROR')).toBe(false);
  });

  it('handles null and undefined', () => {
    expect(isWhoVerified(null)).toBe(false);
    expect(isWhoVerified(undefined)).toBe(false);
  });
});

describe('buildEvidenceRows — READY', () => {
  const rows = buildEvidenceRows(readyStatus);

  it('reports the verified state', () => {
    expect(rowFor(rows, 'الحالة')?.value).toBe(WHO_STATE_LABELS.READY);
    expect(rowFor(rows, 'الحالة')?.tone).toBe('success');
  });

  it('reports authentication and connection as verified', () => {
    expect(rowFor(rows, 'المصادقة (OAuth)')?.value).toBe('مُتحقَّق منها');
    expect(rowFor(rows, 'الاتصال')?.value).toBe('مُتحقَّق منه');
  });

  it('reports ICD-11 verified only because the backend said so', () => {
    expect(rowFor(rows, 'ICD-11')?.value).toBe('مُتحقَّق منه');
  });

  it('shows the verification timestamp, not a sync timestamp', () => {
    const row = rowFor(rows, 'آخر تحقّق');
    expect(row).toBeDefined();
    expect(row?.value).not.toBe('—');
  });

  it('shows HTTP status and latency backed by the check', () => {
    expect(rowFor(rows, 'رمز HTTP')?.value).toBe('200');
    expect(rowFor(rows, 'زمن الاستجابة')?.value).toBe('1124.1 ms');
  });

  it('shows the tested resource path', () => {
    expect(rowFor(rows, 'المورد المُختبَر')?.value).toBe('/icd/entity');
  });
});

describe('buildEvidenceRows — no fabricated evidence', () => {
  it('never shows DNS or TLS rows because the backend does not measure them', () => {
    for (const status of [readyStatus, errorStatus, configuredStatus]) {
      const rows = buildEvidenceRows(status);
      expect(rowFor(rows, 'DNS')).toBeUndefined();
      expect(rowFor(rows, 'TLS')).toBeUndefined();
    }
  });

  it('never shows IHR as verified', () => {
    for (const status of [readyStatus, errorStatus, configuredStatus]) {
      const row = rowFor(buildEvidenceRows(status), 'IHR');
      expect(row?.value).not.toContain('مُتحقَّق منه');
      expect(row?.tone).toBe('neutral');
    }
  });

  it('omits connection row when not verified', () => {
    expect(rowFor(buildEvidenceRows(configuredStatus), 'الاتصال')).toBeUndefined();
    expect(rowFor(buildEvidenceRows(errorStatus), 'الاتصال')).toBeUndefined();
  });

  it('omits auth row when the backend did not verify OAuth', () => {
    expect(rowFor(buildEvidenceRows(errorStatus), 'المصادقة (OAuth)')).toBeUndefined();
  });

  it('omits ICD-11 row when api_verified is false', () => {
    expect(rowFor(buildEvidenceRows(configuredStatus), 'ICD-11')).toBeUndefined();
  });

  it('omits timing and HTTP rows when there is no successful check', () => {
    const rows = buildEvidenceRows(configuredStatus);
    expect(rowFor(rows, 'رمز HTTP')).toBeUndefined();
    expect(rowFor(rows, 'زمن الاستجابة')).toBeUndefined();
  });

  it('shows HTTP status for a failed check because the backend reported it', () => {
    expect(rowFor(buildEvidenceRows(errorStatus), 'رمز HTTP')?.value).toBe('401');
  });

  it('returns no rows for a null status', () => {
    expect(buildEvidenceRows(null)).toEqual([]);
  });
});

describe('buildEvidenceRows — CONFIGURED is not connected', () => {
  it('labels CONFIGURED as configured but unverified', () => {
    const row = rowFor(buildEvidenceRows(configuredStatus), 'الحالة');
    expect(row?.value).toBe('مُعد — لم يُتحقق من الاتصال');
    expect(row?.tone).toBe('warning');
  });

  it('never says connected without a check', () => {
    expect(configuredStatus.connected).toBe(false);
    expect(configuredStatus.verified).toBe(false);
  });
});

describe('WhoConnectivityCard rendering — READY', () => {
  it('shows connected and ready', () => {
    render(<WhoConnectivityCard status={readyStatus} />);
    expect(screen.getByTestId('who-connectivity-card')).toBeTruthy();
    expect(screen.getAllByText(/متصل \/ جاهز/).length).toBeGreaterThan(0);
  });

  it('renders the evidence rows', () => {
    render(<WhoConnectivityCard status={readyStatus} />);
    expect(screen.getByTestId('evidence-المصادقة (OAuth)')).toBeTruthy();
    expect(screen.getByTestId('evidence-الاتصال')).toBeTruthy();
    expect(screen.getByTestId('evidence-ICD-11')).toBeTruthy();
    expect(screen.getByTestId('evidence-آخر تحقّق')).toBeTruthy();
  });

  it('does not render DNS or TLS evidence', () => {
    render(<WhoConnectivityCard status={readyStatus} />);
    expect(screen.queryByTestId('evidence-DNS')).toBeNull();
    expect(screen.queryByTestId('evidence-TLS')).toBeNull();
  });

  it('renders IHR as not verified', () => {
    render(<WhoConnectivityCard status={readyStatus} />);
    const ihr = screen.getByTestId('evidence-IHR');
    expect(ihr).toBeTruthy();
    expect(ihr.textContent).toContain('غير مُعد');
  });
});

describe('WhoConnectivityCard rendering — ERROR', () => {
  it('shows an error state and the backend message', () => {
    render(<WhoConnectivityCard status={errorStatus} />);
    expect(screen.getAllByText(/خطأ في الاتصال/).length).toBeGreaterThan(0);
    expect(screen.getByText(/رفضت WHO بيانات الاعتماد/)).toBeTruthy();
  });

  it('does not render a successful connection row', () => {
    render(<WhoConnectivityCard status={errorStatus} />);
    expect(screen.queryByTestId('evidence-الاتصال')).toBeNull();
  });

  it('does not render a verified ICD-11 row', () => {
    render(<WhoConnectivityCard status={errorStatus} />);
    expect(screen.queryByTestId('evidence-ICD-11')).toBeNull();
  });
});

describe('WhoConnectivityCard rendering — no check yet', () => {
  it('says no verification has been run', () => {
    render(<WhoConnectivityCard status={configuredStatus} />);
    expect(screen.getByText(/لم يُجرَ فحص تحقّق بعد/)).toBeTruthy();
  });

  it('does not claim a connection', () => {
    render(<WhoConnectivityCard status={configuredStatus} />);
    expect(screen.getAllByText(/مُعد — لم يُتحقق من الاتصال/).length).toBeGreaterThan(0);
  });
});

describe('WHO_STATE_LABELS', () => {
  it('labels every state', () => {
    const states: WhoConnectivityState[] = [
      'READY', 'ERROR', 'CONFIGURED', 'UNCONFIGURED', 'INVALID', 'DISABLED',
    ];
    for (const state of states) {
      expect(WHO_STATE_LABELS[state]).toBeTruthy();
    }
  });
});
