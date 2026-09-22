import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  ITAsset,
  ItDashboard,
  ItReport,
  ItSystem,
  NetworkStatus,
  SupportTicket,
} from '../../types/it';

export const getItDashboard = () =>
  apiClient.get<ApiResponse<ItDashboard>>('/it/dashboard/');

export const recheckItSystems = () =>
  apiClient.post<ApiResponse<{ checked: number }>>('/it/systems/recheck/');

export const getItSystems = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ItSystem>>>('/it/systems/', { params });

export const updateItSystem = (id: string, data: Partial<ItSystem>) =>
  apiClient.patch<ApiResponse<ItSystem>>(`/it/systems/${id}/`, data);

export const getItAssets = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ITAsset>>>('/it/assets/', { params });

export const createItAsset = (data: Partial<ITAsset>) =>
  apiClient.post<ApiResponse<ITAsset>>('/it/assets/', data);

export const updateItAsset = (id: string, data: Partial<ITAsset>) =>
  apiClient.patch<ApiResponse<ITAsset>>(`/it/assets/${id}/`, data);

export const deleteItAsset = (id: string) => apiClient.delete(`/it/assets/${id}/`);

export const getItTickets = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SupportTicket>>>('/it/tickets/', { params });

export const createItTicket = (data: Partial<SupportTicket>) =>
  apiClient.post<ApiResponse<SupportTicket>>('/it/tickets/', data);

export const updateItTicket = (id: string, data: Partial<SupportTicket>) =>
  apiClient.patch<ApiResponse<SupportTicket>>(`/it/tickets/${id}/`, data);

export const getItNetworks = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<NetworkStatus>>>('/it/networks/', { params });

export const syncItNetworks = () =>
  apiClient.post<ApiResponse<{ synced: number }>>('/it/networks/sync/');

export const getItReports = () => apiClient.get<ApiResponse<ItReport>>('/it/reports/');