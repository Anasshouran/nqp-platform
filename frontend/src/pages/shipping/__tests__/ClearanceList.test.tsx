/**
 * ClearanceList — render / empty / decision dialog + validation.
 * Mocks the typed shipping API module and the toast helper.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shipping = vi.hoisted(() => ({
  getClearanceDecisions: vi.fn(),
  recordClearanceDecision: vi.fn(),
}));
vi.mock('../../../api/endpoints/shipping', () => shipping);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

import { ClearanceList } from '../components/ClearanceList';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'c1',
  vessel_visit: 'vv1',
  vessel_name: 'MV A',
  vessel_imo: 'IMO-1',
  port_name: 'بورتسودان',
  port_code: 'PZU',
  decision: 'CLEARED',
  reason: '',
  conditions: '',
  decided_by: 'u1',
  decided_by_name: 'د. أحمد',
  decided_at: '2026-10-20T10:00:00Z',
  is_current: true,
};

const row = (over: Partial<typeof base> = {}) => ({ ...base, ...over });

const openDecisionDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'تسجيل قرار' }));
  const dialog = await screen.findByRole('dialog');
  return dialog;
};

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

describe('ClearanceList', () => {
  it('shows a loading skeleton initially', () => {
    shipping.getClearanceDecisions.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<ClearanceList />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows with decision chips', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row()]));
    render(<ClearanceList />);

    expect(await screen.findByText('MV A')).toBeTruthy();
    expect(screen.getByText('بورتسودان')).toBeTruthy();
    expect(screen.getByText('مُفرج عنها')).toBeTruthy();
    expect(screen.getByText('سارٍ')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([]));
    render(<ClearanceList />);

    expect(await screen.findByText('لا توجد قرارات')).toBeTruthy();
  });

  it('records a CLEARED decision', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row()]));
    shipping.recordClearanceDecision.mockResolvedValue({});
    render(<ClearanceList />);

    await screen.findByText('MV A');
    await openDecisionDialog();
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل القرار' }));

    await waitFor(() =>
      expect(shipping.recordClearanceDecision).toHaveBeenCalledWith('vv1', { decision: 'CLEARED' }),
    );
    expect(toast.notifySuccess).toHaveBeenCalled();
  });

  it('blocks REFUSED without a reason', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row()]));
    render(<ClearanceList />);

    await screen.findByText('MV A');
    const dialog = await openDecisionDialog();
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'مرفوض' }));

    const submit = within(dialog).getByRole('button', { name: 'تسجيل القرار' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);

    expect(shipping.recordClearanceDecision).not.toHaveBeenCalled();
  });

  it('blocks CONDITIONAL without conditions', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row()]));
    render(<ClearanceList />);

    await screen.findByText('MV A');
    const dialog = await openDecisionDialog();
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'إفراج مشروط' }));

    const submit = within(dialog).getByRole('button', { name: 'تسجيل القرار' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);

    expect(shipping.recordClearanceDecision).not.toHaveBeenCalled();
  });

  it('records a REFUSED decision with a reason', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row()]));
    shipping.recordClearanceDecision.mockResolvedValue({});
    render(<ClearanceList />);

    await screen.findByText('MV A');
    const dialog = await openDecisionDialog();
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'مرفوض' }));
    fireEvent.change(await within(dialog).findByRole('textbox'), { target: { value: 'وثائق ناقصة' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تسجيل القرار' }));

    await waitFor(() =>
      expect(shipping.recordClearanceDecision).toHaveBeenCalledWith('vv1', {
        decision: 'REFUSED',
        reason: 'وثائق ناقصة',
      }),
    );
  });

  it('records a CONDITIONAL decision with conditions', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row()]));
    shipping.recordClearanceDecision.mockResolvedValue({});
    render(<ClearanceList />);

    await screen.findByText('MV A');
    const dialog = await openDecisionDialog();
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'إفراج مشروط' }));
    fireEvent.change(await within(dialog).findByRole('textbox'), { target: { value: 'تفتيش إضافي' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تسجيل القرار' }));

    await waitFor(() =>
      expect(shipping.recordClearanceDecision).toHaveBeenCalledWith('vv1', {
        decision: 'CONDITIONAL',
        conditions: 'تفتيش إضافي',
      }),
    );
  });

  it('shows an error toast when recording fails', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row()]));
    shipping.recordClearanceDecision.mockRejectedValue(new Error('boom'));
    render(<ClearanceList />);

    await screen.findByText('MV A');
    await openDecisionDialog();
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل القرار' }));

    await waitFor(() => expect(toast.notifyError).toHaveBeenCalled());
    expect(toast.notifySuccess).not.toHaveBeenCalled();
  });

  it('shows decision details in the dialog', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row({ decision: 'REFUSED', reason: 'وثائق ناقصة' })]));
    render(<ClearanceList />);

    await screen.findByText('MV A');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('IMO-1')).toBeTruthy();
    expect(dialog.getByText('د. أحمد')).toBeTruthy();
    expect(dialog.getByText('وثائق ناقصة')).toBeTruthy();
    expect(dialog.getByText('مرفوض')).toBeTruthy();
  });

  it('requests the filtered page when a decision is selected', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([]));
    render(<ClearanceList />);

    const decisionFilter = (await screen.findAllByRole('combobox')).find(
      (el) => el.textContent === 'القرار',
    );
    fireEvent.mouseDown(decisionFilter as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: 'مرفوض' }));

    await waitFor(() =>
      expect(shipping.getClearanceDecisions).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'REFUSED' }),
      ),
    );
  });

  it('marks a superseded decision as مُستبدل', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(paged([row({ is_current: false })]));
    render(<ClearanceList />);

    expect(await screen.findByText('مُستبدل')).toBeTruthy();
  });

  it('renders — placeholders for missing fields', async () => {
    shipping.getClearanceDecisions.mockResolvedValue(
      paged([
        row({
          vessel_name: '',
          vessel_imo: '',
          port_name: undefined,
          port_code: undefined,
          decided_at: undefined,
        }),
      ]),
    );
    render(<ClearanceList />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    expect(screen.queryByText('MV A')).toBeNull();
  });
});
