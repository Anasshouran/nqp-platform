import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { EmergencyAlert, EmergencyEvent, KillSwitch } from '../../types/emergency';

export const getAlerts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<EmergencyAlert>>>('/emergency/alerts/', { params });

export const getEmergencyEvents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<EmergencyEvent>>>('/emergency/events/', { params });

export const getKillSwitches = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<KillSwitch>>>('/emergency/kill-switch/', { params });

export const getKillSwitchStatus = () =>
  apiClient.get<ApiResponse<{ active: boolean; switch: KillSwitch | null }>>('/emergency/kill-switch/status/');

export const getEmergencyStats = () =>
  apiClient.get<ApiResponse<Record<string, number>>>('/emergency/dashboard/');
