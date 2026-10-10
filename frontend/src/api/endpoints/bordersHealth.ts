import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  BorderCertificate,
  BorderCertificateInput,
  BorderCrossing,
  BorderCrossingInput,
  BorderDailyStatistics,
  BorderDecision,
  BorderEmergency,
  BorderFacility,
  BorderHealthIncident,
  BorderNotification,
  BorderSample,
  BorderScreening,
  BorderShift,
  BorderStaff,
  BordersHealthOverview,
  CargoInspection,
  Contact,
  ContactTracingCase,
  CrossingPerformanceRow,
  HealthDeclaration,
  IsolationCase,
  ListResponse,
  QuarantineCase,
  TrafficTrendRow,
  TravelerHealthRecord,
  Vehicle,
  VehicleInspection,
} from '../../types/bordersHealth';

/* ── لوحة القيادة ─────────────────────────────────────────────────────── */

export const getBordersHealthOverview = () =>
  apiClient.get<ApiResponse<BordersHealthOverview>>('/borders-health/dashboard/overview/');

export const getCrossingPerformance = () =>
  apiClient.get<ApiResponse<ListResponse<CrossingPerformanceRow>>>(
    '/borders-health/dashboard/crossing-performance/',
  );

export const getTrafficTrend = (days = 7) =>
  apiClient.get<ApiResponse<ListResponse<TrafficTrendRow>>>(
    '/borders-health/dashboard/traffic-trend/',
    { params: { days } },
  );

/* ── المعابر والمرافق ─────────────────────────────────────────────────── */

export const getCrossings = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderCrossing>>>('/borders-health/crossings/', { params });

export const getCrossing = (id: string) =>
  apiClient.get<ApiResponse<BorderCrossing>>(`/borders-health/crossings/${id}/`);

export const createCrossing = (payload: BorderCrossingInput) =>
  apiClient.post<ApiResponse<BorderCrossing>>('/borders-health/crossings/', payload);

export const updateCrossing = (id: string, payload: Partial<BorderCrossingInput>) =>
  apiClient.patch<ApiResponse<BorderCrossing>>(`/borders-health/crossings/${id}/`, payload);

export const changeCrossingStatus = (
  id: string,
  operating_status: string,
  closure_reason?: string,
) =>
  apiClient.patch<ApiResponse<BorderCrossing>>(`/borders-health/crossings/${id}/status/`, {
    operating_status,
    ...(closure_reason ? { closure_reason } : {}),
  });

export const getFacilities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderFacility>>>('/borders-health/facilities/', { params });

export const getShifts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderShift>>>('/borders-health/shifts/', { params });

export const getBorderStaff = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderStaff>>>('/borders-health/staff/', { params });

/* ── المسافرون ────────────────────────────────────────────────────────── */

export const getTravelerRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<TravelerHealthRecord>>>(
    '/borders-health/traveler-records/',
    { params },
  );

export const getDeclarations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthDeclaration>>>('/borders-health/declarations/', { params });

export const getScreenings = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderScreening>>>('/borders-health/screenings/', { params });

export const createScreening = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<BorderScreening>>('/borders-health/screenings/', payload);

export const reassessScreening = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<BorderScreening>>(`/borders-health/screenings/${id}/reassess/`, payload);

/* ── المركبات ─────────────────────────────────────────────────────────── */

export const getVehicles = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Vehicle>>>('/borders-health/vehicles/', { params });

export const getVehicleInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VehicleInspection>>>(
    '/borders-health/vehicle-inspections/',
    { params },
  );

export const createVehicleInspection = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<VehicleInspection>>('/borders-health/vehicle-inspections/', payload);

/* ── الشحنات ──────────────────────────────────────────────────────────── */

export const getCargoInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CargoInspection>>>(
    '/borders-health/cargo-inspections/',
    { params },
  );

export const decideCargoInspection = (id: string, decision?: string) =>
  apiClient.post<ApiResponse<CargoInspection>>(
    `/borders-health/cargo-inspections/${id}/decide/`,
    decision ? { decision } : {},
  );

export const getSamples = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderSample>>>('/borders-health/samples/', { params });

/* ── الحجر والعزل ─────────────────────────────────────────────────────── */

export const getQuarantineCases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<QuarantineCase>>>(
    '/borders-health/quarantine-cases/',
    { params },
  );

export const getIsolationCases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IsolationCase>>>(
    '/borders-health/isolation-cases/',
    { params },
  );

/* ── تتبع المخالطين ───────────────────────────────────────────────────── */

export const getContactTracingCases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ContactTracingCase>>>(
    '/borders-health/contact-tracing-cases/',
    { params },
  );

export const getContacts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Contact>>>('/borders-health/contacts/', { params });

/* ── الطوارئ والحوادث ─────────────────────────────────────────────────── */

export const getIncidents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderHealthIncident>>>(
    '/borders-health/incidents/',
    { params },
  );

export const getEmergencies = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderEmergency>>>('/borders-health/emergencies/', { params });

/* ── الشهادات والقرارات والإشعارات ───────────────────────────────────── */

export const getCertificates = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderCertificate>>>(
    '/borders-health/certificates/',
    { params },
  );

export const issueCertificate = (payload: BorderCertificateInput) =>
  apiClient.post<ApiResponse<BorderCertificate>>('/borders-health/certificates/issue/', payload);

export const getDecisions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderDecision>>>('/borders-health/decisions/', { params });

export const getNotifications = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderNotification>>>(
    '/borders-health/notifications/',
    { params },
  );

/* ── الإحصاءات ────────────────────────────────────────────────────────── */

export const getDailyStatistics = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<BorderDailyStatistics>>>(
    '/borders-health/daily-statistics/',
    { params },
  );

export const refreshDailyStatistics = (crossing?: string, statDate?: string) =>
  apiClient.post<ApiResponse<ListResponse<BorderDailyStatistics>>>(
    '/borders-health/daily-statistics/refresh/',
    {
      ...(crossing ? { crossing } : {}),
      ...(statDate ? { stat_date: statDate } : {}),
    },
  );
