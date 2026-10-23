/**
 * Public hero pages — language-switch reactivity (I18N Phase 2a, batch 1).
 *
 * Phase 2a migrates the six public hero pages (VectorServices, About, Home,
 * Partners, Privacy, Terms) from hardcoded Arabic text to t() keys under the
 * `public` namespace. Each test renders one page, asserts the Arabic text,
 * calls i18n.changeLanguage('en') WITHOUT remounting, and asserts the English
 * translation of the same node appears — proving constants live in useMemo
 * dependent on t and react to language changes.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
  getCmsPage: vi.fn(),
  getDirectorProfile: vi.fn(),
  getNews: vi.fn(),
  getCirculars: vi.fn(),
  getPorts: vi.fn(),
  getPublicStatistics: vi.fn(),
  submitCarrierRegistration: vi.fn(),
}));
vi.mock('../../api/endpoints/public', () => publicApi);

// Home renders react-leaflet (MapContainer/Marker/…); jsdom has no map engine,
// so the leaflet React bindings are replaced with inert DOM stubs.
vi.mock('react-leaflet', async () => {
  const React = await import('react');
  const stub = (name: string) => {
    type Props = { children?: import('react').ReactNode };
    function Stub({ children }: Props) {
      return React.createElement('div', { 'data-testid': name }, children);
    }
    return Stub;
  };
  return {
    MapContainer: stub('map-container'),
    Marker: stub('map-marker'),
    Tooltip: stub('map-tooltip'),
    Popup: stub('map-popup'),
    TileLayer: stub('map-tilelayer'),
    useMap: () => ({
      fitBounds: vi.fn(),
      flyTo: vi.fn(),
      setView: vi.fn(),
      getZoom: () => 10,
      getBounds: () => ({ extend: () => ({ isValid: () => false }) }),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    }),
  };
});

import VectorServicesPage from './VectorServicesPage';
import AboutPage from './AboutPage';
import HomePage from './HomePage';
import PartnersPage from './PartnersPage';
import PrivacyPage from './PrivacyPage';
import TermsPage from './TermsPage';

const renderPage = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/']}>
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

describe('public hero pages react to language change', () => {
  it('VectorServices (info) — PageHeader/CONTENT constants update on language switch', async () => {
    renderPage(<VectorServicesPage variant="info" />);

    expect(await screen.findByText('معلومات مكافحة النواقل')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Vector control information')).toBeTruthy();
  });

  it('About — PageHeader title updates on language switch', async () => {
    publicApi.getCmsPage.mockRejectedValue(new Error('no cms'));
    publicApi.getDirectorProfile.mockRejectedValue(new Error('no profile'));

    renderPage(<AboutPage />);

    expect(await screen.findByText('من نحن')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Who we are')).toBeTruthy();
  });

  it('Home — hero constants update on language switch', async () => {
    publicApi.getNews.mockResolvedValue([]);
    publicApi.getCirculars.mockResolvedValue([]);
    publicApi.getPorts.mockResolvedValue({ data: { data: [] } });
    publicApi.getPublicStatistics.mockResolvedValue({ data: { data: {} } });

    renderPage(<HomePage />);

    expect(await screen.findByText('منصة الحجر الصحي القومي الرقمية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('The digital National Quarantine Platform')).toBeTruthy();
  });

  it('Partners — PageHeader constants update on language switch', async () => {
    renderPage(<PartnersPage />);

    expect(await screen.findByText('بوابة الشركات')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Companies portal')).toBeTruthy();
  });

  it('Privacy — PageHeader title updates on language switch', async () => {
    publicApi.getCmsPage.mockRejectedValue(new Error('no cms'));

    renderPage(<PrivacyPage />);

    expect(await screen.findByText('سياسة الخصوصية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Privacy policy')).toBeTruthy();
  });

  it('Terms — fallback sections (useMemo) update on language switch', async () => {
    publicApi.getCmsPage.mockRejectedValue(new Error('no cms'));

    renderPage(<TermsPage />);

    expect(await screen.findByText('بيعة الخدمة')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Service pledge')).toBeTruthy();
  });
});