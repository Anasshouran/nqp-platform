import { describe, expect, it, vi } from 'vitest';
import {
  getBordersHealthOverview,
  getCrossingPerformance,
  getTrafficTrend,
  getCrossings,
  changeCrossingStatus,
  getScreenings,
  reassessScreening,
  decideCargoInspection,
  issueCertificate,
  refreshDailyStatistics,
} from '../../api/endpoints/bordersHealth';
import type {
  BorderCertificate,
  BorderCrossing,
  BorderScreening,
  BordersHealthOverview,
  CrossingPerformanceRow,
} from '../../types/bordersHealth';

/**
 * اختبارات طبقة نقاط النهاية لنظام صحة المعابر البرية.
 *
 * القاعدة المحروسة: كل نداء يمرّ عبر `apiClient` على `/borders-health/...`
 * (لا مسارات مطلقة، لأن `baseURL` هو `/api/v1`)، ويرجع الغلاف
 * `{status, data, message}` دون أي فكّ طبقي في طبقة الـ API.
 */

// `vi.mock` يُرفع إلى أعلى الملف، فلا يمكنه الوصول لمتغيرات المستوى الأعلى
// قبل تهيئتها — لذلك نُنشئ الـ mocks داخل `vi.hoisted`.
const { mockGet, mockPost, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  default: { get: mockGet, post: mockPost, patch: mockPatch },
}));

const overview: BordersHealthOverview = {
  crossings: 12,
  open_crossings: 12,
  restricted_crossings: 0,
  closed_crossings: 0,
  travelers_today: 18420,
  vehicles_inspected: 4860,
  cargo_inspections: 1284,
  active_quarantine: 37,
  active_isolation: 6,
  suspected_cases: 5,
  open_emergencies: 2,
  certificates_issued: 1430,
  samples_collected: 310,
};

const crossing: BorderCrossing = {
  id: 'c-1',
  entry_point: 'ep-1',
  entry_point_code: 'EP_ASHKEIT',
  name_ar: 'معبر أشكيت',
  neighbor_country: 'تشاد',
  border_type: 'ROAD',
  operating_status: 'OPEN',
  operating_hours: '24 ساعة',
  daily_capacity: 1500,
  working_agencies: '',
  has_health_facility: true,
  has_laboratory: false,
  has_quarantine_facility: true,
  has_isolation_facility: true,
  quarantine_capacity: 50,
  closure_reason: '',
  notes: '',
};

describe('bordersHealth endpoints — path & envelope', () => {
  it('overview points at the dashboard and returns the envelope unwrapped nowhere', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'success', data: overview } });
    const res = await getBordersHealthOverview();
    expect(mockGet).toHaveBeenCalledWith('/borders-health/dashboard/overview/');
    expect(res.data.data.crossings).toBe(12);
    expect(res.data.data.travelers_today).toBe(18420);
  });

  it('crossing-performance reads results from the envelope', async () => {
    const rows: CrossingPerformanceRow[] = [
      {
        id: 'c-1',
        entry_point__code: 'EP_ASHKEIT',
        entry_point__name_ar: 'معبر أشكيت',
        operating_status: 'OPEN',
        neighbor_country: 'تشاد',
        records_count: 10,
        vehicle_inspections_count: 4,
        cargo_count: 2,
        quarantine_count: 0,
      },
    ];
    mockGet.mockResolvedValueOnce({ data: { status: 'success', data: { results: rows, count: 1 } } });
    const res = await getCrossingPerformance();
    expect(mockGet).toHaveBeenCalledWith('/borders-health/dashboard/crossing-performance/');
    expect(res.data.data.results[0].entry_point__name_ar).toBe('معبر أشكيت');
  });

  it('traffic-trend forwards the day window', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'success', data: { results: [], count: 0 } } });
    await getTrafficTrend(14);
    expect(mockGet).toHaveBeenCalledWith('/borders-health/dashboard/traffic-trend/', {
      params: { days: 14 },
    });
  });

  it('list endpoints pass params straight through', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'success', data: { results: [], count: 0 } } });
    await getCrossings({ operating_status: 'OPEN' });
    expect(mockGet).toHaveBeenCalledWith('/borders-health/crossings/', {
      params: { operating_status: 'OPEN' },
    });
  });
});

