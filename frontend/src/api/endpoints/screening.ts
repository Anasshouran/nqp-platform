import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { HealthScreening } from '../../types/screening';

export const getScreenings = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthScreening>>>('/screening/', { params });

export const getScreening = (id: string) =>
  apiClient.get<ApiResponse<HealthScreening>>(`/screening/${id}/`);

export const createScreening = (data: Record<string, unknown>) =>
  apiClient.post('/screening/', data);
