import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  CapaRecord,
  CriticalResultNotification,
  Disease,
  LabDashboard,
  LabEquipment,
  LabReport,
  LabSample,
  LabSampleInput,
  LabSection,
  LabTestCatalog,
  LabRole,
  LabUser,
  LabUserInput,
  MaterialIssue,
  NationalLabDashboard,
  NonConformity,
  QCRecord,
  ReceptionCheckInput,
  Reagent,
  ReagentLot,
  SampleMovement,
  SampleTest,
  SampleTestInput,
  SaveResultInput,
  StorageLocation,
  TrackResponse,
} from '../../types/laboratory';

export const getLabSamples = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LabSample>>>('/laboratory/samples/', { params });

export const getLabSample = (id: string) =>
  apiClient.get<ApiResponse<LabSample>>(`/laboratory/samples/${id}/`);

export const createLabSample = (data: LabSampleInput) =>
  apiClient.post<ApiResponse<LabSample>>('/laboratory/samples/', data);

export const updateLabSample = (id: string, data: Partial<LabSampleInput>) =>
  apiClient.patch<ApiResponse<LabSample>>(`/laboratory/samples/${id}/`, data);

export const acceptSample = (id: string, data: ReceptionCheckInput) =>
  apiClient.post<ApiResponse<LabSample>>(`/laboratory/samples/${id}/accept/`, data);

export const conditionalAcceptSample = (id: string, data: ReceptionCheckInput) =>
  apiClient.post<ApiResponse<LabSample>>(`/laboratory/samples/${id}/conditional-accept/`, data);

export const rejectSample = (id: string, data: ReceptionCheckInput) =>
  apiClient.post<ApiResponse<LabSample>>(`/laboratory/samples/${id}/reject/`, data);

export const assignSample = (id: string, section: string) =>
  apiClient.post<ApiResponse<LabSample>>(`/laboratory/samples/${id}/assign/`, { section });

export const addSampleTest = (id: string, data: SampleTestInput) =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/samples/${id}/add-test/`, data);

export const getReceptionQueue = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LabSample>>>('/laboratory/samples/reception/', { params });

export const getSampleTrack = (id: string) =>
  apiClient.get<ApiResponse<TrackResponse>>(`/laboratory/samples/${id}/track/`);

export const getSampleQr = (id: string) =>
  apiClient.get<ApiResponse<string>>(`/laboratory/samples/${id}/qr/`);

export const getLabDashboard = (sector?: string) =>
  apiClient.get<ApiResponse<LabDashboard>>('/laboratory/samples/dashboard/', {
    params: sector ? { sector } : undefined,
  });

export const getNationalLabDashboard = () =>
  apiClient.get<ApiResponse<NationalLabDashboard>>('/laboratory/samples/national-dashboard/');

export const getLabReports = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<LabReport>>('/laboratory/samples/reports/', { params });

export const getSampleTests = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SampleTest>>>('/laboratory/sample-tests/', { params });

export const getSampleTest = (id: string) =>
  apiClient.get<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/`);

export const getWorklist = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SampleTest>>>('/laboratory/sample-tests/worklist/', { params });

export const startTest = (id: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/start/`);

export const saveTestResult = (id: string, data: SaveResultInput) =>
  apiClient.patch<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/save-result/`, data);

export const enterTestResult = (id: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/enter-result/`);

export const reviewTest = (id: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/review/`);

export const approveTest = (id: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/approve/`);

export const returnTestResult = (id: string, reason: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/return-result/`, { reason });

