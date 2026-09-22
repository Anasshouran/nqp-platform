import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { RoleAssignment, RoleAssignmentInput } from '../../types/user';

export const listRoleAssignments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<RoleAssignment>>>('/auth/role-assignments/', { params });

export const createRoleAssignment = (data: RoleAssignmentInput) =>
  apiClient.post<ApiResponse<RoleAssignment>>('/auth/role-assignments/', data);

export const updateRoleAssignment = (id: string, data: Partial<RoleAssignmentInput>) =>
  apiClient.patch<ApiResponse<RoleAssignment>>(`/auth/role-assignments/${id}/`, data);

export const deleteRoleAssignment = (id: string) =>
  apiClient.delete(`/auth/role-assignments/${id}/`);
