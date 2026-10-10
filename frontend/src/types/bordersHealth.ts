/* ── أنواع نظام صحة المعابر البرية ──────────────────────────────────────────
   تطابق مسلسلات `backend/apps/borders_health/serializers.py`. القيم النصية
   Unions مطابقة لـ `choices` في النماذج، مع `| string` للسماح بقيم
   مستقبلية لا تُعرف للواجهة (نفس أسلوب `types/vaccination.ts`).
   ------------------------------------------------------------------------ */

// — المعابر والمرافق —

export type BorderType = 'ROAD' | 'RAIL' | 'RIVER';

export type CrossingOperatingStatus =
  | 'OPEN' | 'RESTRICTED' | 'LIMITED' | 'CLOSED' | 'EMERGENCY';

export type FacilityKind =
  | 'HEALTH' | 'LABORATORY' | 'QUARANTINE' | 'ISOLATION' | 'STORAGE'
  | 'WATER_SANITATION' | 'WASTE' | 'VECTOR_CONTROL';

export type ShiftType = 'MORNING' | 'EVENING' | 'NIGHT' | 'ROTATING';

export type StaffAssignmentType = 'PERMANENT' | 'TEMPORARY' | 'RELIEVING';

export interface BorderCrossing {
  id: string;
  entry_point: string;
  entry_point_code?: string;
  name_ar?: string;
  neighbor_state?: string;
  border_type: BorderType;
  neighbor_country: string;
  operating_status: CrossingOperatingStatus;
  operating_hours: string;
  daily_capacity: number;
  working_agencies: string;
  has_health_facility: boolean;
  has_laboratory: boolean;
  has_quarantine_facility: boolean;
  has_isolation_facility: boolean;
  quarantine_capacity: number;
  closure_reason: string;
  notes: string;
}

export interface BorderCrossingInput {
  entry_point: string;
  border_type: BorderType;
  neighbor_country?: string;
  operating_status?: CrossingOperatingStatus;
  operating_hours?: string;
  daily_capacity?: number;
  working_agencies?: string;
  has_health_facility?: boolean;
  has_laboratory?: boolean;
  has_quarantine_facility?: boolean;
  has_isolation_facility?: boolean;
  quarantine_capacity?: number;
  closure_reason?: string;
  notes?: string;
}

export interface BorderFacility {
  id: string;
  crossing: string;
  crossing_name?: string;
  kind: FacilityKind;
  name_ar: string;
  name_en: string;
  capacity: number;
  staff_count: number;
  is_operational: boolean;
  notes: string;
}

export interface BorderShift {
  id: string;
  crossing: string;
  crossing_name?: string;
  shift_date: string;
  shift_type: ShiftType;
  started_at: string | null;
  ended_at: string | null;
  supervisor: string | null;
  supervisor_name?: string;
  is_staffed: boolean;
  notes: string;
}

export interface BorderStaff {
  id: string;
  crossing: string;
  crossing_name?: string;
  user: string;
  user_name?: string;
  role: string;
  assignment_type: StaffAssignmentType;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  notes: string;
}

// — المسافرون —

export type TravelDirection = 'INBOUND' | 'OUTBOUND';
export type HealthStatus = 'FIT' | 'UNFIT' | 'UNDER_OBSERVATION';
export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';
export type TravelerDecision =
  | 'CLEARED' | 'HOLD' | 'REFERRED' | 'QUARANTINED' | 'REFUSED_ENTRY';
export type DeclarationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'FLAGGED';

export interface TravelerHealthRecord {
  id: string;
  crossing: string;
  crossing_name?: string;
  traveler: string;
  traveler_name?: string;
  passport_number?: string;
  direction: TravelDirection;
  entry_at: string;
  departure_country: string;
  visited_countries: string[] | Record<string, unknown>;
  transport_mode: string;
  vehicle: string | null;
  health_status: HealthStatus;
  risk_level: RiskLevel;
  decision: TravelerDecision;
  assessed_by: string | null;
  assessed_by_name?: string;
  notes: string;
}

export interface HealthDeclaration {
  id: string;
  crossing: string;
  crossing_name?: string;
  traveler: string;
  traveler_name?: string;
  departure_country: string;
  departure_date: string;
  visited_countries: string[] | Record<string, unknown>;
  health_conditions: string;
  current_symptoms: string;
  contact_name: string;
  contact_phone: string;
  declared_at: string;
  status: DeclarationStatus;
  reviewed_by: string | null;
  notes: string;
}

export interface BorderScreening {
  id: string;
  crossing: string;
  crossing_name?: string;
  traveler: string;
  traveler_name?: string;
  passport_number?: string;
  shared_screening: string | null;
  body_temperature: number | null;
  oxygen_saturation: number | null;
  observed_symptoms: string;
  risk_level: RiskLevel;
  document_verified: boolean;
  vaccination_verified: boolean;
  screening_certificate: string;
  decision: 'CLEARED' | 'HOLD' | 'REFERRED' | 'QUARANTINED';
  screened_by: string | null;
  screened_by_name?: string;
  screened_at: string;
  notes: string;
}

