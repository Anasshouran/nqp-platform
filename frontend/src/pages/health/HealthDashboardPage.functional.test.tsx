import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';

import { getPublicStatistics } from '../../api/endpoints/public';

// Stub IntersectionObserver (useCommandSections)
if (!('IntersectionObserver' in globalThis)) {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds = [];
  };
}

vi.mock('../../api/endpoints/public', () => ({ getPublicStatistics: vi.fn() }));
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  const t = (k: string, o?: object) => i18n.t(k, o as never);
  return { ...actual, useTranslation: () => ({ t, i18n }) };
});

const HealthDashboardPage = (await import('./HealthDashboardPage')).default;

const stats = {
  screenings: 10, certificates: 5, lab_samples: 3, diseases: 1,
  entry_points: 2, vector_activities: 4, notices: 6,
};

beforeEach(() => vi.clearAllMocks());

describe('HealthDashboardPage', () => {
  it('shows loading skeleton while fetching', async () => {
    vi.mocked(getPublicStatistics).mockReturnValue(new Promise(() => {}) as any);
    render(<HealthDashboardPage />);
    const skeleton = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeleton.length).toBeGreaterThan(0);
  });

  it('renders stats when loaded', async () => {
    vi.mocked(getPublicStatistics).mockResolvedValue({ data: { data: stats } } as any);
    render(<HealthDashboardPage />);
    await waitFor(() => expect(getPublicStatistics).toHaveBeenCalled());
    // ⚠️ "10" يظهر في <p> + Chip + combobox — استخدم findAll
    const matches = await screen.findAllByText(/^10$/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('retries on error', async () => {
    vi.mocked(getPublicStatistics)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ data: { data: stats } } as any);

    render(<HealthDashboardPage />);

    const retry = await screen.findByRole('button', { name: /إعادة|retry|محاولة/i });
    fireEvent.click(retry);

    await waitFor(() => {
      expect(vi.mocked(getPublicStatistics).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
