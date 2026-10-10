import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  Carrier,
  CarrierApiKeyInfo,
  CarrierDashboardStats,
  CarrierDocument,
  CarrierMember,
  CarrierMemberCreatePayload,
  CarrierMemberUpdatePayload,
  CarrierProfile,
  Flight,
  FlightTimelineResponse,
  HealthNotice,
  PassengerManifest,
  UpcomingFlight,
} from '../../types/carrier';

export const getFlights = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Flight>>>('/carriers/flights/', { params });

export const getFlight = (id: string) =>
  apiClient.get<ApiResponse<Flight>>(`/carriers/flights/${id}/`);

export const getFlightTimeline = (id: string) =>
  apiClient.get<ApiResponse<FlightTimelineResponse>>(`/carriers/flights/${id}/timeline/`);

export const getCarrierDocuments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CarrierDocument>>>('/carriers/documents/', { params });

export const uploadCarrierDocument = (formData: FormData) =>
  apiClient.post<ApiResponse<CarrierDocument>>('/carriers/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteCarrierDocument = (id: string) =>
  apiClient.delete(`/carriers/documents/${id}/`);

export const downloadCarrierDocument = (id: string) =>
  apiClient.get(`/carriers/documents/${id}/download/`, { responseType: 'blob' });

export const setFlightStatus = (id: string, status: string) =>
  apiClient.patch<ApiResponse<Flight>>(`/carriers/flights/${id}/status/`, { status });

export const createCarrier = (data: Partial<Carrier>) =>
  apiClient.post<ApiResponse<Carrier>>('/carriers/companies/', data);

// ---------- Carrier Members (M8-B.3, نطاق COMPANY ال صريح) ----------

export const listCarrierMembers = (carrierId: string, params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CarrierMember>>>(
    `/carriers/companies/${carrierId}/members/`,
    { params },
  );

export const createCarrierMember = (carrierId: string, payload: CarrierMemberCreatePayload) =>
  apiClient.post<ApiResponse<CarrierMember>>(
    `/carriers/companies/${carrierId}/members/`,
    payload,
  );

export const getCarrierMember = (carrierId: string, memberId: string) =>
  apiClient.get<ApiResponse<CarrierMember>>(`/carriers/companies/${carrierId}/members/${memberId}/`);

/** `is_primary` هو الحقل الوحيد الذي يقبل التعديل. لا يُمرَّر user/carrier/is_active. */
export const updateCarrierMember = (carrierId: string, memberId: string, payload: CarrierMemberUpdatePayload) =>
  apiClient.patch<ApiResponse<CarrierMember>>(
    `/carriers/companies/${carrierId}/members/${memberId}/`,
    payload,
  );

export const activateCarrierMember = (carrierId: string, memberId: string) =>
  apiClient.post<ApiResponse<CarrierMember>>(
    `/carriers/companies/${carrierId}/members/${memberId}/activate/`,
  );

export const deactivateCarrierMember = (carrierId: string, memberId: string) =>
  apiClient.post<ApiResponse<CarrierMember>>(
    `/carriers/companies/${carrierId}/members/${memberId}/deactivate/`,
  );

export const getCarrierApiKey = (id: string) =>
  apiClient.get<ApiResponse<CarrierApiKeyInfo>>(`/carriers/companies/${id}/api-key/`);

export const regenerateCarrierApiKey = (id: string) =>
  apiClient.post<ApiResponse<CarrierApiKeyInfo>>(`/carriers/companies/${id}/regenerate-api-key/`);

export const uploadManifest = (flightId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<ApiResponse<PassengerManifest>>(
    `/carriers/flights/${flightId}/manifest/upload/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const getCarriers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Carrier>>>('/carriers/companies/', { params });

export const getHealthNotices = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthNotice>>>('/carriers/notices/', { params });

export const getRecentNotices = () =>
  apiClient.get<ApiResponse<HealthNotice[]>>('/carriers/notices/recent/');

export const getDashboardStats = () =>
  apiClient.get<ApiResponse<CarrierDashboardStats>>('/carriers/dashboard/stats/');

export const getDashboardUpcoming = () =>
  apiClient.get<ApiResponse<UpcomingFlight[]>>('/carriers/dashboard/upcoming/');

export const getCompanyProfile = () =>
  apiClient.get<ApiResponse<CarrierProfile>>('/carriers/company/profile/');

export const updateCompanyProfile = (payload: Partial<CarrierProfile>) =>
  apiClient.put<ApiResponse<CarrierProfile>>('/carriers/company/profile/', payload);

export const getApiKey = () =>
  apiClient.get<ApiResponse<CarrierApiKeyInfo>>('/carriers/company/api-key/');

export const regenerateApiKey = () =>
  apiClient.post<ApiResponse<CarrierApiKeyInfo>>('/carriers/company/api-key/regenerate/');
