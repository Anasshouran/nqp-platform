export interface Vaccine {
  id: string;
  code: string;
  who_code?: string;
  name_ar: string;
  name_en?: string;
  route: 'ORAL' | 'INJECTION' | 'INTRANASAL' | 'OTHER' | string;
  series: number;
  booster_required: boolean;
  interval_days?: number | null;
  validity_days?: number | null;
  required: boolean;
  description?: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

export interface VaccineBatch {
  id: string;
  vaccine: string;
  vaccine_name_ar: string;
  lot_number: string;
  manufacturer?: string;
  manufacture_date?: string | null;
  expiry_date: string;
  received_quantity: number;
  available_quantity: number;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'RETURNED' | string;
  received_at: string;
  remaining_percent: number;
}

export interface VaccinationSite {
  id: string;
  name_ar: string;
  name_en?: string;
  kind: 'CLINIC' | 'PORT_POINT' | string;
  entry_point?: string | null;
  entry_point_name?: string;
  location?: string;
  address?: string;
  phone?: string;
  is_active: boolean;
}

export interface TravelerBrief {
  id: string;
  full_name: string;
  passport_number: string;
  date_of_birth?: string | null;
  nationality?: string | null;
  country_name?: string;
  medical_file_no?: string | null;
  qr_token?: string;
}

export interface VaccinationRecord {
  id: string;
  traveler: TravelerBrief;
  vaccine: string;
  vaccine_name_ar: string;
  vaccine_code: string;
  batch?: string | null;
  lot_number?: string;
  dose_type: 'FIRST' | 'SECOND' | 'THIRD' | 'BOOSTER' | string;
  dose_type_label?: string;
  dose_number: number;
  administered_at: string;
  site?: string | null;
  site_name?: string;
  vaccinator?: string | null;
  vaccinator_name?: string;
  recorded_by?: string | null;
  notes?: string;
  status: 'GIVEN' | 'CANCELLED' | string;
  created_at: string;
}

export interface VaccinationCertificate {
  id: string;
  traveler: TravelerBrief;
  record?: string | null;
  vaccine?: string | null;
  vaccine_name_ar?: string;
  vaccine_code?: string;
  certificate_number: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | string;
  status_label?: string;
  issued_by?: string | null;
  issued_by_name?: string;
  issued_at: string;
  valid_until: string;
  validity_days: number;
  qr_token: string;
  verification_path?: string;
}

export interface VaccinationRule {
  id: string;
  vaccine: string;
  vaccine_name_ar: string;
  title_ar: string;
  destination_region?: string;
  min_age_days?: number | null;
  max_age_days?: number | null;
  required: boolean;
  doses_required: number;
  validity_days?: number | null;
  note?: string;
}

export interface InventoryTransaction {
  id: string;
  batch: string;
  batch_number: string;
  vaccine_name_ar: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'EXPIRED' | string;
  type_label?: string;
  quantity: number;
  reference_record?: string | null;
  created_by?: string | null;
  created_by_name?: string;
  note?: string;
  created_at: string;
}

export interface CertificateVerification {
  id: string;
  certificate: string;
  verified_by?: string | null;
  verified_by_name?: string;
  success: boolean;
  ip_address?: string | null;
  note?: string;
  created_at: string;
}

export interface AssessmentItem {
  vaccine_id: string;
  vaccine_code: string;
  vaccine_name_ar: string;
  required: boolean;
  doses_required: number;
  doses_given: number;
  missing: number;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING' | string;
  validity_days?: number | null;
  note?: string;
}

export interface SummaryRecord {
  id: string;
  vaccine_code: string;
  vaccine_name_ar: string;
  dose_number: number;
  dose_type?: string;
  administered_at: string;
  lot_number?: string;
  site_name?: string;
  vaccinator_name?: string;
  notes?: string;
}

export interface SummaryCertificate {
  id: string;
  certificate_number: string;
  vaccine_name_ar: string;
  valid_until: string;
  verification_path?: string;
}

export interface TravelerSummary {
  records: SummaryRecord[];
  certificates: SummaryCertificate[];
}

export interface TravelerLookupResult {
  traveler: TravelerBrief | null;
  summary?: TravelerSummary;
  assessment?: AssessmentItem[];
  message?: string;
}

export interface VaccinationDashboard {
  doses_today: number;
  doses_this_week: number;
  total_records: number;
  active_certificates: number;
  batches_count: number;
  expiring_soon_batches: {
    id: string;
    lot_number: string;
    vaccine_name_ar: string;
    expiry_date: string;
    available_quantity: number;
  }[];
  by_vaccine: { label: string; value: number }[];
  recent_records: {
    id: string;
    traveler_name: string;
    passport_number: string;
    vaccine_code: string;
    dose_number: number;
    administered_at: string;
    lot_number: string;
  }[];
}