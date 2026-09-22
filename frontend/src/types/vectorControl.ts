export interface VectorRegistry {
  id: string;
  vector_type: string;
  vector_type_display?: string;
  species?: string;
  name_ar: string;
  description?: string;
  disease_risk?: string;
  is_active: boolean;
}

export interface VectorUnit {
  id: string;
  code: string;
  name_ar: string;
  kind: string;
  kind_display?: string;
  sector: string;
  sector_name?: string;
  description?: string;
  is_active: boolean;
}

export interface VectorSite {
  id: string;
  entry_point: string;
  entry_point_name?: string;
  site_type: string;
  site_type_display?: string;
  name_ar: string;
  area_m2?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  notes?: string;
  is_active: boolean;
}

export interface VectorTeam {
  id: string;
  code: string;
  name_ar: string;
  team_type: string;
  team_type_display?: string;
  sector: string;
  sector_name?: string;
  entry_point?: string | null;
  entry_point_name?: string | null;
  leader?: string | null;
  leader_name?: string | null;
  members?: string[];
  members_count?: number;
  is_active: boolean;
}

export interface VectorReport {
  id: string;
  report_number: string;
  report_type: string;
  report_type_display?: string;
  source: string;
  source_display?: string;
  entry_point: string;
  entry_point_name: string;
  site?: string | null;
  site_name?: string | null;
  vector?: string | null;
  vector_name?: string | null;
  severity: string;
  severity_display?: string;
  problem_description: string;
  reported_by?: string | null;
  reported_by_name?: string | null;
  reported_at: string;
  gps_latitude?: string | number | null;
  gps_longitude?: string | number | null;
  status: string;
  status_display?: string;
  assessment_note?: string;
  assessed_by?: string | null;
  assessed_by_name?: string | null;
  assessed_at?: string | null;
  closed_at?: string | null;
}

export interface VectorFocus {
  id: string;
  focus_number: string;
  entry_point: string;
  entry_point_name: string;
  site?: string | null;
  site_name?: string | null;
  vector?: string | null;
  vector_name?: string | null;
  vector_type?: string | null;
  severity: string;
  severity_display?: string;
  status: string;
  status_display?: string;
  water_source: string;
  water_source_display?: string;
  environment?: string;
  focus_size?: number | null;
  description?: string;
  gps_latitude?: string | number | null;
  gps_longitude?: string | number | null;
  origin: string;
  origin_display?: string;
  source_report?: string | null;
  opened_by?: string | null;
  opened_by_name?: string | null;
  opened_at: string;
  closed_by?: string | null;
  closed_by_name?: string | null;
  closed_at?: string | null;
  closure_reason?: string;
  sector_code?: string | null;
  has_open_operations?: boolean;
}

export interface VectorInspection {
  id: string;
  inspection_number: string;
  entry_point: string;
  entry_point_name: string;
  site?: string | null;
  site_name?: string | null;
  team?: string | null;
  team_name?: string | null;
  inspector?: string | null;
  inspector_name?: string;
  visit_datetime: string;
  purpose: string;
  purpose_display?: string;
  adult_mosquito: boolean;
  larvae: boolean;
  flies: boolean;
  rodents: boolean;
  cockroaches: boolean;
  other_vectors: boolean;
  found_vectors?: string[];
  foci_count: number;
  hazards_found?: string;
  notes?: string;
  gps_latitude?: string | number | null;
  gps_longitude?: string | number | null;
  findings_severity: string;
  findings_severity_display?: string;
  linked_focus?: string | null;
  status: string;
  status_display?: string;
}

export interface VectorSurvey {
  id: string;
  survey_number: string;
  entry_point: string;
  entry_point_name: string;
  site?: string | null;
  site_name?: string | null;
  vector: string;
  vector_name: string;
  vector_type?: string;
  method: string;
  method_display?: string;
  area: string;
  team?: string | null;
  team_name?: string | null;
  survey_date: string;
  house_index?: string | number | null;
  breteau_index?: string | number | null;
  container_index?: string | number | null;
  breeding_sites: number;
  density: string;
  density_display?: string;
  proposed_risk: string;
  proposed_risk_display?: string;
  environmental_conditions?: string;
  notes?: string;
  suggested_focus?: string | null;
  status: string;
  status_display?: string;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
}

export interface VectorSample {
  id: string;
  sample_number: string;
  entry_point: string;
  entry_point_name: string;
  focus?: string | null;
  focus_number?: string | null;
  inspection?: string | null;
  survey?: string | null;
  vector?: string | null;
  vector_name?: string | null;
  stage: string;
  stage_display?: string;
  specimen_count: number;
  collection_method?: string;
  collector?: string | null;
  collector_name?: string;
  collected_at: string;
  condition_note?: string;
  status: string;
  status_display?: string;
  received_at?: string | null;
  received_by?: string | null;
  received_by_name?: string | null;
  rejection_reason?: string;
  has_result?: boolean;
}

export interface VectorLabResult {
  id: string;
  sample: string;
  sample_number: string;
  entry_point_name: string;
  vector_name?: string | null;
  species_identified?: string;
  identification_method: string;
  method_display?: string;
  result: string;
  result_display?: string;
  findings?: string;
  analyst?: string | null;
  analyst_name?: string | null;
  analyzed_at?: string | null;
  status: string;
  status_display?: string;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string;
}

