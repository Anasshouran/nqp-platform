import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  ActivityLog,
  AuditLog,
  Backup,
  Database,
  DbAdminOverview,
  DbAlert,
  DbPermission,
  DbRole,
  DbSchema,
  DbSetting,
  DbUser,
  DisasterRecoveryPlan,
  MaintenanceJob,
  PerformanceMetric,
  QueryStatistic,
  ReplicationNode,
  RestoreHistory,
  SecurityPolicy,
  StorageUsage,
} from '../../types/dbAdmin';

export const getDbOverview = () =>
  apiClient.get<ApiResponse<DbAdminOverview>>('/dbadmin/dashboard/overview/');

export const getDatabases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Database>>>('/dbadmin/databases/', { params });

export const createDatabase = (data: Partial<Database>) =>
  apiClient.post<ApiResponse<Database>>('/dbadmin/databases/', data);

export const updateDatabase = (id: string, data: Partial<Database>) =>
  apiClient.patch<ApiResponse<Database>>(`/dbadmin/databases/${id}/`, data);

export const deleteDatabase = (id: string) =>
  apiClient.delete(`/dbadmin/databases/${id}/`);

export const getSchemas = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DbSchema>>>('/dbadmin/schemas/', { params });

export const getDbRoles = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DbRole>>>('/dbadmin/roles/', { params });

export const getDbUsers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DbUser>>>('/dbadmin/users/', { params });

export const getDbPermissions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DbPermission>>>('/dbadmin/permissions/', { params });

export const getBackups = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Backup>>>('/dbadmin/backups/', { params });

export const createBackup = (data: { database: string; backup_type: string; storage?: string }) =>
  apiClient.post<ApiResponse<Backup>>('/dbadmin/backups/', data);

export const restoreBackup = (id: string, data: { target_database: string }) =>
  apiClient.post<ApiResponse<RestoreHistory>>(`/dbadmin/backups/${id}/restore/`, data);

export const getRestores = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<RestoreHistory>>>('/dbadmin/restores/', { params });

export const getReplicationNodes = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ReplicationNode>>>('/dbadmin/replication/', { params });

export const failoverNode = (id: string) =>
  apiClient.post<ApiResponse<{ message: string }>>(`/dbadmin/replication/${id}/failover/`);

export const getPerformanceLatest = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PerformanceMetric[]>>('/dbadmin/performance/latest/', { params });

export const getPerformance = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<PerformanceMetric>>>('/dbadmin/performance/', { params });

export const getQueries = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<QueryStatistic>>>('/dbadmin/queries/', { params });

export const getSlowQueries = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<QueryStatistic[]>>('/dbadmin/queries/slow/', { params });

export const getStorageUsage = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<StorageUsage>>>('/dbadmin/storage/', { params });

export const getMaintenanceJobs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MaintenanceJob>>>('/dbadmin/maintenance/', { params });

export const runMaintenanceJob = (id: string) =>
  apiClient.post<ApiResponse<MaintenanceJob>>(`/dbadmin/maintenance/${id}/run/`);

export const getDbAlerts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DbAlert>>>('/dbadmin/alerts/', { params });

export const acknowledgeAlert = (id: string) =>
  apiClient.post<ApiResponse<DbAlert>>(`/dbadmin/alerts/${id}/acknowledge/`);

export const resolveAlert = (id: string) =>
  apiClient.post<ApiResponse<DbAlert>>(`/dbadmin/alerts/${id}/resolve/`);

export const getAuditLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>('/dbadmin/audit-logs/', { params });

export const getActivityLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ActivityLog>>>('/dbadmin/activity-logs/', { params });

export const getDbSettings = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DbSetting>>>('/dbadmin/settings/', { params });

export const getSecurityPolicies = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SecurityPolicy>>>('/dbadmin/security-policies/', { params });

export const getDisasterRecoveryPlans = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DisasterRecoveryPlan>>>('/dbadmin/disaster-recovery/', { params });