/**
 * Public portal pages — language-switch reactivity (I18N Phase 2a, batch 2).
 *
 * Phase 2a migrates the six public portal pages (GatewayHub, Director,
 * SectorDetail, SectorsPorts, Contact, Documents) from hardcoded Arabic text
 * to t() keys under the shared `public` namespace. Each test renders one page,
 * asserts the Arabic text, calls i18n.changeLanguage('en') WITHOUT remounting,
 * and asserts the English translation of the same node appears — proving
 * constants live in useMemo dependent on t and react to language changes.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import i18n from '../../i18n';

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
});

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: () => false,
}));

const publicApi = vi.hoisted(() => ({
  getSectors: vi.fn(),
  getPorts: vi.fn(),
  getSector: vi.fn(),
  getSectorPorts: vi.fn(),
  getDirectorProfile: vi.fn(),
  getDocuments: vi.fn(),
  sendContactMessage: vi.fn(),
  getPublicStatistics: vi.fn(),
  getNews: vi.fn(),
  getNotices: vi.fn(),
}));
vi.mock('../../api/endpoints/public', () => publicApi);

const servicesApi = vi.hoisted(() => ({
  getServiceCategories: vi.fn(),
}));
vi.mock('../../api/endpoints/services', () => servicesApi);

import GatewayHubPage from './GatewayHubPage';
import DirectorPage from './DirectorPage';
import SectorDetailPage from './SectorDetailPage';
import SectorsPortsPage from './SectorsPortsPage';
import ContactPage from './ContactPage';
import DocumentsPage from './DocumentsPage';

const renderPage = (ui: ReactElement, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('ar');
});

afterEach(async () => {
  // أعد اللغة العربية حتى لا تتسرب حالة الاختبار إلى بقية الحزمة.
  await i18n.changeLanguage('ar');
});

describe('public portal pages react to language change', () => {
  it('GatewayHub — GATEWAYS cards + PageHeader constants update on language switch', async () => {
    publicApi.getSectors.mockResolvedValue({ data: { data: [] } });
    publicApi.getPorts.mockResolvedValue({ data: { data: [] } });

    renderPage(<GatewayHubPage />);

    expect(await screen.findByText('بوابة المسافر')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Traveler Gateway')).toBeTruthy();
  });

  it('Director — fallback profile + chip constants update on language switch', async () => {
    publicApi.getDirectorProfile.mockRejectedValue(new Error('no profile'));

    renderPage(<DirectorPage />);

    expect(await screen.findByText('المدير العام')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Director General')).toBeTruthy();
  });

  it('SectorDetail — not-found branch constants update on language switch', async () => {
    publicApi.getSector.mockResolvedValue({ data: { data: null } });
    publicApi.getSectorPorts.mockResolvedValue({ data: { data: [] } });
    publicApi.getSectors.mockResolvedValue({ data: { data: [] } });
    publicApi.getPublicStatistics.mockResolvedValue({ data: { data: {} } });
    publicApi.getNews.mockResolvedValue([]);
    publicApi.getNotices.mockResolvedValue({ data: { data: [] } });
    servicesApi.getServiceCategories.mockResolvedValue({ data: { data: [] } });

    renderPage(
      <Routes>
        <Route path="/sectors/:id" element={<SectorDetailPage />} />
      </Routes>,
      '/sectors/khartoum',
    );

    expect(await screen.findByText('القطاع غير متاح')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Sector unavailable')).toBeTruthy();
  });

  it('SectorsPorts — PageHeader constants update on language switch', async () => {
    publicApi.getSectors.mockResolvedValue({ data: { data: [] } });
    publicApi.getPorts.mockResolvedValue({ data: { data: [] } });

    renderPage(<SectorsPortsPage />);

    expect(await screen.findByText('القطاعات والمنافذ')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Sectors and entry points')).toBeTruthy();
  });

  it('Contact — PageHeader constants update on language switch', async () => {
    renderPage(<ContactPage />);

    expect(await screen.findByText('اتصل بنا')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Contact us')).toBeTruthy();
  });

  it('Documents — PageHeader constants update on language switch', async () => {
    publicApi.getDocuments.mockResolvedValue([]);

    renderPage(<DocumentsPage />);

    expect(await screen.findByText('مركز الوثائق')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Document Center')).toBeTruthy();
  });
});