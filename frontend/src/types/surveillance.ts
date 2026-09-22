export interface ReportableDisease {
  id: string;
  disease_id: string;
  icd_11_code: string;
  name_ar: string;
  name_en: string;
  symptoms: string[];
  notification_timeline: 'IMMEDIATE' | 'WITHIN_24H' | 'WEEKLY';
  surveillance_mode: 'CASE_BASED' | 'AGGREGATE' | 'SYNDROME';
  ewars_threshold: number;
  window_days: number;
  baseline_weeks: number;
  notified_roles: string[];
  is_enabled: boolean;
  case_definitions: CaseDefinition[];
}

export interface CaseDefinition {
  id: string;
  case_type: 'SUSPECTED' | 'PROBABLE' | 'CONFIRMED' | 'NOT_A_CASE';
  clinical_criteria: string | string[] | null;
  lab_criteria: string | string[] | null;
  epidemiological_criteria: string | string[] | null;
  version: number;
}

export interface HealthCase {
  id: string;
  case_number: string;
  disease: string | null;
  disease_name: string | null;
  case_type: 'SUSPECTED' | 'PROBABLE' | 'CONFIRMED' | 'NOT_A_CASE';
  status: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  source: 'SCREENING' | 'LAB' | 'CLINIC' | 'EVENT' | 'EBS' | 'COMMUNITY' | 'PUBLIC' | 'MANUAL';
  traveler: string | null;
  traveler_name: string | null;
  person_name: string;
  person_age: number | null;
  person_sex: 'M' | 'F' | 'U';
  nationality: string;
  occupation: string;
  phone: string;
  passport_number: string;
  port: string | null;
  port_code: string | null;
  sector: string | null;
  sector_name: string | null;
  locality: string | null;
  locality_name: string | null;
  health_facility: string | null;
  facility_name: string | null;
  event: string | null;
  event_number: string | null;
  lab_result: string | null;
  case_definition: string | null;
  onset_date: string | null;
  reported_date: string | null;
  confirmation_date: string | null;
  symptoms: string[];
  risk_factors: string[];
  exposure_history: string;
  notes: string;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthCaseWrite {
  disease?: string | null;
  case_type?: 'SUSPECTED' | 'PROBABLE' | 'CONFIRMED' | 'NOT_A_CASE';
  status?: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  source?: 'SCREENING' | 'LAB' | 'CLINIC' | 'EVENT' | 'EBS' | 'COMMUNITY' | 'PUBLIC' | 'MANUAL';
  traveler?: string | null;
  person_name?: string;
  person_age?: number | null;
  person_sex?: 'M' | 'F' | 'U';
  nationality?: string;
  occupation?: string;
  phone?: string;
  passport_number?: string;
  port?: string | null;
  sector?: string | null;
  locality?: string | null;
  health_facility?: string | null;
  event?: string | null;
  lab_result?: string | null;
  case_definition?: string | null;
  onset_date?: string | null;
  reported_date?: string | null;
  confirmation_date?: string | null;
  symptoms?: string[];
  risk_factors?: string[];
  exposure_history?: string;
  notes?: string;
}

export interface CaseStatusLog {
  id: string;
  field: 'case_type' | 'status';
  old_value: string;
  new_value: string;
  note: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface SurveillanceAlert {
  id: string;
  alert_number: string;
  alert_type: 'EWARS_THRESHOLD' | 'SINGLE_EVENT' | 'LAB_POSITIVE' | 'CONFIRMED_OUTBREAK';
  level: 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  title: string;
  description: string;
  disease: string | null;
  disease_name: string | null;
  sector: string | null;
  sector_name: string | null;
  locality: string | null;
  locality_name: string | null;
  port: string | null;
  port_code: string | null;
  event: string | null;
  event_number: string | null;
  case_count: number;
  case_numbers: string[];
  trigger: Record<string, unknown>;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESPONDING' | 'CLOSED';
  generated_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface ContactFollowUp {
  id: string;
  check_date: string;
  temperature: number | null;
  symptoms: string[];
  status: 'OK' | 'SYMPTOMATIC' | 'CONVERTED';
  notes: string;
  checked_by: string | null;
}

export interface ContactTrace {
  id: string;
  contact_number: string;
  index_case: string;
  index_case_number: string;
  person_name: string;
  age: number | null;
  sex: 'M' | 'F' | 'U';
  phone: string;
  relationship: string;
  contact_type: 'FAMILY' | 'WORK' | 'SOCIAL' | 'HEALTHCARE' | 'TRAVEL' | 'OTHER';
  last_exposure_date: string | null;
  follow_up_start: string | null;
  follow_up_days: number;
  location: string;
  port: string | null;
  port_code: string | null;
  sector: string | null;
  sector_name: string | null;
  status: 'UNDER_MONITORING' | 'COMPLETED' | 'SYMPTOMATIC' | 'CONVERTED_CASE' | 'LOST';
  notes: string;
  follow_ups: ContactFollowUp[];
  created_at: string;
}

export interface ContactTraceWrite {
  index_case: string;
  person_name: string;
  age?: number | null;
  sex?: 'M' | 'F' | 'U';
  phone?: string;
  relationship?: string;
  contact_type?: 'FAMILY' | 'WORK' | 'SOCIAL' | 'HEALTHCARE' | 'TRAVEL' | 'OTHER';
  last_exposure_date?: string | null;
  follow_up_start?: string | null;
  follow_up_days?: number;
  location?: string;
  port?: string | null;
  sector?: string | null;
  status?: 'UNDER_MONITORING' | 'COMPLETED' | 'SYMPTOMATIC' | 'CONVERTED_CASE' | 'LOST';
  notes?: string;
}

export interface ContactFollowUpWrite {
  temperature?: number | null;
  symptoms?: string[];
  status?: 'OK' | 'SYMPTOMATIC' | 'CONVERTED';
  notes?: string;
}

export interface Investigation {
  id: string;
  investigation_number: string;
  title: string;
  case: string | null;
  case_number: string | null;
  event: string | null;
  event_number: string | null;
  hypothesis: string;
  method: string[];
  findings: string;
  recommendations: string;
  actions_taken: string[];
  lead_investigator: string | null;
  lead_name: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  started_at: string;
  completed_at: string | null;
}

export interface InvestigationWrite {
  title: string;
  case?: string | null;
  event?: string | null;
  hypothesis?: string;
  method?: string[];
  findings?: string;
  recommendations?: string;
  actions_taken?: string[];
  lead_investigator?: string | null;
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  completed_at?: string | null;
}

export interface WeeklyReportLine {
  id: string;
  disease: string | null;
  disease_name: string | null;
  syndrome: string;
  new_cases: number;
  new_suspected: number;
  deaths: number;
}

export interface WeeklySurveillanceReport {
  id: string;
  report_number: string;
  period_start: string;
  period_end: string;
  health_facility: string | null;
  facility_name: string | null;
  port: string | null;
  port_code: string | null;
  sector: string | null;
  sector_name: string | null;
  is_on_time: boolean;
  data_quality_issues: string[];
  notes: string;
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  lines: WeeklyReportLine[];
}

export interface WeeklyReportLineWrite {
  disease?: string | null;
  syndrome?: string;
  new_cases?: number;
  new_suspected?: number;
  deaths?: number;
}

export interface WeeklySurveillanceReportWrite {
  period_start: string;
  period_end: string;
  health_facility?: string | null;
  port?: string | null;
  sector?: string | null;
  is_on_time?: boolean;
  data_quality_issues?: string[];
  notes?: string;
  lines?: WeeklyReportLineWrite[];
}

export interface SurveillanceDashboard {
  total_cases: number;
  cases_today: number;
  cases_this_week: number;
  confirmed_cases: number;
  dead_cases: number;
  active_alerts: number;
  new_alerts: number;
  level_counts: Record<'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3', number>;
  cases_by_disease: { disease__name_ar: string; count: number }[];
  cases_by_source: { source: string; count: number }[];
  cases_by_sector: { sector__name_ar: string; count: number }[];
  cases_by_port: { port__code: string; port__name_ar: string; count: number }[];
  cases_by_locality: { locality__name_ar: string; count: number }[];
  open_events: number;
}
