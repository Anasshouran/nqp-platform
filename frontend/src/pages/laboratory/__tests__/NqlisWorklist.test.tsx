/**
 * NqlisWorklist — result workflow page.
 *
 * The lab API + lab-scope hook + toast are mocked; the real `useServerTable`
 * drives loading/success/error. Covers initial render, loading, error, and the
 * primary row action (start a pending test).
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lab = vi.hoisted(() => ({
  getWorklist: vi.fn(),
  startTest: vi.fn(),
  enterTestResult: vi.fn(),
  reviewTest: vi.fn(),
  approveTest: vi.fn(),
  reviseTest: vi.fn(),
  saveTestResult: vi.fn(),
  returnTestResult: vi.fn(),
  addSampleTest: vi.fn(),
}));
vi.mock('../../../api/endpoints/laboratory', () => lab);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

vi.mock('../../../hooks/useLabSectors', () => ({
  useLabScope: () => ({ sector: null }),
}));

import NqlisWorklist from '../NqlisWorklist';

const pendingRow = {
  id: '1',
  sample: 's1',
  sample_number: 'LAB-0001',
  sample_barcode: 'BC1',
  test_name: 'CBC',
  disease_name: 'كوليرا',
  section_name: 'قسم الدم',
  priority: 'ROUTINE',
  status: 'PENDING',
  is_critical: false,
  assigned_name: 'أحمد',
};

const paged = (results: unknown[]) => ({ data: { data: { results, count: results.length } } });

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

describe('NqlisWorklist', () => {
  it('shows a loading skeleton before data arrives', () => {
    lab.getWorklist.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<NqlisWorklist />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders worklist rows from the API', async () => {
    lab.getWorklist.mockResolvedValue(paged([pendingRow]));
    render(<NqlisWorklist />);

    expect(await screen.findByText('LAB-0001')).toBeTruthy();
    expect(screen.getByText('CBC')).toBeTruthy();
    expect(screen.getByText('كوليرا')).toBeTruthy();
  });

  it('shows the load error when the request fails', async () => {
    lab.getWorklist.mockRejectedValue(new Error('boom'));
    render(<NqlisWorklist />);

    expect(await screen.findByText('تعذر تحميل البيانات، حاول مرة أخرى')).toBeTruthy();
  });

  it('starts a pending test via the row action', async () => {
    lab.getWorklist.mockResolvedValue(paged([pendingRow]));
    lab.startTest.mockResolvedValue({ data: { data: {} } });
    render(<NqlisWorklist />);

    const cell = await screen.findByText('LAB-0001');
    const row = cell.closest('tr') as HTMLElement;
    fireEvent.click(within(row).getAllByRole('button')[0]);

    await waitFor(() => expect(lab.startTest).toHaveBeenCalledWith('1'));
    expect(toast.notifySuccess).toHaveBeenCalled();
  });
});
