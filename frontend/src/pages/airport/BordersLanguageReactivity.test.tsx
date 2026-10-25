declare const global: any;
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import i18n from '@/i18n';
import BordersHealthPage from '@/pages/bordershealth/BordersHealthPage';
import PortHealthPage from '@/pages/porthealth/PortHealthPage';
import ShipInspectionForm from '@/pages/porthealth/ShipInspectionForm';
import AirportPage from '@/pages/airport/AirportPage';
import InspectorDashboard from '@/pages/airport/InspectorDashboard';
import AirportHealthPage from '@/pages/airporthealth/AirportHealthPage';

if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  } as any;
}
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
}
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any;
}
if (typeof window !== 'undefined') {
  window.scrollTo = window.scrollTo || vi.fn();
}

vi.mock('@/api/clients', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] }, status: 200 }),
    post: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
    patch: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
    put: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
    delete: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
  },
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] }, status: 200 }),
    post: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
    patch: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
    put: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
    delete: vi.fn().mockResolvedValue({ data: { data: {} }, status: 200 }),
  },
})); 

vi.mock('@/api/endpoints/bordersHealth', () => ({
  changeCrossingStatus: vi.fn(),
  decideCargoInspection: vi.fn(),
  getBorderStaff: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getBordersHealthOverview: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getCargoInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getContactTracingCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getContacts: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCrossingPerformance: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getCrossings: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getDailyStatistics: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getDeclarations: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getDecisions: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getEmergencies: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getFacilities: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getHealthDeclarations: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getIncidents: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getIsolationCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getNotifications: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getQuarantineCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getSamples: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getScreenings: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getShifts: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getStaff: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getTrafficTrend: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getTravelerRecords: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVehicleInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVehicles: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  issueCertificate: vi.fn(),
  reassessScreening: vi.fn(),
  refreshDailyStatistics: vi.fn(),
}));


vi.mock('@/api/portHealth', () => ({
  getSeaPorts: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVessels: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCrewMembers: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getPassengers: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getHealthDeclarations: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  approveDeclaration: vi.fn(),
  rejectDeclaration: vi.fn(),
  getShipInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getFoodWaterInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getSanitationCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getIsolationRecords: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getSurveillanceCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVectorControls: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCargoInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getWasteInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getPortEmergencies: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getHealthCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  createShipInspection: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getPorts: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVesselArrivals: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCrew: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getPortHealthOverview: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getSurveillance: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVectors: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getWaste: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getEmergencies: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
})); 

vi.mock('@/api/endpoints/portHealth', () => ({
  getSeaPorts: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVessels: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVesselVisits: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCrewMembers: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getPassengers: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getHealthDeclarations: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getShipInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getFoodWaterInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getSanitationCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getIsolationRecords: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getSurveillanceCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVectorControls: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCargoInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getWasteInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getPortEmergencies: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getHealthCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  createShipInspection: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getPorts: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getPortHealthOverview: vi.fn().mockResolvedValue({ data: { data: {} } }),
}));

vi.mock('@/api/airport', () => ({
  getAirportScreenings: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getAircraftInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCrewHealthRecords: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getTerminals: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCheckpoints: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
})); 

vi.mock('@/api/endpoints/airport', () => ({
  getAirportScreenings: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getAircraftInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCrewHealthRecords: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getTerminals: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCheckpoints: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getAirportDashboard: vi.fn().mockResolvedValue({ data: { data: { kpis: {}, upcoming_flights: [], suspected: [], tasks: [], alerts: [], report: {} } } }),
}));

vi.mock('@/api/dashboard', () => ({
  getAirportInspectorDashboard: vi.fn().mockResolvedValue({ 
    data: { 
      data: { 
        today_flights: 0, 
        total_passengers: 0, 
        pending_screenings: 0, 
        screened_today: 0, 
        clinic_referrals: 0, 
        suspected_cases: 0, 
        vaccinations_today: 0, 
        completed_today: 0, 
        upcoming_flights: [], 
        suspected_cases_list: [], 
        tasks: [], 
        alerts: [], 
        daily_chart: [] 
      } 
    } 
  }),
  getAirportDashboard: vi.fn().mockResolvedValue({ 
    data: { 
      data: { 
        flights_today: 0, 
        passengers_today: 0, 
        pending_screenings: 0, 
        screened_today: 0, 
        clinic_referrals: 0, 
        suspected_cases: 0, 
        vaccinations: 0, 
        completed_today: 0, 
        upcoming_flights: [], 
        suspected_cases_list: [], 
        tasks: [], 
        alerts: [], 
        daily_chart: [] 
      } 
    } 
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { username: 'test' } }),
}));

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={ui} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

describe('Borders/Airport language reactivity', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders BordersHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<BordersHealthPage />);
    expect(await screen.findByText(/صحة المعابر البرية/i)).toBeTruthy();
    await i18n.changeLanguage('en');
    rerender(
      <Provider store={createTestStore()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<BordersHealthPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findByText(/Border Health/i)).toBeTruthy();
  });

  it('renders PortHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<PortHealthPage />);
    expect(await screen.findByText(/صحة الموانئ/i)).toBeTruthy();
    await i18n.changeLanguage('en');
    rerender(
      <Provider store={createTestStore()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<PortHealthPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findByText(/Port Health/i)).toBeTruthy();
  });

  it('renders ShipInspectionForm in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<ShipInspectionForm />);
    expect(await screen.findByText(/استمارة التفتيش الصحي الميداني/i)).toBeTruthy();
    await i18n.changeLanguage('en');
    rerender(
      <Provider store={createTestStore()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<ShipInspectionForm />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findByText(/Ship Inspection Form/i)).toBeTruthy();
  });

  it('renders AirportPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<AirportPage />);
    expect(await screen.findAllByText(/صحة المطارات/i)).toBeTruthy();
    await i18n.changeLanguage('en');
    rerender(
      <Provider store={createTestStore()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<AirportPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findAllByText(/Airport Health/i)).toBeTruthy();
  });

  it('renders InspectorDashboard in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<InspectorDashboard />);
    expect(await screen.findByText(/مفتش الحجر الصحي/i)).toBeTruthy();
    await i18n.changeLanguage('en');
    rerender(
      <Provider store={createTestStore()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<InspectorDashboard />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findByText(/Quarantine Inspector/i)).toBeTruthy();
  });

  it('renders AirportHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<AirportHealthPage />);
    expect(await screen.findAllByText(/صحة المطارات والطيران/i)).toBeTruthy();
    await i18n.changeLanguage('en');
    rerender(
      <Provider store={createTestStore()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<AirportHealthPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findAllByText(/Airport Health/i)).toBeTruthy();
  });
});
