/**
 * NqlisDashboard — lab mission-control page.
 *
 * Heavy deps (recharts, command rail) are mocked so jsdom can render it.
 * Covers initial render (loader), success (hero + KPIs), error (notifyError +
 * null render), and the refresh action.
 */
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lab = vi.hoisted(() => ({
  getLabDashboard: vi.fn(),
  getLabSamples: vi.fn(),
}));
vi.mock('../../../api/endpoints/laboratory', () => lab);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

vi.mock('../../../hooks/useLabSectors', () => ({
  useLabScope: () => ({ sector: null }),
}));

vi.mock('../../../components/command', () => ({
  CommandSectionRail: () => null,
  useCommandSections: () => ({ active: '', register: () => () => undefined, scrollTo: () => undefined }),
}));

vi.mock('recharts', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Wrap,
    BarChart: Wrap,
    PieChart: Wrap,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Pie: () => null,
    Cell: () => null,
    Legend: () => null,
  };
});

import NqlisDashboard from '../NqlisDashboard';

const dashboard = {
  sections: [],
  totals: {
    samples: 42,
    received_today: 7,
    pending_reception: 3,
    accepted: 20,
    rejected: 1,
    under_testing: 8,
    ready_for_approval: 2,
    completed: 11,
    urgent: 0,
  },
  by_status: { RECEIVED: 10, UNDER_TESTING: 8, COMPLETED: 11 },
  by_section: [{ section: 'sec1', name: 'قسم الدم', count: 5 }],
  by_source: [{ source: 'CLINIC', name: 'العيادة', count: 6 }],
  tests: { total: 20, pending: 4, in_progress: 6, draft: 1, submitted: 3, approved: 6 },
  critical: { open: 0, acknowledged: 0, recent: 0 },
  quality: {
    equipment: { total: 10, overdue: 1, due_soon: 2 },
    reagents: { total: 20, expiring_soon: 3, expired: 1, low_stock: 2 },
    qc: { pending: 1, failed: 0 },
    non_conformities: { open: 1 },
  },
};

const samples = { data: { data: { results: [], count: 0 } } };

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <NqlisDashboard />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

describe('NqlisDashboard', () => {
  it('shows a loader before the dashboard resolves', () => {
    lab.getLabDashboard.mockReturnValue(new Promise(() => undefined));
    lab.getLabSamples.mockResolvedValue(samples);
    const { container } = renderDashboard();
    expect(container.querySelector('.MuiCircularProgress-root')).not.toBeNull();
  });

  it('renders the hero and KPIs once loaded', async () => {
    lab.getLabDashboard.mockResolvedValue({ data: { data: dashboard } });
    lab.getLabSamples.mockResolvedValue(samples);
    renderDashboard();

    expect(await screen.findByText('لوحة قيادة المختبر القومي')).toBeTruthy();
    expect(screen.getByText('إجمالي العينات')).toBeTruthy();
    expect(screen.getAllByText('42').length).toBeGreaterThan(0);
  });

  it('notifies on load failure and renders nothing', async () => {
    lab.getLabDashboard.mockRejectedValue(new Error('boom'));
    lab.getLabSamples.mockResolvedValue(samples);
    const { container } = renderDashboard();

    await waitFor(() => expect(toast.notifyError).toHaveBeenCalledWith('تعذر تحميل لوحة المختبر'));
    expect(container.textContent).toBe('');
  });

  it('refetches when the refresh control is used', async () => {
    lab.getLabDashboard.mockResolvedValue({ data: { data: dashboard } });
    lab.getLabSamples.mockResolvedValue(samples);
    renderDashboard();

    await screen.findByText('لوحة قيادة المختبر القومي');
    fireEvent.click(screen.getAllByRole('button', { name: 'تحديث' })[0]);

    await waitFor(() => expect(lab.getLabDashboard).toHaveBeenCalledTimes(2));
  });
});
