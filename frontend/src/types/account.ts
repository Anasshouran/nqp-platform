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