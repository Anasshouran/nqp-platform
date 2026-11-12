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
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FacilityDetailPage from '../FacilityDetailPage';

vi.mock('../../../api/endpoints/registry', () => ({
  getNode: vi.fn(),
  listFacilityAssignments: vi.fn(),
  listNodes: vi.fn(),
  getFacilitySummary: vi.fn(),
  listFacilityOwnerships: vi.fn(),
  listFacilityOwnershipsPaginated: vi.fn(),
  listTechnicalSupervisions: vi.fn(),
  listServiceAvailability: vi.fn(),
  listDepartmentAssignments: vi.fn(),
}));

import * as registryApi from '../../../api/endpoints/registry';

const assignment = { id: 'a1', facility: 'fac-1', facility_name: 'منشأة', node: 'node-1', valid_from: '2026-01-01', valid_to: null, is_primary: true };

describe('FacilityDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders 6 tabs', async () => {
    vi.mocked(registryApi.listFacilityAssignments).mockResolvedValue([assignment as any]);
    vi.mocked(registryApi.getFacilitySummary).mockResolvedValue({ id: 'fac-1', name_ar: 'منشأة', code: 'F1' } as any);
    vi.mocked(registryApi.getNode).mockResolvedValue({ id: 'node-1', kind: 'FACILITY', code: 'N1', name_ar: 'عقدة' } as any);
    vi.mocked(registryApi.listNodes).mockResolvedValue([]);
    vi.mocked(registryApi.listFacilityOwnerships).mockResolvedValue([]);
    vi.mocked(registryApi.listTechnicalSupervisions).mockResolvedValue([]);
    vi.mocked(registryApi.listServiceAvailability).mockResolvedValue([]);
    vi.mocked(registryApi.listDepartmentAssignments).mockResolvedValue([]);
    vi.mocked(registryApi.listFacilityOwnershipsPaginated).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<MemoryRouter initialEntries={['/app/registry/facilities/fac-1']}><Routes><Route path="/app/registry/facilities/:id" element={<FacilityDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it('switching tabs renders corresponding content', async () => {
    vi.mocked(registryApi.listFacilityAssignments).mockResolvedValue([assignment as any]);
    vi.mocked(registryApi.getFacilitySummary).mockResolvedValue({ id: 'fac-1', name_ar: 'منشأة', code: 'F1' } as any);
    vi.mocked(registryApi.getNode).mockResolvedValue({ id: 'node-1', kind: 'FACILITY', code: 'N1', name_ar: 'عقدة' } as any);
    vi.mocked(registryApi.listNodes).mockResolvedValue([]);
    vi.mocked(registryApi.listFacilityOwnerships).mockResolvedValue([]);
    vi.mocked(registryApi.listTechnicalSupervisions).mockResolvedValue([]);
    vi.mocked(registryApi.listServiceAvailability).mockResolvedValue([]);
    vi.mocked(registryApi.listDepartmentAssignments).mockResolvedValue([]);
    vi.mocked(registryApi.listFacilityOwnershipsPaginated).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<MemoryRouter initialEntries={['/app/registry/facilities/fac-1']}><Routes><Route path="/app/registry/facilities/:id" element={<FacilityDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(6));
    await user.click(screen.getAllByRole('tab')[1]);
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows not-found when assignment missing', async () => {
    vi.mocked(registryApi.listFacilityAssignments).mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/app/registry/facilities/fac-x']}><Routes><Route path="/app/registry/facilities/:id" element={<FacilityDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('renders facility header with name', async () => {
    vi.mocked(registryApi.listFacilityAssignments).mockResolvedValue([assignment as any]);
    vi.mocked(registryApi.getFacilitySummary).mockResolvedValue({ id: 'fac-1', name_ar: 'منشأة تجريبية', code: 'F1' } as any);
    vi.mocked(registryApi.getNode).mockResolvedValue({ id: 'node-1', kind: 'FACILITY', code: 'N1', name_ar: 'عقدة' } as any);
    vi.mocked(registryApi.listNodes).mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/app/registry/facilities/fac-1']}><Routes><Route path="/app/registry/facilities/:id" element={<FacilityDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('منشأة تجريبية').length).toBeGreaterThan(0));
  });

  it('shows error state when getFacilitySummary fails (still renders via assignment)', async () => {
    vi.mocked(registryApi.listFacilityAssignments).mockResolvedValue([assignment as any]);
    vi.mocked(registryApi.getFacilitySummary).mockRejectedValue(new Error('boom'));
    vi.mocked(registryApi.getNode).mockResolvedValue({ id: 'node-1', kind: 'FACILITY', code: 'N1', name_ar: 'عقدة' } as any);
    vi.mocked(registryApi.listNodes).mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/app/registry/facilities/fac-1']}><Routes><Route path="/app/registry/facilities/:id" element={<FacilityDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('منشأة')).toBeInTheDocument());
  });
});
