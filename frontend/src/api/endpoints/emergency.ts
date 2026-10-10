import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { EmergencyAlert, EmergencyEvent, KillSwitch } from '../../types/emergency';

/** Create payload. Optional fields are omitted (backend serializer allows them); `status` and `location_geo` are left to server defaults. */
export interface CreateEmergencyAlertPayload {
  alert_type: string;
  description?: string;
  port?: string;
}

export const getAlerts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<EmergencyAlert>>>('/emergency/alerts/', { params });

export const createAlert = (data: CreateEmergencyAlertPayload) =>
  apiClient.post<ApiResponse<EmergencyAlert>>('/emergency/alerts/', data);

export const closeAlert = (id: string) =>
  apiClient.post<ApiResponse<EmergencyAlert>>(`/emergency/alerts/${id}/close/`);

export const getEmergencyEvents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<EmergencyEvent>>>('/emergency/events/', { params });

export const getKillSwitches = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<KillSwitch>>>('/emergency/kill-switch/', { params });

export const getKillSwitchStatus = () =>
  apiClient.get<ApiResponse<{ active: boolean; switch: KillSwitch | null }>>('/emergency/kill-switch/status/');

export const getEmergencyStats = () =>
  apiClient.get<ApiResponse<Record<string, number>>>('/emergency/dashboard/');
