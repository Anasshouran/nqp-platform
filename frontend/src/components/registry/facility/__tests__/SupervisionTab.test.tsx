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
  listTechnicalSupervisions: vi.fn(),
}));

import * as api from '../../../../api/endpoints/registry';
import { SupervisionTab } from '../SupervisionTab';

describe('SupervisionTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list', async () => {
    vi.mocked(api.listTechnicalSupervisions).mockResolvedValue([{ id: 's1', supervisor_name: 'مشرف' } as any]);
    render(<SupervisionTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('مشرف')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    vi.mocked(api.listTechnicalSupervisions).mockResolvedValue([]);
    render(<SupervisionTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText(/registry\.facility\.supervision\.empty/i)).toBeInTheDocument());
  });
});
