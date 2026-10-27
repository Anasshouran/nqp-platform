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
});
