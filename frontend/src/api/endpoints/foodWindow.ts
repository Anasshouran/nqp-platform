import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  CommodityDecision,
  ServiceWindow,
  ShipmentTransaction,
  TransactionCommodity,
  WindowAssignment,
  WindowCommodity,
  WindowDashboardItem,
  WindowScopeItem,
} from '../../types/foodWindow';

const BASE = '/food-window';

export const getWindowDashboard = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<WindowDashboardItem[]>>(`${BASE}/windows/dashboard/`, { params });

export const getWindows = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ServiceWindow>>>(`${BASE}/windows/`, { params });

export const getWindow = (id: string) =>
  apiClient.get<ApiResponse<ServiceWindow>>(`${BASE}/windows/${id}/`);

export const createWindow = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<ServiceWindow>>(`${BASE}/windows/`, data);

export const updateWindow = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<ServiceWindow>>(`${BASE}/windows/${id}/`, data);

export const getWindowCommodities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WindowCommodity>>>(`${BASE}/commodities/`, { params });

export const getTransactions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ShipmentTransaction>>>(`${BASE}/transactions/`, { params });

export const getTransaction = (id: string) =>
  apiClient.get<ApiResponse<ShipmentTransaction>>(`${BASE}/transactions/${id}/`);

export const createTransaction = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<ShipmentTransaction>>(`${BASE}/transactions/`, data);

export const closeTransaction = (id: string) =>
  apiClient.post<ApiResponse<ShipmentTransaction>>(`${BASE}/transactions/${id}/close/`);

export const getTransactionCommodities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<TransactionCommodity>>>(`${BASE}/transaction-commodities/`, { params });

export const getDecisions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CommodityDecision>>>(`${BASE}/decisions/`, { params });

export const createDecision = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<CommodityDecision>>(`${BASE}/decisions/`, data);

export const getAssignments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WindowAssignment>>>(`${BASE}/assignments/`, { params });

export const getMyScope = () =>
  apiClient.get<ApiResponse<WindowScopeItem[]>>(`${BASE}/assignments/my-scope/`);

export const getAuditLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<{ id: string; window_name: string | null; user_name: string | null; action: string; detail: Record<string, unknown>; timestamp: string }>>>(`${BASE}/audit-logs/`, { params });
