import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  CertificateVerification,
  InventoryTransaction,
  TravelerLookupResult,
  VaccinationCertificate,
  VaccinationDashboard,
  VaccinationRecord,
  VaccinationRule,
  VaccinationSite,
  Vaccine,
  VaccineBatch,
} from '../../types/vaccination';

export const getVaccinationDashboard = () =>
  apiClient.get<ApiResponse<VaccinationDashboard>>('/vaccination/dashboard/');

export const getVaccines = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Vaccine>>>('/vaccination/vaccines/', { params });

export const createVaccine = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<Vaccine>>('/vaccination/vaccines/', payload);

export const updateVaccine = (id: string, payload: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<Vaccine>>(`/vaccination/vaccines/${id}/`, payload);

export const getBatches = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VaccineBatch>>>('/vaccination/batches/', { params });

export const createBatch = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<VaccineBatch>>('/vaccination/batches/', payload);

export const adjustBatch = (id: string, delta: number, reason?: string) =>
  apiClient.post<ApiResponse<{ available_quantity: number; batch: VaccineBatch }>>(
    `/vaccination/batches/${id}/adjust/`,
    { delta, reason },
  );

export const getSites = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VaccinationSite>>>('/vaccination/sites/', { params });

export const createSite = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<VaccinationSite>>('/vaccination/sites/', payload);

export const getRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VaccinationRecord>>>('/vaccination/records/', { params });

export const createRecord = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<VaccinationRecord>>('/vaccination/records/', payload);

export const searchTraveler = (passport: string) =>
  apiClient.get<ApiResponse<TravelerLookupResult>>('/vaccination/records/search-traveler/', {
    params: { passport },
  });

export const getCertificates = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VaccinationCertificate>>>('/vaccination/certificates/', { params });

export const issueCertificate = (recordId: string, validityDays?: number) =>
  apiClient.post<ApiResponse<VaccinationCertificate>>('/vaccination/certificates/', {
    record: recordId,
    ...(validityDays ? { validity_days: validityDays } : {}),
  });

export const getCertificateQr = (id: string) =>
  apiClient.get<ApiResponse<{ qr_png: string }>>(`/vaccination/certificates/${id}/qr/`);

export const revokeCertificate = (id: string) =>
  apiClient.post<ApiResponse<VaccinationCertificate>>(`/vaccination/certificates/${id}/revoke/`);

export const getRules = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VaccinationRule>>>('/vaccination/rules/', { params });

export const createRule = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<VaccinationRule>>('/vaccination/rules/', payload);

export const updateRule = (id: string, payload: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<VaccinationRule>>(`/vaccination/rules/${id}/`, payload);

export const getInventory = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<InventoryTransaction>>>('/vaccination/inventory/', { params });

export const getVerifications = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CertificateVerification>>>('/vaccination/verifications/', { params });

export const publicVerifyCertificate = (code: string) =>
  apiClient.get<ApiResponse<VaccineCertificateVerifyResult>>(
    `/vaccination/public/verify/${encodeURIComponent(code)}/`,
  );

export interface VaccineCertificateVerifyResult {
  certificate_number: string;
  traveler_name: string;
  passport_number: string;
  vaccine_name_ar: string;
  vaccine_code: string;
  issued_at: string;
  valid_until: string;
  status: string;
  verified: boolean;
}