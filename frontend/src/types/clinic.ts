export interface ClinicReferral {
  id: string;
  screening_id?: string;
  traveler?: string;
  traveler_name?: string;
  passport_number?: string;
  nationality_name?: string;
  date_of_birth?: string | null;
  port?: string;
  port_name?: string;
  clinic?: string;
  clinic_name?: string;
  source?: string;
  queue_no?: number | null;
  status: string;
  notes?: string;
  body_temperature?: number | null;
  observed_symptoms?: string[];
  officer_notes?: string;
  created_at: string;
}

export interface ClinicVisit {
  id: string;
  referral?: string | null;
  clinic?: string;
  clinic_name?: string;
  phase?: string;
  source?: string;
  traveler?: string;
  traveler_name?: string;
  passport_number?: string;
  doctor?: string;
  doctor_name?: string;
  visit_status: string;
  opened_at: string;
  closed_at?: string | null;
}

export interface ClinicDashboardStats {
  open_visits: number;
  closed_visits: number;
  pending_referrals: number;
  total_patients: number;
  completed_today: number;
}

export interface ClinicDashboard {
  stats: ClinicDashboardStats;
  open_visits: ClinicVisit[];
  pending_referrals: ClinicReferral[];
}

export interface ClinicMedication {
  id: string;
  name: string;
  generic_name?: string;
  unit?: string;
  interactions?: string[];
}

export interface ClinicEmr {
  id: string;
  clinical_notes: Record<string, unknown>;
  vital_signs: Record<string, unknown>;
  physical_exam: Record<string, unknown>;
}

export interface ClinicPrescription {
  id: string;
  visit: string;
  medication: string;
  medication_name: string;
  medication_unit?: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  created_at: string;
}

export interface ClinicLabRequest {
  id: string;
  visit: string;
  visit_traveler_name?: string;
  sample_type: string;
  disease?: string;
  disease_code?: string;
  disease_name?: string;
  priority: string;
  barcode: string;
  status: string;
}

export interface ClinicTriage {
  id: string;
  visit: string;
  severity: string;
  temperature?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  oxygen_saturation?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  symptoms?: string[];
  chief_complaint?: string;
  routing?: string;
  notes?: string;
  triaged_by_name?: string;
  triaged_at: string;
}

export interface ClinicVisitDetail extends ClinicVisit {
  emr?: ClinicEmr | null;
  prescriptions: ClinicPrescription[];
  lab_requests: ClinicLabRequest[];
  triages?: ClinicTriage[];
  allowed_transitions?: string[];
  isolation?: IsolationRecord | null;
  health_certificate?: HealthCertificate | null;
}

export interface LabResultSummary {
  id: string;
  sample: string;
  sample_barcode: string;
  sample_type?: string;
  disease?: string | null;
  disease_name?: string | null;
  result: string;
  value?: string;
  entered_by_name?: string;
  approved_by_name?: string;
  approval_status: string;
  result_date: string;
}

export interface IsolationRecord {
  id: string;
  visit: string;
  isolation_type: string;
  status: string;
  health_status: string;
  severity: string;
  required_days: number;
  start_date: string;
  expected_end_date?: string | null;
  end_date?: string | null;
  notes?: string;
  discharge_summary?: string;
  started_by_name?: string;
  closed_by_name?: string;
  started_at: string;
  closed_at?: string | null;
}

export interface IsolationRow extends IsolationRecord {
  traveler_name?: string;
  passport_number?: string;
  clinic_name?: string;
  port_name?: string;
}

export interface HealthCertificate {
  id: string;
  visit: string;
  certificate_number: string;
  certificate_type: string;
  verdict: string;
  decision?: string;
  status: string;
  issued_by_name?: string;
  issued_at: string;
  valid_until?: string | null;
  qr_token: string;
  verification_path?: string;
  traveler_name?: string;
  passport_number?: string;
  clinic_name?: string;
}

export interface CertificateVerifyResult {
  certificate_number: string;
  certificate_type: string;
  verdict: string;
  decision?: string;
  status: string;
  issued_at: string;
  clinic_name?: string;
  traveler_name?: string;
  verified: boolean;
}

export interface ClinicReportStats {
  total_visits: number;
  open_visits: number;
  closed_visits: number;
  isolated: number;
  certificates: number;
  patients: number;
  completed_today: number;
  by_phase: Record<string, number>;
}

export interface ClinicReport {
  clinic: Clinic;
  stats: ClinicReportStats;
}

export interface ClinicType {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  kind?: string;
  services?: string[];
  order?: number;
  is_active?: boolean;
}

export interface ClinicStaffMember {
  id: string;
  clinic: string;
  user: string;
  user_name: string;
  role: string;
  is_active: boolean;
}

export interface Clinic {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  entry_point?: string;
  entry_point_name?: string;
  sector?: string;
  sector_name?: string;
  clinic_type?: string;
  clinic_type_code?: string;
  clinic_type_name?: string;
  location?: string;
  phone?: string;
  email?: string;
  services?: string[];
  order?: number;
  is_active?: boolean;
  staff?: ClinicStaffMember[];
}

export interface ClinicPatient {
  id: string;
  passport_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth?: string;
  nationality?: string;
  nationality_name?: string;
  phone?: string;
  email?: string;
  medical_file_no?: string;
  qr_token?: string;
  medical_history?: Record<string, unknown>;
}

export interface WalkInRegisterResponse {
  created: boolean;
  traveler: ClinicPatient;
  referral: ClinicReferral;
}

export type ClinicDispositionDecision = 'RELEASE' | 'FOLLOW_UP' | 'HOSPITAL';

export interface ClinicDisposition {
  decision: string;
  summary: string;
  closed_by?: string;
  closed_at?: string;
}
