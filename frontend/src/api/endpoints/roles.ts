import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { Permission, PermissionTree, Role, RoleInput } from '../../types/user';

export const listRoles = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Role>>>('/auth/roles/', { params });

export const createRole = (data: RoleInput) =>
  apiClient.post<ApiResponse<Role>>('/auth/roles/', data);

export const updateRole = (id: string, data: Partial<RoleInput>) =>
  apiClient.patch<ApiResponse<Role>>(`/auth/roles/${id}/`, data);

export const deleteRole = (id: string) =>
  apiClient.delete(`/auth/roles/${id}/`);

export const getPermissionTree = () =>
  apiClient.get<ApiResponse<PermissionTree>>('/auth/permissions/tree/');

export const listPermissions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Permission>>>('/auth/permissions/', { params });
