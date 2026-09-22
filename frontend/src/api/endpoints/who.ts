import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  DiseaseMaster,
  WhoConnectionStatus,
  WhoEnvironment,
  WhoIntegration,
  WhoIntegrationInput,
  WhoSyncLog,
  WhoTestResult,
} from '../../types/who';

export const getWhoIntegrations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WhoIntegration>>>('/who/integrations/', { params });

export const createWhoIntegration = (payload: WhoIntegrationInput) =>
  apiClient.post<ApiResponse<WhoIntegration>>('/who/integrations/', payload);

export const updateWhoIntegration = (id: string, payload: Partial<WhoIntegrationInput>) =>
  apiClient.patch<ApiResponse<WhoIntegration>>(`/who/integrations/${id}/`, payload);

export const getWhoConnectionStatus = () =>
  apiClient.get<ApiResponse<WhoConnectionStatus>>('/who/integrations/status/');

export const testWhoConnection = () =>
  apiClient.post<ApiResponse<WhoTestResult>>('/who/integrations/test/');

export const syncWhoNow = () =>
  apiClient.post<ApiResponse<{ task_id: string }>>('/who/integrations/sync/');

export const getWhoSyncLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WhoSyncLog>>>('/who/logs/', { params });

export const getWhoDiseases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DiseaseMaster>>>('/who/diseases/', { params });

export const syncWhoDiseases = (payload: { diseases: string[] }) =>
  apiClient.post<ApiResponse<never[]>>('/who/diseases/sync/', payload);

export const WHO_ENVIRONMENT_OPTIONS: WhoEnvironment[] = ['DEV', 'SANDBOX', 'PRODUCTION'];