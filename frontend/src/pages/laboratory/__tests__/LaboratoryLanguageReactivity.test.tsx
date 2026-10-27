/**
 * Laboratory Round 1 + Round 2 — language reactivity (Phase 3c).
 *
 * Each of the 13 migrated laboratory pages must render in Arabic (default) and
 * re-render in English after a language switch. Lab API, lab scope and toasts
 * are mocked; the real useServerTable, auth store and i18n instance are used.
 */
import type { ReactNode } from 'react';
import { describe, it, beforeAll, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';

import NqlisQc from '../NqlisQc';
import NqlisReagents from '../NqlisReagents';
import NqlisUsers from '../NqlisUsers';
import NqlisQuality from '../NqlisQuality';
import NationalLabDashboard from '../NationalLabDashboard';
import NqlisDashboard from '../NqlisDashboard';
import NqlisReception from '../NqlisReception';
import NqlisWorklist from '../NqlisWorklist';
import NqlisReports from '../NqlisReports';
import NqlisSamples from '../NqlisSamples';
import NqlisEquipment from '../NqlisEquipment';
import NqlisCritical from '../NqlisCritical';
import LaboratoryPage from '../LaboratoryPage';

const fixtures = vi.hoisted(() => {
  const dashboard = {
    sections: [],
    totals: {
      samples: 42,
      received_today: 7,
      pending_reception: 3,
      accepted: 20,
      rejected: 1,
      under_testing: 8,
      ready_for_approval: 2,
      completed: 11,
      urgent: 0,
    },
    by_status: { RECEIVED: 10, UNDER_TESTING: 8, COMPLETED: 11 },
    by_section: [{ section: 'sec1', name: 'قسم الدم', count: 5 }],
    by_source: [{ source: 'CLINIC', name: 'العيادة', count: 6 }],
    tests: { total: 20, pending: 4, in_progress: 6, draft: 1, submitted: 3, approved: 6 },
    critical: { open: 0, acknowledged: 0, recent: 0 },
    quality: {
      equipment: { total: 10, overdue: 1, due_soon: 2 },
      reagents: { total: 20, expiring_soon: 3, expired: 1, low_stock: 2 },
      qc: { pending: 1, failed: 0 },
      non_conformities: { open: 1 },
    },
  };

  const makeSector = (code: string, name: string) => ({
    code,
    name,
    color: '#0c7f6a',
    laboratory: { name: `معلم ${name}` },
    totals: { samples: 20, under_testing: 4, positive: 2, negative: 2, critical: 0, avg_tat_hours: 5, tests_count: 30 },
    equipment: { overdue: 0, total: 3 },
    reagents: { expired: 0, low_stock: 1 },
    quality: { open_nc: 0, pending_qc: 1 },
    epidemic_alerts: 0,
  });

  const nationalLab = {
    totals: {
      samples: 42,
      under_testing: 8,
      completed: 11,
      positive: 5,
      negative: 6,
      critical: 0,
      avg_tat_hours: 6,
      tests_count: 77,
    },
    sectors: [makeSector('SEC_A', 'القطاع أ'), makeSector('SEC_B', 'القطاع ب')],
    top_tests_global: [{ name: 'PCR', count: 10 }],
    recent_alerts: [],
  };

  return { dashboard, nationalLab };
});

vi.mock('../../../api/endpoints/laboratory', async (importOriginal) => ({
  ...(await importOriginal() as Record<string, unknown>),
  // QC
  getQcRecords: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  createQcRecord: vi.fn().mockResolvedValue({ data: { data: {} } }),
  reviewQcRecord: vi.fn().mockResolvedValue({ data: { data: {} } }),
  // Reagents & lots
  getReagents: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getReagentLots: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  createReagent: vi.fn().mockResolvedValue({ data: { data: {} } }),
  createReagentLot: vi.fn().mockResolvedValue({ data: { data: {} } }),
  // Users
  getLabUsers: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getLabRoles: vi.fn().mockResolvedValue({ data: { data: [] } }),
  createLabUser: vi.fn().mockResolvedValue({ data: { data: {} } }),
  updateLabUser: vi.fn().mockResolvedValue({ data: { data: {} } }),
  resetLabUserPassword: vi.fn().mockResolvedValue({ data: { data: {} } }),
  // Non-conformity / CAPA
  getNonConformities: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCapaRecords: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  createNonConformity: vi.fn().mockResolvedValue({ data: { data: {} } }),
  createCapaRecord: vi.fn().mockResolvedValue({ data: { data: {} } }),
  setNonConformityStatus: vi.fn().mockResolvedValue({ data: { data: {} } }),
  setCapaStatus: vi.fn().mockResolvedValue({ data: { data: {} } }),
  // Dashboards
  getNationalLabDashboard: vi.fn().mockResolvedValue({ data: { data: fixtures.nationalLab } }),
  getLabDashboard: vi.fn().mockResolvedValue({ data: { data: fixtures.dashboard } }),
  getLabSamples: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  // Round 2 — Reception
  getReceptionQueue: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  createLabSample: vi.fn().mockResolvedValue({ data: { data: {} } }),
  acceptSample: vi.fn().mockResolvedValue({ data: { data: {} } }),
  conditionalAcceptSample: vi.fn().mockResolvedValue({ data: { data: {} } }),
  rejectSample: vi.fn().mockResolvedValue({ data: { data: {} } }),
  // Round 2 — Worklist
  getWorklist: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  startTest: vi.fn().mockResolvedValue({ data: { data: {} } }),
  enterTestResult: vi.fn().mockResolvedValue({ data: { data: {} } }),
  reviewTest: vi.fn().mockResolvedValue({ data: { data: {} } }),
  approveTest: vi.fn().mockResolvedValue({ data: { data: {} } }),
  reviseTest: vi.fn().mockResolvedValue({ data: { data: {} } }),
  saveTestResult: vi.fn().mockResolvedValue({ data: { data: {} } }),
  returnTestResult: vi.fn().mockResolvedValue({ data: { data: {} } }),
  addSampleTest: vi.fn().mockResolvedValue({ data: { data: {} } }),
  // Round 2 — Reports
  getLabReports: vi.fn().mockResolvedValue({ data: { data: { summary: {}, by_section: [], by_disease: [], by_source: [] } } }),
  // Round 2 — Samples
  getSampleTrack: vi.fn().mockResolvedValue({ data: { data: { movements: [] } } }),
  assignSample: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getSections: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  // Round 2 — Equipment
  getEquipment: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  createEquipment: vi.fn().mockResolvedValue({ data: { data: {} } }),
  // Round 2 — Critical
  getCriticalResults: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  acknowledgeCritical: vi.fn().mockResolvedValue({ data: { data: {} } }),
}));

vi.mock('../../../hooks/useLabSectors', () => ({
  useLabScope: () => ({ sector: null, isNational: false, allowedSectors: [] }),
  useLabSectors: () => ({ activeSector: null, allowedSectors: [], setSector: vi.fn(), isNational: false }),
}));

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class IntersectionObserverStub {
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  if (!window.matchMedia) {
    vi.stubGlobal('matchMedia', (q: string): MediaQueryList => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  }
  window.scrollTo = vi.fn();
});

const store = configureStore({ reducer: { auth: authReducer } });
const wrap = (ui: ReactNode) => (
  <Provider store={store}>
    <MemoryRouter>{ui}</MemoryRouter>
  </Provider>
);

describe('Laboratory pages language reactivity', () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  // Round 1 (6 pages)
  it('NqlisQc renders AR and switches to EN', async () => {
    render(wrap(<NqlisQc />));
    await screen.findByText('مراقبة الجودة');
    await i18n.changeLanguage('en');
    await screen.findByText('Quality Control');
  });

  it('NqlisReagents renders AR and switches to EN', async () => {
    render(wrap(<NqlisReagents />));
    await screen.findByText('المواد والكواشف');
    await i18n.changeLanguage('en');
    await screen.findByText('Materials and reagents');
  });

  it('NqlisUsers renders AR and switches to EN', async () => {
    render(wrap(<NqlisUsers />));
    await screen.findByText('مستخدمو المختبر');
    await i18n.changeLanguage('en');
    await screen.findByText('Lab users');
  });

  it('NqlisQuality renders AR and switches to EN', async () => {
    render(wrap(<NqlisQuality />));
    await screen.findByText('الجودة');
    await i18n.changeLanguage('en');
    await screen.findByText('Quality');
  });

  it('NationalLabDashboard renders AR and switches to EN', async () => {
    render(wrap(<NationalLabDashboard />));
    await screen.findByText('اللوحة القومية للمعامل القطاعية');
    await i18n.changeLanguage('en');
    await screen.findByText('Sectoral national laboratories dashboard');
  });

  it('NqlisDashboard renders AR and switches to EN', async () => {
    render(wrap(<NqlisDashboard />));
    await screen.findByText('لوحة قيادة المختبر القومي');
    await i18n.changeLanguage('en');
    await screen.findByText('National laboratory command dashboard');
  });

  // Round 2 (7 pages)
  it('NqlisReception renders AR and switches to EN', async () => {
    render(wrap(<NqlisReception />));
    await screen.findByText('استقبال العينات');
    await i18n.changeLanguage('en');
    await screen.findByText('Sample Reception');
  });

  it('NqlisWorklist renders AR and switches to EN', async () => {
    render(wrap(<NqlisWorklist />));
    await screen.findByText('مهام فحص عينات NQLIS');
    await i18n.changeLanguage('en');
    await screen.findByText('NQLIS Sample Test Tasks');
  });

  it('NqlisReports renders AR and switches to EN', async () => {
    render(wrap(<NqlisReports />));
    await screen.findByText('التقارير');
    await i18n.changeLanguage('en');
    await screen.findByText('Reports');
  });

  it('NqlisSamples renders AR and switches to EN', async () => {
    render(wrap(<NqlisSamples />));
    await screen.findByText('سجل العينات');
    await i18n.changeLanguage('en');
    await screen.findByText('Sample Registry');
  });

  it('NqlisEquipment renders AR and switches to EN', async () => {
    render(wrap(<NqlisEquipment />));
    await screen.findByText('الأجهزة والمعدات');
    await i18n.changeLanguage('en');
    await screen.findByText('Equipment & Devices');
  });

  it('NqlisCritical renders AR and switches to EN', async () => {
    render(wrap(<NqlisCritical />));
    await screen.findByText('النتائج الحرجة');
    await i18n.changeLanguage('en');
    await screen.findByText('Critical Results');
  });

  it('LaboratoryPage renders AR and switches to EN', async () => {
    render(wrap(<LaboratoryPage />));
    await screen.findByText('المعمل القومي للحجر الصحي');
    await i18n.changeLanguage('en');
    await screen.findByText('National Quarantine Laboratory');
  });
});
