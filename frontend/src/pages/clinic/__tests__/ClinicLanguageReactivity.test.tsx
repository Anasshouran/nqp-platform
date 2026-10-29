import { describe, it, beforeAll, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import ClinicPage from '../ClinicPage';
import IsolationPage from '../IsolationPage';
import MedicationPage from '../MedicationsPage';
import RegisterPatientPage from '../RegisterPatientPage';
import ClinicDashboardPage from '../ClinicDashboardPage';
import VisitDetailPage from '../VisitDetailPage';
import LabPage from '../LabPage';
import { ReferralDecisionDrawer } from '../ReferralDecisionDrawer';
import CertificatesPage from '../CertificatesPage';
import HealthDashboardPage from '../../health/HealthDashboardPage';
import ScreeningPage from '../../screening/ScreeningPage';

vi.mock('../../../api/endpoints/public', async (importOriginal) => ({
  ...(await importOriginal() as Record<string, unknown>),
  getPublicStatistics: vi.fn().mockResolvedValue({ data: { data: { screenings: 0, certificates: 0, lab_samples: 0, diseases: 0, entry_points: 0, vector_activities: 0, notices: 0 } } }),
}));
vi.mock('../../../api/endpoints/notifications', async (importOriginal) => ({
  ...(await importOriginal() as Record<string, unknown>),
  getNotifications: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));
vi.mock('../../../api/endpoints/screening', async (importOriginal) => ({
  ...(await importOriginal() as Record<string, unknown>),
  getScreenings: vi.fn().mockResolvedValue({ data: { data: { count: 0, results: [] } } }),
  getLatestRisk: vi.fn().mockResolvedValue({ data: { data: {} } }),
  referScreening: vi.fn().mockResolvedValue({}),
  createScreening: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../api/endpoints/laboratory', () => ({
  getDiseases: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
}));

vi.mock('../../../api/endpoints/clinic', () => ({
  getClinicVisit: vi.fn().mockResolvedValue({
    data: {
      data: {
        id: 'v1',
        visit_status: 'OPEN',
        phase: 'REGISTERED',
        traveler_name: 'سالم أحمد',
        passport_number: 'P123456',
        doctor_name: 'د. نور',
        opened_at: '2026-01-01T08:00:00Z',
        allowed_transitions: ['TRIAGED'],
        triages: [],
        prescriptions: [],
        lab_requests: [],
        isolation: null,
        health_certificate: null,
        emr: null,
      },
    },
  }),
  getVisitLabResults: vi.fn().mockResolvedValue({ data: { data: [] } }),
  addPrescription: vi.fn().mockResolvedValue({}),
  isolateVisit: vi.fn().mockResolvedValue({}),
  issueCertificate: vi.fn().mockResolvedValue({}),
  requestClinicLab: vi.fn().mockResolvedValue({}),
  submitEmr: vi.fn().mockResolvedValue({}),
  submitTriage: vi.fn().mockResolvedValue({}),
  transitionVisit: vi.fn().mockResolvedValue({}),
  getReferrals: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getClinicVisits: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getIsolations: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getClinicDashboard: vi.fn().mockResolvedValue({
    data: { data: { stats: { total_patients: 0, open_visits: 0, closed_visits: 0, completed_today: 0 } } },
  }),
  getClinicReport: vi.fn().mockResolvedValue({ data: { data: { stats: { by_phase: {} } } } }),
  holdReferral: vi.fn().mockResolvedValue({}),
  releaseReferral: vi.fn().mockResolvedValue({}),
  getClinicMedications: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getClinics: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getCountries: vi.fn().mockResolvedValue({ data: { data: [] } }),
  searchPatients: vi.fn().mockResolvedValue({ data: { data: [] } }),
  registerWalkInPatient: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getPatientQr: vi.fn().mockResolvedValue({ data: { data: {} } }),
  acceptReferral: vi.fn().mockResolvedValue({}),
  rejectReferral: vi.fn().mockResolvedValue({}),
  closeVisit: vi.fn().mockResolvedValue({}),
  updateIsolationStatus: vi.fn().mockResolvedValue({}),
  releaseIsolation: vi.fn().mockResolvedValue({}),
  getClinicLabRequests: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getCertificates: vi.fn().mockResolvedValue({ data: { data: { count: 0, results: [] } } }),
  getCertificateQr: vi.fn().mockResolvedValue({ data: { data: { qr_png: '' } } }),
  revokeCertificate: vi.fn().mockResolvedValue({ data: { data: {} } }),
}));

beforeAll(() => {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  };
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.matchMedia =
    window.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as any;
  window.scrollTo = vi.fn();
});

const store = configureStore({ reducer: { auth: authReducer } });
const wrap = (ui: React.ReactNode) => (
  <Provider store={store}>
    <MemoryRouter>{ui}</MemoryRouter>
  </Provider>
);

describe('Clinic pages language reactivity', () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('ClinicPage renders AR and switches to EN', async () => {
    render(wrap(<ClinicPage />));
    await screen.findByRole('heading', { name: /العيادة|Clinic/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Clinic/i, level: 1 });
  });

  it('IsolationPage renders AR and switches to EN', async () => {
    render(wrap(<IsolationPage />));
    await screen.findByRole('heading', { name: /العزل|Isolation/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Isolation/i, level: 1 });
  });

  it('MedicationsPage renders AR and switches to EN', async () => {
    render(wrap(<MedicationPage />));
    await screen.findByRole('heading', { name: /الأدوية|Medications/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Medications/i, level: 1 });
  });

  it('RegisterPatientPage renders AR and switches to EN', async () => {
    render(wrap(<RegisterPatientPage />));
    await screen.findByRole('heading', { name: /تسجيل حالة جديدة/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Register New Case/i, level: 1 });
  });

  it('ClinicDashboardPage renders AR and switches to EN', async () => {
    render(wrap(<ClinicDashboardPage />));
    await screen.findByRole('heading', { name: /لوحة العيادة الطبية/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Medical Clinic Dashboard/i, level: 1 });
  });

  it('VisitDetailPage renders AR and switches to EN', async () => {
    render(wrap(<VisitDetailPage />));
    await screen.findByRole('button', { name: /العودة إلى العيادة/i });
    await screen.findByText(/زيارة عيادة/i);
    await i18n.changeLanguage('en');
    await screen.findByRole('button', { name: /Back to clinic/i });
    await screen.findByText(/Clinic visit/i);
  });

  it('LabPage renders AR and switches to EN', async () => {
    render(wrap(<LabPage />));
    await screen.findByRole('heading', { name: /طلبات المختبر|Lab Requests/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Lab Requests/i, level: 1 });
  });

  it('ReferralDecisionDrawer renders AR and switches to EN', async () => {
    const referral = {
      id: 'r1',
      traveler_name: 'مسافر تجريبي',
      passport_number: 'P999',
      queue_no: 3,
      status: 'PRE_ACCEPT',
      source: 'ENTRY_POINT',
      body_temperature: null,
      observed_symptoms: [],
      officer_notes: '',
      notes: '',
      nationality_name: 'سوداني',
      port_name: 'مطار الخرطوم',
      created_at: '2026-01-01T08:00:00Z',
    } as never;
    render(
      wrap(
        <ReferralDecisionDrawer
          open
          referral={referral}
          submitting={false}
          acceptedVisit={null}
          hasNext={false}
          onClose={vi.fn()}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          onHold={vi.fn()}
          onRelease={vi.fn()}
          onOpenVisit={vi.fn()}
          onProcessNext={vi.fn()}
        />
      )
    );
    await screen.findByText(/قرار الإحالة/);
    await i18n.changeLanguage('en');
    await screen.findByText(/Referral decision/);
  });

  it('HealthDashboardPage renders AR and switches to EN', async () => {
    render(wrap(<HealthDashboardPage />));
    await screen.findByText(/لوحة الرعاية الصحية|Health Care Dashboard/);
    await i18n.changeLanguage('en');
    await screen.findByText(/Health Care Dashboard/);
  });

  it('ScreeningPage renders AR and switches to EN', async () => {
    render(wrap(<ScreeningPage />));
    await screen.findByRole('heading', { name: /الفحوصات الصحية|Health screenings/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Health screenings/i, level: 1 });
  });

  it('CertificatesPage renders AR and switches to EN', async () => {
    render(wrap(<CertificatesPage />));
    await screen.findByRole('heading', { name: /الشهادات الصحية|Health certificates/i, level: 1 });
    await i18n.changeLanguage('en');
    await screen.findByRole('heading', { name: /Health certificates/i, level: 1 });
  });
});
