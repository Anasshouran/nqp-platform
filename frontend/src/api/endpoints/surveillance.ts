import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  ContactFollowUpWrite,
  ContactTrace,
  ContactTraceWrite,
  HealthCase,
  HealthCaseWrite,
  Investigation,
  InvestigationWrite,
  ReportableDisease,
  SurveillanceAlert,
  SurveillanceDashboard,
  WeeklySurveillanceReport,
  WeeklySurveillanceReportWrite,
} from '../../types/surveillance';

const BASE = '/surveillance';

export const getSurveillanceDashboard = () =>
  apiClient.get<ApiResponse<SurveillanceDashboard>>(`${BASE}/dashboard/`);

export const listReportableDiseases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ReportableDisease>>>(`${BASE}/reportable-diseases/`, { params });

export const listCases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthCase>>>(`${BASE}/cases/`, { params });

export const getCase = (id: string) =>
  apiClient.get<ApiResponse<HealthCase>>(`${BASE}/cases/${id}/`);

export const createCase = (payload: HealthCaseWrite) =>
  apiClient.post<ApiResponse<HealthCase>>(`${BASE}/cases/`, payload);

export const updateCase = (id: string, payload: HealthCaseWrite) =>
  apiClient.patch<ApiResponse<HealthCase>>(`${BASE}/cases/${id}/`, payload);

export const transitionCase = (id: string, payload: { case_type?: string; status?: string; note?: string }) =>
  apiClient.post<ApiResponse<HealthCase>>(`${BASE}/cases/${id}/transition/`, payload);

export const caseHistory = (id: string) =>
  apiClient.get<ApiResponse<unknown>>(`${BASE}/cases/${id}/history/`);

export const listAlerts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SurveillanceAlert>>>(`${BASE}/surveillance-alerts/`, { params });

export const updateAlert = (id: string, payload: { status: string }) =>
  apiClient.patch<ApiResponse<SurveillanceAlert>>(`${BASE}/surveillance-alerts/${id}/`, payload);

export const ackAlert = (id: string) =>
  apiClient.post<ApiResponse<SurveillanceAlert>>(`${BASE}/surveillance-alerts/${id}/ack/`);

export const respondAlert = (id: string) =>
  apiClient.post<ApiResponse<SurveillanceAlert>>(`${BASE}/surveillance-alerts/${id}/respond/`);

export const closeAlert = (id: string) =>
  apiClient.post<ApiResponse<SurveillanceAlert>>(`${BASE}/surveillance-alerts/${id}/close/`);

export const runEwars = () =>
  apiClient.post<ApiResponse<{ created: number }>>(`${BASE}/surveillance-alerts/run-ewars/`);

export const listContacts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ContactTrace>>>(`${BASE}/contacts/`, { params });

export const createContact = (payload: ContactTraceWrite) =>
  apiClient.post<ApiResponse<ContactTrace>>(`${BASE}/contacts/`, payload);

export const addContactFollowUp = (id: string, payload: ContactFollowUpWrite) =>
  apiClient.post<ApiResponse<unknown>>(`${BASE}/contacts/${id}/follow-up/`, payload);

export const listInvestigations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Investigation>>>(`${BASE}/investigations/`, { params });

export const createInvestigation = (payload: InvestigationWrite) =>
  apiClient.post<ApiResponse<Investigation>>(`${BASE}/investigations/`, payload);

export const listWeeklyReports = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WeeklySurveillanceReport>>>(`${BASE}/weekly-reports/`, { params });

export const createWeeklyReport = (payload: WeeklySurveillanceReportWrite) =>
  apiClient.post<ApiResponse<WeeklySurveillanceReport>>(`${BASE}/weekly-reports/`, payload);

export const reviewWeeklyReport = (id: string, is_on_time?: boolean) =>
  apiClient.post<ApiResponse<WeeklySurveillanceReport>>(`${BASE}/weekly-reports/${id}/review/`, { is_on_time });
