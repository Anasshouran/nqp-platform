/**
 * VesselList — render / empty / search / filter / detail (read-only).
 * Mocks the typed portHealth API module and the toast helper (not used but consistent).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const portHealth = vi.hoisted(() => ({ getVessels: vi.fn() }));
vi.mock('../../../api/endpoints/portHealth', () => portHealth);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

import { VesselList } from '../components/VesselList';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'v1',
  vessel_name: 'MV Atlas',
  imo_number: 'IMO-1234567',
  flag_state: 'Panama',
  shipping_company: 'Alpha Shipping',
  company_name: 'Alpha Shipping Co.',
  company: null,
  vessel_type: 'COMMERCIAL',
  gross_tonnage: 85000,
  last_port_of_call: 'جدة',
  arrival_date: '2026-10-15',
  departure_date: null,
  status: 'ARRIVED',
  notes: '',
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
  portHealth.getVessels.mockResolvedValue(paged([]));
});

describe('VesselList', () => {
  it('shows a loading skeleton initially', () => {
    portHealth.getVessels.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<VesselList />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    portHealth.getVessels.mockResolvedValue(paged([row({ status: 'ARRIVED' })]));
    render(<VesselList />);

    expect(await screen.findByText('MV Atlas')).toBeTruthy();
    expect(screen.getByText('IMO-1234567')).toBeTruthy();
    expect(screen.getByText('وصلت')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    portHealth.getVessels.mockResolvedValue(paged([]));
    render(<VesselList />);

    expect(await screen.findByText('لا توجد سفن')).toBeTruthy();
  });

  it('updates searchInput when searching (controlled)', async () => {
    portHealth.getVessels.mockResolvedValue(paged([]));
    render(<VesselList />);

    const search = await screen.findByPlaceholderText('ابحث باسم السفينة أو رقم IMO...');
    fireEvent.change(search, { target: { value: 'atlas' } });
    expect((search as HTMLInputElement).value).toBe('atlas');
  });

  it('applies status filter (changes value)', async () => {
    portHealth.getVessels.mockResolvedValue(paged([]));
    render(<VesselList />);

    const combo = (await screen.findAllByRole('combobox'))[0];
    fireEvent.mouseDown(combo);
    const quarantined = await screen.findByRole('option', { name: 'محجورة' });
    fireEvent.click(quarantined);

    expect(screen.getAllByText('محجورة').length).toBeGreaterThan(0);
  });

  it('opens the detail dialog on row click', async () => {
    portHealth.getVessels.mockResolvedValue(paged([row({ status: 'QUARANTINED' })]));
    render(<VesselList />);

    await screen.findByText('MV Atlas');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    expect(await screen.findByText('تفاصيل السفينة')).toBeTruthy();
    expect(screen.getByText('الشركة المالكة')).toBeTruthy();
    expect(screen.getAllByText('Panama').length).toBeGreaterThan(0);
    expect(screen.getAllByText('محجورة').length).toBeGreaterThan(0);
  });
});
