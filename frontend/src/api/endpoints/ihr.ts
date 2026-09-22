import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  IhrEvent,
  IHRRiskLevel,
  IHREventStatus,
  IHREventType,
  NationalFocalPoint,
  NfpType,
  RiskAssessment,
  SPARAssessment,
  SPARIndicator,
  SPARYearReport,
} from '../../types/ihr';

export interface IhrEventInput {
  event_type: IHREventType;
  title: string;
  description?: string;
  disease?: string;
  sector?: string;
  port?: string;
  locality?: string;
  date_detected?: string;
  date_verified?: string;
  cases_suspected?: number;
  cases_probable?: number;
  cases_confirmed?: number;
  deaths?: number;
  risk_level?: IHRRiskLevel;
  is_international_impact?: boolean;
}

export interface RiskAssessmentInput {
  hazard?: string;
  geographic_spread?: string;
  transmission?: string;
  international_travel?: string;
  poe_impact?: string;
  response_capacity?: string;
  overall_risk?: IHRRiskLevel;
  notes?: string;
}

export const getIhrEvents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IhrEvent>>>('/ihr/events/', { params });

export const getIhrEvent = (id: string) =>
  apiClient.get<ApiResponse<IhrEvent>>(`/ihr/events/${id}/`);

export const createIhrEvent = (payload: IhrEventInput) =>
  apiClient.post<ApiResponse<IhrEvent>>('/ihr/events/', payload);

export const updateIhrEvent = (id: string, payload: Partial<IhrEventInput>) =>
  apiClient.patch<ApiResponse<IhrEvent>>(`/ihr/events/${id}/`, payload);

export const submitIhrEvent = (id: string) =>
  apiClient.post<ApiResponse<IhrEvent>>(`/ihr/events/${id}/submit/`);

export const assessIhrEvent = (id: string, payload: RiskAssessmentInput) =>
  apiClient.post<ApiResponse<RiskAssessment>>(`/ihr/events/${id}/assess/`, payload);

export const approveIhrEvent = (id: string) =>
  apiClient.post<ApiResponse<IhrEvent>>(`/ihr/events/${id}/approve/`);

export const notifyWhoOfIhrEvent = (id: string) =>
  apiClient.post<ApiResponse<{ task_id: string }>>(`/ihr/events/${id}/notify-who/`);

export const closeIhrEvent = (id: string) =>
  apiClient.post<ApiResponse<IhrEvent>>(`/ihr/events/${id}/close/`);

export const getRiskAssessments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<RiskAssessment>>>('/ihr/risk-assessments/', { params });

export const getNfp = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<NationalFocalPoint>>>('/ihr/nfp/', { params });

export const assignNfp = (payload: { user: string; nfp_type: NfpType; phone?: string; email?: string; institution?: string; appointed_at?: string }) =>
  apiClient.post<ApiResponse<NationalFocalPoint>>('/ihr/nfp/assign/', payload);

export const getSparIndicators = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SPARIndicator>>>('/ihr/spar/indicators/', { params });

export const getSparAssessments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SPARAssessment>>>('/ihr/spar/', { params });

export const createSparAssessment = (payload: { year: number; indicator: string; score: number; evidence?: string; gaps?: string; action_plan?: string; comments?: string }) =>
  apiClient.post<ApiResponse<SPARAssessment>>('/ihr/spar/', payload);

export const getSparYearReport = (year: number) =>
  apiClient.get<ApiResponse<SPARYearReport>>(`/ihr/spar/report/${year}/`);

export const IHR_EVENT_STATUS_OPTIONS: IHREventStatus[] = [
  'DRAFT',
  'UNDER_REVIEW',
  'NATIONAL_ASSESSMENT',
  'NFP_REVIEW',
  'NOTIFIABLE',
  'SUBMITTED',
  'FOLLOW_UP',
  'CLOSED',
];

export const IHR_EVENT_TYPE_OPTIONS: IHREventType[] = [
  'INFECTIOUS_DISEASE',
  'ZOONOSIS',
  'FOODBORNE',
  'CHEMICAL',
  'RADIOLOGICAL',
  'UNKNOWN',
];

export const IHR_RISK_OPTIONS: IHRRiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];