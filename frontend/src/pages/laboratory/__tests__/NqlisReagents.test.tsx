/**
 * NqlisReagents — reagents & lots inventory page.
 *
 * Lab API / scope / toast mocked; real `useServerTable` (two instances). Covers
 * initial render, loading, error, and the primary action (add a reagent).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lab = vi.hoisted(() => ({
  getReagents: vi.fn(),
  getReagentLots: vi.fn(),
  createReagent: vi.fn(),
  createReagentLot: vi.fn(),
}));
vi.mock('../../../api/endpoints/laboratory', () => lab);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

vi.mock('../../../hooks/useLabSectors', () => ({
  useLabScope: () => ({ sector: null }),
}));

import NqlisReagents from '../NqlisReagents';

const reagentRow = {
  id: 'r1',
  name_ar: 'كاشف إيبولا',
  name_en: 'Ebola Reagent',
  section_name: 'قسم الفيروسات',
  material_type: 'REAGENT',
  total_quantity: 12,
  unit: 'ml',
  low_stock: false,
  reorder_level: 5,
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

describe('NqlisReagents', () => {
  it('shows a loading skeleton before data arrives', () => {
    lab.getReagents.mockReturnValue(new Promise(() => undefined));
    lab.getReagentLots.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<NqlisReagents />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders reagents from the API', async () => {
    lab.getReagents.mockResolvedValue(paged([reagentRow]));
    lab.getReagentLots.mockResolvedValue(paged([]));
    render(<NqlisReagents />);

    expect(await screen.findByText('كاشف إيبولا')).toBeTruthy();
    expect(screen.getByText('Ebola Reagent')).toBeTruthy();
  });

  it('shows the load error when the reagents request fails', async () => {
    lab.getReagents.mockRejectedValue(new Error('boom'));
    lab.getReagentLots.mockResolvedValue(paged([]));
    render(<NqlisReagents />);

    expect(await screen.findByText('تعذر تحميل البيانات، حاول مرة أخرى')).toBeTruthy();
  });

  it('adds a reagent through the create dialog', async () => {
    lab.getReagents.mockResolvedValue(paged([]));
    lab.getReagentLots.mockResolvedValue(paged([]));
    lab.createReagent.mockResolvedValue({ data: { data: {} } });
    render(<NqlisReagents />);

    fireEvent.click(await screen.findByRole('button', { name: 'مادة جديدة' }));
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));

    await waitFor(() =>
      expect(lab.createReagent).toHaveBeenCalledWith({
        name_ar: '',
        material_type: 'REAGENT',
        unit: '',
      }),
    );
  });
});
