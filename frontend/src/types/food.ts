export interface FoodOrderItem {
  id: string;
  product_name: string;
  brand: string;
  origin: string;
  weight_kg: string | number;
  package_count: number;
  package_type: string;
}

export interface FeeLine {
  name: string;
  fee: string | number;
  fee_type: string;
}

export interface FeeBreakdown {
  exempt: boolean;
  lines: FeeLine[];
  total: string | number;
  samples: number;
}

export interface FoodShipment {
  id: string;
  manifest_number: string;
  port: string;
  port_name: string;
  port_type: string;
  supplier_name: string;
  origin_country: string;
  product_list: string[];
  arrival_date: string;
  shipment_type: string;
  status: string;
  customs_number: string;
  certificate_no: string;
  vessel_name: string;
  clearing_agent: string;
  exporter_name: string;
  message_type: string;
  loading_port: string;
  bill_of_lading: string;
  transport_data: Record<string, unknown>;
  total_weight_kg: string | number;
  samples_required: number;
  inspection_required: boolean;
  submitted_at: string | null;
  items: FoodOrderItem[];
  attachments: ShipmentAttachment[];
  fee_preview: FeeBreakdown;
  assigned_inspector: string | null;
  assigned_inspector_name: string | null;
  assigned_at: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  final_decision: string;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_reason: string;
  fees_paid: boolean;
  referred_from: string;
  referral_reference: string;
  referred_by: string | null;
  referred_by_name: string | null;
  referred_at: string | null;
}

