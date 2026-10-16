/**
 * VesselVisitList — render / empty / depart workflow / detail dialog.
 * Mocks the typed portHealth + shipping API modules and the toast helper.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const portHealth = vi.hoisted(() => ({ getVesselVisits: vi.fn() }));
vi.mock('../../../api/endpoints/portHealth', () => portHealth);

const shipping = vi.hoisted(() => ({ departVessel: vi.fn() }));
vi.mock('../../../api/endpoints/shipping', () => shipping);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

import { VesselVisitList } from '../components/VesselVisitList';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'vv1',
  vessel: 'vessel-1',
  vessel_name: 'MV Visit',
  vessel_imo: 'IMO-9',
  port: 'port-1',
  port_name: 'بورتسودان',
  berth_code: 'B-12',
  arrival_date: '2026-10-20',
  departure_date: null,
  status: 'SCHEDULED',
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

describe('VesselVisitList', () => {
  it('shows a loading skeleton initially', () => {
    portHealth.getVesselVisits.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<VesselVisitList />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'ARRIVED' })]));
    render(<VesselVisitList />);

    expect(await screen.findByText('MV Visit')).toBeTruthy();
    expect(screen.getByText('بورتسودان')).toBeTruthy();
    expect(screen.getByText('وصلت')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([]));
    render(<VesselVisitList />);

    expect(await screen.findByText('لا توجد زيارات')).toBeTruthy();
  });

  it('registers a departure for a non-departed row', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'IN_PORT' })]));
    shipping.departVessel.mockResolvedValue({});
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    fireEvent.click(screen.getByRole('button', { name: 'مغادرة' }));
    fireEvent.click(await screen.findByRole('button', { name: 'تأكيد المغادرة' }));

    await waitFor(() => expect(shipping.departVessel).toHaveBeenCalledWith('vv1', undefined));
    expect(toast.notifySuccess).toHaveBeenCalled();
  });

  it('does not offer departure for an already departed row', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'DEPARTED' })]));
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    expect(screen.queryByRole('button', { name: 'مغادرة' })).toBeNull();
    expect(screen.getByRole('button', { name: 'عرض' })).toBeTruthy();
  });

  it('opens the detail dialog from the view action', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'SCHEDULED' })]));
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    expect(await screen.findByText('تفاصيل الزيارة')).toBeTruthy();
    expect(screen.getByText('تاريخ المغادرة')).toBeTruthy();
  });

  it('shows row values in the detail dialog', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'ARRIVED' })]));
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('IMO-9')).toBeTruthy();
    expect(dialog.getByText('بورتسودان')).toBeTruthy();
    expect(dialog.getByText('وصلت')).toBeTruthy();
  });

  it('requests the filtered page when a status is selected', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'SCHEDULED' })]));
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    const statusFilter = screen.getAllByRole('combobox').find((el) => el.textContent === 'الحالة');
    fireEvent.mouseDown(statusFilter as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: 'وصلت' }));

    await waitFor(() =>
      expect(portHealth.getVesselVisits).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ARRIVED' }),
      ),
    );
  });

  it('sends the entered notes with the departure', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'IN_PORT' })]));
    shipping.departVessel.mockResolvedValue({});
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    fireEvent.click(screen.getByRole('button', { name: 'مغادرة' }));
    fireEvent.change(await screen.findByLabelText('ملاحظات المغادرة'), {
      target: { value: 'اكتمل التفتيش' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد المغادرة' }));

    await waitFor(() =>
      expect(shipping.departVessel).toHaveBeenCalledWith('vv1', 'اكتمل التفتيش'),
    );
  });

  it('shows an error toast when departure fails', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'IN_PORT' })]));
    shipping.departVessel.mockRejectedValue(new Error('boom'));
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    fireEvent.click(screen.getByRole('button', { name: 'مغادرة' }));
    fireEvent.click(await screen.findByRole('button', { name: 'تأكيد المغادرة' }));

    await waitFor(() => expect(toast.notifyError).toHaveBeenCalled());
    expect(toast.notifySuccess).not.toHaveBeenCalled();
  });

  it('does not offer departure for a cancelled row', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'CANCELLED' })]));
    render(<VesselVisitList />);

    await screen.findByText('MV Visit');
    expect(screen.queryByRole('button', { name: 'مغادرة' })).toBeNull();
  });

  it('renders a fallback label for an unknown status', async () => {
    portHealth.getVesselVisits.mockResolvedValue(paged([row({ status: 'WEIRD' })]));
    render(<VesselVisitList />);

    expect(await screen.findByText('غير معروف')).toBeTruthy();
  });

  it('renders — placeholders for missing vessel/port fields', async () => {
    portHealth.getVesselVisits.mockResolvedValue(
      paged([
        row({
          vessel_name: '',
          vessel_imo: '',
          port_name: undefined,
          port: undefined,
          berth_code: undefined,
          arrival_date: undefined,
        }),
      ]),
    );
    render(<VesselVisitList />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    expect(screen.queryByText('بورتسودان')).toBeNull();
  });
});
