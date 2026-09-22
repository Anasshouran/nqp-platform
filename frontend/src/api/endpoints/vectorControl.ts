import apiClient from '../client';
import { vectorMutation } from '../../utils/vectorOffline';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  InventoryMovement,
  OpChemicalLine,
  VectorAlert,
  VectorCase,
  VectorChemical,
  VectorControlOperation,
  VectorDashboardOverview,
  VectorEquipment,
  VectorFocus,
  VectorFollowUp,
  VectorInspection,
  VectorInventoryItem,
  VectorLabResult,
  VectorMapFocus,
  VectorRegistry,
  VectorReport,
  VectorSample,
  VectorSite,
  VectorStatistics,
  VectorSurvey,
  VectorTeam,
  VectorUnit,
} from '../../types/vectorControl';

const BASE = '/vector-control';

const vc = {
  post: <T>(path: string, data?: unknown) =>
    vectorMutation({ url: `${BASE}${path}`, method: 'POST', data: data ?? {} }) as Promise<{ data: ApiResponse<T> }>,
  patch: <T>(path: string, data?: unknown) =>
    vectorMutation({ url: `${BASE}${path}`, method: 'PATCH', data: data ?? {} }) as Promise<{ data: ApiResponse<T> }>,
};

export const getVectors = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorRegistry>>>(`${BASE}/vectors/`, { params });

export const createVector = (data: Partial<VectorRegistry>) => vc.post<VectorRegistry>(`/vectors/`, data);

export const updateVector = (id: string, data: Partial<VectorRegistry>) => vc.patch<VectorRegistry>(`/vectors/${id}/`, data);

export const getUnits = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorUnit>>>(`${BASE}/units/`, { params });

export const createUnit = (data: Partial<VectorUnit>) => vc.post<VectorUnit>(`/units/`, data);

export const getSites = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorSite>>>(`${BASE}/sites/`, { params });

export const createSite = (data: Partial<VectorSite>) => vc.post<VectorSite>(`/sites/`, data);

export const getTeams = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorTeam>>>(`${BASE}/teams/`, { params });

export const createTeam = (data: Partial<VectorTeam>) => vc.post<VectorTeam>(`/teams/`, data);

export const getReports = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorReport>>>(`${BASE}/reports/`, { params });

export const createReport = (data: Partial<VectorReport>) => vc.post<VectorReport>(`/reports/`, data);

export const assessReport = (id: string, note = '') => vc.post<VectorReport>(`/reports/${id}/assess/`, { note });

export const acceptReport = (id: string) => vc.post<VectorReport>(`/reports/${id}/accept/`);

export const openFocusFromReport = (id: string) => vc.post<VectorFocus>(`/reports/${id}/open_focus/`);

export const rejectReport = (id: string, note = '') => vc.post<VectorReport>(`/reports/${id}/reject/`, { note });

export const closeReport = (id: string) => vc.post<VectorReport>(`/reports/${id}/close/`);

export const getFoci = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorFocus>>>(`${BASE}/foci/`, { params });

export const createFocus = (data: Partial<VectorFocus>) => vc.post<VectorFocus>(`/foci/`, data);

export const closeFocus = (id: string, reason = '') => vc.post<VectorFocus>(`/foci/${id}/close/`, { reason });

export const retreatFocus = (id: string) => vc.post<VectorFocus>(`/foci/${id}/retreat/`, { reason: 'أُعيدت للمعالجة' });

export const getInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorInspection>>>(`${BASE}/inspections/`, { params });

export const createInspection = (data: Partial<VectorInspection>) => vc.post<VectorInspection>(`/inspections/`, data);

export const submitInspection = (id: string) => vc.post<VectorInspection>(`/inspections/${id}/submit/`);

export const getSurveys = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorSurvey>>>(`${BASE}/surveys/`, { params });

export const createSurvey = (data: Partial<VectorSurvey>) => vc.post<VectorSurvey>(`/surveys/`, data);

export const approveSurvey = (id: string) => vc.post<VectorSurvey>(`/surveys/${id}/approve/`);

export const openFocusFromSurvey = (id: string) => vc.post<VectorFocus>(`/surveys/${id}/open_focus/`);

