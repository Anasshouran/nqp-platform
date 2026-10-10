import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteCycleKpi, getCycleKpis, getPerformanceCycle } from '../../api/endpoints/hr';

const PerformanceCycleDetailPage = (await import('./PerformanceCycleDetailPage')).default;

vi.mock('../../api/endpoints/hr', () => ({
  getPerformanceCycle: vi.fn(),
  getCycleKpis: vi.fn(),
  addCycleKpi: vi.fn(),
  deleteCycleKpi: vi.fn(),
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/app/hr/performance/cycles/c1']}>
      <Routes>
        <Route path="/app/hr/performance/cycles/:id" element={<PerformanceCycleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPerformanceCycle).mockResolvedValue({
    data: {
      data: {
        id: 'c1',
        name: 'دورة 2026',
        period_start: '2026-01-01',
        period_end: '2026-03-31',
        review_due_date: null,
        status: 'OPEN',
        review_count: null,
        approved_count: null,
      },
    },
  } as never);
  vi.mocked(getCycleKpis).mockResolvedValue({
    data: {
      data: [{ id: 'k1', cycle: 'c1', name: 'مؤشر الانضباط', description: '', weight: '40', order: 0 }],
    },
  } as never);
});

describe('PerformanceCycleDetailPage — حذف المؤشر', () => {
  it('يتطلب تأكيداً صريحاً قبل حذف مؤشر الأداء', async () => {
    vi.mocked(deleteCycleKpi).mockResolvedValue({} as never);

    renderPage();
    expect(await screen.findByText('مؤشر الانضباط')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('حذف مؤشر الأداء')).toBeTruthy();
    expect(within(dialog).getByText(/مؤشر الانضباط/)).toBeTruthy();
    expect(deleteCycleKpi).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleteCycleKpi).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    const reopened = await screen.findByRole('dialog');
    fireEvent.click(within(reopened).getByRole('button', { name: 'حذف' }));

    await waitFor(() => expect(deleteCycleKpi).toHaveBeenCalledWith('k1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
