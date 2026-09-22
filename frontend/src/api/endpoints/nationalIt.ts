import apiClient from '../client';
import type { ApiResponse } from '../../types/api';
import type { NationalItDashboard } from '../../types/nationalIt';

export const getNationalItDashboard = () =>
  apiClient.get<ApiResponse<NationalItDashboard>>('/it/national/dashboard/');

export const testNationalItIntegration = (id: string) =>
  apiClient.post<ApiResponse<{ id: string; status: string }>>(`/it/integrations/${id}/test_connection/`);
