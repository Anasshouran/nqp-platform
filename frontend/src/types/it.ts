export type ItSystemStatus = 'ONLINE' | 'WARNING' | 'OFFLINE';

export interface ItSystem {
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

export type ITAssetType =
  | 'COMPUTER'
  | 'LAPTOP'
  | 'PRINTER'
  | 'SCANNER'
  | 'NETWORK'
  | 'SERVER'
  | 'OTHER';
export type ITAssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'REPAIR' | 'INACTIVE';

export interface ITAsset {
  id: string;
  name: string;
  asset_type: ITAssetType;
  serial_number: string;
  entry_point: string | null;
  entry_point_name?: string | null;
  location: string;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  status: ITAssetStatus;
  notes: string;
  sector: string;
}

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  ticket_no: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  entry_point: string | null;
  entry_point_name?: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  resolved_at: string | null;
  sector: string;
}

export interface NetworkStatus {
  id: string;
  entry_point: string;
  entry_point_code: string;
  entry_point_name: string;
  connected: boolean;
  ping_ms: number;
  last_sync: string | null;
  sector: string;
}

export interface ItDashboard {
  active_systems: number;
  warning_systems: number;
  offline_systems: number;
  connected_ports: number;
  asset_count: number;
  open_tickets: number;
  critical_tickets: number;
  high_tickets: number;
  systems: ItSystem[];
  recent_tickets: SupportTicket[];
  networks: NetworkStatus[];
}

export interface ItReport {
  systems: ItSystem[];
  assets: ITAsset[];
  tickets: SupportTicket[];
  networks: NetworkStatus[];
}