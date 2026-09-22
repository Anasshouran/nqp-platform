export type ItSystemStatus = 'ONLINE' | 'WARNING' | 'OFFLINE';

export interface NationalItSystem {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  status: ItSystemStatus;
  request_count: number;
  last_checked_at: string | null;
  last_error: string;
  sector: string;
}

export type IntegrationStatus = 'CONNECTED' | 'WARNING' | 'ERROR';

export interface GovernmentIntegration {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  status: IntegrationStatus;
  last_sync_at: string | null;
  error_count: number;
  notes: string;
  order: number;
  is_active: boolean;
}

export type SectorConnectivity = 'STABLE' | 'PARTIAL' | 'DISRUPTION';

export interface SectorItPerformance {
  id: string;
  code: string;
  name_ar: string;
  total_systems: number;
  active_systems: number;
  warning_systems: number;
  offline_systems: number;
  connected_ports: number;
  open_tickets: number;
  critical_tickets: number;
  connectivity: SectorConnectivity;
}

export interface NationalTicket {
  id: string;
  ticket_no: string;
  subject: string;
  priority: string;
  status: string;
}

export interface NationalItDashboard {
  sectors: SectorItPerformance[];
  systems: NationalItSystem[];
  integrations: GovernmentIntegration[];
  active_systems: number;
  warning_systems: number;
  offline_systems: number;
  connected_ports: number;
  asset_count: number;
  open_tickets: number;
  critical_tickets: number;
  recent_tickets: NationalTicket[];
}
