/**
 * VesselList — render / empty / search / filter / detail (read-only).
 * Mocks the typed portHealth API module and the toast helper (not used but consistent).
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('shows row values in the detail dialog', async () => {
    portHealth.getVessels.mockResolvedValue(paged([row({ status: 'ARRIVED' })]));
    render(<VesselList />);

    await screen.findByText('MV Atlas');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('IMO-1234567')).toBeTruthy();
    expect(dialog.getByText('Alpha Shipping Co.')).toBeTruthy();
    expect(dialog.getByText('تجارية')).toBeTruthy();
    expect(dialog.getByText('جدة')).toBeTruthy();
  });

  it('translates the vessel type in the table', async () => {
    portHealth.getVessels.mockResolvedValue(paged([row({ vessel_type: 'TANKER' })]));
    render(<VesselList />);

    expect(await screen.findByText('ناقلة نفط')).toBeTruthy();
  });

  it('falls back to shipping_company when company_name is missing', async () => {
    portHealth.getVessels.mockResolvedValue(
      paged([row({ company_name: '', shipping_company: 'Beta Line' })]),
    );
    render(<VesselList />);

    expect(await screen.findByText('Beta Line')).toBeTruthy();
  });

  it('requests the filtered page when a status is selected', async () => {
    portHealth.getVessels.mockResolvedValue(paged([]));
    render(<VesselList />);

    const statusFilter = (await screen.findAllByRole('combobox')).find(
      (el) => el.textContent === 'الحالة',
    );
    fireEvent.mouseDown(statusFilter as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: 'محجورة' }));

    await waitFor(() =>
      expect(portHealth.getVessels).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'QUARANTINED' }),
      ),
    );
  });

  it('closes the detail dialog', async () => {
    portHealth.getVessels.mockResolvedValue(paged([row()]));
    render(<VesselList />);

    await screen.findByText('MV Atlas');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));

    await waitFor(() => expect(screen.queryByText('تفاصيل السفينة')).toBeNull());
  });

  it('re-fetches when refresh is clicked', async () => {
    portHealth.getVessels.mockResolvedValue(paged([row()]));
    render(<VesselList />);

    await screen.findByText('MV Atlas');
    expect(portHealth.getVessels).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'تحديث' }));
    await waitFor(() => expect(portHealth.getVessels).toHaveBeenCalledTimes(2));
  });

  it('renders a fallback label for an unknown status', async () => {
    portHealth.getVessels.mockResolvedValue(paged([row({ status: 'WEIRD' })]));
    render(<VesselList />);

    expect(await screen.findByText('غير معروف')).toBeTruthy();
  });

  it('renders — placeholders for missing fields', async () => {
    portHealth.getVessels.mockResolvedValue(
      paged([
        row({
          vessel_name: '',
          imo_number: '',
          company_name: '',
          shipping_company: '',
          flag_state: '',
          last_port_of_call: '',
          gross_tonnage: undefined,
        }),
      ]),
    );
    render(<VesselList />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    expect(screen.queryByText('MV Atlas')).toBeNull();
  });
});
