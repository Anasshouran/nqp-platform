import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { RiskAssessment, RiskSettings } from '../../types/risk';

export const getRiskAssessments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<RiskAssessment>>>('/risk/assessments/', { params });

export const getRiskSettings = () =>
  apiClient.get<ApiResponse<RiskSettings>>('/risk/settings/');

export const updateRiskSettings = (data: Partial<RiskSettings>) =>
  apiClient.put<ApiResponse<RiskSettings>>('/risk/settings/1/', data);
