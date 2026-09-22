import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { DeveloperApp, ExternalEntity, IhrReportResponse, IhrSubmitResult, IntegrationLog, WebhookEndpoint } from '../../types/integration';

export const getIntegrationLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IntegrationLog>>>('/integration/logs/', { params });

export const getExternalEntities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ExternalEntity>>>('/integration/entities/', { params });

export const getIhrPheicReport = (output?: 'xml' | 'json') =>
  apiClient.get<ApiResponse<IhrReportResponse>>('/integration/ihr/report/pheic/', {
    params: output === 'xml' ? { output: 'xml' } : {},
  });

export const getIhrWeeklyReport = () =>
  apiClient.get<ApiResponse<IhrReportResponse>>('/integration/ihr/report/weekly/');

export const submitIhrReport = (payload: { report_type: 'PHEIC' | 'WEEKLY' | 'ANNUAL'; output?: 'xml' | 'json' }) =>
  apiClient.post<ApiResponse<IhrSubmitResult>>('/integration/ihr/report/submit/', payload);

export const getDeveloperApps = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DeveloperApp>>>('/integration/developer-apps/', { params });

export const createDeveloperApp = (payload: Pick<DeveloperApp, 'name' | 'description' | 'is_active'>) =>
  apiClient.post<ApiResponse<DeveloperApp>>('/integration/developer-apps/', payload);

export const updateDeveloperApp = (id: string, payload: Partial<DeveloperApp>) =>
  apiClient.patch<ApiResponse<DeveloperApp>>(`/integration/developer-apps/${id}/`, payload);

export const deleteDeveloperApp = (id: string) =>
  apiClient.delete(`/integration/developer-apps/${id}/`);

export const rotateDeveloperAppKey = (id: string) =>
  apiClient.post<ApiResponse<DeveloperApp>>(`/integration/developer-apps/${id}/rotate-key/`);

export const getWebhooks = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WebhookEndpoint>>>('/integration/webhooks/', { params });

export const createWebhook = (payload: Pick<WebhookEndpoint, 'app' | 'event_type' | 'endpoint_url' | 'is_active'>) =>
  apiClient.post<ApiResponse<WebhookEndpoint>>('/integration/webhooks/', payload);

export const updateWebhook = (id: string, payload: Partial<WebhookEndpoint>) =>
  apiClient.patch<ApiResponse<WebhookEndpoint>>(`/integration/webhooks/${id}/`, payload);

export const deleteWebhook = (id: string) =>
  apiClient.delete(`/integration/webhooks/${id}/`);
