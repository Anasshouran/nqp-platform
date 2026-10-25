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

vi.mock('@/api/clients', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
    post: vi.fn().mockResolvedValue({ data: { data: {} } }),
    patch: vi.fn().mockResolvedValue({ data: { data: {} } }),
    delete: vi.fn().mockResolvedValue({ data: { data: {} } }),
  },
}));

vi.mock('@/api/borders', () => ({
  getCrossings: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getOverview: vi.fn().mockResolvedValue({ data: { data: {} } }),
  getPerformance: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getTrafficTrend: vi.fn().mockResolvedValue({ data: { data: [] } }),
  updateCrossingStatus: vi.fn(),
  getFacilities: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getShifts: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getStaffAssignments: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getTravelers: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getDeclarations: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getScreenings: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getVehicles: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getVehicleInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getCargoInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getSamples: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getQuarantine: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getIsolation: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getTracing: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getIncidents: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getEmergencies: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getDecisions: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getNotifications: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getDailyStatistics: vi.fn().mockResolvedValue({ data: { data: [] } }),
  refreshDailyStatistics: vi.fn(),
  getCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
}));

vi.mock('@/api/portHealth', () => ({
  getSeaPorts: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getVessels: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getCrewMembers: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getPassengers: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getHealthDeclarations: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  approveDeclaration: vi.fn(),
  rejectDeclaration: vi.fn(),
  getShipInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getFoodWaterInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getSanitationCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getIsolationRecords: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getSurveillanceCases: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getVectorControls: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getCargoInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getWasteInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getPortEmergencies: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getHealthCertificates: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  createShipInspection: vi.fn().mockResolvedValue({ data: { data: {} } }),
}));

vi.mock('@/api/airport', () => ({
  getAirportScreenings: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getAircraftInspections: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getCrewHealthRecords: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getTerminals: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
  getCheckpoints: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
}));

vi.mock('@/api/dashboard', () => ({
  getAirportInspectorDashboard: vi.fn().mockResolvedValue({ data: { data: {} } }),
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
  });

  it('renders BordersHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<BordersHealthPage />);
    expect(screen.getByText(/صحة المعابر البرية/i)).toBeTruthy();
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
    expect(screen.getByText(/Border Health/i)).toBeTruthy();
  });

  it('renders PortHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<PortHealthPage />);
    expect(screen.getByText(/صحة الموانئ/i)).toBeTruthy();
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
    expect(screen.getByText(/Port Health/i)).toBeTruthy();
  });

  it('renders ShipInspectionForm in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<ShipInspectionForm />);
    expect(screen.getByText(/استمارة التفتيش الصحي الميداني/i)).toBeTruthy();
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
    expect(screen.getByText(/Ship Inspection Form/i)).toBeTruthy();
  });

  it('renders AirportPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<AirportPage />);
    expect(screen.getByText(/صحة المطارات/i)).toBeTruthy();
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
    expect(screen.getByText(/Airport Health/i)).toBeTruthy();
  });

  it('renders InspectorDashboard in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<InspectorDashboard />);
    expect(screen.getByText(/مفتش الحجر الصحي/i)).toBeTruthy();
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
    expect(screen.getByText(/Quarantine Inspector/i)).toBeTruthy();
  });

  it('renders AirportHealthPage in Arabic and switches to English', async () => {
    const { rerender } = renderWithProviders(<AirportHealthPage />);
    expect(screen.getByText(/صحة المطارات والطيران/i)).toBeTruthy();
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
    expect(screen.getByText(/Airport Health/i)).toBeTruthy();
  });
});
