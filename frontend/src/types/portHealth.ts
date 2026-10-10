export interface SeaPort {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  location: string;
  capacity?: number | null;
  authorities: string;
  description: string;
  is_active: boolean;
  entry_point_id?: string | null;
  entry_point_code?: string | null;
  entry_point_name_ar?: string | null;
  entry_point_name_en?: string | null;
}

export interface Berth {
  id: string;
  port: string;
  port_name?: string;
  port_entry_point_id?: string | null;
  port_entry_point_code?: string | null;
  code: string;
  name_ar: string;
  max_draft?: number | null;
  is_active: boolean;
}

export interface Vessel {
  id: string;
  vessel_name: string;
  imo_number: string;
  flag_state: string;
  /**
   * DEPRECATED: legacy free-text company identity. Use `company`/`company_name`
   * (ShippingCompany) for ownership. Retained until every consumer migrates.
   */
  shipping_company: string;
  /** ShippingCompany (carriers.Carrier) owning the vessel — current primary operator. */
  company?: string | null;
  company_name?: string | null;
  vessel_type: string;
  gross_tonnage?: number | null;
  last_port_of_call: string;
  arrival_date?: string | null;
  departure_date?: string | null;
  status: string;
  notes: string;
}

export interface VesselVisit {
  id: string;
  vessel: string;
  vessel_name?: string;
  vessel_imo?: string;
  port: string;
  port_name?: string;
  berth?: string | null;
  berth_code?: string | null;
  arrival_date: string;
  departure_date?: string | null;
  status: string;
}

export interface CrewMember {
  id: string;
  vessel: string;
  vessel_name?: string;
  full_name: string;
  nationality: string;
  passport_number: string;
  job_title: string;
  health_status: string;
  temperature?: number | null;
  symptoms?: string[];
  notes: string;
}

export interface Passenger {
  id: string;
  vessel: string;
  vessel_name?: string;
  full_name: string;
  nationality: string;
  passport_number: string;
  cabin_number: string;
  health_status: string;
  temperature?: number | null;
  symptoms?: string[];
  notes: string;
}

export type HealthDeclarationStatus = 'RECEIVED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

export interface HealthDeclaration {
  id: string;
  vessel: string;
  vessel_name?: string;
  visit?: string | null;
  captain_name: string;
  declaration_date: string;
  illness_on_board: boolean;
  deaths_on_board: number;
  reported_diseases: string;
  visited_ports: string;
  /** Server-owned (Phase 1D-6B): moves only via the lifecycle actions. */
  status: HealthDeclarationStatus;
  notes: string;
  /** Server-owned review metadata; never sent by the client. */
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  /** Set only by the reject action; retained permanently on a rejected record. */
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
}

/** Payload for creating a declaration: `status` is server-assigned (RECEIVED). */
export type HealthDeclarationCreate = Omit<
  HealthDeclaration,
  'id' | 'status' | 'reviewed_by' | 'reviewed_by_name' | 'reviewed_at' | 'rejection_reason' | 'created_at' | 'updated_at'
>;

export type ShipInspectionZoneStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
export type ShipInspectionOverallStatus = 'PASSED' | 'FAILED' | 'CONDITIONAL';

/** The eight zones the verdict is derived from (Phase 1D-6B, Rule 1/2/3/4). */
export const SHIP_INSPECTION_ZONE_FIELDS = [
  'accommodation_status',
  'kitchen_status',
  'storeroom_status',
  'clinic_status',
  'water_tank_status',
  'toilet_status',
  'ventilation_status',
  'cleanliness_status',
] as const;

export interface ShipInspection {
  id: string;
  vessel: string;
  vessel_name?: string;
  visit?: string | null;
  /** Server-owned. */
  inspection_date: string;
  inspector_name?: string;
  accommodation_status: ShipInspectionZoneStatus;
  kitchen_status: ShipInspectionZoneStatus;
  storeroom_status: ShipInspectionZoneStatus;
  clinic_status: ShipInspectionZoneStatus;
  water_tank_status: ShipInspectionZoneStatus;
  toilet_status: ShipInspectionZoneStatus;
  ventilation_status: ShipInspectionZoneStatus;
  cleanliness_status: ShipInspectionZoneStatus;
  findings: string;
  /**
   * Server-derived from the eight zones (Phase 1D-6B). Never submitted by the
   * client. `CONDITIONAL` remains a valid stored state but is not produced by
   * the current derivation.
   */
  overall_status: ShipInspectionOverallStatus;
  certificate_issued: boolean;
}

/**
 * Create payload for an inspection. `overall_status`, `inspection_date`,
 * `inspector` and `certificate_issued` are server-owned and must be omitted.
 */
export type ShipInspectionCreate = Pick<
  ShipInspection,
  'vessel' | 'findings' | (typeof SHIP_INSPECTION_ZONE_FIELDS)[number]
> & { visit?: string | null };

export interface FoodWaterInspection {
  id: string;
  vessel: string;
  vessel_name?: string;
  inspection_date: string;
  inspector_name?: string;
  food_safety_status: string;
  food_expiry_status: string;
  storage_temp_status: string;
  drinking_water_status: string;
  ice_status: string;
  samples_collected: number;
  sample_status: string;
  findings: string;
}

export interface SanitationCertificate {
  id: string;
  certificate_number: string;
  certificate_type: string;
  vessel: string;
  vessel_name?: string;
  inspection?: string | null;
  issue_date: string;
  expiry_date: string;
  status: string;
  qr_code: string;
}

export interface IsolationRecord {
  id: string;
  vessel: string;
  vessel_name?: string;
  person_name: string;
  person_type: string;
  start_date: string;
  end_date?: string | null;
  status: string;
  notes: string;
}

export interface SurveillanceCase {
  id: string;
  vessel: string;
  vessel_name?: string;
  disease_name: string;
  person_name: string;
  report_date: string;
  status: string;
  international_alert: boolean;
  notes: string;
}

export interface VectorControl {
  id: string;
  vessel: string;
  vessel_name?: string;
  control_type: string;
  inspection_date: string;
  evidence_found: boolean;
  treatment_applied: boolean;
  campaign_name: string;
  notes: string;
}

export interface CargoInspection {
  id: string;
  vessel: string;
  vessel_name?: string;
  declaration_number: string;
  cargo_type: string;
  country_of_origin: string;
  description: string;
  status: string;
  laboratory_result: string;
  decision: string;
}

export interface WasteInspection {
  id: string;
  vessel: string;
  vessel_name?: string;
  inspection_date: string;
  inspector_name?: string;
  medical_waste_status: string;
  food_waste_status: string;
  wastewater_status: string;
  safe_disposal_status: string;
  findings: string;
}

export interface PortEmergency {
  id: string;
  port: string;
  port_name?: string;
  port_entry_point_id?: string | null;
  port_entry_point_code?: string | null;
  vessel?: string | null;
  vessel_name?: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  vessel_restricted: boolean;
  reported_at: string;
}

export interface HealthCertificate {
  id: string;
  certificate_number: string;
  certificate_type: string;
  vessel: string;
  vessel_name?: string;
  inspection?: string | null;
  issue_date: string;
  expiry_date?: string | null;
  status: string;
  notes: string;
}

export interface PortHealthOverview {
  seaports: number;
  vessels: number;
  arrived_vessels: number;
  inspections: number;
  pending_certificates: number;
  suspected_cases: number;
  active_isolation: number;
  open_emergencies: number;
}