// — المركبات —

export type VehicleType =
  | 'BUS' | 'TRUCK' | 'CAR' | 'PICKUP' | 'TRACTOR' | 'MOTORCYCLE' | 'OTHER';
export type VehicleStatus = 'AWAITING' | 'INSPECTED' | 'CLEARED' | 'HELD' | 'REJECTED';
export type InspectionType =
  | 'EXTERIOR' | 'CARGO_HOLD' | 'TEMPERATURE' | 'DISINFECTION'
  | 'PEST_CONTROL' | 'WASTE' | 'CABIN';
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
export type OverallInspection = 'PASSED' | 'CONDITIONAL' | 'FAILED';

export interface Vehicle {
  id: string;
  crossing: string;
  crossing_name?: string;
  plate_number: string;
  chassis_number: string;
  vehicle_type: VehicleType;
  make_model: string;
  year_of_manufacture: number | null;
  capacity: number | null;
  owner_name: string;
  driver_name: string;
  driver_phone: string;
  status: VehicleStatus;
  notes: string;
}

export interface VehicleInspection {
  id: string;
  vehicle: string;
  plate_number?: string;
  inspection_type: InspectionType;
  inspection_date: string;
  inspector: string | null;
  inspector_name?: string;
  cleanliness_status: ComplianceStatus;
  pest_control_status: ComplianceStatus;
  waste_status: ComplianceStatus;
  cooling_status: ComplianceStatus;
  findings: string;
  overall_status: OverallInspection;
  reinspection_required: boolean;
}

// — الشحنات —

export type CargoScope = 'CARGO' | 'FOOD' | 'WAREHOUSE' | 'WATER_SANITATION';
export type CargoStatus =
  | 'PENDING' | 'INSPECTING' | 'SAMPLES_SENT' | 'AWAITING_DECISION'
  | 'RELEASED' | 'REJECTED' | 'HOLD';
export type CargoOutcome = 'CLEARED' | 'CONDITIONAL' | 'REJECTED' | 'HOLD';
export type SampleStatus =
  | 'COLLECTED' | 'SENT' | 'UNDER_TEST' | 'RESULT_RECEIVED' | 'REJECTED';

export interface CargoInspection {
  id: string;
  crossing: string;
  crossing_name?: string;
  scope: CargoScope;
  food_shipment: string | null;
  facility: string | null;
  declaration_number: string;
  product_type: string;
  country_of_origin: string;
  vehicle: string | null;
  plate_number?: string;
  samples_collected: boolean;
  laboratory_result: string;
  status: CargoStatus;
  decision: CargoOutcome | '';
  decided_by: string | null;
  decided_at: string | null;
  notes: string;
}

export interface BorderSample {
  id: string;
  crossing: string;
  crossing_name?: string;
  lab_sample: string | null;
  cargo_inspection: string | null;
  vehicle: string | null;
  sample_code: string;
  sample_type: string;
  collected_by: string | null;
  collected_by_name?: string;
  collected_at: string;
  status: SampleStatus;
  result: string;
  notes: string;
}

// — الحجر والعزل —

export type QuarantineStatus =
  | 'ADMITTED' | 'UNDER_QUARANTINE' | 'REFERRED' | 'RELEASED' | 'ESCALATED';
export type QuarantinePhase =
  | 'SCREENED' | 'ASSESSED' | 'QUARANTINED' | 'UNDER_TREATMENT'
  | 'RECOVERED' | 'RELEASED' | 'REFERRED_OUT';
export type IsolationStatus = 'ACTIVE' | 'RELEASED' | 'REMOVED';
export type ContactTracingStatus =
  | 'OPEN' | 'FOLLOW_UP' | 'COMPLETED' | 'CLOSED';
export type ContactStatus =
  | 'PENDING' | 'SYMPTOMATIC' | 'ISOLATED' | 'CLEARED' | 'LOST_TO_FOLLOW_UP';

export interface QuarantineCase {
  id: string;
  case_number: string;
  crossing: string;
  crossing_name?: string;
  traveler: string | null;
  person_name?: string;
  health_case: string | null;
  disease: string | null;
  clinic: string | null;
  facility: string | null;
  entry_at: string;
  required_days: number;
  expected_end_date: string | null;
  actual_end_date: string | null;
  phase: QuarantinePhase;
  status: QuarantineStatus;
  follow_up_notes: string;
}

export interface IsolationCase {
  id: string;
  crossing: string;
  crossing_name?: string;
  quarantine_case: string | null;
  clinic_isolation: string | null;
  facility: string | null;
  start_date: string;
  expected_end_date: string | null;
  end_date: string | null;
  status: IsolationStatus;
  started_by: string | null;
  started_by_name?: string;
  closed_by: string | null;
  notes: string;
}

