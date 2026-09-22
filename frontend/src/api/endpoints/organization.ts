import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  Department,
  DepartmentInput,
  OrgAssignment,
  OrgAssignmentInput,
  OrgHierarchy,
  OrgPosition,
  OrgPositionInput,
  Sector,
  SectorInput,
  Station,
  StationInput,
} from '../../types/organization';

export const getOrgHierarchy = () =>
  apiClient.get<ApiResponse<OrgHierarchy>>('/organization/tree/hierarchy/');

export const getPositions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<OrgPosition>>>('/organization/positions/', { params });

export const createPosition = (data: OrgPositionInput) =>
  apiClient.post<ApiResponse<OrgPosition>>('/organization/positions/', data);

export const updatePosition = (id: string, data: Partial<OrgPositionInput>) =>
  apiClient.patch<ApiResponse<OrgPosition>>(`/organization/positions/${id}/`, data);

export const deletePosition = (id: string) =>
  apiClient.delete(`/organization/positions/${id}/`);

export const getSectors = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Sector>>>('/organization/sectors/', { params });

export const createSector = (data: SectorInput) =>
  apiClient.post<ApiResponse<Sector>>('/organization/sectors/', data);

export const updateSector = (id: string, data: Partial<SectorInput>) =>
  apiClient.patch<ApiResponse<Sector>>(`/organization/sectors/${id}/`, data);

export const deleteSector = (id: string) =>
  apiClient.delete(`/organization/sectors/${id}/`);

export const getDepartments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Department>>>('/organization/departments/', { params });

export const createDepartment = (data: DepartmentInput) =>
  apiClient.post<ApiResponse<Department>>('/organization/departments/', data);

export const updateDepartment = (id: string, data: Partial<DepartmentInput>) =>
  apiClient.patch<ApiResponse<Department>>(`/organization/departments/${id}/`, data);

export const deleteDepartment = (id: string) =>
  apiClient.delete(`/organization/departments/${id}/`);

export const getStations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Station>>>('/organization/stations/', { params });

export const createStation = (data: StationInput) =>
  apiClient.post<ApiResponse<Station>>('/organization/stations/', data);

export const updateStation = (id: string, data: Partial<StationInput>) =>
  apiClient.patch<ApiResponse<Station>>(`/organization/stations/${id}/`, data);

export const deleteStation = (id: string) =>
  apiClient.delete(`/organization/stations/${id}/`);

export const getAssignments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<OrgAssignment>>>('/organization/assignments/', { params });

export const createAssignment = (data: OrgAssignmentInput) =>
  apiClient.post<ApiResponse<OrgAssignment>>('/organization/assignments/', data);

export const updateAssignment = (id: string, data: Partial<OrgAssignmentInput>) =>
  apiClient.patch<ApiResponse<OrgAssignment>>(`/organization/assignments/${id}/`, data);

export const deleteAssignment = (id: string) =>
  apiClient.delete(`/organization/assignments/${id}/`);
