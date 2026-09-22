export interface AirportPort {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
  country: string;
  is_active: boolean;
}

export interface AirportTerminal {
  id: string;
  port: string;
  port_name?: string;
  terminal_code: string;
  name_ar: string;
  name_en: string;
  capacity?: number | null;
  is_active: boolean;
}

export interface ScreeningPoint {
  id: string;
  terminal: string;
  terminal_name?: string;
  point_code: string;
  point_type: string;
  is_active: boolean;
}

export interface AirportScreening {
  id: string;
  traveler: string;
  traveler_name?: string;
  screening_point: string;
  point_name?: string;
  flight?: string | null;
  flight_number?: string | null;
  screening_type: string;
  body_temperature?: number | null;
  oxygen_saturation?: number | null;
  symptoms?: string[];
  risk_level: string;
  status: string;
  screened_by_name?: string;
  screened_at: string;
}

export interface AircraftInspection {
  id: string;
  aircraft_registration: string;
  flight: string;
  flight_number?: string;
  inspection_date: string;
  inspector_name?: string;
  cleanliness_status: string;
  water_quality_status: string;
  toilets_status: string;
  medical_waste_status: string;
  pest_control_status: string;
  rodent_control_status: string;
  food_safety_status: string;
  findings?: string;
  overall_status: string;
  certificate_issued: boolean;
}

export interface CrewHealthRecord {
  id: string;
  crew: string;
  crew_name?: string;
  flight: string;
  flight_number?: string;
  health_status: string;
  temperature?: number | null;
  symptoms?: string[];
  medical_clearance_date?: string | null;
  next_clearance_date?: string | null;
  notes?: string;
}

export interface AirportKpis {
  flights_today: number;
  passengers_today: number;
  pending_screenings: number;
  screened_today: number;
  clinic_referrals: number;
  suspected_cases: number;
  vaccinations: number;
  completed_today: number;
}

export interface UpcomingFlight {
  id: string;
  flight_number: string;
  origin_country: string;
  scheduled_arrival: string;
  status: string;
}

export interface SuspectedCase {
  kind: 'RED' | 'REFERRAL';
  traveler_name: string;
  flight_number: string | null;
  detail: string;
  at: string;
}

export interface DashboardTask {
  kind: string;
  title: string;
  priority: string;
}

export interface DashboardAlert {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  status: string;
}

export interface AirportDashboardReport {
  flights: number;
  travelers: number;
  screened: number;
  referrals: number;
  suspected: number;
  screenings_by_flight: Array<{ flight_number: string; count: number }>;
}

export interface AirportDashboard {
  kpis: AirportKpis;
  upcoming_flights: UpcomingFlight[];
  suspected: SuspectedCase[];
  tasks: DashboardTask[];
  alerts: DashboardAlert[];
  report: AirportDashboardReport;
}

