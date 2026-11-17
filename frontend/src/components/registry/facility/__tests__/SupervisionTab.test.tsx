import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../../../../api/endpoints/registry', () => ({
  listTechnicalSupervisionsPaginated: vi.fn(),
}));

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t, i18n: { language: 'ar', changeLanguage: vi.fn() } }) };
});

import * as api from '../../../../api/endpoints/registry';
import { SupervisionTab } from '../SupervisionTab';

describe('SupervisionTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list', async () => {
    vi.mocked(api.listTechnicalSupervisionsPaginated).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 's1', supervisor_name: 'مشرف' } as any] });
    render(<SupervisionTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('مشرف')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    vi.mocked(api.listTechnicalSupervisionsPaginated).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<SupervisionTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText(/registry\.facility\.supervision\.empty/i)).toBeInTheDocument());
  });

  it('shows load more button when hasMore', async () => {
    vi.mocked(api.listTechnicalSupervisionsPaginated).mockResolvedValue({ count: 2, next: 'next-url', previous: null, results: [{ id: 's1', supervisor_name: 'مشرف' } as any] });
    render(<SupervisionTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /registry\.common\.load_more/i })).toBeInTheDocument());
  });

  it('hides load more when no more pages', async () => {
    vi.mocked(api.listTechnicalSupervisionsPaginated).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 's1', supervisor_name: 'مشرف' } as any] });
    render(<SupervisionTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('مشرف')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /registry\.common\.load_more/i })).not.toBeInTheDocument();
  });

  it('sends page=1 on initial load', async () => {
    vi.mocked(api.listTechnicalSupervisionsPaginated).mockResolvedValue({ count: 120, next: 'next', previous: null, results: [] });
    render(<SupervisionTab facilityId="fac-1" />);
    await waitFor(() => {
      expect(api.listTechnicalSupervisionsPaginated).toHaveBeenCalledWith('fac-1', 1);
    });
  });
  it('loads page 2 when load more is clicked', async () => {
    vi.mocked(api.listTechnicalSupervisionsPaginated)
      .mockResolvedValueOnce({ count: 2, next: 'next-url', previous: null, results: [{ id: 'x1', supervisor_name: 'مشرف' } as any] })
      .mockResolvedValueOnce({ count: 2, next: null, previous: null, results: [{ id: 'x2', supervisor_name: 'مشرف٢' } as any] });
    render(<SupervisionTab facilityId="fac-1" />);
    const btn = await screen.findByRole('button', { name: /registry\.common\.load_more/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(api.listTechnicalSupervisionsPaginated).toHaveBeenCalledWith('fac-1', 2);
    });
    await waitFor(() => expect(screen.getByText('مشرف٢')).toBeInTheDocument());
  });
});
