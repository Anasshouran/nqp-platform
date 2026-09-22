import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  Clinic,
  ClinicDashboard,
  ClinicEmr,
  ClinicLabRequest,
  ClinicMedication,
  ClinicPatient,
  ClinicPrescription,
  ClinicReferral,
  ClinicReport,
  ClinicTriage,
  ClinicType,
  ClinicVisit,
  ClinicVisitDetail,
  HealthCertificate,
  IsolationRecord,
  IsolationRow,
  LabResultSummary,
  WalkInRegisterResponse,
} from '../../types/clinic';

export const getClinicDashboard = () =>
  apiClient.get<ApiResponse<ClinicDashboard>>('/clinic/dashboard/');

export const getClinics = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Clinic>>>('/clinic/clinics/', { params });

export const getClinicReport = (id: string) =>
  apiClient.get<ApiResponse<ClinicReport>>(`/clinic/clinics/${id}/reports/`);

export const getClinicTypes = () =>
  apiClient.get<ApiResponse<PaginatedResponse<ClinicType>>>('/clinic/clinic-types/', {
    params: { page_size: 200 },
  });

export const searchPatients = (q: string) =>
  apiClient.get<ApiResponse<ClinicPatient[]>>('/clinic/patients/', { params: { q } });

export const registerWalkInPatient = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<WalkInRegisterResponse>>('/clinic/patients/register/', payload);

export const getPatientQr = (id: string) =>
  apiClient.get<ApiResponse<{ qr_png: string; medical_file_no: string }>>(`/clinic/patients/${id}/qr/`);

export const getClinicMedications = () =>
  apiClient.get<ApiResponse<ClinicMedication[]>>('/clinic/dashboard/medications/');

export const getReferrals = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ClinicReferral>>>('/clinic/referrals/', { params });

export const acceptReferral = (id: string) =>
  apiClient.post<ApiResponse<ClinicVisit>>(`/clinic/referrals/${id}/accept/`);

export const rejectReferral = (id: string, payload?: { notes?: string; reason?: string }) =>
  apiClient.post<ApiResponse<ClinicReferral>>(`/clinic/referrals/${id}/reject/`, payload);

export const holdReferral = (id: string) =>
  apiClient.post<ApiResponse<ClinicReferral>>(`/clinic/referrals/${id}/hold/`);

export const releaseReferral = (id: string) =>
  apiClient.post<ApiResponse<ClinicReferral>>(`/clinic/referrals/${id}/release/`);

export const getClinicVisits = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ClinicVisit>>>('/clinic/visits/', { params });

export const getClinicLabRequests = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ClinicLabRequest>>>('/clinic/lab-requests/', { params });

export const getClinicVisit = (id: string) =>
  apiClient.get<ApiResponse<ClinicVisitDetail>>(`/clinic/visits/${id}/`);

export const submitEmr = (
  id: string,
  payload: {
    clinical_notes: Record<string, unknown>;
    vital_signs: Record<string, unknown>;
    physical_exam: Record<string, unknown>;
  },
) => apiClient.post<ApiResponse<ClinicEmr>>(`/clinic/visits/${id}/emr/`, payload);

export const submitTriage = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<ClinicTriage>>(`/clinic/visits/${id}/triage/`, payload);

export const transitionVisit = (id: string, phase: string) =>
  apiClient.post<ApiResponse<ClinicVisitDetail>>(`/clinic/visits/${id}/transition/`, { phase });

export const getVisitLabResults = (id: string) =>
  apiClient.get<ApiResponse<LabResultSummary[]>>(`/clinic/visits/${id}/results/`);

export const getIsolations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IsolationRow>>>(`/clinic/isolation/`, { params });

export const isolateVisit = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<IsolationRecord>>(`/clinic/visits/${id}/isolate/`, payload);

export const updateIsolationStatus = (id: string, health_status: string) =>
  apiClient.post<ApiResponse<IsolationRecord>>(`/clinic/isolation/${id}/update-status/`, { health_status });

export const releaseIsolation = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<IsolationRecord>>(`/clinic/isolation/${id}/release/`, payload);

export const getCertificates = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthCertificate>>>('/clinic/certificates/', { params });

export const issueCertificate = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<HealthCertificate>>(`/clinic/visits/${id}/certificate/`, payload);

export const getCertificateQr = (id: string) =>
  apiClient.get<ApiResponse<{ qr_png: string }>>(`/clinic/certificates/${id}/qr/`);

export const revokeCertificate = (id: string) =>
  apiClient.post<ApiResponse<HealthCertificate>>(`/clinic/certificates/${id}/revoke/`);

export const requestClinicLab = (
  id: string,
  payload: { sample_type: string; disease_code: string; priority: string },
) =>
  apiClient.post<ApiResponse<{ sample_id: string; barcode: string; status: string }>>(
    `/clinic/visits/${id}/lab-requests/`,
    payload,
  );

export const addPrescription = (
  id: string,
  payload: { medication: string; dosage: string; frequency: string; duration_days: number; instructions?: string },
) => apiClient.post<ApiResponse<ClinicPrescription>>(`/clinic/visits/${id}/prescriptions/`, payload);

export const closeVisit = (id: string, payload?: { decision?: string; summary?: string }) =>
  apiClient.post<ApiResponse<{ message: string }>>(`/clinic/visits/${id}/close/`, payload);
