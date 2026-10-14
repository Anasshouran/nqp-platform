/**
 * PreArrivalList — render / empty / error-free actions / create.
 * Mocks the typed shipping + portHealth API modules and the toast helper.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shipping = vi.hoisted(() => ({
  getPreArrivals: vi.fn(),
  createPreArrival: vi.fn(),
  submitPreArrival: vi.fn(),
  reviewPreArrival: vi.fn(),
  acceptPreArrival: vi.fn(),
  rejectPreArrival: vi.fn(),
  cancelPreArrival: vi.fn(),
}));
vi.mock('../../../api/endpoints/shipping', () => shipping);

const portHealth = vi.hoisted(() => ({ getVesselVisits: vi.fn() }));
vi.mock('../../../api/endpoints/portHealth', () => portHealth);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

import { PreArrivalList } from '../components/PreArrivalList';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'a1',
  vessel_name: 'MV A',
  vessel_imo: 'IMO-1',
  port_name: 'بورتسودان',
  port_code: 'PZU',
  arrival_date: '2026-10-20',
  status: 'DRAFT',
  vessel_visit: 'v1',
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
  portHealth.getVesselVisits.mockResolvedValue(paged([]));
});

describe('PreArrivalList', () => {
  it('shows a loading skeleton initially', () => {
    shipping.getPreArrivals.mockReturnValue(new Promise(() => undefined));
    portHealth.getVesselVisits.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<PreArrivalList />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    shipping.getPreArrivals.mockResolvedValue(paged([row({ status: 'SUBMITTED' })]));
    render(<PreArrivalList />);

    expect(await screen.findByText('MV A')).toBeTruthy();
    expect(screen.getByText('بورتسودان')).toBeTruthy();
    expect(screen.getByText('مُقدَّم')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    shipping.getPreArrivals.mockResolvedValue(paged([]));
    render(<PreArrivalList />);

    expect(await screen.findByText('لا توجد إشعارات')).toBeTruthy();
  });

  it('submits a DRAFT notification', async () => {
    shipping.getPreArrivals.mockResolvedValue(paged([row({ status: 'DRAFT' })]));
    shipping.submitPreArrival.mockResolvedValue({});
    render(<PreArrivalList />);

    await screen.findByText('MV A');
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));

    await waitFor(() => expect(shipping.submitPreArrival).toHaveBeenCalledWith('a1'));
    expect(toast.notifySuccess).toHaveBeenCalled();
  });

  it('opens the review dialog and calls reviewPreArrival', async () => {
    shipping.getPreArrivals.mockResolvedValue(paged([row({ status: 'SUBMITTED' })]));
    shipping.reviewPreArrival.mockResolvedValue({});
    render(<PreArrivalList />);

    await screen.findByText('MV A');
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة' }));
    fireEvent.click(await screen.findByRole('button', { name: 'بدء المراجعة' }));

    await waitFor(() => expect(shipping.reviewPreArrival).toHaveBeenCalledWith('a1', undefined));
  });

  it('creates a notification from the create dialog', async () => {
    shipping.getPreArrivals.mockResolvedValue(paged([]));
    portHealth.getVesselVisits.mockResolvedValue(
      paged([{ id: 'v1', vessel: 'vessel-1', vessel_name: 'MV Visit', port_name: 'الميناء', arrival_date: '2026-10-25' }]),
    );
    shipping.createPreArrival.mockResolvedValue({});
    render(<PreArrivalList />);

    fireEvent.click(await screen.findByRole('button', { name: 'إشعار جديد' }));
    fireEvent.mouseDown(await screen.findByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: /MV Visit/ }));
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء' }));

    await waitFor(() =>
      expect(shipping.createPreArrival).toHaveBeenCalledWith('v1', { remarks: undefined }),
    );
  });
});
