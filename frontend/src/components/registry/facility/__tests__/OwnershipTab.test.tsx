import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../../api/endpoints/registry', () => ({
  listFacilityOwnershipsPaginated: vi.fn(),
}));

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'ar', changeLanguage: vi.fn() },
    }),
  };
});

import * as api from '../../../../api/endpoints/registry';
import { OwnershipTab } from '../OwnershipTab';

describe('OwnershipTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list of ownerships', async () => {
    vi.mocked(api.listFacilityOwnershipsPaginated).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 'o1', owner_name: 'مالك' } as any] });
    render(<OwnershipTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('مالك')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    vi.mocked(api.listFacilityOwnershipsPaginated).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<OwnershipTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText(/registry\.facility\.ownership\.empty/i)).toBeInTheDocument());
  });

  it('shows load more button when hasMore', async () => {
    vi.mocked(api.listFacilityOwnershipsPaginated).mockResolvedValue({ count: 2, next: 'next-url', previous: null, results: [{ id: 'o1', owner_name: 'مالك' } as any] });
    render(<OwnershipTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /registry\.common\.load_more/i })).toBeInTheDocument());
  });

  it('hides load more when no more pages', async () => {
    vi.mocked(api.listFacilityOwnershipsPaginated).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 'o1', owner_name: 'مالك' } as any] });
    render(<OwnershipTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('مالك')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /registry\.common\.load_more/i })).not.toBeInTheDocument();
  });
});
