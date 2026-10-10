import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCarrierDocuments, getFlight, getFlightTimeline } from '../../api/endpoints/carriers';

const CarrierFlightDetailPage = (await import('./CarrierFlightDetailPage')).default;

vi.mock('../../api/endpoints/carriers', () => ({
  getFlight: vi.fn(),
  getFlightTimeline: vi.fn(),
  getCarrierDocuments: vi.fn(),
}));

const flight = {
  id: 'f-1',
  flight_number: 'SD123',
  carrier_name: 'Sudan Airways',
  flight_type: 'INTERNATIONAL',
  origin_country_name: 'السودان',
  destination_port_name: 'ميناء بورتسودان',
  scheduled_departure: '2026-10-03T06:00:00Z',
  scheduled_arrival: '2026-10-03T10:00:00Z',
  status: 'SCHEDULED',
  aircraft_type: 'B737',
  crew_count: 6,
  created_at: '2026-10-01T08:00:00Z',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/app/carrier/flights/f-1']}>
      <Routes>
        <Route path="/app/carrier/flights/:id" element={<CarrierFlightDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCarrierDocuments).mockResolvedValue({ data: { data: { count: 0, results: [] } } } as never);
});

describe('CarrierFlightDetailPage', () => {
  it('يعرض تفاصيل الرحلة وسجل الأحداث من الـ API', async () => {
    vi.mocked(getFlight).mockResolvedValue({ data: { data: flight } } as never);
    vi.mocked(getFlightTimeline).mockResolvedValue({
      data: {
        data: {
          flight_id: 'f-1',
          events: [
            {
              event_type: 'flight_status_changed',
              timestamp: '2026-10-02T09:00:00Z',
              title: 'تحديث حالة الرحلة',
              category: 'operational',
              from_status: 'SCHEDULED',
              to_status: 'IN_TRANSIT',
              status: 'IN_TRANSIT',
              actor_name: 'منسق شركة',
              source_id: 'log-1',
              source_type: 'flight_status_log',
            },
          ],
        },
      },
    } as never);

    renderPage();

    await waitFor(() => expect(getFlight).toHaveBeenCalledWith('f-1'));
    expect(getFlightTimeline).toHaveBeenCalledWith('f-1');
    expect(await screen.findByText('تفاصيل الرحلة SD123')).toBeTruthy();
    expect(screen.getByText('المستندات')).toBeTruthy();
    expect(screen.getByText('لا توجد مستندات مرتبطة بهذه الرحلة')).toBeTruthy();
    expect(screen.getByText('B737')).toBeTruthy();
    expect(screen.getByText('تحديث حالة الرحلة')).toBeTruthy();
    expect(screen.getByText(/IN_TRANSIT/)).toBeTruthy();
  });

  it('يعرض حالة الإقرار الصحي حين تتوفر في السجل', async () => {
    vi.mocked(getFlight).mockResolvedValue({ data: { data: flight } } as never);
    vi.mocked(getFlightTimeline).mockResolvedValue({
      data: {
        data: {
          flight_id: 'f-1',
          events: [
            {
              event_type: 'health_declaration_status_changed',
              timestamp: '2026-10-02T09:00:00Z',
              title: 'تحديث حالة الإقرار الصحي',
              category: 'health',
              to_status: 'APPROVED',
              status: 'APPROVED',
              source_id: 'log-2',
              source_type: 'health_declaration_log',
            },
          ],
        },
      },
    } as never);

    renderPage();

    await waitFor(() => expect(getFlightTimeline).toHaveBeenCalledWith('f-1'));
    expect(screen.getByText('حالة الإقرار الصحي:').parentElement?.textContent).toContain('APPROVED');
  });

  it('يعرض حالة عدم وجود أحداث', async () => {
    vi.mocked(getFlight).mockResolvedValue({ data: { data: flight } } as never);
    vi.mocked(getFlightTimeline).mockResolvedValue({
      data: { data: { flight_id: 'f-1', events: [] } },
    } as never);

    renderPage();

    expect(await screen.findByText('لا توجد أحداث مسجلة لهذه الرحلة')).toBeTruthy();
  });

  it('يعرض حالة التحميل', () => {
    vi.mocked(getFlight).mockReturnValue(new Promise(() => {}) as never);
    vi.mocked(getFlightTimeline).mockReturnValue(new Promise(() => {}) as never);

    renderPage();

    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('يعرض رسالة خطأ عند فشل التحميل', async () => {
    vi.mocked(getFlight).mockRejectedValue(new Error('boom') as never);
    vi.mocked(getFlightTimeline).mockResolvedValue({
      data: { data: { flight_id: 'f-1', events: [] } },
    } as never);

    renderPage();

    expect(await screen.findByText('تعذر تحميل تفاصيل الرحلة')).toBeTruthy();
  });
});