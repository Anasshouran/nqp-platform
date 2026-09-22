export interface Database {
  id: string;
  name: string;
  description?: string;
  db_type: string;
  version?: string;
  host?: string;
  port: number;
  engine?: string;
  status: string;
  status_label?: string;
  size_mb: number;
  owner?: string;
  primary?: string | null;
  primary_name?: string | null;
  schema_count?: number;
  backup_count?: number;
  is_active: boolean;
  created_at: string;
}

export interface DbSchema {
  id: string;
  database: string;
  database_name?: string;
  name: string;
  description?: string;
  object_count: number;
  size_mb: number;
  last_analyzed_at?: string | null;
  is_active: boolean;
}

export interface DbRole {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  is_superuser: boolean;
  can_login: boolean;
  can_create_db: boolean;
  can_create_role: boolean;
  can_replicate: boolean;
  is_active: boolean;
  user_count?: number;
  permission_count?: number;
}

export interface DbUser {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  db_role?: string | null;
  role_code?: string | null;
  role_name?: string | null;
  is_superuser: boolean;
  connection_limit: number;
  last_login_at?: string | null;
  is_active: boolean;
}

export interface DbPermission {
  id: string;
  db_role: string;
  role_code?: string;
  database: string;
  database_name?: string;
  schema?: string | null;
  schema_name?: string | null;
  table_name?: string;
  action: string;
  granted: boolean;
  is_active: boolean;
}

export interface Backup {
  id: string;
  database: string;
  database_name?: string;
  backup_type: string;
  type_label?: string;
  status: string;
  status_label?: string;
  storage: string;
  started_at: string;
  completed_at?: string | null;
  size_mb: number;
  file_path?: string;
  checksum?: string;
  created_by?: string;
  notes?: string;
}

export interface RestoreHistory {
  id: string;
  backup: string;
  database: string;
  database_name?: string;
  backup_type?: string;
  target_database: string;
  status: string;
  status_label?: string;
  started_at: string;
  completed_at?: string | null;
  restored_by?: string;
  notes?: string;
}

export interface ReplicationNode {
  id: string;
  database: string;
  database_name?: string;
  name: string;
  node_type: string;
  type_label?: string;
  host: string;
  port: number;
  sync_mode: string;
  status: string;
  status_label?: string;
  replication_lag_seconds: number;
  current_lsn?: string;
  role?: string | null;
  is_active: boolean;
}

export interface MaintenanceJob {
  id: string;
  database: string;
  database_name?: string;
  name: string;
  job_type: string;
  job_type_label?: string;
  frequency: string;
  scheduled_time?: string | null;
  last_run_at?: string | null;
  next_run_at?: string | null;
  status: string;
  status_label?: string;
  last_result?: string;
  created_by?: string | null;
  created_by_name?: string | null;
  is_active: boolean;
}

export interface PerformanceMetric {
  id: string;
  database: string;
  database_name?: string;
  cpu_usage: number;
  memory_usage: number;
  disk_io_read: number;
  disk_io_write: number;
  connections: number;
  cache_hit_ratio: number;
  transaction_rate: number;
  locks_count: number;
  deadlocks_count: number;
  recorded_at: string;
}

export interface QueryStatistic {
  id: string;
  database: string;
  database_name?: string;
  query_text: string;
  calls: number;
  total_time_ms: number;
  mean_time_ms: number;
  rows: number;
  shared_hit_ratio: number;
  is_slow: boolean;
  is_indexed: boolean;
  last_executed_at?: string | null;
}

export interface StorageUsage {
  id: string;
  database: string;
  database_name?: string;
  database_size_mb: number;
  schema_name?: string;
  table_name?: string;
  table_size_mb: number;
  index_size_mb: number;
  rows_count: number;
  bloat_estimate: number;
  recorded_at: string;
}

export interface DbAlert {
  id: string;
  database?: string | null;
  database_name?: string | null;
  alert_type: string;
  type_label?: string;
  severity: string;
  severity_label?: string;
  status: string;
  status_label?: string;
  title: string;
  message?: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user?: string | null;
  user_email?: string | null;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string;
  success: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user?: string | null;
  user_email?: string | null;
  activity_type: string;
  type_label?: string;
  description: string;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  performed_at: string;
}

export interface DbSetting {
  id: string;
  key: string;
  value?: string;
  label: string;
  group: string;
  group_label?: string;
  is_encrypted: boolean;
  is_active: boolean;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  ssl_enabled: boolean;
  encryption_enabled: boolean;
  row_level_security: boolean;
  password_policy: string;
  ip_whitelist: string[];
  is_active: boolean;
}

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description?: string;
  recovery_time_objective: number;
  recovery_point_objective: number;
  backup_site?: string;
  procedures?: string;
  status: string;
  status_label?: string;
  tested_at?: string | null;
  is_active: boolean;
}

export interface DbAdminOverview {
  database_count: number;
  online_count: number;
  offline_count: number;
  total_size_mb: number;
  db_user_count: number;
  db_role_count: number;
  active_connections: number;
  backup_total: number;
  last_backup_status?: string | null;
  replication_active: number;
  replication_total: number;
  critical_alerts: number;
  total_alerts: number;
  maintenance_due: number;
  performance: {
    cpu: number;
    memory: number;
    connections: number;
    cache_hit: number;
    locks: number;
  };
}
