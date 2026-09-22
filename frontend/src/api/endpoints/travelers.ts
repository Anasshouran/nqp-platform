import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { Traveler } from '../../types/traveler';

export const getTravelers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Traveler>>>('/travelers/', { params });

export const getTraveler = (id: string) =>
  apiClient.get<ApiResponse<Traveler>>(`/travelers/${id}/`);

export interface TravelerCreatePayload {
  passport_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  phone?: string;
  email?: string;
  medical_history?: Record<string, unknown>;
}

export interface TravelerStatusResult {
  registration_status: string;
  qr_code_issued: boolean;
  rejection_reason: string | null;
  action_required?: boolean;
}

export interface TravelerStatusLog {
  id: string;
  from_status: string;
  to_status: string;
  note: string;
  changed_by_name: string | null;
  created_at: string;
}

export interface TravelerQrResult {
  qr_code: string;
  qr_data: {
    traveler_id: string;
    passport_hash: string;
    issued_at: string;
    expires_at: string;
    signature: string;
  };
}

export const refreshTravelerQr = (id: string) =>
  apiClient.post<ApiResponse<TravelerQrResult>>(`/travelers/${id}/qr-code/refresh/`);

export const downloadTravelerQr = (id: string) =>
  apiClient.get<Blob>(`/travelers/${id}/qr-code/download/`, { responseType: 'blob' });

export const createTraveler = (payload: TravelerCreatePayload) =>
  apiClient.post<ApiResponse<TravelerCreatePayload & { id: string }>>('/travelers/', payload);

export const registerTraveler = (payload: TravelerCreatePayload) =>
  apiClient.post<ApiResponse<TravelerCreatePayload & { id: string }>>('/travelers/register/', payload);

export const updatePersonalInfo = (id: string, payload: Partial<TravelerCreatePayload>) =>
  apiClient.put<ApiResponse<Traveler>>(`/travelers/${id}/personal-info/`, payload);

export const submitTraveler = (id: string) =>
  apiClient.post<ApiResponse<TravelerStatusResult>>(`/travelers/${id}/submit/`);

export const getTravelerStatus = (id: string) =>
  apiClient.get<ApiResponse<TravelerStatusResult>>(`/travelers/${id}/status/`);

export interface TravelerDeclaration {
  declared: boolean;
  submitted_at: string | null;
  risk_score?: number | null;
  risk_level?: string | null;
  symptoms?: Record<string, { has: boolean; temperature?: string; patient_name?: string; details?: string }> | null;
  trip?: {
    origin_country?: string;
    port_of_entry?: string;
    transport_mode?: string;
    flight_number?: string;
    seat_number?: string;
    arrival_date?: string;
    transit_countries?: string[];
  } | null;
  purpose?: string | null;
}

export const getTravelerDeclaration = (id: string) =>
  apiClient.get<ApiResponse<TravelerDeclaration>>(`/travelers/${id}/declaration/`);

export const getTravelerTimeline = (id: string) =>
  apiClient.get<ApiResponse<TravelerStatusLog[]>>(`/travelers/${id}/timeline/`);

export const reviewTraveler = (id: string, payload: { registration_status: string; note?: string; rejection_reason?: string }) =>
  apiClient.post<ApiResponse<{ detail: string }>>(`/travelers/${id}/review/`, payload);

export const getTravelerQr = (id: string) =>
  apiClient.get<ApiResponse<TravelerQrResult>>(`/travelers/${id}/qr-code/`);

export interface TravelerDocument {
  id: string;
  document_type: string;
  file: string;
  file_url: string | null;
  file_size: number | null;
  expiry_date: string | null;
  uploaded_at: string;
}

export const getTravelerDocuments = (id: string) =>
  apiClient.get<ApiResponse<TravelerDocument[]>>(`/travelers/${id}/documents/`);

export const uploadTravelerDocument = (id: string, formData: FormData) =>
  apiClient.post<ApiResponse<TravelerDocument>>(`/travelers/${id}/documents/`, formData);

export const deleteTravelerDocument = (id: string, docId: string) =>
  apiClient.delete(`/travelers/${id}/documents/${docId}/`);

export const getTravelerDocumentDownloadUrl = (id: string, docId: string) =>
  apiClient.get<ApiResponse<{ doc_id: string; name: string; download_url: string | null }>>(
    `/travelers/${id}/documents/${docId}/download/`,
  );

/* ── مصادقة بوابة المسافرين (جلبة/تسجيل موحّد على /auth/* عبر api/endpoints/auth) ── */

export interface TravelerAuthUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  user_type: string;
  travelers: Array<{
    id: string;
    passport_number: string;
    full_name: string;
    registration_status: string;
    nationality: string | null;
  }>;
}

export const travelerForgotPassword = (email: string) =>
  apiClient.post<ApiResponse<{ detail: string }>>('/travelers/auth/forgot-password/', { email });

export const travelerResetPassword = (uidb64: string, token: string, password: string, confirm_password: string) =>
  apiClient.post<ApiResponse<{ detail: string }>>('/travelers/auth/reset-password/', { uidb64, token, password, confirm_password });

export const travelerMe = () =>
  apiClient.get<ApiResponse<TravelerAuthUser>>('/travelers/auth/me/');
