import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  MasterEntryPoint,
  MasterMember,
  MasterSection,
  MasterSector,
  MasterState,
  MasterStation,
  MasterTerminal,
  TreeSector,
} from '../../types/masterdata';

/* شجرة البيانات الأساسية الكاملة */
export const getMasterTree = () =>
  apiClient.get<ApiResponse<TreeSector[]>>('/master-data/tree/tree/');

/* القطاعات (الأنواع) */
export const getMasterSectors = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MasterSector>>>('/master-data/sectors/', { params });

export const createMasterSector = (data: Partial<MasterSector>) =>
  apiClient.post<ApiResponse<MasterSector>>('/master-data/sectors/', data);

export const updateMasterSector = (id: string, data: Partial<MasterSector>) =>
  apiClient.patch<ApiResponse<MasterSector>>(`/master-data/sectors/${id}/`, data);

export const deleteMasterSector = (id: string) =>
  apiClient.delete(`/master-data/sectors/${id}/`);

/* الولايات */
export const getMasterStates = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MasterState>>>('/master-data/states/', { params });

export const createMasterState = (data: Partial<MasterState>) =>
  apiClient.post<ApiResponse<MasterState>>('/master-data/states/', data);

export const updateMasterState = (id: string, data: Partial<MasterState>) =>
  apiClient.patch<ApiResponse<MasterState>>(`/master-data/states/${id}/`, data);

export const deleteMasterState = (id: string) =>
  apiClient.delete(`/master-data/states/${id}/`);

/* منافذ الدخول */
export const getMasterEntryPoints = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MasterEntryPoint>>>('/master-data/entry-points/', { params });

export const createMasterEntryPoint = (data: Partial<MasterEntryPoint>) =>
  apiClient.post<ApiResponse<MasterEntryPoint>>('/master-data/entry-points/', data);

export const updateMasterEntryPoint = (id: string, data: Partial<MasterEntryPoint>) =>
  apiClient.patch<ApiResponse<MasterEntryPoint>>(`/master-data/entry-points/${id}/`, data);

export const deleteMasterEntryPoint = (id: string) =>
  apiClient.delete(`/master-data/entry-points/${id}/`);

/* المنشآت (الطرفيات) */
export const getMasterTerminals = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MasterTerminal>>>('/master-data/terminals/', { params });

export const createMasterTerminal = (data: Partial<MasterTerminal>) =>
  apiClient.post<ApiResponse<MasterTerminal>>('/master-data/terminals/', data);

export const updateMasterTerminal = (id: string, data: Partial<MasterTerminal>) =>
  apiClient.patch<ApiResponse<MasterTerminal>>(`/master-data/terminals/${id}/`, data);

export const deleteMasterTerminal = (id: string) =>
  apiClient.delete(`/master-data/terminals/${id}/`);

/* محطات الحجر الصحي */
export const getMasterStations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MasterStation>>>('/master-data/stations/', { params });

export const createMasterStation = (data: Partial<MasterStation>) =>
  apiClient.post<ApiResponse<MasterStation>>('/master-data/stations/', data);

export const updateMasterStation = (id: string, data: Partial<MasterStation>) =>
  apiClient.patch<ApiResponse<MasterStation>>(`/master-data/stations/${id}/`, data);

export const deleteMasterStation = (id: string) =>
  apiClient.delete(`/master-data/stations/${id}/`);

/* الأقسام */
export const getMasterSections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MasterSection>>>('/master-data/sections/', { params });

export const createMasterSection = (data: Partial<MasterSection>) =>
  apiClient.post<ApiResponse<MasterSection>>('/master-data/sections/', data);

export const updateMasterSection = (id: string, data: Partial<MasterSection>) =>
  apiClient.patch<ApiResponse<MasterSection>>(`/master-data/sections/${id}/`, data);

export const deleteMasterSection = (id: string) =>
  apiClient.delete(`/master-data/sections/${id}/`);

/* أعضاء الأقسام */
export const getMasterMembers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MasterMember>>>('/master-data/members/', { params });

export const createMasterMember = (data: Partial<MasterMember>) =>
  apiClient.post<ApiResponse<MasterMember>>('/master-data/members/', data);

export const updateMasterMember = (id: string, data: Partial<MasterMember>) =>
  apiClient.patch<ApiResponse<MasterMember>>(`/master-data/members/${id}/`, data);

export const deleteMasterMember = (id: string) =>
  apiClient.delete(`/master-data/members/${id}/`);