export interface ContactTracingCase {
  id: string;
  case: string | null;
  crossing: string;
  crossing_name?: string;
  index_case_name: string;
  transport_mode: string;
  vehicle: string | null;
  shared_contact_trace: string | null;
  follow_up_days: number;
  started_at: string;
  status: ContactTracingStatus;
  notes: string;
}

export interface Contact {
  id: string;
  tracing_case: string;
  full_name: string;
  passport_number: string;
  phone: string;
  seat_or_relation: string;
  status: ContactStatus;
  follow_up_day: number | null;
  notes: string;
}

// — الطوارئ والحوادث —

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus =
  | 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
export type EmergencyStatus =
  | 'OPEN' | 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'CLOSED';
export type RestrictionLevel = 'ADVISORY' | 'PARTIAL' | 'FULL' | 'BORDER_CLOSURE';

export interface BorderHealthIncident {
  id: string;
  crossing: string;
  crossing_name?: string;
  quarantine_case: string | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reported_at: string;
  closed_at: string | null;
  reported_by: string | null;
  notes: string;
}

export interface BorderEmergency {
  id: string;
  crossing: string;
  crossing_name?: string;
  shared_event: string | null;
  disease: string | null;
  title: string;
  description: string;
  restriction_level: RestrictionLevel;
  status: EmergencyStatus;
  reported_at: string;
  resolved_at: string | null;
  reported_by: string | null;
  notes: string;
}

// — الشهادات والقرارات والإشعارات والإحصاءات —

export type CertificateType =
  | 'HEALTH_CLEARANCE' | 'INSPECTION' | 'PASSAGE_PERMIT'
  | 'QUARANTINE_RELEASE' | 'REJECTION';
export type CertificateStatus =
  | 'DRAFT' | 'ISSUED' | 'EXPIRED' | 'REVOKED' | 'CANCELLED';
export type DecisionOutcome =
  | 'CLEARED' | 'CONDITIONAL' | 'HOLD' | 'REFERRED' | 'REJECTED' | 'ENFORCEMENT';
export type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH' | 'RADIO';
export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface BorderCertificate {
  id: string;
  certificate_number: string;
  certificate_type: CertificateType;
  crossing: string;
  crossing_name?: string;
  traveler: string | null;
  vehicle: string | null;
  vehicle_inspection: string | null;
  issue_date: string;
  expiry_date: string | null;
  status: CertificateStatus;
  qr_payload: string;
  issued_by: string | null;
  issued_by_name?: string;
  notes: string;
}

export interface BorderCertificateInput {
  crossing: string;
  certificate_type: CertificateType;
  traveler?: string;
  vehicle?: string;
  vehicle_inspection?: string;
  expiry_days?: number;
  notes?: string;
}

export interface BorderDecision {
  id: string;
  crossing: string;
  crossing_name?: string;
  subject_type: string;
  traveler: string | null;
  vehicle: string | null;
  cargo_inspection: string | null;
  quarantine_case: string | null;
  outcome: DecisionOutcome;
  reason: string;
  decided_by: string | null;
  decided_by_name?: string;
  decided_at: string;
}

export interface BorderNotification {
  id: string;
  crossing: string;
  crossing_name?: string;
  recipient_role: string;
  recipient_contact: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  sent_at: string | null;
  sent_by: string | null;
}

export interface BorderDailyStatistics {
  id: string;
  crossing: string;
  crossing_name?: string;
  stat_date: string;
  travelers_inbound: number;
  travelers_outbound: number;
  vehicles_inspected: number;
  cargo_inspections: number;
  quarantine_cases: number;
  isolation_cases: number;
  suspected_cases: number;
  certificates_issued: number;
  samples_collected: number;
  average_processing_minutes: number | null;
}

// — لوحة القيادة —

export interface BordersHealthOverview {
  crossings: number;
  open_crossings: number;
  restricted_crossings: number;
  closed_crossings: number;
  travelers_today: number;
  vehicles_inspected: number;
  cargo_inspections: number;
  active_quarantine: number;
  active_isolation: number;
  suspected_cases: number;
  open_emergencies: number;
  certificates_issued: number;
  samples_collected: number;
}

export interface CrossingPerformanceRow {
  id: string;
  entry_point__code: string;
  entry_point__name_ar: string;
  operating_status: CrossingOperatingStatus;
  neighbor_country: string;
  records_count: number;
  vehicle_inspections_count: number;
  cargo_count: number;
  quarantine_count: number;
}

export interface TrafficTrendRow {
  stat_date: string;
  inbound: number | null;
  outbound: number | null;
  vehicles: number | null;
  cargo: number | null;
  samples: number | null;
}

export interface ListResponse<T> {
  results: T[];
  count: number;
}
