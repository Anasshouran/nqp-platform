import apiClient from '../client';
import type { ApiResponse } from '../../types/api';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'websocket';
export type NotificationStatus = 'sent' | 'failed' | 'pending';

export interface AppNotification {
  id: string;
  user?: string | null;
  template?: string | null;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  is_read?: boolean;
  read_at?: string | null;
  created_at?: string;
  sent_at?: string | null;
  error_message?: string;
}

export const NOTIFICATIONS_CHANGED_EVENT = 'nqp:notifications-changed';

/** يُبث عند تغيّر حالة القراءة ليُحدِّث الجرس واللوحة معاً. */
export const notifyNotificationsChanged = () =>
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));

export const getNotifications = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<AppNotification[]>>('/notifications/', { params });

export const getUnreadNotificationCount = () =>
  apiClient.get<ApiResponse<{ unread_count: number }>>('/notifications/unread-count/');

export const markNotificationRead = (id: string) =>
  apiClient.post<ApiResponse<AppNotification>>(`/notifications/${id}/read/`);

export const markAllNotificationsRead = () =>
  apiClient.post<ApiResponse<{ marked: number }>>('/notifications/read-all/');