export const getSamples = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorSample>>>(`${BASE}/samples/`, { params });

export const createSample = (data: Partial<VectorSample>) => vc.post<VectorSample>(`/samples/`, data);

export const receiveSample = (id: string) => vc.post<VectorSample>(`/samples/${id}/receive/`);

export const submitSampleResult = (
  id: string,
  data: { species_identified?: string; identification_method: string; result: string; findings?: string }
) => vc.post<VectorLabResult>(`/samples/${id}/submit_result/`, data);

export const getLabResults = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorLabResult>>>(`${BASE}/lab-results/`, { params });

export const approveLabResult = (id: string) => vc.post<VectorLabResult>(`/lab-results/${id}/approve/`);

export const rejectLabResult = (id: string, reason = '') => vc.post<VectorLabResult>(`/lab-results/${id}/reject/`, { reason });

export const getOperations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorControlOperation>>>(`${BASE}/operations/`, { params });

export const createOperation = (data: Partial<VectorControlOperation>) => vc.post<VectorControlOperation>(`/operations/`, data);

export const nextOperationStatus = (id: string, data: Record<string, unknown> = {}) =>
  vc.post<VectorControlOperation>(`/operations/${id}/next/`, data);

export const addOperationChemical = (
  id: string,
  data: { chemical: string; item?: string | null; dosage?: string; concentration?: string; quantity_used: number; unit?: string; area_covered?: number | null }
) => vc.post<OpChemicalLine>(`/operations/${id}/chemicals/`, data);

export const setOperationResult = (id: string, data: { effective: boolean; effectiveness_percent?: number; reason?: string }) =>
  vc.post<VectorControlOperation>(`/operations/${id}/set_result/`, data);

export const closeOperation = (id: string) => vc.post<VectorControlOperation>(`/operations/${id}/close/`);

export const getChemicals = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorChemical>>>(`${BASE}/chemicals/`, { params });

export const createChemical = (data: Partial<VectorChemical>) => vc.post<VectorChemical>(`/chemicals/`, data);

export const getEquipment = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorEquipment>>>(`${BASE}/equipment/`, { params });

export const createEquipment = (data: Partial<VectorEquipment>) => vc.post<VectorEquipment>(`/equipment/`, data);

export const getInventory = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorInventoryItem>>>(`${BASE}/inventory/`, { params });

export const lowStockInventory = () => apiClient.get<ApiResponse<VectorInventoryItem[]>>(`${BASE}/inventory/low_stock/`);

export const adjustInventory = (id: string, data: { quantity: number; note?: string }) =>
  vc.post<VectorInventoryItem>(`/inventory/${id}/adjust/`, data);

export const getMovements = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<InventoryMovement>>>(`${BASE}/inventory-movements/`, { params });

export const getFollowups = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorFollowUp>>>(`${BASE}/followups/`, { params });

export const createFollowup = (data: Partial<VectorFollowUp>) => vc.post<VectorFollowUp>(`/followups/`, data);

export const closeFollowup = (id: string, data: { controlled: boolean; recommend_retreatment: boolean; findings?: string; notes?: string }) =>
  vc.post<VectorFollowUp>(`/followups/${id}/close/`, data);

export const getCases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorCase>>>(`${BASE}/cases/`, { params });

export const getAlerts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorAlert>>>(`${BASE}/alerts/`, { params });

export const markAlertRead = (id: string) => vc.post<VectorAlert>(`/alerts/${id}/mark_read/`);

export const markAllAlertsRead = () => vc.post<{ updated: number }>(`/alerts/mark_all_read/`);

export const getVectorDashboard = () => apiClient.get<ApiResponse<VectorDashboardOverview>>(`${BASE}/dashboard/overview/`);

export const getVectorMap = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<VectorMapFocus[]>>(`${BASE}/dashboard/map/`, { params });

export const getVectorStatistics = () => apiClient.get<ApiResponse<VectorStatistics>>(`${BASE}/dashboard/statistics/`);

export const getVectorActivity = (limit = 12) =>
  apiClient.get<ApiResponse<unknown[]>>(`${BASE}/dashboard/recent-activity/`, { params: { limit } });