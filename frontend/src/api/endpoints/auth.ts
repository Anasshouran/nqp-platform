import apiClient from '../client';
import type { ApiResponse } from '../../types/api';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  national_id?: string | null;
  user_type?: string | null;
  organization_name?: string | null;
  role?: string | null;
  role_id?: string | null;
  sector?: string | null;
  sector_name?: string | null;
  sector_code?: string | null;
  permissions?: string[];
  role_assignments?: ProfileRoleAssignment[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone?: string;
  user_type: string;
  organization_name?: string;
  password: string;
  confirm_password: string;
}

interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

export const login = (data: { identifier: string; password: string }) =>
  apiClient.post<ApiResponse<LoginResponse>>('/auth/login/', data);

export const register = (data: RegisterPayload) =>
  apiClient.post<ApiResponse<LoginResponse>>('/auth/register/', data);

export const refresh = (refreshToken: string) =>
  apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh/', {
    refresh: refreshToken,
  });

export const logout = (refreshToken: string) =>
  apiClient.post('/auth/logout/', { refresh: refreshToken });

export const staffForgotPassword = (email: string) =>
  apiClient.post<ApiResponse<{ detail: string }>>('/auth/forgot-password/', { email });

export const staffResetPassword = (uidb64: string, token: string, password: string, confirm_password: string) =>
  apiClient.post<ApiResponse<{ detail: string }>>('/auth/reset-password/', { uidb64, token, password, confirm_password });

export const me = () =>
  apiClient.get<ApiResponse<LoginResponse['user']>>('/auth/me/');

export interface EmployeeProfile {
  employee_number?: string | null;
  full_name_ar?: string;
  full_name_en?: string;
  gender?: string;
  birth_date?: string | null;
  job_title?: string;
  hire_date?: string | null;
  employment_status?: string;
  internal_phone?: string;
  office?: string;
  preferred_contact?: string;
  language?: string;
  theme?: string;
  timezone?: string;
  notify_email?: boolean;
  notify_sms?: boolean;
  notify_in_app?: boolean;
  signature_status?: string;
  certificate?: string;
  signature_issue_date?: string | null;
  signature_expiry_date?: string | null;
}

export interface ProfileRoleAssignment {
  role: string;
  role_name: string;
  scope_type: string;
  scope_id?: string | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProfileOrganizationEntry {
  position?: string | null;
  position_code?: string | null;
  sector?: string | null;
  sector_code?: string | null;
  sector_id?: string | null;
  department?: string | null;
  department_code?: string | null;
  department_id?: string | null;
  station?: string | null;
  station_code?: string | null;
  station_id?: string | null;
  lab?: string | null;
  lab_code?: string | null;
  lab_id?: string | null;
  is_primary?: boolean;
}

export interface ProfileData {
  user: LoginResponse['user'];
  profile: EmployeeProfile;
  security: {
    id: string;
    is_active: boolean;
    is_staff: boolean;
    is_mfa_enabled: boolean;
    account_expires_at?: string | null;
    last_login?: string | null;
    created_at?: string | null;
  };
  roles: ProfileRoleAssignment[];
  organization: ProfileOrganizationEntry[];
  effective_permissions: string[];
  scopes: { role: string; scope_type: string; scope_id?: string | null }[];
}

export interface ProfileUpdatePayload {
  full_name?: string;
  phone?: string | null;
  profile?: Partial<EmployeeProfile>;
}

export const getProfile = () =>
  apiClient.get<ApiResponse<ProfileData>>('/auth/profile/');

export const updateProfile = (data: ProfileUpdatePayload) =>
  apiClient.patch<ApiResponse<ProfileData>>('/auth/profile/', data);
