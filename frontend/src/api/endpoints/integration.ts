import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  Organization,
  ApiEndpoint,
  Integration,
  IntegrationHealth,
  WebhookSubscription,
  WebhookDelivery,
  AuditLog,
  DataScope,
  Credential,
  OrganizationFormData,
  ApiEndpointFormData,
  IntegrationFormData,
  IntegrationHealthFormData,
  WebhookSubscriptionFormData,
  DataScopeFormData,
  CredentialFormData,
  DeveloperApp,
  IntegrationLog,
  IhrReportResponse,
  IhrSubmitResult,
  WebhookEndpoint,
} from '../../types/integration';

// --- Organizations ---
export const getOrganizations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Organization>>>('/integration/entities/', { params });

export const getOrganization = (id: string) =>
  apiClient.get<ApiResponse<Organization>>(`/integration/entities/${id}/`);

export const createOrganization = (payload: OrganizationFormData) =>
  apiClient.post<ApiResponse<Organization>>('/integration/entities/', payload);

export const updateOrganization = (id: string, payload: Partial<OrganizationFormData>) =>
  apiClient.patch<ApiResponse<Organization>>(`/integration/entities/${id}/`, payload);

export const deleteOrganization = (id: string) =>
  apiClient.delete(`/integration/entities/${id}/`);

// --- API Endpoints (Catalog) ---
export const getApiEndpoints = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ApiEndpoint>>>('/integration/api-endpoints/', { params });

export const getApiEndpoint = (id: string) =>
  apiClient.get<ApiResponse<ApiEndpoint>>(`/integration/api-endpoints/${id}/`);

export const createApiEndpoint = (payload: ApiEndpointFormData) =>
  apiClient.post<ApiResponse<ApiEndpoint>>('/integration/api-endpoints/', payload);

export const updateApiEndpoint = (id: string, payload: Partial<ApiEndpointFormData>) =>
  apiClient.patch<ApiResponse<ApiEndpoint>>(`/integration/api-endpoints/${id}/`, payload);

export const deleteApiEndpoint = (id: string) =>
  apiClient.delete(`/integration/api-endpoints/${id}/`);

// --- Integrations ---
export const getIntegrations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Integration>>>('/integration/integrations/', { params });

export const getIntegration = (id: string) =>
  apiClient.get<ApiResponse<Integration>>(`/integration/integrations/${id}/`);

export const createIntegration = (payload: IntegrationFormData) =>
  apiClient.post<ApiResponse<Integration>>('/integration/integrations/', payload);

export const updateIntegration = (id: string, payload: Partial<IntegrationFormData>) =>
  apiClient.patch<ApiResponse<Integration>>(`/integration/integrations/${id}/`, payload);

export const deleteIntegration = (id: string) =>
  apiClient.delete(`/integration/integrations/${id}/`);

// --- Integration Health ---
export const getIntegrationHealth = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IntegrationHealth>>>('/integration/health/', { params });

export const createIntegrationHealth = (payload: IntegrationHealthFormData) =>
  apiClient.post<ApiResponse<IntegrationHealth>>('/integration/health/', payload);

// --- Webhook Subscriptions ---
export const getWebhookSubscriptions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WebhookSubscription>>>('/integration/webhook-subscriptions/', { params });

export const getWebhookSubscription = (id: string) =>
  apiClient.get<ApiResponse<WebhookSubscription>>(`/integration/webhook-subscriptions/${id}/`);

export const createWebhookSubscription = (payload: WebhookSubscriptionFormData) =>
  apiClient.post<ApiResponse<WebhookSubscription>>('/integration/webhook-subscriptions/', payload);

export const updateWebhookSubscription = (id: string, payload: Partial<WebhookSubscriptionFormData>) =>
  apiClient.patch<ApiResponse<WebhookSubscription>>(`/integration/webhook-subscriptions/${id}/`, payload);

export const deleteWebhookSubscription = (id: string) =>
  apiClient.delete(`/integration/webhook-subscriptions/${id}/`);

// --- Webhook Deliveries ---
export const getWebhookDeliveries = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WebhookDelivery>>>('/integration/webhook-deliveries/', { params });

