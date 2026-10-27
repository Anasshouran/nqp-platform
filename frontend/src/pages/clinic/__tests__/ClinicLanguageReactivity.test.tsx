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

vi.mock('../../../api/endpoints/clinic', () => ({
  getReferrals: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  getClinicVisits: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  getIsolations: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
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
});
