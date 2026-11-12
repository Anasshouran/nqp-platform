vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegistryTreePage from '../RegistryTreePage';

vi.mock('../../../api/endpoints/registry', () => ({
  getRegistryTree: vi.fn(),
  deactivateNode: vi.fn(),
}));

vi.mock('../../../store/hooks', () => ({
  useAppSelector: () => ({ id: 'u1', is_superuser: true, scopes: [] }),
}));

vi.mock('../../../utils/scopes', () => ({
  hasGlobalScope: () => true,
}));

import * as registryApi from '../../../api/endpoints/registry';

const mockTree = [
  { id: 'root-1', kind: 'FEDERAL', code: 'FMOH', name_ar: 'وزارة الصحة', name_en: 'MOH', depth: 0, facility_id: null, children: [
    { id: 'state-1', kind: 'STATE', code: 'KRT', name_ar: 'الخرطوم', name_en: 'Khartoum', depth: 1, facility_id: null, children: [] },
  ] },
];

describe('RegistryTreePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(registryApi.getRegistryTree).mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><RegistryTreePage /></MemoryRouter>);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders tree when data loads', async () => {
    vi.mocked(registryApi.getRegistryTree).mockResolvedValue(mockTree as any);
    render(<MemoryRouter><RegistryTreePage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('وزارة الصحة')).toBeInTheDocument();
    });
  });

  it('renders error state when API fails', async () => {
    vi.mocked(registryApi.getRegistryTree).mockRejectedValue(new Error('API error'));
    render(<MemoryRouter><RegistryTreePage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('renders empty state when tree is empty', async () => {
    vi.mocked(registryApi.getRegistryTree).mockResolvedValue([]);
    render(<MemoryRouter><RegistryTreePage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/registry\.tree\.empty/i)).toBeInTheDocument();
    });
  });

  it('shows scoped banner when no FEDERAL root', async () => {
    const scopedTree = [
      { id: 'state-1', kind: 'STATE', code: 'KRT', name_ar: 'الخرطوم', name_en: 'Khartoum', depth: 0, facility_id: null, children: [] },
    ];
    vi.mocked(registryApi.getRegistryTree).mockResolvedValue(scopedTree as any);
    render(<MemoryRouter><RegistryTreePage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/registry\.tree\.banner\.scoped/i)).toBeInTheDocument();
    });
  });

  it('opens create modal when global user clicks create', async () => {
    vi.mocked(registryApi.getRegistryTree).mockResolvedValue(mockTree as any);
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<MemoryRouter><RegistryTreePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('وزارة الصحة')).toBeInTheDocument());
    const createBtn = screen.getByRole('button', { name: /registry\.nodes\.create\.button/i });
    await user.click(createBtn);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});
