import apiClient from '../client';
import type { ApiResponse } from '../../types/api';

export interface MeResponse {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  national_id?: string | null;
  role?: string | null;
  role_id?: string | null;
  sector?: string | null;
  sector_name?: string | null;
  sector_code?: string | null;
  permissions?: string[];
}

export interface OrganizationEntry {
  sector?: string | null;
  sector_name?: string | null;
  sector_code?: string | null;
  department?: string | null;
  department_name?: string | null;
  station?: string | null;
  station_name?: string | null;
  unit?: string | null;
  unit_name?: string | null;
  position?: string | null;
  position_name?: string | null;
}

export interface SessionInfo {
  id: string;
  last_activity?: string | null;
  is_active: boolean;
  device_info?: string | null;
  ip_address?: string | null;
}

export interface NotificationSetting {
  key: string;
  label: string;
  value: boolean;
}

export interface PreferenceSettings {
  language?: 'ar' | 'en';
  direction?: 'RTL' | 'LTR';
  timezone?: string;
}

export interface ActivityLogEntry {
  date: string;
  time: string;
  action: string;
  description: string;
}

export const me = () =>
  apiClient.get<ApiResponse<MeResponse>>('/me/');

export const updateProfile = (data: {
  full_name_ar?: string;
  full_name_en?: string;
  phone?: string | null;
}) =>
  apiClient.patch<ApiResponse<MeResponse>>('/me/profile/', data);

export const meOrganization = () =>
  apiClient.get<ApiResponse<OrganizationEntry[]>>('/me/organization/');

export const meSessions = () =>
  apiClient.get<ApiResponse<SessionInfo[]>>('/me/sessions/');

export const deleteSession = (sessionId: string) =>
  apiClient.delete<ApiResponse<{ detail: string }>>(`/me/sessions/${sessionId}/`);

export const meActivity = () =>
  apiClient.get<ApiResponse<ActivityLogEntry[]>>('/me/activity/');

export const meNotificationsSettings = () =>
  apiClient.get<ApiResponse<NotificationSetting[]>>('/me/notifications/settings/');

export const updateNotificationsSettings = (data: {
  notify_transactions?: boolean;
  notify_tasks?: boolean;
  notify_health?: boolean;
  notify_certificates?: boolean;
  notify_system?: boolean;
  notify_email?: boolean;
  notify_in_app?: boolean;
}) =>
  apiClient.patch<ApiResponse<NotificationSetting[]>>('/me/notifications/settings/', data);

export const mePreferences = (data: PreferenceSettings) =>
  apiClient.patch<ApiResponse<PreferenceSettings>>('/me/preferences/', data);

export const authLogout = () =>
  apiClient.post<ApiResponse<{ detail: string }>>('/auth/logout/');