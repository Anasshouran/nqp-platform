/**
 * NqlisReception — sample intake page.
 *
 * Lab API / scope / toast mocked; real `useServerTable`. Covers initial render,
 * loading, error, and the primary action (register a new sample).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lab = vi.hoisted(() => ({
  getReceptionQueue: vi.fn(),
  createLabSample: vi.fn(),
  acceptSample: vi.fn(),
  conditionalAcceptSample: vi.fn(),
  rejectSample: vi.fn(),
}));
vi.mock('../../../api/endpoints/laboratory', () => lab);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

vi.mock('../../../hooks/useLabSectors', () => ({
  useLabScope: () => ({ sector: null }),
}));

import NqlisReception from '../NqlisReception';

const row = {
  id: '1',
  sample_number: 'LAB-1000',
  sample_barcode: 'BC-1000',
  sample_type: 'SWAB',
  source: 'CLINIC',
  priority: 'ROUTINE',
  reception_status: 'RECEIVED',
  status: 'RECEIVED',
  collected_at: '2026-01-01T10:00:00Z',
  created_at: '2026-01-01T10:00:00Z',
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

describe('NqlisReception', () => {
  it('shows a loading skeleton before data arrives', () => {
    lab.getReceptionQueue.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<NqlisReception />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders the reception queue from the API', async () => {
    lab.getReceptionQueue.mockResolvedValue(paged([row]));
    render(<NqlisReception />);

    expect(await screen.findByText('LAB-1000')).toBeTruthy();
    expect(screen.getByText('BC-1000')).toBeTruthy();
  });

  it('shows the load error when the request fails', async () => {
    lab.getReceptionQueue.mockRejectedValue(new Error('boom'));
    render(<NqlisReception />);

    expect(await screen.findByText('تعذر تحميل البيانات، حاول مرة أخرى')).toBeTruthy();
  });

  it('registers a new sample through the create dialog', async () => {
    lab.getReceptionQueue.mockResolvedValue(paged([]));
    lab.createLabSample.mockResolvedValue({ data: { data: {} } });
    render(<NqlisReception />);

    fireEvent.click(await screen.findByRole('button', { name: 'عينة جديدة' }));
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));

    await waitFor(() =>
      expect(lab.createLabSample).toHaveBeenCalledWith({
        sample_type: 'SWAB',
        source: 'CLINIC',
        priority: 'ROUTINE',
      }),
    );
  });
});