export interface VectorChemical {
  id: string;
  name_ar: string;
  active_ingredient?: string;
  concentration?: string;
  form: string;
  form_display?: string;
  hazard_class: string;
  hazard_class_display?: string;
  target: string;
  target_display?: string;
  unit: string;
  min_stock: string | number;
  supplier?: string;
  is_restricted: boolean;
  notes?: string;
  is_active: boolean;
  in_stock_total?: string | number;
}

export interface VectorEquipment {
  id: string;
  code: string;
  name_ar: string;
  kind: string;
  kind_display?: string;
  model?: string;
  quantity: number;
  status: string;
  status_display?: string;
  assigned_team?: string | null;
  assigned_team_name?: string | null;
  entry_point?: string | null;
  entry_point_name?: string | null;
  notes?: string;
  is_active: boolean;
}

export interface VectorInventoryItem {
  id: string;
  chemical: string;
  chemical_name?: string;
  chemical_unit?: string;
  entry_point?: string | null;
  entry_point_name?: string | null;
  batch_number?: string;
  expiry_date?: string | null;
  quantity: string | number;
  unit: string;
  received_date: string;
  notes?: string;
  low_stock?: boolean;
}

export interface InventoryMovement {
  id: string;
  item: string;
  item_label?: string;
  movement_type: string;
  movement_type_display?: string;
  quantity: string | number;
  unit: string;
  operation?: string | null;
  operation_number?: string | null;
  reference?: string;
  performed_by?: string | null;
  performed_by_name?: string | null;
  performed_at: string;
  notes?: string;
}

export interface OpChemicalLine {
  id: string;
  operation: string;
  operation_number?: string;
  chemical: string;
  chemical_name?: string;
  item?: string | null;
  dosage?: string;
  concentration?: string;
  quantity_used: string | number;
  unit: string;
  area_covered?: number | null;
}

export interface VectorControlOperation {
  id: string;
  op_number: string;
  focus?: string | null;
  focus_number?: string | null;
  focus_severity?: string | null;
  report?: string | null;
  report_number?: string | null;
  entry_point: string;
  entry_point_name: string;
  site?: string | null;
  site_name?: string | null;
  vector?: string | null;
  vector_name?: string | null;
  operation_type: string;
  operation_type_display?: string;
  area_m2?: number | null;
  team?: string | null;
  team_name?: string | null;
  leader?: string | null;
  leader_name?: string | null;
  application_method?: string;
  planned_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  status: string;
  status_display?: string;
  result_effective?: boolean | null;
  effectiveness_percent?: number | null;
  equipment_used?: string[];
  notes?: string;
  review_by?: string | null;
  review_by_name?: string | null;
  reviewed_at?: string | null;
  chemical_lines?: OpChemicalLine[];
  chemicals_summary?: { chemical_name: string; quantity_used: number; unit: string }[];
}

export interface VectorFollowUp {
  id: string;
  followup_number: string;
  focus: string;
  focus_number: string;
  operation?: string | null;
  operation_number?: string | null;
  visit_datetime: string;
  team?: string | null;
  team_name?: string | null;
  performed_by?: string | null;
  performed_by_name?: string | null;
  findings?: string;
  controlled?: boolean | null;
  recommend_retreatment?: boolean;
  new_foci_count?: number;
  notes?: string;
  status: string;
  status_display?: string;
  closed_at?: string | null;
}

export interface VectorCase {
  id: string;
  case_number: string;
  focus: string;
  focus_number: string;
  disease: string;
  classification: string;
  classification_display?: string;
  detected_at: string;
  patient_ref?: string;
  outcome?: string;
  notes?: string;
}

export interface VectorAlert {
  id: string;
  alert_type: string;
  alert_type_display?: string;
  severity: string;
  severity_display?: string;
  title_ar: string;
  body: string;
  focus?: string | null;
  focus_number?: string | null;
  operation?: string | null;
  operation_number?: string | null;
  chemical?: string | null;
  item?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface VectorDashboardOverview {
  reports_new: number;
  reports_total: number;
  inspections_today: number;
  surveys_this_month: number;
  foci_active: number;
  foci_critical: number;
  operations_active: number;
  operations_completed: number;
  samples_pending: number;
  lab_results_pending: number;
  low_stock_items: number;
  unread_alerts: number;
  avg_effectiveness: number | null;
  by_severity: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
}

export interface VectorMapFocus {
  id: string;
  focus_number: string;
  entry_point: string;
  entry_point_name: string;
  site_name?: string | null;
  vector_name?: string | null;
  severity: string;
  severity_display: string;
  status: string;
  status_display: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  sector_code?: string | null;
  sector_name?: string | null;
}

export interface VectorStatistics {
  foci_by_sector: Array<{ code: string | null; name: string | null; count: number }>;
  foci_by_severity: Array<{ key: string; value: number }>;
  foci_by_status: Array<{ key: string; value: number }>;
  operations_by_type: Array<{ key: string; value: number }>;
  reports_by_status: Array<{ key: string; value: number }>;
  samples_by_status: Array<{ key: string; value: number }>;
  chemicals_usage: Array<{ chemical: string; total: string | number }>;
}

export interface VectorActivityItem {
  type: string;
  data: Record<string, string | number | boolean | null>;
  entry_point: string;
  time: string;
  by: string;
}