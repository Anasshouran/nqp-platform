/**
 * VesselRelationships — render / empty / search / filter / detail (read-only).
 * Mocks the typed shipping API module.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shipping = vi.hoisted(() => ({ getVesselRelationships: vi.fn() }));
vi.mock('../../../api/endpoints/shipping', () => shipping);

import { VesselRelationships } from '../components/VesselRelationships';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'r1',
  vessel: 'v1',
  vessel_name: 'MV Atlas',
  vessel_imo: 'IMO-1234567',
  company: 'c1',
  company_name: 'Alpha Shipping Co.',
  company_id: 'c1',
  role: 'OWNER',
  valid_from: '2026-01-01',
  valid_until: '2026-12-31',
  is_primary: true,
  notes: 'ملاحظة',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const row = (over: Partial<typeof base> = {}) => ({ ...base, ...over });

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
  shipping.getVesselRelationships.mockResolvedValue(paged([]));
});

describe('VesselRelationships', () => {
  it('shows a loading skeleton initially', () => {
    shipping.getVesselRelationships.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<VesselRelationships />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([row()]));
    render(<VesselRelationships />);

    expect(await screen.findByText('MV Atlas')).toBeTruthy();
    expect(screen.getByText('IMO-1234567')).toBeTruthy();
    expect(screen.getByText('Alpha Shipping Co.')).toBeTruthy();
    expect(screen.getByText('مالك')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([]));
    render(<VesselRelationships />);

    expect(await screen.findByText('لا توجد علاقات')).toBeTruthy();
  });

  it('filters the visible rows with client-side search', async () => {
    shipping.getVesselRelationships.mockResolvedValue(
      paged([row({ id: 'r1', vessel_name: 'MV Atlas' }), row({ id: 'r2', vessel_name: 'MV Beta' })]),
    );
    render(<VesselRelationships />);

    await screen.findByText('MV Atlas');
    fireEvent.change(screen.getByPlaceholderText('ابحث باسم السفينة أو الشركة...'), {
      target: { value: 'Atlas' },
    });

    expect(screen.getByText('MV Atlas')).toBeTruthy();
    expect(screen.queryByText('MV Beta')).toBeNull();
  });

  it('applies role filter (changes value)', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([]));
    render(<VesselRelationships />);

    const combo = (await screen.findAllByRole('combobox'))[0];
    fireEvent.mouseDown(combo);
    const owner = await screen.findByRole('option', { name: 'مالك' });
    fireEvent.click(owner);

    expect(screen.getAllByText('مالك').length).toBeGreaterThan(0);
  });

  it('opens the detail dialog on row click', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([row()]));
    render(<VesselRelationships />);

    await screen.findByText('MV Atlas');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    expect(await screen.findByText('تفاصيل العلاقة')).toBeTruthy();
    expect(screen.getByText('دور أساسي')).toBeTruthy();
    expect(screen.getByText('ملاحظة')).toBeTruthy();
    expect(screen.getByText('نعم')).toBeTruthy();
  });

  it('shows a filtered-count subtitle when searching', async () => {
    shipping.getVesselRelationships.mockResolvedValue(
      paged([row({ vessel_name: 'MV Atlas' }), row({ id: 'r2', vessel_name: 'MV Beta' })], 2),
    );
    render(<VesselRelationships />);

    await screen.findByText('MV Atlas');
    expect(screen.getByText('2 علاقة')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('ابحث باسم السفينة أو الشركة...'), {
      target: { value: 'Atlas' },
    });
    expect(screen.getByText('1 من 2 علاقة')).toBeTruthy();
  });

  it('requests the filtered page when a role is selected', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([]));
    render(<VesselRelationships />);

    const roleFilter = (await screen.findAllByRole('combobox')).find(
      (el) => el.textContent === 'نوع العلاقة',
    );
    fireEvent.mouseDown(roleFilter as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: 'مشغل' }));

    await waitFor(() =>
      expect(shipping.getVesselRelationships).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'OPERATOR' }),
      ),
    );
  });

  it('requests the filtered page when the active filter is selected', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([]));
    render(<VesselRelationships />);

    const activeFilter = (await screen.findAllByRole('combobox')).find(
      (el) => el.textContent === 'مفعّل',
    );
    fireEvent.mouseDown(activeFilter as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: 'غير نشط' }));

    await waitFor(() =>
      expect(shipping.getVesselRelationships).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: 'false' }),
      ),
    );
  });

  it('shows the primary chip for primary relations only', async () => {
    shipping.getVesselRelationships.mockResolvedValue(
      paged([row({ id: 'r1', vessel_name: 'Primary', is_primary: true }), row({ id: 'r2', vessel_name: 'Secondary', is_primary: false })]),
    );
    render(<VesselRelationships />);

    await screen.findByText('Primary');
    expect(screen.getAllByText('أساسي').length).toBe(1);
    expect(screen.getByText('Secondary')).toBeTruthy();
  });

  it('renders a fallback for an unknown role', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([row({ role: 'WEIRD' })]));
    render(<VesselRelationships />);

    expect(await screen.findByText('WEIRD')).toBeTruthy();
  });

  it('renders — placeholders for missing fields', async () => {
    shipping.getVesselRelationships.mockResolvedValue(
      paged([row({ vessel_name: '', vessel_imo: '', company_name: '', valid_from: '' })]),
    );
    render(<VesselRelationships />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });

  it('shows full relationship details and closes the dialog', async () => {
    shipping.getVesselRelationships.mockResolvedValue(paged([row()]));
    render(<VesselRelationships />);

    await screen.findByText('MV Atlas');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('IMO-1234567')).toBeTruthy();
    expect(dialog.getByText('مالك')).toBeTruthy();
    expect(dialog.getByText('2026-01-01')).toBeTruthy();
    expect(dialog.getByText('2026-12-31')).toBeTruthy();
    expect(dialog.getByText('نشط')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => expect(screen.queryByText('تفاصيل العلاقة')).toBeNull());
  });
});