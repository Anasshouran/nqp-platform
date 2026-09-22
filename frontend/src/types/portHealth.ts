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
}

export interface Berth {
  id: string;
  port: string;
  port_name?: string;
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
  shipping_company: string;
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
  status: string;
  notes: string;
}

export interface ShipInspection {
  id: string;
  vessel: string;
  vessel_name?: string;
  visit?: string | null;
  inspection_date: string;
  inspector_name?: string;
  accommodation_status: string;
  kitchen_status: string;
  storeroom_status: string;
  clinic_status: string;
  water_tank_status: string;
  toilet_status: string;
  ventilation_status: string;
  cleanliness_status: string;
  findings: string;
  overall_status: string;
  certificate_issued: boolean;
}

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
