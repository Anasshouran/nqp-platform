import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { PermissionAuditEntry, Role, User, UserInput, UserProfile } from '../../types/user';

export const getUsers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<User>>>('/auth/users/', { params });

export const getUser = (id: string) =>
  apiClient.get<ApiResponse<User>>(`/auth/users/${id}/`);

export const getUserProfile = (id: string) =>
  apiClient.get<ApiResponse<UserProfile>>(`/auth/users/${id}/profile/`);

export const createUser = (data: UserInput) =>
  apiClient.post<ApiResponse<User>>('/auth/users/', data);

export const updateUser = (id: string, data: Partial<UserInput>) =>
  apiClient.patch<ApiResponse<User>>(`/auth/users/${id}/`, data);

export const deleteUser = (id: string) =>
  apiClient.delete(`/auth/users/${id}/`);

export const getRoles = () =>
  apiClient.get<ApiResponse<Role[]>>('/auth/users/roles/');

export const getUserPermissionAudit = (id: string) =>
  apiClient.get<ApiResponse<PermissionAuditEntry[]>>(`/auth/users/${id}/permission-audit/`);

export const resetUserPassword = (id: string, password: string) =>
  apiClient.post<ApiResponse<{ email: string; reset: boolean }>>(`/auth/users/${id}/reset-password/`, { password });
