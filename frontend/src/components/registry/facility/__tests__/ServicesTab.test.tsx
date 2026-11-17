import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../../../../api/endpoints/registry', () => ({
  listServiceAvailabilityPaginated: vi.fn(),
}));

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t, i18n: { language: 'ar', changeLanguage: vi.fn() } }) };
});

import * as api from '../../../../api/endpoints/registry';
import { ServicesTab } from '../ServicesTab';

describe('ServicesTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list', async () => {
    vi.mocked(api.listServiceAvailabilityPaginated).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 'sv1', service_name: 'خدمة' } as any] });
    render(<ServicesTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('خدمة')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    vi.mocked(api.listServiceAvailabilityPaginated).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<ServicesTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText(/registry\.facility\.services\.empty/i)).toBeInTheDocument());
  });

  it('shows load more button when hasMore', async () => {
    vi.mocked(api.listServiceAvailabilityPaginated).mockResolvedValue({ count: 2, next: 'next-url', previous: null, results: [{ id: 'sv1', service_name: 'خدمة' } as any] });
    render(<ServicesTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /registry\.common\.load_more/i })).toBeInTheDocument());
  });

  it('hides load more when no more pages', async () => {
    vi.mocked(api.listServiceAvailabilityPaginated).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 'sv1', service_name: 'خدمة' } as any] });
    render(<ServicesTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('خدمة')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /registry\.common\.load_more/i })).not.toBeInTheDocument();
  });

  it('sends page=1 on initial load', async () => {
    vi.mocked(api.listServiceAvailabilityPaginated).mockResolvedValue({ count: 120, next: 'next', previous: null, results: [] });
    render(<ServicesTab facilityId="fac-1" />);
    await waitFor(() => {
      expect(api.listServiceAvailabilityPaginated).toHaveBeenCalledWith('fac-1', 1);
    });
  });
  it('loads page 2 when load more is clicked', async () => {
    vi.mocked(api.listServiceAvailabilityPaginated)
      .mockResolvedValueOnce({ count: 2, next: 'next-url', previous: null, results: [{ id: 'x1', service_name: 'خدمة' } as any] })
      .mockResolvedValueOnce({ count: 2, next: null, previous: null, results: [{ id: 'x2', service_name: 'خدمة٢' } as any] });
    render(<ServicesTab facilityId="fac-1" />);
    const btn = await screen.findByRole('button', { name: /registry\.common\.load_more/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(api.listServiceAvailabilityPaginated).toHaveBeenCalledWith('fac-1', 2);
    });
    await waitFor(() => expect(screen.getByText('خدمة٢')).toBeInTheDocument());
  });
});
