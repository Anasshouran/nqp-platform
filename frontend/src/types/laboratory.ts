export interface LabSample {
  id: string;
  sample_number: string;
  sample_barcode: string;
  sample_type: string;
  sample_type_label: string;
  source: string;
  source_label: string;
  priority: string;
  priority_label: string;
  status: string;
  status_label: string;
  reception_status: string;
  reception_status_label: string;
  reception_checklist: Record<string, boolean> | null;
  reception_note: string;
  rejection_reason: string;
  received_at: string;
  storage_location: string | null;
  visit: string | null;
  visit_traveler_name: string;
  visit_phase: string;
  lab_request: string | null;
  request_barcode: string;
  request_priority: string;
  section: string | null;
  section_name: string;
  sector: string | null;
  sector_name: string;
  entry_point: string | null;
  entry_point_name: string;
  collector: string | null;
  collector_name: string;
  collected_at: string;
  reception_decision_by: string | null;
  reception_decision_at: string;
  test_count: number;
  result_count: number;
  movement_count: number;
  created_at: string;
}

export interface LabSampleInput {
  sample_type: string;
  source?: string;
  priority?: string;
  visit?: string;
  lab_request?: string;
  section?: string;
  sector?: string;
  entry_point?: string;
  storage_location?: string;
}

export interface ReceptionCheckInput {
  reception_checklist?: Record<string, boolean>;
  reception_note?: string;
  rejection_reason?: string;
}

export interface SampleTest {
  id: string;
  sample: string;
  sample_number: string;
  sample_barcode: string;
  section_name: string;
  disease: string | null;
  disease_name: string;
  disease_code: string;
  test_name: string;
  method: string;
  instrument: string | null;
  instrument_name: string;
  assigned_to: string | null;
  assigned_name: string;
  priority: string;
  status: string;
  status_label: string;
  version: number;
  result_value: number | null;
  result_text: string;
  unit: string;
  reference_range: string;
  outcome: string;
  outcome_label: string;
  notes: string;
  is_critical: boolean;
  critical_acknowledged_by: string | null;
  critical_acknowledged_at: string;
  critical_ack_name: string;
  entered_by: string | null;
  entered_name: string;
  entered_at: string;
  reviewed_by: string | null;
  reviewed_name: string;
  reviewed_at: string;
  approved_by: string | null;
  approved_name: string;
  approved_at: string;
  lab_result: string | null;
  lab_result_status: string;
  created_at: string;
  updated_at: string;
}

export interface SampleTestInput {
  test_name: string;
  disease_code?: string;
  method?: string;
  instrument?: string;
  assigned_to?: string;
  priority?: string;
}

export interface SaveResultInput {
  outcome: string;
  result_value?: number | null;
  result_text?: string;
  unit?: string;
  reference_range?: string;
  notes?: string;
}

