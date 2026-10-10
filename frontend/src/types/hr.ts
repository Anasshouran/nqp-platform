export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';

export type EmploymentType = 'PERMANENT' | 'CONTRACT' | 'TEMPORARY' | 'CONSULTANT' | 'INTERN';

export type TimelineEventType =
  | 'HIRE'
  | 'PROMOTION'
  | 'TRANSFER'
  | 'DEMOTION'
  | 'LEAVE_START'
  | 'LEAVE_END'
  | 'SUSPENSION'
  | 'TERMINATION'
  | 'REINSTATE'
  | 'PROBATION_END'
  | 'CONTRACT_RENEWAL';

export interface OrgAssignmentSnapshot {
  id: string;
  is_primary: boolean;
  position_name: string | null;
  sector_name: string | null;
  department_name: string | null;
  station_name: string | null;
  entry_point_name: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  full_name_ar: string;
  full_name_en: string;
  email: string;
  phone: string | null;
  gender: string;
  job_title: string;
  employment_status: EmploymentStatus;
  employment_type: EmploymentType;
  hire_date: string | null;
  position_name: string | null;
  department_name: string | null;
  sector_name: string | null;
  manager_name: string | null;
  created_at: string;
}

export interface EmployeeDetail extends Employee {
  user: string;
  birth_date: string | null;
  home_address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  degree: string;
  specialization: string;
  probation_end_date: string | null;
  reporting_manager: string | null;
  photo: string | null;
  office: string;
  internal_phone: string;
  preferred_contact: string;
  language: string;
  theme: string;
  timezone: string;
  notify_email: boolean;
  notify_sms: boolean;
  notify_in_app: boolean;
  assignments: OrgAssignmentSnapshot[];
  timeline_count: number;
  updated_at: string;
}

export interface EmployeeTimelineEntry {
  id: string;
  employee: string;
  employee_name: string;
  event: TimelineEventType;
  event_display: string;
  title: string;
  old_position: string;
  new_position: string;
  old_department: string;
  new_department: string;
  old_sector: string;
  new_sector: string;
  old_entry_point: string;
  new_entry_point: string;
  start_date: string;
  end_date: string | null;
  reason: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface HrPing {
  module: string;
  phase: number;
  national_scope: boolean;
  scope_count: number | null;
  visible_employee_count: number | null;
}

export interface HrLabelCount {
  label: string;
  value: number;
}

export interface HrDashboardEvent {
  id: string;
  employee: string;
  employee_name: string;
  event: TimelineEventType;
  title: string;
  start_date: string;
  created_by_name: string | null;
}

export interface HrDashboard {
  total_employees: number;
  active_employees: number;
  on_leave: number;
  suspended: number;
  terminated: number;
  new_hires_30d: number;
  probations_ending_30d: number;
  by_employment_type: HrLabelCount[];
  by_department: HrLabelCount[];
  by_sector: HrLabelCount[];
  recent_events: HrDashboardEvent[];
  is_national: boolean;
  generated_at: string;
}

export type EstablishmentKind = 'DEPARTMENT' | 'UNIT' | 'ENTRY_POINT' | 'ENTRY_GROUP';

export interface HrEstablishment {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: EstablishmentKind;
  kind_display: string;
  parent: string | null;
  parent_name: string | null;
  sector: string | null;
  sector_name: string | null;
  manager_position: string | null;
  manager_name: string | null;
  description: string;
  order: number;
  is_active: boolean;
  headcount: number;
}

/** حساب قابل للربط بملف وظيفي جديد (بلا `EmployeeProfile` بعد). */
export interface LinkableUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  label: string;
}

export type PostingKind = 'TRANSFER' | 'PROMOTION' | 'DEMOTION';
export type PostingStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface PostingStatusLogEntry {
  id: string;
  from_status: PostingStatus | '';
  to_status: PostingStatus;
  note: string;
  changed_by: string | null;
  changed_by_name: string | null;
  created_at: string;
}

