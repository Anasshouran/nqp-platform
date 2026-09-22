import apiClient from '../client';
import type { ApiResponse } from '../../types/api';

export type DashboardWindow = 'day' | 'week' | 'month' | 'year' | 'all';

export type SectorStatus = 'CRITICAL' | 'WATCH' | 'STABLE';

export interface SectorRow {
  id: string;
  name: string;
  stations: number;
  screens: number;
  suspected: number;
  readiness: number;
  status: SectorStatus;
}

export interface TopProduct {
  name: string;
  count: number;
}

export interface FinalDecisionBucket {
  final_decision: string;
  total: number;
}

export interface RevenueShare {
  name: string;
  amount: number;
  pct: number;
}

export interface ExecutiveDashboard {
  window: { key: DashboardWindow; start: string | null; today: string };
  kpis: {
    sectors: number;
    passengers: number;
    imports: number;
    exports: number;
    samples: number;
    certificates: number;
    revenue: number;
    suspected: number;
    confirmed: number;
    ports: { total: number; airports: number; seaports: number; land_ports: number };
    screenings: { total: number; pending: number; completed: number };
  };
  sectors: SectorRow[];
  ranking: SectorRow[];
  food: {
    imports: number;
    exports: number;
    released: number;
    rejected: number;
    in_progress: number;
    samples: number;
    noncomplying: number;
    top_products: TopProduct[];
    final_decisions: FinalDecisionBucket[];
  };
  labs: {
    received: number;
    processing: number;
    completed: number;
    pending_results: number;
    avg_turnover_days: number;
  };
  surveillance: {
    suspected: number;
    confirmed: number;
    active_alerts: number;
    risk_level: string;
  };
  vectors: {
    reports: number;
    active_campaigns: number;
    high_risk_sites: number;
    completed_sprays: number;
    note?: string;
  };
  airports: {
    count: number;
    flights_today: number;
    screenings: number;
    referrals: number;
    suspected: number;
  };
  seaports: {
    ships: number;
    inspected: number;
    declarations: number;
    free_pratique: number;
  };
  land_borders: { ports: number; screenings: number; suspected: number };
  revenue: { total: number; shares: RevenueShare[] };
  alerts: Array<{ id: string; severity: string; title: string; body: string; time: string; recipient?: string }>;
}

export const getExecutiveDashboard = (window?: DashboardWindow) =>
  apiClient.get<ApiResponse<ExecutiveDashboard>>('/reports/executive-dashboard/', { params: { window } });

export interface SectorStation {
  id: string;
  name: string;
  code: string;
  type: 'AIRPORT' | 'SEAPORT' | 'LAND_PORT';
  screens: number;
  suspected: number;
  readiness: number;
  status: SectorStatus;
}

export interface SectorDashboard {
  sector: {
    id: string;
    name_ar: string;
    name_en: string;
    code: string;
    region: string;
  } | null;
  window: { key: DashboardWindow; start: string | null; today: string };
  kpis: {
    stations: number;
    staff: number;
    ports: number;
    imports: number;
    exports: number;
    shipments: number;
    samples: number;
    passengers: number;
    certificates: number;
    revenue: number;
    suspected: number;
    confirmed: number;
    alerts: number;
  };
  stations: SectorStation[];
  food: {
    imports: number;
    exports: number;
    released: number;
    rejected: number;
    in_progress: number;
    samples: number;
    noncomplying: number;
    top_products: TopProduct[];
    decisions: FinalDecisionBucket[];
  };
  lab: {
    received: number;
    processing: number;
    completed: number;
    pending_results: number;
    noncomplying: number;
    avg_turnover_days: number;
  };
  airports: {
    count: number;
    flights_today: number;
    screenings: number;
    passengers: number;
    referrals: number;
    suspected: number;
  };
  seaports: {
    ships: number;
    inspected: number;
    declarations: number;
    free_pratique: number;
    suspected: number;
  };
  land_borders: { ports: number; screenings: number; suspected: number };
  vectors: {
    reports: number;
    active_campaigns: number;
    high_risk_sites: number;
    completed_sprays: number;
    note?: string;
  };
  surveillance: {
    suspected: number;
    confirmed: number;
    active_alerts: number;
    risk_level: string;
  };
  revenue: { total: number; shares: RevenueShare[] };
  alerts: Array<{ id: string; severity: string; title: string; body: string; time: string; recipient?: string }>;
  departments: Array<{ id: string; name: string; staff: number; score: number }>;
  staff: Array<{ id: string; name: string; sector: string; department: string; station: string }>;
  performance: Array<{ key: string; label: string; value: number }>;
}

export const getSectorDashboard = (params?: { window?: DashboardWindow; sector_id?: string }) =>
  apiClient.get<ApiResponse<SectorDashboard>>('/reports/sector-dashboard/', { params });

export type EventSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type EventStatus =
  | 'IDENTIFIED'
  | 'VERIFIED'
  | 'RESPONDING'
  | 'CONTROLLED'
  | 'CLOSED'
  | 'REJECTED';

export interface EpidemicEvent {
  id: string;
  number: string;
  title: string;
  severity: EventSeverity;
  status: EventStatus;
  location: string;
  source: string;
  reported_at: string;
  team_count: number;
  affected_count: number;
}

export interface EpidemicTeam {
  id: string;
  team_name: string;
  member: string;
  role: string;
  event_number: string;
  event_title: string;
  event_status: string;
}

export interface EpidemicAlert {
  id: string;
  type: 'RED_ALERT' | 'OUTBREAK';
  status: 'NEW' | 'PROCESSING' | 'RESOLVED';
  description: string;
  port: string;
  triggered_at: string;
}

export interface EpidemicDashboard {
  window: { key: DashboardWindow; start: string | null; today: string };
  kpis: {
    active_events: number;
    alerts: number;
    under_monitoring: number;
    suspected: number;
    confirmed: number;
    samples: number;
    positive: number;
    teams: number;
    affected_locations: number;
  };
  events: EpidemicEvent[];
  teams: EpidemicTeam[];
  alerts: EpidemicAlert[];
  lab: {
    samples: number;
    registered: number;
    processing: number;
    completed: number;
    pending: number;
    positive: number;
    negative: number;
    inconclusive: number;
  };
  case_curve: Array<{ date: string; count: number }>;
  response_level: 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  investigations: {
    identified: number;
    verified: number;
    responding: number;
    controlled: number;
    closed: number;
    open: number;
  };
  severity_totals: Record<string, number>;
  status_totals: Record<string, number>;
  response_plan: { name: string; description: string; active: boolean };
}

export const getEpidemicDashboard = (window?: DashboardWindow) =>
  apiClient.get<ApiResponse<EpidemicDashboard>>('/reports/epidemic-dashboard/', { params: { window } });