export interface LabTestCatalog {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  section: string;
  section_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface LabSection {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: string;
  description: string;
  order: number;
  is_active: boolean;
}

export interface StorageLocation {
  id: string;
  name: string;
  location_type: string;
  parent: string | null;
  temperature: string;
  humidity: string;
  notes: string;
}

export interface SampleMovement {
  id: string;
  sample: string;
  action: string;
  action_label: string;
  department: string;
  location: string;
  user: string;
  user_name: string;
  note: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface TrackResponse {
  sample: LabSample;
  movements: SampleMovement[];
}

export interface LabEquipment {
  id: string;
  name_ar: string;
  name_en: string;
  model_number: string;
  serial_number: string;
  section: string;
  section_name: string;
  status: string;
  last_calibrated: string;
  next_calibration_due: string;
  calibration_overdue: boolean;
  calibration_due_soon: boolean;
  notes: string;
}

export interface Reagent {
  id: string;
  name_ar: string;
  name_en: string;
  material_type: string;
  section: string;
  section_name: string;
  manufacturer: string;
  catalog_number: string;
  cas_number: string;
  grade: string;
  unit: string;
  min_stock: number;
  reorder_level: number;
  max_stock: number;
  total_quantity: number;
  low_stock: boolean;
  hazard_class: string;
  storage: string;
  notes: string;
}

export interface ReagentLot {
  id: string;
  reagent: string;
  reagent_name: string;
  lot_number: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  storage: string;
  supplier: string;
  certificate_ref: string;
  received_date: string;
  received_by: string;
  status: string;
  is_expired: boolean;
  days_to_expiry: number;
  notes: string;
}

export interface MaterialIssue {
  id: string;
  lot: string;
  lot_number: string;
  reagent_name: string;
  issue_type: string;
  quantity_used: number;
  unit: string;
  purpose: string;
  issued_by: string;
  issued_by_name: string;
  issued_at: string;
  notes: string;
}

export interface QCRecord {
  id: string;
  qc_number: string;
  section: string;
  section_name: string;
  test: string | null;
  test_label: string;
  control_type: string;
  lot_number: string;
  status: string;
  severity: string;
  result_value: number | null;
  expected_value: number | null;
  tolerance: number | null;
  qc_notes: string;
  reviewed_by: string | null;
  reviewed_name: string;
  reviewed_at: string;
}

export interface NonConformity {
  id: string;
  nc_number: string;
  nc_type: string;
  section: string;
  section_name: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  reference_type: string;
  reference_number: string;
  root_cause: string;
  capa_required: boolean;
  reported_by: string;
  reported_by_name: string;
  closed_at: string;
  capa_count: number;
  created_at: string;
}

export interface CapaRecord {
  id: string;
  non_conformity: string;
  nc_number: string;
  nc_title: string;
  title: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  responsible_user: string | null;
  responsible_name: string;
  due_date: string;
  status: string;
  verification_notes: string;
  closed_at: string;
}

export interface CriticalResultNotification {
  id: string;
  test: string;
  sample_number: string;
  test_name: string;
  outcome: string;
  notified_at: string;
  channel: string;
  acknowledged_by: string | null;
  acknowledged_name: string;
  acknowledged_at: string;
  note: string;
}

export interface LabDashboard {
  sections: LabSection[];
  totals: {
    samples: number;
    received_today: number;
    pending_reception: number;
    accepted: number;
    rejected: number;
    under_testing: number;
    ready_for_approval: number;
    completed: number;
    urgent: number;
  };
  by_status: Record<string, number>;
  by_section: Array<{ section: string; name: string; count: number }>;
  by_source: Array<{ source: string; name: string; count: number }>;
  tests: {
    total: number;
    pending: number;
    in_progress: number;
    draft: number;
    submitted: number;
    approved: number;
  };
  critical: {
    open: number;
    acknowledged: number;
    recent: number;
  };
  quality: {
    equipment: { total: number; overdue: number; due_soon: number };
    reagents: { total: number; expiring_soon: number; expired: number; low_stock: number };
    qc: { pending: number; failed: number };
    non_conformities: { open: number };
  };
}

export interface NationalLabSector {
  code: string;
  name: string;
  color: string | null;
  laboratory: { code: string; name: string } | null;
  totals: {
    samples: number;
    under_testing: number;
    completed: number;
    positive: number;
    negative: number;
    critical: number;
    avg_tat_hours: number;
  };
  equipment: { total: number; overdue: number };
  reagents: { total: number; expiring_soon: number; expired: number; low_stock: number };
  quality: { open_nc: number; pending_qc: number };
  epidemic_alerts: number;
  top_tests: Array<{ name: string; count: number }>;
}

export interface NationalLabDashboard {
  generated_at: string;
  sectors: NationalLabSector[];
  totals: {
    samples: number;
    under_testing: number;
    completed: number;
    positive: number;
    negative: number;
    critical: number;
    open_nc: number;
    avg_tat_hours: number;
    tests_count: number;
  };
  top_tests_global: Array<{ name: string; count: number }>;
  recent_alerts: Array<{
    id: string;
    alert_type: string;
    description: string;
    port: string;
    status: string;
    triggered_at: string;
  }>;
}

export interface LabReport {
  summary: {
    samples: number;
    tests: number;
    decided: number;
    completed: number;
    positive: number;
    non_compliant: number;
    critical: number;
    positivity_rate: number;
    avg_tat_hours: number;
  };
  by_section: Array<{
    section: string;
    name: string;
    code: string;
    total: number;
    completed: number;
    positive: number;
    non_compliant: number;
    critical: number;
  }>;
  by_source: Array<{ source: string; name: string; count: number }>;
  by_disease: Array<{ disease: string; name: string; total: number; positive: number }>;
}

export interface Disease {
  id: string;
  icd_11_code: string;
  name_ar: string;
  name_en: string;
  description: string;
  symptoms: string[];
  incubation_period_min: number | null;
  incubation_period_max: number | null;
  transmission_methods: string[];
  is_public_health_emergency: boolean;
  ihr_category: string;
  is_active: boolean;
}

export interface LabUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  phone: string | null;
  user_type: string;
  organization_name: string;
  role: string | null;
  role_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabUserInput {
  email?: string;
  full_name?: string;
  phone?: string;
  user_type?: string;
  role?: string | null;
  password?: string;
  is_active?: boolean;
}

export interface LabRole {
  code: string;
  name: string;
  name_ar: string;
  user_count: number;
}
