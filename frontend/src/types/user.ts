export interface Role {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  description?: string;
  default_scope?: string;
  permissions?: string[];
  permission_count?: number;
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoleInput {
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  default_scope?: string;
  permissions?: string[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
}

export type PermissionTree = Record<string, Permission[]>;

export type ScopeType = 'GLOBAL' | 'POINT' | 'PORT' | 'REGION' | 'SECTOR' | 'DEPARTMENT' | 'STATION';

export const SCOPE_TYPES: ScopeType[] = ['GLOBAL', 'POINT', 'PORT', 'REGION', 'SECTOR', 'DEPARTMENT', 'STATION'];

export interface RoleAssignment {
  id: string;
  user: string;
  user_email: string;
  role: string;
  role_code: string;
  role_name: string;
  scope_type: ScopeType | null;
  scope_id: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_current: boolean;
  assigned_by: string | null;
  assigned_by_email: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoleAssignmentInput {
  user: string;
  role: string;
  scope_type?: ScopeType | null;
  scope_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

export interface PermissionAuditEntry {
  id: string;
  user: string;
  user_email: string;
  permission_code: string;
  action: 'GRANT' | 'DENY' | 'REVOKE';
  granted: boolean;
  reason: string;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  username?: string | null;
  full_name: string;
  phone?: string | null;
  national_id?: string | null;
  user_type?: string | null;
  organization_name?: string | null;
  role?: string | null;
  role_id?: string | null;
  sector?: string | null;
  sector_name?: string | null;
  sector_code?: string | null;
  permissions?: string[];
  role_assignments?: RoleAssignment[];
  employee_number?: string | null;
  primary_org?: PrimaryOrg | null;
  extra_permissions?: string[];
  blocked_permissions?: string[];
  is_active: boolean;
  is_staff?: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PrimaryOrg {
  sector_id?: string | null;
  sector_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  station_id?: string | null;
  station_name?: string | null;
  entry_point_id?: string | null;
  entry_point_name?: string | null;
  is_primary: boolean;
}

export interface UserInput {
  email: string;
  username?: string | null;
  full_name: string;
  phone?: string;
  national_id?: string;
  user_type?: string;
  organization_name?: string;
  role?: string | null;
  employee_number?: string | null;
  extra_permissions?: string[];
  password?: string;
  is_active?: boolean;
  is_staff?: boolean;
}

export interface EmployeeProfile {
  employee_number?: string | null;
  full_name_ar?: string | null;
  full_name_en?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  job_title?: string | null;
  hire_date?: string | null;
  employment_status?: string | null;
  internal_phone?: string | null;
  office?: string | null;
  preferred_contact?: string | null;
  language?: string | null;
  theme?: string | null;
  timezone?: string | null;
  notify_email?: boolean;
  notify_sms?: boolean;
  notify_in_app?: boolean;
  signature_status?: string | null;
  certificate?: string | null;
  signature_issue_date?: string | null;
  signature_expiry_date?: string | null;
}

export interface UserSecurity {
  id: string;
  is_active: boolean;
  is_staff?: boolean;
  is_mfa_enabled?: boolean;
  account_expires_at?: string | null;
  last_login?: string | null;
  created_at?: string;
}

export interface UnifiedRoleAssignment {
  role: string;
  role_name: string;
  scope_type?: string | null;
  scope_id?: string | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface OrganizationAssignmentEntry {
  position?: string | null;
  position_code?: string | null;
  sector?: string | null;
  sector_code?: string | null;
  sector_id?: string | null;
  department?: string | null;
  department_code?: string | null;
  department_id?: string | null;
  station?: string | null;
  station_code?: string | null;
  station_id?: string | null;
  lab?: string | null;
  lab_code?: string | null;
  lab_id?: string | null;
  is_primary?: boolean;
}

export interface ScopeEntry {
  role?: string;
  scope_type?: string | null;
  scope_id?: string | null;
}

export interface UserProfile {
  user: User;
  profile: EmployeeProfile;
  security: UserSecurity;
  roles: UnifiedRoleAssignment[];
  organization: OrganizationAssignmentEntry[];
  effective_permissions: string[];
  scopes: ScopeEntry[];
}
