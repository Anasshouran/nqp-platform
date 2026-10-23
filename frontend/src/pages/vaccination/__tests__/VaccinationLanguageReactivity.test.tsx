/**
 * Vaccination pages — language-switch reactivity (I18N-FIX-EXPANDED).
 *
 * PR #96 evaluated 9 page constants (status/dose/batch/tx/kind/route/section
 * maps) at module scope via i18n.t(), so they froze at import time. They now
 * live in useMemo dependent on t. Each test renders one page, asserts the
 * Arabic label, calls i18n.changeLanguage('en') WITHOUT remounting, and
 * asserts the same constant renders the English label.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import i18n from '../../../i18n';

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

const vaccinationApi = vi.hoisted(() => ({
  getRecords: vi.fn(),
  issueCertificate: vi.fn(),
  getBatches: vi.fn(),
  getInventory: vi.fn(),
  getCertificates: vi.fn(),
  getCertificateQr: vi.fn(),
  revokeCertificate: vi.fn(),
  replaceCertificate: vi.fn(),
  reissueCertificate: vi.fn(),
  createVaccinationInvoice: vi.fn(),
  payVaccinationInvoice: vi.fn(),
  getSites: vi.fn(),
  createSite: vi.fn(),
  getVaccines: vi.fn(),
  createVaccine: vi.fn(),
  updateVaccine: vi.fn(),
  getRules: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  getVaccinationDashboard: vi.fn(),
  searchTraveler: vi.fn(),
  createRecord: vi.fn(),
}));
vi.mock('../../../api/endpoints/vaccination', () => vaccinationApi);

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'clinician' }, token: 'test-token', isAuthenticated: true }),
}));

import VaccinationRecordsPage from '../VaccinationRecordsPage';
import BatchesInventoryPage from '../BatchesInventoryPage';
import VaccinationCertificatesPage from '../VaccinationCertificatesPage';
import VaccinationSitesPage from '../VaccinationSitesPage';
import VaccinesPage from '../VaccinesPage';
import VaccinationDashboardPage from '../VaccinationDashboardPage';
import RegisterVaccinationPage from '../RegisterVaccinationPage';

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/vaccination']}>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

const paged = (results: unknown[]) => ({
  data: { data: { results, count: results.length, next: null, previous: null } },
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  // أعد اللغة العربية حتى لا تتسرب حالة الاختبار إلى بقية الحزمة.
  await i18n.changeLanguage('ar');
});

describe('vaccination constants react to language change', () => {
  it('Records — statusMeta and DOSE_LABELS update on language switch', async () => {
    vaccinationApi.getRecords.mockResolvedValue(
      paged([
        {
          id: 'r1',
          traveler: { id: 't1', full_name: 'أحمد محمد', passport_number: 'P11345' },
          vaccine_name_ar: 'الحمى الصفراء',
          vaccine_code: 'YF',
          dose_type: 'FIRST',
          dose_number: 1,
          lot_number: 'LOT-001',
          status: 'GIVEN',
          administered_at: '2026-10-01',
          created_at: '2026-10-01T10:00:00Z',
        },
      ]),
    );

    wrap(<VaccinationRecordsPage />);

    // statusMeta in the table cell
    expect(await screen.findByText('مُعطاة')).toBeTruthy();

    // DOSE_LABELS in the dose filter options (open the MUI Select)
    const trigger = screen.getByText('نوع الجرعة').closest('[role="combobox"]') as HTMLElement;
    fireEvent.mouseDown(trigger);
    expect(await screen.findByText('الجرعة الأولى')).toBeTruthy();

    // switch language WITHOUT remount
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Administered')).toBeTruthy();
    expect((await screen.findAllByText('First dose')).length).toBeGreaterThan(0);
  });

  it('Batches — batchStatusMeta and txMeta update on language switch', async () => {
    vaccinationApi.getBatches.mockResolvedValue(
      paged([
        {
          id: 'b1',
          vaccine_name_ar: 'الحمى الصفراء',
          lot_number: 'LOT-001',
          manufacturer: 'Serum Institute',
          expiry_date: '2030-01-01',
          available_quantity: 50,
          received_quantity: 100,
          remaining_percent: 50,
          status: 'ACTIVE',
        },
      ]),
    );
    vaccinationApi.getInventory.mockResolvedValue(
      paged([{ id: 'tx1', vaccine_name_ar: 'الحمى الصفراء', batch_number: 'LOT-001', type: 'IN', quantity: 100, created_at: '2026-10-01T10:00:00Z' }]),
    );
    vaccinationApi.getVaccines.mockResolvedValue(paged([]));

    wrap(<BatchesInventoryPage />);

    // batchStatusMeta in tab 0
    expect(await screen.findByText('متاحة')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Available')).toBeTruthy();

    // txMeta in tab 1 (now in English, still no remount)
    fireEvent.click(screen.getByRole('tab', { name: /حركات المخزون/ }));
    expect(await screen.findByText('Receive')).toBeTruthy();

    // and back to Arabic without remount
    await i18n.changeLanguage('ar');
    expect(await screen.findByText('استلام')).toBeTruthy();
  });

  it('Certificates — statusMeta updates on language switch', async () => {
    vaccinationApi.getCertificates.mockResolvedValue(
      paged([
        {
          id: 'cert-1',
          certificate_number: 'AFY-VAC-000001',
          traveler: { id: 't1', full_name: 'أحمد محمد', passport_number: 'P12345' },
          vaccine_name_ar: 'الحمى الصفراء',
          vaccine_code: 'YF',
          status: 'ACTIVE',
          issued_at: '2026-10-20T10:00:00Z',
          valid_until: '2036-10-20',
          validity_days: 3650,
          qr_token: 'qr-token-1',
          verification_path: '/verify/vaccination/AFY-VAC-000001',
          issued_by_name: 'Admin',
        },
      ]),
    );

    wrap(<VaccinationCertificatesPage />);

    expect(await screen.findByText('سارية')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Active')).toBeTruthy();
  });

  it('Sites — kindMeta updates on language switch', async () => {
    vaccinationApi.getSites.mockResolvedValue(
      paged([{ id: 's1', name_ar: 'عيادة النخيل', kind: 'CLINIC', location: 'الخرطوم', phone: '12345678', is_active: true }]),
    );

    wrap(<VaccinationSitesPage />);

    expect(await screen.findByText('عيادة تطعيم')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Vaccination clinic')).toBeTruthy();
  });

  it('Vaccines — routeLabels updates on language switch', async () => {
    vaccinationApi.getVaccines.mockResolvedValue(
      paged([
        {
          id: 'v1',
          code: 'YF',
          name_ar: 'الحمى الصفراء',
          name_en: 'Yellow Fever',
          route: 'ORAL',
          series: 1,
          validity_days: 3650,
          required: true,
          is_active: true,
        },
      ]),
    );
    vaccinationApi.getRules.mockResolvedValue(paged([]));

    wrap(<VaccinesPage />);

    expect(await screen.findByText('فموي')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Oral')).toBeTruthy();
  });

  it('Dashboard — SECTIONS update on language switch', async () => {
    vaccinationApi.getVaccinationDashboard.mockResolvedValue({
      data: {
        data: {
          total_records: 10,
          active_certificates: 5,
          batches_count: 3,
          doses_today: 4,
          doses_this_week: 20,
          by_vaccine: [],
          expiring_soon_batches: [],
          recent_records: [],
        },
      },
    });

    wrap(<VaccinationDashboardPage />);

    expect(await screen.findByText('نظرة عامة')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Overview')).toBeTruthy();
  });

  it('Register — assessmentLabel (statusMeta) updates on language switch', async () => {
    vaccinationApi.getVaccines.mockResolvedValue(paged([]));
    vaccinationApi.getBatches.mockResolvedValue(paged([]));
    vaccinationApi.getSites.mockResolvedValue(paged([]));
    vaccinationApi.searchTraveler.mockResolvedValue({
      data: {
        data: {
          traveler: {
            id: 't1',
            full_name: 'أحمد محمد',
            passport_number: 'SDN123456',
            date_of_birth: '1990-01-01',
            medical_file_no: 'MF-001',
          },
          summary: null,
          assessment: [
            {
              vaccine_id: 'v1',
              vaccine_name_ar: 'الحمى الصفراء',
              status: 'COMPLETE',
              doses_given: 1,
              doses_required: 1,
              destination_region: null,
              destination_confirmed: false,
            },
          ],
        },
      },
    });

    wrap(<RegisterVaccinationPage />);

    fireEvent.change(screen.getByPlaceholderText('مثال: SDN123456'), { target: { value: 'SDN123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'بحث' }));

    expect(await screen.findByText('مكتمل · 1/1')).toBeTruthy();
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Complete · 1/1')).toBeTruthy();
  });
});