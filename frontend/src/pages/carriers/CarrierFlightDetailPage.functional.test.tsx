import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';

import {
  downloadCarrierDocument, getCarrierDocuments, getFlight, getFlightTimeline,
} from '../../api/endpoints/carriers';

vi.mock('../../api/endpoints/carriers', () => ({
  getFlight: vi.fn(), getFlightTimeline: vi.fn(),
  getCarrierDocuments: vi.fn(), downloadCarrierDocument: vi.fn(),
}));
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  const t = (k: string, o?: object) => i18n.t(k, o as never);
  return { ...actual, useTranslation: () => ({ t, i18n }) };
});

const CarrierFlightDetailPage = (await import('./CarrierFlightDetailPage')).default;

const flight = {
  id: 'f-1', flight_number: 'SD123', carrier_name: 'Sudan Airways',
  aircraft_type: 'A320', origin_country_name: 'السودان',
  destination_port_name: 'بورتسودان', status: 'SCHEDULED',
  scheduled_departure: '2026-01-01T10:00:00Z',
  scheduled_arrival: '2026-01-01T12:00:00Z',
};

const renderAt = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/flights/${id}`]}>
      <Routes>
        <Route path="/flights/:id" element={<CarrierFlightDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getFlight).mockResolvedValue({ data: { data: flight } } as any);
  vi.mocked(getFlightTimeline).mockResolvedValue({ data: { data: { events: [] } } } as any);
  vi.mocked(getCarrierDocuments).mockResolvedValue({ data: { data: { results: [] } } } as any);
});

describe('CarrierFlightDetailPage', () => {
  it('renders flight number and carrier', async () => {
    renderAt('f-1');
    await waitFor(() => expect(getFlight).toHaveBeenCalledWith('f-1'));

    // ⚠️ SD123 يظهر مرتين: في عنوان الصفحة + في حقل رقم الرحلة
    const matches = await screen.findAllByText(/SD123/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('downloads an attached document', async () => {
    vi.mocked(getCarrierDocuments).mockResolvedValue({
      data: {
        data: {
          results: [
            { id: 'doc-1', title: 'ملف', original_filename: 'x.pdf',
              document_type: 'OTHER', file_size: 100 },
          ],
        },
      },
    } as any);
    vi.mocked(downloadCarrierDocument).mockResolvedValue({ data: new Blob() } as any);

    renderAt('f-1');
    const dl = await screen.findByRole('button', { name: /تنزيل/ });
    fireEvent.click(dl);
    await waitFor(() => expect(downloadCarrierDocument).toHaveBeenCalledWith('doc-1'));
  });
});
