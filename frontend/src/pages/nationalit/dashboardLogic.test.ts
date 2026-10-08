import { describe, it, expect } from 'vitest';
import {
  selectDegraded,
  selectBusiest,
  toSparkPoints,
  countByStatus,
  healthVerdict,
  type SystemLike,
} from './dashboardLogic';
import { formatNumber } from '../../utils/formatters';

const sys = (id: string, status: SystemLike['status'], request_count: number): SystemLike => ({
  id,
  code: `SYS-${id}`,
  name: id,
  name_ar: `نظام ${id}`,
  status,
  request_count,
  last_checked_at: '2026-09-28T04:00:00Z',
  last_error: '',
});

const FIXTURE: SystemLike[] = [
  sys('ONLINE-LOW', 'ONLINE', 10),
  sys('ONLINE-HIGH', 'ONLINE', 900),
  sys('WARN-BUSY', 'WARNING', 500),
  sys('WARN-IDLE', 'WARNING', 5),
  sys('DOWN-BUSY', 'OFFLINE', 400),
  sys('DOWN-IDLE', 'OFFLINE', 1),
];

describe('selectDegraded', () => {
  it('excludes healthy systems', () => {
    expect(selectDegraded(FIXTURE).every((s) => s.status !== 'ONLINE')).toBe(true);
  });

  it('puts offline systems ahead of warnings', () => {
    const out = selectDegraded(FIXTURE);
    expect(out[0].status).toBe('OFFLINE');
    expect(out[out.length - 1].status).toBe('WARNING');
  });

  it('orders by request volume within the same severity', () => {
    const out = selectDegraded(FIXTURE);
    expect(out.filter((s) => s.status === 'OFFLINE').map((s) => s.request_count)).toEqual([400, 1]);
  });

  it('returns an empty list when everything is healthy', () => {
    expect(selectDegraded([sys('A', 'ONLINE', 1)])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [...FIXTURE];
    selectDegraded(input);
    expect(input.map((s) => s.id)).toEqual(FIXTURE.map((s) => s.id));
  });
});

describe('selectBusiest', () => {
  it('returns the highest-traffic systems first', () => {
    expect(selectBusiest(FIXTURE, 2).map((s) => s.request_count)).toEqual([900, 500]);
  });

  it('honours the limit', () => {
    expect(selectBusiest(FIXTURE)).toHaveLength(6);
    expect(selectBusiest(FIXTURE, 3)).toHaveLength(3);
  });

  it('does not mutate the input array', () => {
    const input = [...FIXTURE];
    selectBusiest(input);
    expect(input.map((s) => s.request_count)).toEqual(FIXTURE.map((s) => s.request_count));
  });
});

describe('toSparkPoints', () => {
  it('maps code and traffic onto sparkline points', () => {
    expect(toSparkPoints([sys('A', 'ONLINE', 7)])).toEqual([{ label: 'SYS-A', value: 7 }]);
  });
});

describe('countByStatus', () => {
  it('counts each state', () => {
    expect(countByStatus(FIXTURE)).toEqual({ ONLINE: 2, WARNING: 2, OFFLINE: 2 });
  });

  it('returns zeroed counts for no systems instead of NaN', () => {
    expect(countByStatus([])).toEqual({ ONLINE: 0, WARNING: 0, OFFLINE: 0 });
  });
});

describe('healthVerdict', () => {
  const fmt = (n: number) => formatNumber(n);

  it('escalates: an offline system is never reported as merely observed', () => {
    expect(healthVerdict({ ONLINE: 5, WARNING: 3, OFFLINE: 1 }, fmt)).toContain('متوقف');
    expect(healthVerdict({ ONLINE: 5, WARNING: 3, OFFLINE: 1 }, fmt)).toContain('تدخل مطلوب');
  });

  it('reports a clean state when nothing is degraded', () => {
    expect(healthVerdict({ ONLINE: 7, WARNING: 0, OFFLINE: 0 }, fmt)).toBe('جميع الأنظمة تعمل بشكل طبيعي');
  });

  it('reports warnings only when nothing is offline', () => {
    expect(healthVerdict({ ONLINE: 7, WARNING: 2, OFFLINE: 0 }, fmt)).toContain('مراقبة مطلوبة');
  });
});