// --- Audit Logs ---
export const getAuditLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>('/integration/audit-logs/', { params });

// --- Data Scopes ---
export const getDataScopes = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DataScope>>>('/integration/data-scopes/', { params });

export const getDataScope = (id: string) =>
  apiClient.get<ApiResponse<DataScope>>(`/integration/data-scopes/${id}/`);

export const createDataScope = (payload: DataScopeFormData) =>
  apiClient.post<ApiResponse<DataScope>>('/integration/data-scopes/', payload);

export const updateDataScope = (id: string, payload: Partial<DataScopeFormData>) =>
  apiClient.patch<ApiResponse<DataScope>>(`/integration/data-scopes/${id}/`, payload);

export const deleteDataScope = (id: string) =>
  apiClient.delete(`/integration/data-scopes/${id}/`);

// --- Credentials ---
export const getCredentials = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Credential>>>('/integration/credentials/', { params });

export const getCredential = (id: string) =>
  apiClient.get<ApiResponse<Credential>>(`/integration/credentials/${id}/`);

export const createCredential = (payload: CredentialFormData) =>
  apiClient.post<ApiResponse<Credential>>('/integration/credentials/', payload);

export const updateCredential = (id: string, payload: Partial<CredentialFormData>) =>
  apiClient.patch<ApiResponse<Credential>>(`/integration/credentials/${id}/`, payload);

export const deleteCredential = (id: string) =>
  apiClient.delete(`/integration/credentials/${id}/`);

// --- Integration Health ---
export const getIntegrationHealthRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IntegrationHealth>>>('/integration/health/', { params });

export const createIntegrationHealthRecord = (payload: IntegrationHealthFormData) =>
  apiClient.post<ApiResponse<IntegrationHealth>>('/integration/health/run_check/', payload);

// --- IHR Reports (existing) ---
export const getIhrPheicReport = (output?: 'xml' | 'json') =>
  apiClient.get<ApiResponse<IhrReportResponse>>('/integration/ihr/report/pheic/', {
    params: output === 'xml' ? { output: 'xml' } : {},
  });

export const getIhrWeeklyReport = () =>
  apiClient.get<ApiResponse<IhrReportResponse>>('/integration/ihr/report/weekly/');

export const submitIhrReport = (payload: { report_type: 'PHEIC' | 'WEEKLY' | 'ANNUAL'; output?: 'xml' | 'json' }) =>
  apiClient.post<ApiResponse<IhrSubmitResult>>('/integration/ihr/report/submit/', payload);

// --- Developer Apps (existing) ---
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

// --- Legacy Webhook Endpoints ---
export const getWebhooks = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WebhookEndpoint>>>('/integration/webhooks/', { params });

export const createWebhook = (payload: Pick<WebhookEndpoint, 'app' | 'event_type' | 'endpoint_url' | 'is_active'>) =>
  apiClient.post<ApiResponse<WebhookEndpoint>>('/integration/webhooks/', payload);

export const updateWebhook = (id: string, payload: Partial<WebhookEndpoint>) =>
  apiClient.patch<ApiResponse<WebhookEndpoint>>(`/integration/webhooks/${id}/`, payload);

export const deleteWebhook = (id: string) =>
  apiClient.delete(`/integration/webhooks/${id}/`);

// --- Re-export types for convenience ---
export type {
  Organization,
  OrganizationFormData,
  ApiEndpoint,
  ApiEndpointFormData,
  Integration,
  IntegrationFormData,
  IntegrationHealth,
  IntegrationHealthFormData,
  WebhookSubscription,
  WebhookSubscriptionFormData,
  WebhookDelivery,
  AuditLog,
  DataScope,
  DataScopeFormData,
  Credential,
  CredentialFormData,
  Organization as ExternalEntity,
  IntegrationLog,
  DeveloperApp,
  WebhookEndpoint,
  IhrReportResponse,
  IhrSubmitResult,
} from '../../types/integration';

// Backward compatibility aliases
export const getExternalEntities = getOrganizations;
export const getIntegrationLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IntegrationLog>>>('/integration/logs/', { params });