/**
 * Public services pages — language-switch reactivity (I18N Phase 2a, batch 3).
 *
 * Phase 2a migrates the six public service pages (LabResultsLookup,
 * TravelRequirements, SmartServices, Service, ServicesCatalog, Notices)
 * from hardcoded Arabic text to t() keys under the shared `public`
 * namespace. Each test renders one page, asserts the Arabic text, calls
 * i18n.changeLanguage('en') WITHOUT remounting, and asserts the English
 * translation of the same node appears — proving constants live in
 * useMemo dependent on t and react to language changes.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import i18n from '../../i18n';
import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';

// LabResultsLookup يستخدم useAuth (Redux) — يغلّف الصفحات Provider بمتجهات حقيقية.
const makeStore = () =>
  configureStore({ reducer: { auth: authReducer, ui: uiReducer } });

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
  lookupLabResult: vi.fn(),
  getTravelRequirements: vi.fn(),
  getCountries: vi.fn(),
  getNotices: vi.fn(),
}));
vi.mock('../../api/endpoints/public', () => publicApi);

const servicesApi = vi.hoisted(() => ({
  getServiceCategories: vi.fn(),
  getService: vi.fn(),
}));
vi.mock('../../api/endpoints/services', () => servicesApi);

import LabResultsLookupPage from './LabResultsLookupPage';
import TravelRequirementsPage from './TravelRequirementsPage';
import SmartServicesPage from './SmartServicesPage';
import ServicePage from './ServicePage';
import ServicesCatalogPage from './ServicesCatalogPage';
import NoticesPage from './NoticesPage';

const renderPage = (ui: ReactElement) =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('ar');
});

afterEach(async () => {
  // أعد اللغة العربية حتى لا تتسرب حالة الاختبار إلى بقية الحزمة.
  await i18n.changeLanguage('ar');
});

describe('public services pages react to language change', () => {
  it('LabResultsLookup — PageHeader constants update on language switch', async () => {
    renderPage(<LabResultsLookupPage />);

    expect(await screen.findByText('نتائج التحاليل المخبرية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Laboratory test results')).toBeTruthy();
  });

  it('TravelRequirements — PageHeader constants update on language switch', async () => {
    publicApi.getCountries.mockResolvedValue({ data: { data: [] } });
    publicApi.getTravelRequirements.mockResolvedValue({ data: { data: [] } });

    renderPage(<TravelRequirementsPage />);

    expect(await screen.findByText('✈️ متطلبات السفر')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('✈️ Travel requirements')).toBeTruthy();
  });

  it('SmartServices — PageHeader + serviceGroups constants update on language switch', async () => {
    renderPage(<SmartServicesPage />);

    expect(await screen.findByText('الخدمات الذكية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Smart services')).toBeTruthy();
  });

  it('Service — not-found branch constants update on language switch', async () => {
    servicesApi.getService.mockResolvedValue({ data: { data: null } });

    renderPage(<ServicePage serviceCode="lab-lookup" />);

    expect(await screen.findByText('العودة إلى الخدمات')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Back to services')).toBeTruthy();
  });

  it('ServicesCatalog — PageHeader constants update on language switch', async () => {
    servicesApi.getServiceCategories.mockResolvedValue({ data: { data: [] } });

    renderPage(<ServicesCatalogPage />);

    expect(await screen.findByText('جميع الخدمات')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('All services')).toBeTruthy();
  });

  it('Notices — PageHeader constants update on language switch', async () => {
    publicApi.getNotices.mockResolvedValue({ data: { data: [] } });

    renderPage(<NoticesPage />);

    expect(await screen.findByText('الإشعارات والتنبيهات الصحية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Notifications and health alerts')).toBeTruthy();
  });
});