export const reviseTest = (id: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/revise/`);

export const acknowledgeTest = (id: string, note = '') =>
  apiClient.post<ApiResponse<SampleTest>>(`/laboratory/sample-tests/${id}/acknowledge/`, { note });

export const getSections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LabSection>>>('/laboratory/sections/', { params });

export const createSection = (data: Partial<LabSection>) =>
  apiClient.post<ApiResponse<LabSection>>('/laboratory/sections/', data);

export const getTestCatalog = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LabTestCatalog>>>('/laboratory/test-catalog/', { params });

export const getEquipment = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LabEquipment>>>('/laboratory/equipment/', { params });

export const createEquipment = (data: Partial<LabEquipment>) =>
  apiClient.post<ApiResponse<LabEquipment>>('/laboratory/equipment/', data);

export const updateEquipment = (id: string, data: Partial<LabEquipment>) =>
  apiClient.patch<ApiResponse<LabEquipment>>(`/laboratory/equipment/${id}/`, data);

export const getReagents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Reagent>>>('/laboratory/reagents/', { params });

export const createReagent = (data: Partial<Reagent>) =>
  apiClient.post<ApiResponse<Reagent>>('/laboratory/reagents/', data);

export const getReagentLots = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ReagentLot>>>('/laboratory/reagent-lots/', { params });

export const createReagentLot = (data: Partial<ReagentLot>) =>
  apiClient.post<ApiResponse<ReagentLot>>('/laboratory/reagent-lots/', data);

export const getMaterialIssues = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MaterialIssue>>>('/laboratory/material-issues/', { params });

export const createMaterialIssue = (data: Partial<MaterialIssue>) =>
  apiClient.post<ApiResponse<MaterialIssue>>('/laboratory/material-issues/', data);

export const getStorageLocations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<StorageLocation>>>('/laboratory/storage-locations/', { params });

export const getQcRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<QCRecord>>>('/laboratory/qc/', { params });

export const createQcRecord = (data: Partial<QCRecord>) =>
  apiClient.post<ApiResponse<QCRecord>>('/laboratory/qc/', data);

export const reviewQcRecord = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<QCRecord>>(`/laboratory/qc/${id}/review/`, data);

export const getNonConformities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<NonConformity>>>('/laboratory/non-conformities/', { params });

export const createNonConformity = (data: Partial<NonConformity>) =>
  apiClient.post<ApiResponse<NonConformity>>('/laboratory/non-conformities/', data);

export const setNonConformityStatus = (id: string, status: string) =>
  apiClient.post<ApiResponse<NonConformity>>(`/laboratory/non-conformities/${id}/set-status/`, { status });

export const getCapaRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CapaRecord>>>('/laboratory/capa/', { params });

export const createCapaRecord = (data: Partial<CapaRecord>) =>
  apiClient.post<ApiResponse<CapaRecord>>('/laboratory/capa/', data);

export const setCapaStatus = (id: string, status: string) =>
  apiClient.post<ApiResponse<CapaRecord>>(`/laboratory/capa/${id}/set-status/`, { status });

export const getCriticalResults = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CriticalResultNotification>>>('/laboratory/critical/', { params });

export const acknowledgeCritical = (id: string, note = '') =>
  apiClient.post<ApiResponse<CriticalResultNotification>>(`/laboratory/critical/${id}/acknowledge/`, { note });

export const getSampleMovements = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SampleMovement>>>('/laboratory/sample-movements/', { params });

export const getDiseases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Disease>>>('/laboratory/diseases/', { params });

export const getLabUsers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<LabUser[]>>('/laboratory/users/', { params });

export const createLabUser = (data: LabUserInput) =>
  apiClient.post<ApiResponse<LabUser>>('/laboratory/users/', data);

export const updateLabUser = (id: string, data: Partial<LabUserInput>) =>
  apiClient.patch<ApiResponse<LabUser>>(`/laboratory/users/${id}/`, data);

export const resetLabUserPassword = (id: string, password: string) =>
  apiClient.post<ApiResponse<{ email: string; reset: boolean }>>(`/laboratory/users/${id}/reset-password/`, { password });

export const getLabRoles = () =>
  apiClient.get<ApiResponse<LabRole[]>>('/laboratory/users/lab-roles/');
