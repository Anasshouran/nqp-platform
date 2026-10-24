/**
 * Public misc pages — language-switch reactivity (I18N Phase 2a, batch 5 — final).
 *
 * Phase 2a migrates the seven public misc pages (News, NewsDetail, Circulars,
 * CircularDetail, Faq, Indicators, Assistant) from hardcoded Arabic text to
 * t() keys under the shared `public` namespace, completing Phase 2a (all 31
 * public-facing pages). Each test renders one page, asserts the Arabic text,
 * calls i18n.changeLanguage('en') WITHOUT remounting, and asserts the English
 * translation of the same node appears — proving the memoized constants
 * depend on t and react to language changes.
 *
 * No logic is wrapped in t() (Batch 3 lesson): includes/filter/if/input
 * processing were audited — none of them entered a t() call.
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

// jsdom does not implement scrollIntoView (SmartAssistant uses it on mount).
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

// ---- API / dependency mocks (pages never hit the network in tests) ----
// News/Circulars/Indicators use useApi(getX) — mock the hook itself.
const useApi = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useApi', () => ({ useApi: (...args: unknown[]) => useApi(...args) }));

// Detail pages + Faq import endpoint functions directly.
const publicApi = vi.hoisted(() => ({
  getNews: vi.fn(),
  getNewsById: vi.fn(),
  getCirculars: vi.fn(),
  getCircularById: vi.fn(),
  getFaq: vi.fn(),
}));
vi.mock('../../api/endpoints/public', () => publicApi);

// Assistant page + SmartAssistant (mounted inside it) — provide every value
// export the components import, with safe default promises.
const assistantApi = vi.hoisted(() => ({
  chatAssistant: vi.fn(),
  getAssistantSuggestions: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getAssistantTopics: vi.fn().mockResolvedValue({ data: { data: [] } }),
  submitAssistantFeedback: vi.fn(),
}));
vi.mock('../../api/endpoints/assistant', () => assistantApi);

import NewsPage from './NewsPage';
import NewsDetailPage from './NewsDetailPage';
import CircularsPage from './CircularsPage';
import CircularDetailPage from './CircularDetailPage';
import FaqPage from './FaqPage';
import IndicatorsPage from './IndicatorsPage';
import AssistantPage from './AssistantPage';

const renderPage = (ui: ReactElement, routePath?: string) =>
  render(
    <MemoryRouter initialEntries={[routePath ? routePath.replace(':id', '1') : '/']}>
      <ThemeProvider theme={createTheme()}>
        {routePath ? (
          <Routes>
            <Route path={routePath} element={ui} />
          </Routes>
        ) : (
          ui
        )}
      </ThemeProvider>
    </MemoryRouter>,
  );

const emptyList = () =>
  useApi.mockReturnValue({ data: [], loading: false, error: null, retry: vi.fn() });

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('ar');
});

afterEach(async () => {
  // Restore Arabic so language state never leaks into other suites.
  await i18n.changeLanguage('ar');
});

describe('public misc pages react to language change', () => {
  it('News — PageHeader constants update on switch', async () => {
    emptyList();
    renderPage(<NewsPage />);

    expect(await screen.findByText('الأخبار والإعلانات')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('News & Announcements')).toBeTruthy();
  });

  it('NewsDetail — PageHeader constants update on switch', async () => {
    publicApi.getNewsById.mockResolvedValue(null);
    publicApi.getNews.mockResolvedValue([]);

    renderPage(<NewsDetailPage />, '/news/:id');

    expect(await screen.findByText('تفاصيل الخبر')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('News details')).toBeTruthy();
  });

  it('Circulars — PageHeader constants update on switch', async () => {
    emptyList();
    renderPage(<CircularsPage />);

    expect(await screen.findByText('التعميمات')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Circulars')).toBeTruthy();
  });

  it('CircularDetail — back link + not-found EmptyState update on switch', async () => {
    publicApi.getCircularById.mockResolvedValue(null);

    renderPage(<CircularDetailPage />, '/circulars/:id');

    expect(await screen.findByText('العودة إلى التعميمات')).toBeTruthy();
    expect(await screen.findByText('التعميم غير متاح')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Back to circulars')).toBeTruthy();
    expect(await screen.findByText('Circular unavailable')).toBeTruthy();
  });

  it('Faq — PageHeader constants update on switch', async () => {
    publicApi.getFaq.mockResolvedValue([]);

    renderPage(<FaqPage />);

    expect(await screen.findByText('الأسئلة الشائعة')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Frequently asked questions')).toBeTruthy();
  });

  it('Indicators — PageHeader constants update on switch', async () => {
    useApi.mockReturnValue({ data: null, loading: false, error: null, retry: vi.fn() });

    renderPage(<IndicatorsPage />);

    expect(await screen.findByText('المؤشرات العامة')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('General indicators')).toBeTruthy();
  });

  it('Assistant — hero + heroTopics memo constants update on switch', async () => {
    renderPage(<AssistantPage />);

    expect(await screen.findByText('المساعد الذكي')).toBeTruthy();
    expect(await screen.findByText('الإرشادات الصحية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Smart Assistant')).toBeTruthy();
    expect(await screen.findByText('Health guidance')).toBeTruthy();
  });
});
