vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../../api/endpoints/registry', () => ({
  listFacilityOwnerships: vi.fn(),
}));

import * as api from '../../../../api/endpoints/registry';
import { OwnershipTab } from '../OwnershipTab';

describe('OwnershipTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list of ownerships', async () => {
    vi.mocked(api.listFacilityOwnerships).mockResolvedValue([{ id: 'o1', owner_name: 'مالك' } as any]);
    render(<OwnershipTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('مالك')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    vi.mocked(api.listFacilityOwnerships).mockResolvedValue([]);
    render(<OwnershipTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText(/registry\.facility\.ownership\.empty/i)).toBeInTheDocument());
  });
});
