/**
 * VesselRelationships — render / empty / search / filter / detail (read-only).
 * Mocks the typed shipping API module.
 */
import { fireEvent, render, screen } from '@testing-library/react';
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
});