describe('bordersHealth endpoints — actions', () => {
  it('changeCrossingStatus posts status and reason to the custom action', async () => {
    mockPatch.mockResolvedValueOnce({ data: { status: 'success', data: crossing } });
    await changeCrossingStatus('c-1', 'CLOSED', 'أمني');
    expect(mockPatch).toHaveBeenCalledWith('/borders-health/crossings/c-1/status/', {
      operating_status: 'CLOSED',
      closure_reason: 'أمني',
    });
  });

  it('changeCrossingStatus omits an empty reason instead of sending an empty string', async () => {
    mockPatch.mockResolvedValueOnce({ data: { status: 'success', data: crossing } });
    await changeCrossingStatus('c-1', 'OPEN');
    expect(mockPatch).toHaveBeenCalledWith('/borders-health/crossings/c-1/status/', {
      operating_status: 'OPEN',
    });
  });

  it('reassessScreening posts to the reassess action', async () => {
    mockPost.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
    await reassessScreening('s-1', { body_temperature: 39.2 });
    expect(mockPost).toHaveBeenCalledWith('/borders-health/screenings/s-1/reassess/', {
      body_temperature: 39.2,
    });
  });

  it('decideCargoInspection with no explicit decision sends an empty body', async () => {
    mockPost.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
    await decideCargoInspection('ci-1');
    expect(mockPost).toHaveBeenCalledWith('/borders-health/cargo-inspections/ci-1/decide/', {});
  });

  it('decideCargoInspection forwards an explicit decision', async () => {
    mockPost.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
    await decideCargoInspection('ci-1', 'REJECTED');
    expect(mockPost).toHaveBeenCalledWith('/borders-health/cargo-inspections/ci-1/decide/', {
      decision: 'REJECTED',
    });
  });

  it('issueCertificate targets the issue action, not the collection', async () => {
    const cert: BorderCertificate = {
      id: 'bc-1',
      certificate_number: 'BC-20260929-0001',
      certificate_type: 'HEALTH_CLEARANCE',
      crossing: 'c-1',
      issue_date: '2026-09-29',
      expiry_date: '2026-10-29',
      status: 'ISSUED',
      qr_payload: 'NQP|BC|BC-20260929-0001|2026-09-29|2026-10-29',
      traveler: null,
      vehicle: null,
      vehicle_inspection: null,
      issued_by: 'u-1',
      notes: '',
    };
    mockPost.mockResolvedValueOnce({ data: { status: 'success', data: cert } });
    const res = await issueCertificate({
      crossing: 'c-1',
      certificate_type: 'HEALTH_CLEARANCE',
      expiry_days: 30,
    });
    expect(mockPost).toHaveBeenCalledWith('/borders-health/certificates/issue/', {
      crossing: 'c-1',
      certificate_type: 'HEALTH_CLEARANCE',
      expiry_days: 30,
    });
    expect(res.data.data.certificate_number).toBe('BC-20260929-0001');
  });

  it('refreshDailyStatistics omits absent optional fields rather than sending undefined', async () => {
    mockPost.mockResolvedValueOnce({ data: { status: 'success', data: { results: [], count: 0 } } });
    await refreshDailyStatistics();
    expect(mockPost).toHaveBeenCalledWith('/borders-health/daily-statistics/refresh/', {});
  });

  it('refreshDailyStatistics includes crossing and date when provided', async () => {
    mockPost.mockResolvedValueOnce({ data: { status: 'success', data: { results: [], count: 0 } } });
    await refreshDailyStatistics('c-1', '2026-09-29');
    expect(mockPost).toHaveBeenCalledWith('/borders-health/daily-statistics/refresh/', {
      crossing: 'c-1',
      stat_date: '2026-09-29',
    });
  });
});