export interface ShipmentAttachment {
  id: string;
  shipment: string;
  doc_type: string;
  doc_type_label: string;
  file: string;
  file_url: string | null;
  original_name: string;
  status?: string;
  status_label?: string;
  rejected_reason?: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface FoodShipmentEvent {
  id: string;
  shipment: string;
  stage: string;
  stage_label: string;
  message: string;
  actor: string | null;
  actor_name: string | null;
  occurred_at: string;
}

export interface ClerkStats {
  imports_today: number;
  exports_today: number;
  drafts: number;
  submitted: number;
  under_review: number;
  inspection: number;
  sampling: number;
  lab_testing: number;
  final_review: number;
  completed_today: number;
  rejected: number;
  total: number;
}

export interface ClerkDashboardData {
  stats: ClerkStats;
  recent: FoodShipment[];
}

export interface PublicPort {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
}

export interface FoodInvoice {
  id: string;
  shipment: string;
  shipment_manifest: string;
  invoice_number: string;
  items: Array<{ name: string; amount: number }>;
  total_amount: string | number;
  status: string;
  issued_by: string;
  issued_by_name: string | null;
  issued_at: string;
  receipt_number: string;
  payment_method: string;
  paid_notes: string;
  paid_by: string | null;
  paid_by_name: string | null;
  paid_at: string | null;
  payment_reference: string;
}

export interface FoodDecisionCertificate {
  id: string;
  shipment: string;
  shipment_manifest: string;
  certificate_number: string;
  certificate_type: string;
  status: string;
  decision: string;
  issued_by_name: string | null;
  issued_at: string;
  reason: string;
  certificate_data: Record<string, unknown>;
}

export interface FoodFee {
  id: string;
  name_ar: string;
  fee_type: string;
  amount: string | number;
  unit: string;
  is_active: boolean;
}

export interface FoodInspection {
  id: string;
  shipment: string;
  shipment_manifest: string;
  shipment_status: string;
  inspector: string | null;
  inspector_name: string | null;
  production_date: string | null;
  expiry_date: string | null;
  temperature: string | number | null;
  container_condition: string;
  container_status: string;
  batch_number: string;
  package_condition: string;
  damaged_weight: string | number;
  sound_weight: string | number;
  damaged_count: number;
  sound_count: number;
  notes: string;
  decision: string;
  inspected_at: string;
  supervisor_status: 'PENDING' | 'APPROVED' | 'RETURNED';
  supervisor_status_label: string;
  supervisor_notes: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
}

export interface InspectorWorkload {
  id: string;
  full_name: string;
  email: string;
  open_tasks: number;
  inspections_today: number;
  total_inspections: number;
  status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
}

export interface SupervisorStats {
  pending_review: number;
  awaiting_decision: number;
  holds_rejections: number;
  active_inspectors_today: number;
  awaiting_inspection: number;
  decided_week: number;
}

export interface LabParameter {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  bench: string;
  unit: string;
  method: string;
  reference_limit: string;
  detection_limit: string;
  price: string | number;
  sla_min_days: number;
  sla_max_days: number;
  order: number;
  is_active: boolean;
}

export interface TestSla {
  status: 'ON_TIME' | 'DUE_SOON' | 'DELAYED' | 'COMPLETED';
  due_at: string;
  remaining_days?: number;
  completed_at?: string | null;
  tat_hours?: number | null;
}

export interface SampleTestRevision {
  id: string;
  version: number;
  snapshot: Record<string, unknown>;
  reason: string;
  created_by: string | null;
  created_at: string;
}

/* ---------- النظام الوطني للمعايير الميكروبيولوجية ---------- */

export interface Microorganism {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  scientific_name: string;
  category: string;
  detection_type: string;
  default_unit: string;
  order: number;
  active: boolean;
}

export interface ProductCategory {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent: string | null;
  parent_name: string | null;
  order: number;
  active: boolean;
}

export interface TestMethod {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  reference_standard: string;
  detection_limit: string;
  unit: string;
  sample_quantity: string;
  incubation_parameters: string;
  active: boolean;
}

export interface MicrobiologicalLimit {
  id: string;
  version: string;
  microorganism: string | null;
  microorganism_code: string | null;
  microorganism_name: string | null;
  detection_type: string | null;
  test_method: string | null;
  test_method_name: string | null;
  unit: string;
  n: number;
  c: number;
  m: string | number | null;
  M: string | number | null;
  plan: string;
  plan_label: string;
  rule: { plan?: string; m_op?: string; M_op?: string };
  rule_json: Record<string, unknown>;
  active: boolean;
}

export interface SpecificationVersion {
  id: string;
  specification: string;
  spec_code: string;
  spec_name: string;
  version: number;
  effective_from: string | null;
  effective_to: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approval_date: string | null;
  notes: string;
  limits: MicrobiologicalLimit[];
  label: string;
}

export interface MicrobiologicalSpecification {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  product_category: string | null;
  product_category_name: string | null;
  product: string | null;
  product_name: string | null;
  reference: string;
  status: string;
  status_label: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approval_date: string | null;
  versions: SpecificationVersion[];
  current_version: SpecificationVersion | null;
}

export interface ApplicableLimits {
  product: { id: string; code: string; name_ar: string } | null;
  spec_version: SpecificationVersion | null;
  limits: MicrobiologicalLimit[];
}

export interface MicroUnitInput {
  unit_number: number;
  result_value?: number | string | null;
  qualifier?: string;
  result_unit?: string;
}

export interface MicroEvaluationCounts {
  total: number;
  missing: number;
  below_m: number;
  between_m_M: number;
  above_M: number;
  positive: number;
  negative: number;
  required_n: number;
}

export interface MicroEvaluation {
  test: string;
  decision: string;
  reason: string;
  counts: MicroEvaluationCounts;
  plan: string;
  engine: string;
  spec_snapshot: Record<string, unknown> | null;
  evaluation_id: string;
}

export interface SampleUnitResult {
  id: string;
  unit_number: number;
  result_value: string | null;
  qualifier: string;
  result_unit: string | null;
  entered_by: string | null;
  entered_at: string;
}

export interface ResultEvaluation {
  id: string;
  decision: string;
  reason: string;
  details: Record<string, unknown>;
  engine_version: string;
  limit_label: string | null;
  spec_version_label: string | null;
  evaluated_by: string | null;
  evaluated_at: string;
}

export interface SampleTest {
  id: string;
  sample: string;
  parameter: LabParameter;
  assigned_to: string | null;
  assigned_to_name: string | null;
  status: string;
  result_value: number | null;
  result_text: string;
  unit: string;
  reference_limit: string;
  method_used: string;
  device_used: string;
  reagent_lot: string;
  decision: string;
  version: number;
  entered_by: string | null;
  entered_by_name: string | null;
  entered_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  notes: string;
  qc_status: string;
  qc_status_label: string;
  qc_notes: string;
  qc_reviewed_by: string | null;
  qc_reviewed_by_name: string | null;
  qc_reviewed_at: string | null;
  revisions: SampleTestRevision[];
  sla: TestSla;
  micro_limit: MicrobiologicalLimit | null;
  spec_snapshot: Record<string, unknown> | null;
  evaluation: string | null;
  evaluation_reason: string | null;
  evaluated_at: string | null;
  unit_results: SampleUnitResult[];
  evaluations: ResultEvaluation[];
}

export interface SampleInvoiceItem {
  parameter: string;
  code: string;
  name_ar: string;
  quantity: number;
  unit_price: string | number;
  total: string | number;
}

export interface SampleInvoice {
  id: string;
  sample: string;
  sample_number: string;
  invoice_number: string;
  items: SampleInvoiceItem[];
  total_amount: string | number;
  currency: string;
  status: string;
  issued_by: string | null;
  issued_by_name: string | null;
  issued_at: string;
  receipt_number: string;
  paid_by: string | null;
  paid_by_name: string | null;
  paid_at: string | null;
  payment_reference: string;
  exemption_reason: string;
  exempted_by: string | null;
  exempted_by_name: string | null;
  exempted_at: string | null;
}

export interface FoodSample {
  id: string;
  inspection: string | null;
  shipment_manifest: string | null;
  source: string | null;
  source_name: string | null;
  classification: string;
  requesting_department: string;
  sample_barcode: string;
  sample_number: string;
  sample_type: string;
  sampling_reason: string;
  sampling_reason_label: string;
  priority: string;
  priority_label: string;
  priority_updated_by: string | null;
  priority_updated_by_name: string | null;
  priority_updated_at: string | null;
  bench: string;
  received_by: string | null;
  received_by_name: string | null;
  received_at: string | null;
  coordinator: string | null;
  coordinator_name: string | null;
  department_head: string | null;
  department_head_name: string | null;
  analyst: string | null;
  analyst_name: string | null;
  status: string;
  approval_status: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  collection_status: string;
  fee_amount: string | number;
  reception_status: string;
  reception_note: string;
  reception_decision_by: string | null;
  reception_decision_by_name: string | null;
  reception_decision_at: string | null;
  dispatched_by: string | null;
  dispatched_by_name: string | null;
  dispatched_at: string | null;
  dispatch_notes: string;
  reported_to_food_safety: boolean;
  lab_invoice: SampleInvoice | null;
  tests: SampleTest[];
  custody: ChainOfCustody[];
  analysis_request_number: string;
  station: string;
  inspector_name: string;
  brand: string;
  origin_country: string;
  batch_number: string;
  production_date: string | null;
  expiry_date: string | null;
  quantity: string | number | null;
  quantity_unit: string;
  units_count: number | null;
  packaging_type: string;
  packaging_condition: string;
  temperature: string | number | null;
  rejection_reason: string;
  reception_checklist: Record<string, boolean> | null;
  sector: string | null;
  sector_name: string | null;
  sector_code: string | null;
}

export interface ChainOfCustody {
  id: string;
  sample: string;
  sample_number: string;
  sample_barcode: string;
  from_department: string;
  to_department: string;
  transferred_by: string | null;
  transferred_by_name: string | null;
  received_by: string | null;
  received_by_name: string | null;
  transferred_at: string;
  received_at: string | null;
  condition: string;
  seal_number: string;
  remarks: string;
  is_received: boolean;
}

export interface SampleSource {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description: string;
  order: number;
  is_active: boolean;
}

export interface FoodProduct {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  category: string;
  subcategory: string;
  risk_group: string;
  reference_quantity: string;
  micro_category: string | null;
  order: number;
  is_active: boolean;
}

export interface ReferenceSample {
  id: string;
  ref_number: string;
  source: string | null;
  source_name: string | null;
  product_name: string;
  origin: string;
  original_sample: string | null;
  original_sample_number: string | null;
  quantity: string | number | null;
  retention_reason: string;
  storage_temperature: string | number | null;
  retention_duration: string;
  storage_location: string;
  coding: string;
  seal_number: string;
  condition_on_arrival: string;
  received_by: string | null;
  received_by_name: string | null;
  received_at: string;
  status: string;
  retrieved_by: string | null;
  retrieved_by_name: string | null;
  retrieved_at: string | null;
  remarks: string;
}

export interface ReferenceSampleInput {
  source?: string;
  product_name: string;
  origin?: string;
  original_sample?: string;
  quantity?: string | number;
  retention_reason?: string;
  storage_temperature?: string | number;
  retention_duration?: string;
  storage_location?: string;
  coding?: string;
  seal_number?: string;
  condition_on_arrival?: string;
  remarks?: string;
}

export interface SamplingPolicy {
  id: string;
  name_ar: string;
  scope: string;
  benchmark: string;
  threshold: string | number;
  samples_per_unit: string | number;
  max_samples: number;
  default_reason: string;
  order: number;
  is_active: boolean;
}

export interface AccountingSummaryReport {
  period: string;
  start: string;
  end: string;
  paid_count: number;
  pending_count: number;
  total_collected: string | number;
  receipts: Array<{
    receipt_number: string;
    invoice_number: string;
    amount: string | number;
    payment_method?: string;
    paid_at: string | null;
    paid_by: string | null;
    manifest: string;
  }>;
  payments_by_date: Array<{
    date: string;
    total: string | number;
    count: number;
  }>;
}

export interface FoodLabDashboard {
  sector_name: string | null;
  total_samples: number;
  received: number;
  coordinated: number;
  assigned: number;
  under_testing: number;
  ready_for_approval: number;
  approved: number;
  dispatched: number;
  completed: number;
  rejected: number;
  reception_pending: number;
  reception_cond: number;
  unpaid_samples: number;
  overdue_tests: number;
  sla_compliance_pct: number | null;
  by_bench: Record<string, number>;
  by_classification: Record<string, number>;
  by_source: Array<{ source: string; count: number }>;
  approved_count: number;
  reference_samples: number;
  custody_events: number;
  certificates: number;
  avg_completion_hours: number | null;
  total_tests: number;
  total_results: number;
  under_review_tests: number;
  retest_tests: number;
  non_compliant_samples: number;
  compliant_samples: number;
}

export interface StationDashboardItem {
  id: string;
  code: string;
  name_ar: string;
  kind: string;
  kind_label: string;
  samples: number;
  received: number;
  under_testing: number;
  approved: number;
  completed: number;
  tests: number;
  submitted: number;
  non_compliant_samples: number;
  compliant_samples: number;
  shipments: number;
}

export interface ChemistryDashboard {
  total_samples: number;
  under_testing: number;
  ready_for_approval: number;
  approved: number;
  overdue_tests: number;
  qc_pending: number;
  qc_failed: number;
  equipment_total: number;
  equipment_status: Record<string, number>;
  calibration_overdue: number;
}

export interface WorkloadItem {
  id: string;
  full_name: string;
  in_progress: number;
  draft: number;
  review: number;
  overdue: number;
  completed: number;
  total: number;
  load_level: 'idle' | 'normal' | 'high' | 'overloaded';
}

export interface MicroDashboard {
  total_samples: number;
  under_testing: number;
  ready_for_approval: number;
  approved: number;
  dispatched: number;
  completed: number;
  today_tests: number;
  urgent: number;
  draft_results: number;
  submitted: number;
  reviewed: number;
  pending_results: number;
  overdue_tests: number;
  at_risk_tests: number;
  non_compliant: number;
  avg_tat_hours: number | null;
  sla_compliance: { count: number; on_time: number; percent: number | null };
  qc_pending: number;
  qc_failed: number;
  analysts_count: number;
  workload: WorkloadItem[];
  specs_active: number;
  evaluated_tests: number;
}

export interface LabEquipment {
  id: string;
  name_ar: string;
  name_en: string;
  model_number: string;
  bench: string;
  bench_label: string;
  status: string;
  status_label: string;
  last_calibrated: string | null;
  next_calibration_due: string | null;
  calibration_overdue: boolean;
  notes: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface AnalysisCertificate {
  id: string;
  sample: string;
  sample_number: string;
  certificate_number: string;
  issued_by: string | null;
  issued_by_name: string | null;
  issued_at: string;
  decision: string;
  summary: Record<string, unknown>;
  status: string;
}

export interface QaDashboard {
  specs: { active: number; total: number };
  qc: { passed: number; failed: number; pending: number; pass_rate: number | null };
  equipment: { total: number; operational: number; overdue: number; due_soon: number; calibration_pct: number | null };
  reagents: { total: number; expired: number; low: number; valid_pct: number | null };
  methods: { total: number; active: number; compliance_pct: number | null };
  nonconformity: { open: number; closed: number; total: number; closed_pct: number | null; capa_open: number };
  audit: { total: number; today: number };
  compliance: { result_pct: number | null };
  qc_records: { failed: number; total: number };
}

export interface QCRecord {
  id: string;
  qc_number: string;
  bench: string;
  bench_label?: string;
  test: string | null;
  test_label: string | null;
  control_type: string;
  lot_number: string;
  status: string;
  severity: string;
  result_value: number | null;
  expected_value: number | null;
  tolerance: number | null;
  qc_notes: string;
  affected_tests: string[];
  affected_tests_count: number;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reagent {
  id: string;
  name_ar: string;
  name_en: string;
  bench: string;
  lot_number: string;
  expiry_date: string | null;
  quantity: number;
  unit: string;
  status: string;
  supplier: string;
  certificate_ref: string;
  notes: string;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  location_type: string;
  location_type_label: string;
  parent: string | null;
  parent_name: string | null;
  temperature: string;
  humidity: string;
  light_protection: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialCatalog {
  id: string;
  name_ar: string;
  name_en: string;
  material_type: string;
  material_type_label: string;
  bench: string;
  bench_label: string;
  manufacturer: string;
  catalog_number: string;
  cas_number: string;
  grade: string;
  grade_label: string;
  unit: string;
  min_stock: number;
  reorder_level: number;
  max_stock: number;
  hazard_class: string;
  hazard_label: string;
  default_storage: string | null;
  notes: string;
  created_by: string | null;
  created_by_name: string | null;
  total_stock: number;
  low_stock: boolean;
  active_lots: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialLot {
  id: string;
  material: string;
  material_name: string;
  lot_number: string;
  batch_number: string;
  manufacturing_date: string | null;
  expiry_date: string | null;
  quantity: number;
  unit: string;
  storage: string | null;
  storage_name: string | null;
  supplier: string;
  certificate_ref: string;
  received_date: string | null;
  received_by: string | null;
  status: string;
  status_label: string;
  days_to_expiry: number | null;
  is_expired: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Solution {
  id: string;
  name: string;
  material: string | null;
  material_name: string | null;
  concentration: string;
  solvent: string;
  final_volume: number | null;
  volume_unit: string;
  source_lot: string | null;
  source_lot_number: string | null;
  batch_number: string;
  preparation_date: string;
  expiry_date: string | null;
  prepared_by: string | null;
  prepared_by_name: string | null;
  verified_by: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
  verified_notes: string;
  storage: string | null;
  storage_name: string | null;
  status: string;
  status_label: string;
  is_expired: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialIssue {
  id: string;
  material: string;
  material_name: string;
  lot: string | null;
  lot_number: string | null;
  solution: string | null;
  solution_name: string | null;
  test: string | null;
  test_parameter: string | null;
  sample: string | null;
  sample_number: string | null;
  issue_type: string;
  issue_type_label: string;
  quantity_used: number;
  unit: string;
  purpose: string;
  issued_by: string | null;
  issued_by_name: string | null;
  issued_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DisposalRequest {
  id: string;
  material: string;
  material_name: string;
  lot: string | null;
  lot_number: string | null;
  solution: string | null;
  solution_name: string | null;
  quantity: number;
  unit: string;
  reason: string;
  detail: string;
  status: string;
  status_label: string;
  requested_by: string | null;
  requested_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  disposed_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialManagementDashboard {
  kpis: {
    total_materials: number;
    total_stock: number;
    expired: number;
    expiring_30: number;
    expiring_90: number;
    low_stock: number;
    solutions_pending: number;
    solutions_approved: number;
    solutions_expired: number;
    disposals_pending: number;
  };
  low_stock_materials: { id: string; name: string; current: number; min: number; unit: string }[];
  type_counts: Record<string, number>;
  recent_issues: MaterialIssue[];
}

export interface NonConformity {
  id: string;
  nc_number: string;
  nc_type: string;
  bench: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  reference_type: string;
  reference_number: string;
  root_cause: string;
  capa_required: boolean;
  capa_count: number;
  reported_by: string | null;
  reported_by_name: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CpaRecord {
  id: string;
  non_conformity: string;
  nc_number: string | null;
  title: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  responsible_user: string | null;
  responsible_user_name: string | null;
  due_date: string | null;
  status: string;
  verification_notes: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  object_type: string;
  object_id: string;
  object_label: string;
  detail: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface FoodSampleInput {
  inspection?: string;
  source?: string;
  classification?: string;
  requesting_department?: string;
  sample_type?: string;
  sampling_reason?: string;
  bench?: string;
  priority?: string;
  analysis_request_number?: string;
  station?: string;
  inspector_name?: string;
  brand?: string;
  origin_country?: string;
  batch_number?: string;
  production_date?: string;
  expiry_date?: string;
  quantity?: string | number;
  quantity_unit?: string;
  units_count?: number;
  packaging_type?: string;
  packaging_condition?: string;
  temperature?: string | number;
}

export interface ReceptionDashboard {
  today: number;
  pending: number;
  accepted: number;
  conditional: number;
  rejected: number;
  needs_review: number;
  urgent: number;
  references: number;
  avg_reception_minutes?: number | null;
}

export interface LabDirectorDashboard {
  kpis: {
    total_samples: number;
    samples_today: number;
    under_testing: number;
    ready_for_approval: number;
    approved: number;
    completed: number;
    dispatched: number;
    rejected: number;
    overdue: number;
    approval_queue: number;
  };
  approval_queue: {
    count: number;
    samples: Array<{
      id: string;
      sample_number: string;
      sample_type: string;
      bench: string;
      bench_label: string;
      created_at: string;
      source: string;
    }>;
  };
  departments: {
    microbiology: {
      total: number;
      completed: number;
      performance_pct: number;
      under_testing: number;
      ready_for_approval: number;
      tests_total: number;
    };
    chemistry: {
      total: number;
      completed: number;
      performance_pct: number;
      under_testing: number;
      ready_for_approval: number;
      tests_total: number;
    };
    physical: {
      total: number;
      completed: number;
      performance_pct: number;
      under_testing: number;
      ready_for_approval: number;
      tests_total: number;
    };
  };
  sla: {
    overdue_tests: number;
    at_risk_tests: number;
    sla_compliance_pct: number | null;
    avg_tat_hours: number | null;
  };
  equipment: {
    total: number;
    overdue: number;
    due_soon: number;
    by_status: Record<string, number>;
  };
  reagents: {
    total: number;
    expired: number;
    low: number;
  };
  nonconformity: {
    open: number;
    closed: number;
    capa_open: number;
  };
  audit: {
    today: number;
    total: number;
  };
  by_source: Array<{ source: string; count: number }>;
  decisions: {
    approved: number;
    rejected: number;
    compliant_pct: number | null;
  };
  avg_completion_hours: number | null;
  by_classification: Record<string, number>;
}

export interface ExportInspectionForm {
  shipment: {
    manifest_number: string;
    customs_number: string | null;
    certificate_no: string | null;
    created_at: string | null;
    submitted_at: string | null;
    arrival_date: string | null;
    shipment_type: string;
    message_type: string;
    status: string;
    port_name: string | null;
    port_type: string | null;
    supplier_name: string;
    origin_country: string;
    vessel_name: string | null;
    loading_port: string | null;
    bill_of_lading: string | null;
    clearing_agent: string | null;
    exporter_name: string | null;
    total_weight_kg: string | number;
    samples_required: number;
    inspection_required: boolean;
  };
  items: Array<{
    product_name: string;
    brand: string | null;
    origin: string | null;
    weight_kg: string | number;
    package_count: number;
    package_type: string | null;
  }>;
  inspection: {
    inspector_name: string | null;
    inspected_at: string | null;
    decision: string;
    temperature: string | number | null;
    production_date: string | null;
    expiry_date: string | null;
    batch_number: string | null;
    container_condition: string | null;
    container_status: string | null;
    package_condition: string | null;
    damaged_count: number;
    sound_count: number;
    damaged_weight_kg: string | number;
    sound_weight_kg: string | number;
    notes: string | null;
  } | null;
  samples: Array<{
    sample_number: string;
    sample_barcode: string;
    sample_type: string;
    sampling_reason: string;
    bench: string;
    status: string;
    approval_status: string;
    received_at: string | null;
  }>;
  decision: {
    final_decision: string;
    decision_reason: string | null;
    decided_by_name: string | null;
    decided_at: string | null;
  } | null;
  certificate: {
    certificate_number: string;
    certificate_type: string;
    status: string;
    issued_at: string | null;
  } | null;
}

export interface QuarantineFeeCategory {
  key: string;
  label: string;
  fees: QuarantineFee[];
}

export interface QuarantineFeeSchedule {
  year: number;
  categories: QuarantineFeeCategory[];
}

export interface QuarantineFee {
  id: string;
  code: string;
  category: string;
  name_ar: string;
  amount_sdg: string | number | null;
  amount_usd: string | number | null;
  currency_note: string | null;
  year: number;
  is_active: boolean;
  order: number;
}


// ============================================================
//  المواصفات والمعايير المرجعية (Standards & Compliance)
// ============================================================

export interface AnalyticalMethod {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  source: string;
  source_label: string;
  version: string;
  matrix: string;
  applicable_organism: string;
  lod: string;
  loq: string;
  unit: string;
  validation_status: string;
  validation_status_label: string;
  reference_standard: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StandardRequirement {
  id: string;
  version: string;
  version_label: string;
  version_code: string;
  parameter: string | null;
  parameter_code: string | null;
  parameter_name: string | null;
  microorganism: string | null;
  microorganism_code: string | null;
  microorganism_name: string | null;
  method: string | null;
  method_code: string | null;
  method_name: string | null;
  limit_type: string;
  limit_type_label: string;
  min_value: string | number | null;
  max_value: string | number | null;
  unit: string;
  n: number;
  c: number;
  m: string | number | null;
  M: string | number | null;
  plan: string;
  plan_label: string;
  rule: { limit_type?: string; plan?: string; m_op?: string; M_op?: string };
  rule_json: Record<string, unknown>;
  label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StandardVersion {
  id: string;
  standard: string;
  standard_code: string;
  standard_title: string;
  standard_source: string;
  version: string;
  effective_from: string | null;
  effective_to: string | null;
  issue_date: string | null;
  document_reference: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approval_date: string | null;
  notes: string;
  requirements: StandardRequirement[];
  label: string;
  created_at: string;
  updated_at: string;
}

export interface Standard {
  id: string;
  code: string;
  title_ar: string;
  title_en: string;
  source: string;
  source_label: string;
  country: string;
  document_reference: string;
  product: string | null;
  product_name: string | null;
  product_category: string | null;
  product_category_name: string | null;
  mandatory: boolean;
  status: string;
  status_label: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approval_date: string | null;
  notes: string;
  versions: StandardVersion[];
  current_version: StandardVersion | null;
  created_at: string;
  updated_at: string;
}

export interface RegulatoryRule {
  id: string;
  code: string;
  name_ar: string;
  description: string;
  priority: number;
  source_type: string;
  source_type_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StandardsDashboard {
  kpis: {
    total_standards: number;
    active_versions: number;
    chemical_requirements: number;
    micro_requirements: number;
    total_requirements: number;
    validated_methods: number;
    active_rules: number;
  };
  source_counts: Record<string, number>;
}

export interface StandardsComparison {
  parameter_id: string;
  comparison: {
    source: string;
    source_label: string;
    standards: {
      standard_code: string;
      standard_title: string;
      version: string;
      effective_from: string;
      limit_label: string;
      method_code: string | null;
      method_name: string | null;
    }[];
  }[];
}

export interface ApplicableStandardResponse {
  standard: {
    code: string;
    title: string;
    source: string;
  };
  version: {
    version: string;
    effective_from: string;
    effective_to: string | null;
  };
  requirement: StandardRequirement;
  method: AnalyticalMethod | null;
  reason: string;
}

export interface MicroUnitInput {
  unit_number: number;
  result_value?: number | string | null;
  qualifier?: string;
  result_unit?: string;
}

export interface StandardsEvaluation {
  decision: string;
  reason: string;
  counts: any;
  plan: string;
  engine: string;
  applied_standard?: {
    code: string;
    title: string;
    source: string;
  };
  applied_version?: string;
  applied_method?: AnalyticalMethod | null;
}

export interface DeptHeadDashboard {
  period: string;
  kpis: { shipments_today: number; inspections_today: number; samples_lab: number; pending_decision: number };
  status_cards: { released: number; rejected: number; holds: number; violations_open: number };
  details: {
    total_shipments: number;
    inspected: number;
    released_pct: number;
    rejected_pct: number;
    avg_release_hours: number | null;
    samples_count: number;
    non_compliant_results: number;
    holds_count: number;
    violations: number;
    certificates_issued: number;
  };
  recent_shipments: Array<{
    id: string;
    manifest_number: string;
    customs_number: string;
    supplier_name: string;
    products: string;
    port_name: string;
    status: string;
    created_at: string;
  }>;
  inspection_board: {
    tasks_today: number;
    completed: number;
    in_progress: number;
    late: number;
    per_inspector: Array<{ id: string; full_name: string; open_tasks: number; completed_today: number; total_inspections: number }>;
  };
  samples_board: { collected: number; under_analysis: number; results_ready: number; late_sla: number };
  pending_decisions: Array<{ id: string; manifest_number: string; supplier_name: string; recommendation: string }>;
  alerts: Array<{ level: 'critical' | 'warning'; text: string }>;
  analytics_by_status: Record<string, number>;
  finance: { inspection_fees: number; lab_fees: number; certificate_fees: number; total: number };
  certificates: { issued_today: number; total_period: number };
  staff: { inspectors: number; busy: number; available: number; idle: number };
}

export interface SectorHeadDashboard {
  period: string;
  sector: { id: string; name_ar: string };
  kpis: { shipments_period: number; inspections_completed: number; samples_lab: number; violations_open: number };
  outcomes: { released: number; rejected: number; holds: number; sla_pct: number };
  ports_overview: Array<{
    id: string;
    code: string;
    name_ar: string;
    kind: string;
    shipments: number;
    inspections: number;
    samples: number;
    rejected: number;
    sla_pct: number;
    released_pct: number;
  }>;
  status_breakdown: Record<string, number>;
  inspection_board: {
    tasks_assigned: number;
    completed: number;
    in_progress: number;
    late: number;
    per_port: Array<{ port_name: string; tasks: number; completed: number; late: number; performance_pct: number }>;
  };
  samples_board: {
    collected: number;
    at_lab: number;
    under_analysis: number;
    results_ready: number;
    late_sla: number;
    non_compliant: number;
    sla_within: number;
    sla_near: number;
    sla_exceeded: number;
  };
  alerts: Array<{ level: 'critical' | 'warning' | 'info'; text: string }>;
  certificates: { issued_today: number; issued_period: number; awaiting_decision: number };
  staff: {
    total: number;
    busy: number;
    available: number;
    idle: number;
    workload: Array<{
      id: string;
      full_name: string;
      open_tasks: number;
      completed_period: number;
      total_inspections: number;
      status: 'BUSY' | 'AVAILABLE' | 'UNAVAILABLE';
    }>;
  };
  finance: { inspection_fees: number; lab_fees: number; certificate_fees: number; total: number };
}

export interface FoodDirectorDashboard {
  period: string;
  kpis: { shipments_period: number; inspections_completed: number; samples_lab: number; certificates_issued: number };
  outcomes: { released_pct: number; rejected_pct: number; high_risk_pct: number; sla_pct: number };
  sectors_overview: Array<{
    id: string;
    name_ar: string;
    shipments: number;
    inspections: number;
    samples: number;
    rejected: number;
    sla_pct: number;
    performance_score: number;
    performance_dot: 'green' | 'yellow' | 'red';
  }>;
  alerts: Array<{ level: 'critical' | 'warning' | 'info'; text: string }>;
  lab_performance: {
    samples_received: number;
    under_analysis: number;
    results_completed: number;
    delayed: number;
    non_conforming: number;
    sla_within: number;
    sla_near: number;
    sla_exceeded: number;
  };
  kpi_table: Array<{ name: string; current: string; target: string; ok: boolean }>;
  trade: Record<'import' | 'export', {
    total: number;
    released: number;
    released_pct: number;
    rejected: number;
    rejected_pct: number;
    hold: number;
    hold_pct: number;
  }>;
  finance: { inspection_fees: number; lab_fees: number; certificate_fees: number; total: number };
  staff: { inspectors: number; busy: number; available: number; idle: number };
  certificates: { issued_today: number; issued_period: number; awaiting_decision: number };
}
