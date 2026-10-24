/**
 * Public verify pages — language-switch reactivity (I18N Phase 2a, batch 4).
 *
 * Phase 2a migrates the six public verify pages (CertificateVerify, Verify,
 * VaccineCertificateVerify, Disease, NotFound, PortDetail) from hardcoded
 * Arabic text to t() keys under the shared `public` namespace. Each test
 * renders one page, asserts the Arabic text, calls i18n.changeLanguage('en')
 * WITHOUT remounting, and asserts the English translation of the same node
 * appears — proving constants live in useMemo dependent on t and react to
 * language changes.
 *
 * No logic() is wrapped: every t() here was audited to cover display text
 * only (Batch 3 lesson — .includes()/filter()/if conditions never enter t()).
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

// ---- API / dependency mocks (pages never hit the network in tests) ----
const clinicApi = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../api/client', () => ({ default: clinicApi }));

const vaccinationApi = vi.hoisted(() => ({ publicVerifyCertificate: vi.fn() }));
vi.mock('../../api/endpoints/vaccination', () => vaccinationApi);

const publicApi = vi.hoisted(() => ({
  getDiseases: vi.fn(),
  getPort: vi.fn(),
  getPortStats: vi.fn(),
}));
vi.mock('../../api/endpoints/public', () => publicApi);

// DiseasePage يعتمد على useApi (نمط اختباراته الحالية نفسه).
const useApi = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useApi', () => ({ useApi: (...args: unknown[]) => useApi(...args) }));

// VerifyTools مكوّن مركّب (QR) — نعزله على عنصر بسيط: الصفحة المتحدَّث منها هنا هو VerifyPage نفسه.
vi.mock('../../components/VerifyTools', () => ({
  default: () => <div>verify-tools</div>,
}));

import CertificateVerifyPage from './CertificateVerifyPage';
import VerifyPage from './VerifyPage';
import VaccineCertificateVerifyPage from './VaccineCertificateVerifyPage';
import DiseasePage from './DiseasePage';
import NotFoundPage from './NotFoundPage';
import PortDetailPage from './PortDetailPage';

const renderPage = (ui: ReactElement, routePath?: string) =>
  render(
    <MemoryRouter initialEntries={[routePath ?? '/']}>
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

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('ar');
});

afterEach(async () => {
  // أعد العربية حتى لا تتسرب حالة الاختبار إلى بقية الحزمة.
  await i18n.changeLanguage('ar');
});

describe('public verify pages react to language change', () => {
  it('CertificateVerify — PageHeader + certTypeLabels memo update on switch', async () => {
    clinicApi.get.mockResolvedValue({
      data: {
        data: {
          verified: true,
          status: 'ACTIVE',
          certificate_type: 'CLEARANCE',
          traveler_name: 'أحمد محمد عبد الله النور',
          passport_number: 'P12345678',
          issued_at: '2026-10-03T08:00:00Z',
        },
      },
    } as never);

    renderPage(<CertificateVerifyPage />, '/verify/certificates/:number');

    expect(await screen.findByText('التحقق من الشهادة الصحية')).toBeTruthy();
    expect(await screen.findByText('شهادة خلو من الأمراض')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Verify Health Certificate')).toBeTruthy();
    expect(await screen.findByText('Disease-Free Certificate')).toBeTruthy();
  });

  it('Verify — PageHeader + capabilities memo update on switch', async () => {
    renderPage(<VerifyPage />);

    expect(await screen.findByText('التحقق الذكي')).toBeTruthy();
    expect(await screen.findByText('التحقق من QR')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Smart Verification')).toBeTruthy();
    expect(await screen.findByText('QR Verification')).toBeTruthy();
  });

  it('VaccineCertificateVerify — PageHeader + statusLabels memo update on switch', async () => {
    vaccinationApi.publicVerifyCertificate.mockResolvedValue({
      data: { data: { verified: true, status: 'ACTIVE' } },
    } as never);

    renderPage(<VaccineCertificateVerifyPage />, '/verify/vaccination/:code');

    expect(await screen.findByText('التحقق من شهادة التطعيم الدولية')).toBeTruthy();
    expect(await screen.findByText('سارية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Verify International Vaccination Certificate')).toBeTruthy();
    expect(await screen.findByText('Valid', { selector: 'span' })).toBeTruthy();
  });

  it('Disease — PageHeader constants update on switch', async () => {
    useApi.mockReturnValue({
      data: { count: 0, next: null, previous: null, results: [] },
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    renderPage(<DiseasePage />);

    expect(await screen.findByText('الأمراض والإرشادات')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Diseases & Guidance')).toBeTruthy();
  });

  it('NotFound — 404 copy updates on switch', async () => {
    renderPage(<NotFoundPage />);

    expect(await screen.findByText('عذراً، الصفحة التي تبحث عنها غير موجودة')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Sorry, the page you are looking for does not exist')).toBeTruthy();
  });

  it('PortDetail — not-found EmptyState constants update on switch', async () => {
    publicApi.getPort.mockResolvedValue({ data: { data: null } } as never);
    publicApi.getPortStats.mockResolvedValue({ data: { data: null } } as never);

    renderPage(<PortDetailPage />, '/ports/:id');

    expect(await screen.findByText('المنفذ غير متاح')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Port Unavailable')).toBeTruthy();
  });
});