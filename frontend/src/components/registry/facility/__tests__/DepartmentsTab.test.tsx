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
  listDepartmentAssignments: vi.fn(),
}));

import * as api from '../../../../api/endpoints/registry';
import { DepartmentsTab } from '../DepartmentsTab';

describe('DepartmentsTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders list', async () => {
    vi.mocked(api.listDepartmentAssignments).mockResolvedValue([{ id: 'd1', department_name: 'قسم' } as any]);
    render(<DepartmentsTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText('قسم')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    vi.mocked(api.listDepartmentAssignments).mockResolvedValue([]);
    render(<DepartmentsTab facilityId="fac-1" />);
    await waitFor(() => expect(screen.getByText(/registry\.facility\.departments\.empty/i)).toBeInTheDocument());
  });
});
