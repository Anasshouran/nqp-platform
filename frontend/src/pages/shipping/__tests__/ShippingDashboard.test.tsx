/**
 * ShippingDashboard — client-side aggregation of three typed endpoints.
 *
 * Mocks portHealth + shipping, asserts loading / KPIs / status breakdown /
 * error / empty / refresh, and that all three APIs fire on mount.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const portHealth = vi.hoisted(() => ({
  getVessels: vi.fn(),
  getVesselVisits: vi.fn(),
}));
vi.mock('../../../api/endpoints/portHealth', () => portHealth);

const shippingApi = vi.hoisted(() => ({ getPreArrivals: vi.fn() }));
vi.mock('../../../api/endpoints/shipping', () => shippingApi);

import { ShippingDashboard } from '../components/ShippingDashboard';

const today = new Date().toLocaleDateString('en-CA');

const page = (count: number, results: unknown[]) => ({
  data: { data: { count, next: null, previous: null, results } },
});

const vesselsPage = page(12, [{ id: 'v1' }, { id: 'v2' }]);

const visitsPage = page(5, [
  { id: '1', status: 'ARRIVED', arrival_date: today },
  { id: '2', status: 'ARRIVED', arrival_date: '2000-01-01' },
  { id: '3', status: 'INSPECTED', arrival_date: '2000-01-01' },
  { id: '4', status: 'CLEARED', arrival_date: '2000-01-01' },
  { id: '5', status: 'EXPECTED', arrival_date: '2000-01-01' },
]);

const arrivalsPage = page(2, [
  { id: 'a1', arrival_date: today },
  { id: 'a2', arrival_date: '2000-01-01' },
]);

const emptyPage = page(0, []);

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
  portHealth.getVessels.mockResolvedValue(vesselsPage);
  portHealth.getVesselVisits.mockResolvedValue(visitsPage);
  shippingApi.getPreArrivals.mockResolvedValue(arrivalsPage);
});

describe('ShippingDashboard', () => {
  it('shows a loading skeleton initially', () => {
    portHealth.getVessels.mockReturnValue(new Promise(() => undefined));
    portHealth.getVesselVisits.mockReturnValue(new Promise(() => undefined));
    shippingApi.getPreArrivals.mockReturnValue(new Promise(() => undefined));

    const { container } = render(<ShippingDashboard />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('invokes all three typed endpoints on mount', async () => {
    render(<ShippingDashboard />);

    expect(portHealth.getVessels).toHaveBeenCalledTimes(1);
    expect(portHealth.getVesselVisits).toHaveBeenCalledTimes(1);
    expect(shippingApi.getPreArrivals).toHaveBeenCalledTimes(1);

    // Let the parallel promises settle so no state updates escape act().
    await screen.findByText('إجمالي السفن');
  });

  it('renders the four KPI cards with aggregated values', async () => {
    render(<ShippingDashboard />);

    expect(await screen.findByText('إجمالي السفن')).toBeTruthy();
    expect(screen.getByText('إجمالي الزيارات')).toBeTruthy();
    expect(screen.getByText('السفن في الميناء')).toBeTruthy();
    expect(screen.getByText('وصول اليوم')).toBeTruthy();

    // إجمالي السفن = vessels.count
    expect(screen.getByText('12')).toBeTruthy();
    // إجمالي الزيارات = visits.count
    expect(screen.getByText('5')).toBeTruthy();
    // السفن في الميناء = ARRIVED + INSPECTED = 3
    expect(screen.getByText('3')).toBeTruthy();
    // وصول اليوم = pre-arrivals dated today = 1
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('renders the visits status breakdown', async () => {
    render(<ShippingDashboard />);

    expect(await screen.findByText('توزيع الزيارات حسب الحالة')).toBeTruthy();
    expect(screen.getByText('وصلت · 2')).toBeTruthy();
    expect(screen.getByText('فُحصت · 1')).toBeTruthy();
  });

  it('shows the error state when any call fails', async () => {
    portHealth.getVesselVisits.mockRejectedValue(new Error('boom'));
    render(<ShippingDashboard />);

    expect(await screen.findByText('تعذّر تحميل البيانات الآن')).toBeTruthy();
  });

  it('renders the empty state for a blank dataset without crashing', async () => {
    portHealth.getVessels.mockResolvedValue(emptyPage);
    portHealth.getVesselVisits.mockResolvedValue(emptyPage);
    shippingApi.getPreArrivals.mockResolvedValue(emptyPage);

    render(<ShippingDashboard />);

    expect(await screen.findByText('لا توجد بيانات شحن بعد')).toBeTruthy();
  });

  it('refetches all three endpoints via the refresh button', async () => {
    render(<ShippingDashboard />);

    await screen.findByText('إجمالي السفن');
    fireEvent.click(screen.getByRole('button', { name: 'تحديث' }));

    await waitFor(() => expect(portHealth.getVessels).toHaveBeenCalledTimes(2));
    expect(portHealth.getVesselVisits).toHaveBeenCalledTimes(2);
    expect(shippingApi.getPreArrivals).toHaveBeenCalledTimes(2);
  });

  it('sorts the status breakdown by count descending', async () => {
    portHealth.getVesselVisits.mockResolvedValue(
      page(5, [
        { id: '1', status: 'EXPECTED' },
        { id: '2', status: 'CLEARED' },
        { id: '3', status: 'CLEARED' },
        { id: '4', status: 'CLEARED' },
        { id: '5', status: 'ARRIVED' },
      ]),
    );
    render(<ShippingDashboard />);

    await screen.findByText('توزيع الزيارات حسب الحالة');
    const chips = screen.getAllByText(/·/).map((el) => el.textContent);
    expect(chips[0]).toContain('· 3');
    expect(chips[1]).toContain('· 1');
  });

  it('uses the raw status label for unknown statuses', async () => {
    portHealth.getVesselVisits.mockResolvedValue(
      page(1, [{ id: '1', status: 'WEIRD' }]),
    );
    render(<ShippingDashboard />);

    expect(await screen.findByText('WEIRD · 1')).toBeTruthy();
  });

  it('shows the no-visits note when only vessels exist', async () => {
    portHealth.getVessels.mockResolvedValue(page(3, [{ id: 'v1' }]));
    portHealth.getVesselVisits.mockResolvedValue(emptyPage);
    shippingApi.getPreArrivals.mockResolvedValue(emptyPage);
    render(<ShippingDashboard />);

    expect(await screen.findByText('لا توجد زيارات مسجّلة.')).toBeTruthy();
  });

  it('counts only ARRIVED and INSPECTED as in-port', async () => {
    portHealth.getVesselVisits.mockResolvedValue(
      page(4, [
        { id: '1', status: 'ARRIVED' },
        { id: '2', status: 'INSPECTED' },
        { id: '3', status: 'CLEARED' },
        { id: '4', status: 'DEPARTED' },
      ]),
    );
    render(<ShippingDashboard />);

    await screen.findByText('السفن في الميناء');
    const card = screen.getByText('السفن في الميناء').closest('.MuiCard-root') as HTMLElement;
    expect(within(card).getByText('2')).toBeTruthy();
  });

  it('recovers from the error state on retry', async () => {
    portHealth.getVesselVisits.mockRejectedValueOnce(new Error('boom'));
    render(<ShippingDashboard />);

    expect(await screen.findByText('تعذّر تحميل البيانات الآن')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(await screen.findByText('إجمالي السفن')).toBeTruthy();
  });
});