export interface PostingRequest {
  id: string;
  employee: string;
  employee_name: string;
  employee_number: string;
  kind: PostingKind;
  kind_display: string;
  status: PostingStatus;
  status_display: string;
  target_summary: string;
  effective_date: string | null;
  is_self_service: boolean;
  requested_by: string;
  requested_by_name: string;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  rejection_reason: string;
  reason?: string;
  decision_note?: string;
  employee_email?: string;
  created_at: string;
  updated_at: string;
  status_logs?: PostingStatusLogEntry[];
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'REMOTE' | 'ON_LEAVE' | 'OFF_DAY';

export interface AttendanceRecord {
  id: string;
  employee: string;
  employee_name: string;
  employee_number: string;
  date: string;
  status: AttendanceStatus;
  status_display: string;
  check_in: string | null;
  check_out: string | null;
  overtime_minutes: number;
  worked_minutes: number;
  shift_code: string;
  is_approved: boolean;
  recorded_by: string;
  recorded_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  period_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  remote_days: number;
  off_days: number;
  total_overtime_minutes: number;
  total_worked_minutes: number;
  pending_approval: number;
}

export type LeaveRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_paid: boolean;
  requires_document: boolean;
  max_consecutive_days: number | null;
  default_entitlement_days: string | null;
  suspends_assignment: boolean;
  is_active: boolean;
  order: number;
}

export interface LeaveBalance {
  id: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  leave_type_name: string;
  leave_type_code: string;
  year: number;
  entitled_days: string;
  carried_over_days: string;
  taken_days: string;
  pending_days: string;
  available_days: string;
  note: string;
}

export interface LeaveBalanceSummary {
  year: number;
  items: LeaveBalance[];
  total_available: string;
}

export interface LeaveRequest {
  id: string;
  employee: string;
  employee_name: string;
  employee_number: string;
  leave_type: string;
  leave_type_name: string;
  status: LeaveRequestStatus;
  status_display: string;
  start_date: string;
  end_date: string;
  year: number;
  is_half_day: boolean;
  days: string;
  is_self_service: boolean;
  requested_by: string;
  requested_by_name: string;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  rejection_reason: string;
  reason?: string;
  document?: string;
  decision_note?: string;
  leave_type_requires_document?: boolean;
  leave_type_is_paid?: boolean;
  status_logs?: PostingStatusLogEntry[];
}

// ---------------------------------------------------------------------
// التدريب
// ---------------------------------------------------------------------
export type EnrollmentStatus =
  | 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REJECTED';

export interface TrainingPlan {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description: string;
  provider: string;
  delivery_mode: 'INTERNAL' | 'EXTERNAL' | 'ONLINE' | 'ON_THE_JOB';
  duration_hours: number;
  cost: string;
  is_mandatory: boolean;
  is_active: boolean;
  order: number;
  employee_count: number;
  enrollment_count: number;
}

export interface TrainingEnrollment {
  id: string;
  employee: string;
  employee_name: string;
  employee_number: string;
  plan: string;
  plan_code: string;
  plan_name: string;
  status: EnrollmentStatus;
  status_display: string;
  requested_date: string | null;
  start_date: string | null;
  end_date: string | null;
  score: string | null;
  pass_score: string | null;
  passed: boolean;
  certificate_ref: string;
  is_self_service: boolean;
  requested_by: string;
  requested_by_name: string;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  rejection_reason: string;
  notes?: string;
  decision_note?: string;
}

// ---------------------------------------------------------------------
// تقييم الأداء
// ---------------------------------------------------------------------
export type CycleStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type ReviewStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';

export interface PerformanceKPI {
  id: string;
  cycle: string;
  name: string;
  description: string;
  weight: string;
  order: number;
}

export interface PerformanceCycle {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  review_due_date: string | null;
  status: CycleStatus;
  status_display: string;
  department: string | null;
  is_anonymous_peer_review: boolean;
  notes: string;
  kpi_weight_total: string;
  /** `null` لمن يقرأ في الخدمة الذاتية: الإحصاء إداري لا يخصّه. */
  review_count: number | null;
  approved_count: number | null;
}

export interface ReviewKPIScore {
  id?: string;
  kpi: string;
  kpi_name: string;
  kpi_weight: string;
  score: string;
  comment: string;
}

export interface CycleKPIWithScore {
  kpi: string;
  name: string;
  weight: string;
  score: string | null;
}

export interface PerformanceReview {
  id: string;
  cycle: string;
  cycle_name: string;
  employee: string;
  employee_name: string;
  status: ReviewStatus;
  status_display: string;
  total_score: string | null;
  rating: string;
  rating_display: string;
  reviewed_by: string;
  reviewed_by_name: string;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  strengths?: string;
  improvements?: string;
  comments?: string;
  decision_note?: string;
  rejection_reason?: string;
  kpi_scores?: ReviewKPIScore[];
  cycle_kpis?: CycleKPIWithScore[];
}
