import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { HealthScreening } from '../../types/screening';

export interface ScreeningRiskAssessment {
  id: string;
  screening: string;
  passport_number?: string;
  traveler_name?: string;
  port_name?: string;
  risk_level: 'GREEN' | 'YELLOW' | 'RED';
  risk_score: number;
  decision_factors: Record<string, unknown>;
  recommendation: 'ADMIT' | 'QUARANTINE' | 'REFER';
  assessed_at: string;
}

export interface ScreeningCreateResult {
  screening_id: string;
  risk_assessment: ScreeningRiskAssessment;
}

export const getScreenings = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthScreening>>>('/screening/', { params });

export const getScreening = (id: string) =>
  apiClient.get<ApiResponse<HealthScreening>>(`/screening/${id}/`);

export const createScreening = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<ScreeningCreateResult>>('/screening/', data);

export const getLatestRisk = (id: string) =>
  apiClient.get<ApiResponse<ScreeningRiskAssessment>>(`/screening/${id}/latest-risk/`);

export const referScreening = (id: string) =>
  apiClient.post<ApiResponse<{ referral_id: string; clinic_visit_url: string }>>(`/screening/${id}/refer/`);
