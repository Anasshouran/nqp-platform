import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { Carrier, CarrierApiKeyInfo, CarrierDashboardStats, CarrierProfile, Flight, HealthNotice, PassengerManifest, UpcomingFlight } from '../../types/carrier';

export const getFlights = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Flight>>>('/carriers/flights/', { params });

export const setFlightStatus = (id: string, status: string) =>
  apiClient.patch<ApiResponse<Flight>>(`/carriers/flights/${id}/status/`, { status });

export const createCarrier = (data: Partial<Carrier>) =>
  apiClient.post<ApiResponse<Carrier>>('/carriers/companies/', data);

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
