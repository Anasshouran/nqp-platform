/**
 * DepartureList — render / empty / DEPARTED filter / search / detail.
 * Mocks the typed portHealth API module.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const portHealth = vi.hoisted(() => ({ getVesselVisits: vi.fn() }));
vi.mock('../../../api/endpoints/portHealth', () => portHealth);

import { DepartureList } from '../components/DepartureList';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'vv1',
  vessel: 'vessel-1',
  vessel_name: 'MV Depart',
  vessel_imo: 'IMO-9',
  port: 'port-1',
  port_name: 'بورتسودان',
  berth_code: 'B-12',
  arrival_date: '2026-10-18',
  departure_date: '2026-10-20',
  status: 'DEPARTED',
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

describe('DepartureList', () => {
  it('shows a loading skeleton initially', () => {
    portHealth.getVesselVisits.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<DepartureList />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('requests only DEPARTED visits from the API', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([]));
    render(<DepartureList />);

    await waitFor(() =>
      expect(portHealth.getVesselVisits).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DEPARTED' }),
      ),
    );
  });

  it('renders rows from the API', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row()]));
    render(<DepartureList />);

    expect(await screen.findByText('MV Depart')).toBeTruthy();
    expect(screen.getByText('بورتسودان')).toBeTruthy();
    expect(screen.getAllByText('غادرت').length).toBeGreaterThan(0);
    expect(screen.getByText('2026-10-20')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([]));
    render(<DepartureList />);

    expect(await screen.findByText('لا توجد مغادرات')).toBeTruthy();
  });

  it('updates the search input (controlled)', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([]));
    render(<DepartureList />);

    const search = await screen.findByPlaceholderText('ابحث بالسفينة أو رقم IMO أو الميناء...');
    fireEvent.change(search, { target: { value: 'depart' } });
    expect((search as HTMLInputElement).value).toBe('depart');
  });

  it('opens the detail dialog from the view action', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row()]));
    render(<DepartureList />);

    await screen.findByText('MV Depart');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    expect(await screen.findByText('تفاصيل المغادرة')).toBeTruthy();
    expect(screen.getByText('تاريخ الوصول')).toBeTruthy();
  });
});