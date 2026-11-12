vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'ar', changeLanguage: vi.fn() },
    }),
  };
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../../api/endpoints/registry', () => ({
  listServiceAvailability: vi.fn(),
}));

import * as api from '../../../../api/endpoints/registry';
import { ServicesTab } from '../ServicesTab';

describe('ServicesTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list', async () => {
    vi.mocked(api.listServiceAvailability).mockResolvedValue([{ id: 'sv1', service_name: 'خدمة' } as any]);
    render(<ServicesTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('خدمة')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    vi.mocked(api.listServiceAvailability).mockResolvedValue([]);
    render(<ServicesTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText(/registry\.facility\.services\.empty/i)).toBeInTheDocument());
  });
});
