import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lookupTraveler } from '../../api/endpoints/public';

const RequestTrackingPage = (await import('./RequestTrackingPage')).default;

vi.mock('../../api/endpoints/public', () => ({ lookupTraveler: vi.fn() }));
vi.mock('../../api/endpoints/travelers', () => ({
  getTravelerStatus: vi.fn(),
  getTravelerQr: vi.fn(),
  refreshTravelerQr: vi.fn(),
  getTravelerTimeline: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lookupTraveler).mockResolvedValue({
    data: {
      data: {
        found: true,
        traveler_id: 't1',
        registration_status: 'UNDER_REVIEW',
        qr_issued: false,
      },
    },
  } as never);
  vi.mocked(lookupTraveler).mockClear();
});

const setup = () =>
  render(
    <MemoryRouter>
      <RequestTrackingPage />
    </MemoryRouter>,
  );

describe('RequestTrackingPage — دلالة شريط التقدم', () => {
  it('يعرض شريط تقدم بدلالة progressbar وقيم aria صحيحة', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/رقم جواز السفر|الجواز/i), { target: { value: 'P12345' } });
    fireEvent.change(screen.getByLabelText(/تاريخ الميلاد/i), { target: { value: '1990-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /بحث|تتبع/i }));

    await waitFor(() => expect(lookupTraveler).toHaveBeenCalled());

    const bar = await screen.findByRole('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0);
    expect(bar.getAttribute('aria-label')).toBeTruthy();
  });
});