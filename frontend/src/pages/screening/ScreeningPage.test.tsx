import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLatestRisk,
  getScreenings,
  referScreening,
} from '../../api/endpoints/screening';
import { getTravelers } from '../../api/endpoints/travelers';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';

const ScreeningPage = (await import('./ScreeningPage')).default;

vi.mock('../../api/endpoints/screening', () => ({
  getScreenings: vi.fn(),
  getLatestRisk: vi.fn(),
  referScreening: vi.fn(),
  createScreening: vi.fn(),
}));

vi.mock('../../api/endpoints/travelers', () => ({ getTravelers: vi.fn() }));
vi.mock('../../api/endpoints/masterdata', () => ({ getMasterEntryPoints: vi.fn() }));
vi.mock('../../utils/toast', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  extractErrorMessage: (_: unknown, fallback: string) => fallback,
}));

const screeningRow = {
  id: 's1',
  traveler: 't1',
  traveler_name: 'أحمد النور',
  passport_number: 'P100',
  port: 'p1',
  officer: 'o1',
  body_temperature: 38.4,
  oxygen_saturation: 93,
  systolic_bp: 120,
  diastolic_bp: 80,
  observed_symptoms: ['حمى'],
  officer_notes: 'حرارة مرتفعة',
  screened_at: '2026-10-03T08:00:00Z',
};

const assessment = {
  id: 'a1',
  screening: 's1',
  risk_level: 'RED',
  risk_score: 42,
  recommendation: 'QUARANTINE',
  decision_factors: {},
  assessed_at: '2026-10-03T08:00:00Z',
};

const list = (results: unknown[]) => ({ data: { data: { count: results.length, next: null, previous: null, results } } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getScreenings).mockResolvedValue(list([screeningRow]) as never);
  vi.mocked(getTravelers).mockResolvedValue(list([]) as never);
  vi.mocked(getMasterEntryPoints).mockResolvedValue({ data: { data: { count: 0, results: [] } } } as never);
});

const setup = () =>
  render(
    <MemoryRouter>
      <ScreeningPage />
    </MemoryRouter>,
  );

describe('ScreeningPage — سير قرار الفحص الصحي', () => {
  it('يعرض زر «فحص جديد» ويفتح نموذج التسجيل', async () => {
    setup();
    await waitFor(() => expect(getScreenings).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /فحص جديد/ }));
    expect(await screen.findByText('تسجيل فحص صحي')).toBeTruthy();
  });

  it('يعرض تقييم المخاطر بعد نقرة «المخاطر»', async () => {
    vi.mocked(getLatestRisk).mockResolvedValue({ data: { data: assessment } } as never);
    setup();
    await waitFor(() => expect(getScreenings).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /المخاطر/ }));
    await waitFor(() => expect(getLatestRisk).toHaveBeenCalledWith('s1'));
    expect(await screen.findByText('أحمر')).toBeTruthy();
    expect(screen.getByText('حجر صحي')).toBeTruthy();
  });

  it('يعرض تحذيراً عند غياب تقييم المخاطر', async () => {
    vi.mocked(getLatestRisk).mockRejectedValue(new Error('no risk'));
    setup();
    await waitFor(() => expect(getScreenings).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /المخاطر/ }));
    expect(await screen.findByText(/لا يوجد تقييم مخاطر لهذا الفحص بعد/)).toBeTruthy();
  });

  it('يعرض تأكيد التحويل إلى العيادة', async () => {
    vi.mocked(referScreening).mockResolvedValue({ data: { data: { referral_id: 'r1', clinic_visit_url: '' } } } as never);
    setup();
    await waitFor(() => expect(getScreenings).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'تحويل إلى العيادة' }));
    expect(await screen.findByText(/تأكيد تحويل/)).toBeTruthy();
  });
});