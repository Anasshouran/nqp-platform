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
  getSeaPorts: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getVessels: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCrewMembers: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPassengers: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getHealthDeclarations: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  approveDeclaration: vi.fn(),
  rejectDeclaration: vi.fn(),
  getShipInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getFoodWaterInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getSanitationCertificates: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getIsolationRecords: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getSurveillanceCases: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getVectorControls: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCargoInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getWasteInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPortEmergencies: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getHealthCertificates: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  createShipInspection: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getPorts: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getVesselArrivals: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCrew: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPortHealthOverview: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getSurveillance: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getVectors: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getWaste: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getEmergencies: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCertificates: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
})); 

vi.mock('@/api/endpoints/portHealth', () => ({
  getSeaPorts: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getVessels: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getVesselVisits: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCrewMembers: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPassengers: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getHealthDeclarations: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getShipInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getFoodWaterInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getSanitationCertificates: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getIsolationRecords: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getSurveillanceCases: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getVectorControls: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCargoInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getWasteInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPortEmergencies: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getHealthCertificates: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  createShipInspection: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getPorts: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
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
  getAirportDashboard: vi.fn().mockResolvedValue({ data: { data: {
    kpis: { flights_today: 0, passengers_today: 0, pending_screenings: 0, screened_today: 0, clinic_referrals: 0, suspected_cases: 0, vaccinations: 0, completed_today: 0, quarantined_today: 0 },
    upcoming_flights: [], suspected: [], tasks: [], alerts: [], daily_chart: [],
    report: { flights: 0, travelers: 0, screened: 0, referrals: 0, suspected: 0, screenings_by_flight: [] },
  } } }),
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
  // The language-reactivity tests wait for i18n tree re-renders; give them room
  // locally instead of raising the project-wide timeout.
  vi.setConfig({ testTimeout: 15000 });
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders BordersHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<BordersHealthPage />);
    expect(await screen.findByRole('heading', { name: /صحة المعابر البرية/i, level: 1 }, { timeout: 10000 })).toBeTruthy();
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
    expect(await screen.findByRole('heading', { name: /Border Health/i, level: 1 }, { timeout: 10000 })).toBeTruthy();
  });

  it('renders PortHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<PortHealthPage />);
    expect(await screen.findAllByText(/صحة الموانئ/i, {}, { timeout: 4000 })).toBeTruthy();
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
    expect(await screen.findAllByText(/Port Health/i, {}, { timeout: 4000 })).toBeTruthy();
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
    expect(await screen.findAllByText(/مفتش الحجر الصحي/i)).toBeTruthy();
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
    expect(await screen.findAllByText(/Quarantine Inspector/i)).toBeTruthy();
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


vi.mock('@/api/endpoints/airportHealth', () => ({
  getAirportHealthOverview: vi.fn().mockResolvedValue({ data: { data: { flights_today: 0, passengers_today: 0, screened_today: 0, pending_screenings: 0, suspected_cases: 0, clinic_referrals: 0, quarantined_today: 0, vaccinations_today: 0 } } }),
  getFlights: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getAirportScreenings: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getCrewHealth: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getSuspectedCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getClinicVisits: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getQuarantineCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getVaccinations: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getEmergencies: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
  getAlerts: vi.fn().mockResolvedValue({ data: { data: [], count: 0, results: [] } }),
}));
