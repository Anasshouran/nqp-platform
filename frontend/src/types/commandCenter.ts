export type OpsStatus = 'NORMAL' | 'WATCH' | 'CRITICAL' | 'OFFLINE';

export type PortType = 'AIRPORT' | 'SEAPORT' | 'LAND_PORT';

export interface SectorOps {
  id: string;
  name: string;
  region: string;
  status: OpsStatus;
  ports: number;
  stations: number;
  passengers: number;
  screenings: number;
  suspected: number;
  referred: number;
  quarantine: number;
  readiness: number;
  mapX: number;
  mapY: number;
  trend: string;
}

export interface PortCard {
  id: string;
  name: string;
  type: PortType;
  sector: string;
  online: boolean;
  passengers: number;
  flights: number;
  screenings: number;
  suspected: number;
  referred: number;
  completion: number;
  status: Exclude<OpsStatus, 'OFFLINE'>;
}

export interface ScreeningStats {
  total_screened: number;
  arrivals: number;
  departures: number;
  transit: number;
  total_flights: number;
  healthy: number;
  suspected: number;
  referred: number;
  quarantine: number;
  isolation: number;
  certificates: number;
  violations: number;
  avg_check_minutes: number;
  digital_completion_pct: number;
  initial_check: number;
  temp_measured: number;
  clinical_exam: number;
  symptoms_recorded: number;
  daily_curve: Array<{ date: string; screened: number; suspected: number }>;
  outcome_dist: { healthy: number; suspected: number; referred: number };
}

export interface NameCount {
  name: string;
  count: number;
  pct: number;
}

export interface SurveillanceStats {
  top_symptoms: NameCount[];
  top_diseases: NameCount[];
  cases_by_port: Array<{ port: string; count: number }>;
  cases_by_sector: Array<{ sector: string; count: number }>;
  daily_trend: number[];
  weekly_trend: number[];
  monthly_trend: number[];
  epidemic_alerts: Array<{ id: string; title: string; severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'; time: string; port: string }>;
  follow_up: number;
  early_warning_index: number;
}

export interface CriticalCase {
  id: string;
  number: string;
  port: string;
  case_type: string;
  severity: 'CRITICAL' | 'HIGH';
  registered_at: string;
  action: string;
  referred_to: string;
  follow_up: 'OPEN' | 'IN_PROGRESS' | 'ESCALATED';
}

export interface ScoreItem {
  name: string;
  score: number;
}

export interface OpPerformance {
  ports_readiness: number;
  screening_completion: number;
  avg_service_minutes: number;
  e_transactions_pct: number;
  compliance: number;
  response_rate: number;
  sector_scores: ScoreItem[];
  station_scores: ScoreItem[];
  staff_performance: Array<{ name: string; role: string; score: number }>;
}

export interface AiInsights {
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  prediction: string;
  anomalies: string[];
  daily_summary: string;
  recommendations: string[];
  forecast: Array<{ label: string; value: number }>;
}

export interface AlertItem {
  id: string;
  title: string;
  body: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  time: string;
}

export interface QuarantineStats {
  current_cases: number;
  new_cases: number;
  ended_cases: number;
  avg_duration_days: number;
  centers: number;
  capacity: number;
  occupancy_pct: number;
  transferred_to_isolation: number;
  need_follow_up: number;
}

export interface EmergencyAlert {
  id: string;
  port: string;
  title: string;
  case_type: string;
  cases_count: number;
  reported_at: string;
  severity: 'CRITICAL' | 'HIGH';
  action: string;
  responsible: string;
  response: 'PENDING' | 'IN_PROGRESS' | 'CONTROLLED';
}

export interface NationalCommandReport {
  window: string;
  last_updated: string;
  kpis: {
    sectors: number;
    stations: number;
    total_screened: number;
    food_shipments: number;
    samples: number;
    critical_cases: number;
    epidemic_alerts: number;
    pending_transactions: number;
  };
  sectors: SectorOps[];
  ports: PortCard[];
  screening: ScreeningStats;
  surveillance: SurveillanceStats;
  quarantine: QuarantineStats;
  emergency: EmergencyAlert | null;
  critical_cases: CriticalCase[];
  performance: OpPerformance;
  ai: AiInsights;
  alerts: AlertItem[];
}

export const statusMeta: Record<OpsStatus, { label: string; color: string; soft: string }> = {
  NORMAL: { label: 'طبيعي', color: '#1d7a54', soft: '#e7f5ed' },
  WATCH: { label: 'يحتاج متابعة', color: '#a86400', soft: '#fdf3e0' },
  CRITICAL: { label: 'حالة طوارئ', color: '#c63a3a', soft: '#fdeaea' },
  OFFLINE: { label: 'خارج الخدمة', color: '#94a3b8', soft: '#eef2f7' },
};
