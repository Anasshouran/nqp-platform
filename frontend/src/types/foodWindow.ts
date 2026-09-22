export interface ServiceWindow {
  id: string;
  code: string;
  name_ar: string;
  station: string;
  station_name: string | null;
  station_kind: string | null;
  window_type: string;
  is_active: boolean;
  order: number;
  commodities: WindowCommodity[];
}

export interface WindowCommodity {
  id: string;
  window: string;
  code: string;
  name_ar: string;
  name_en: string;
  order: number;
  is_active: boolean;
}

export interface ShipmentTransaction {
  id: string;
  shipment: string;
  shipment_manifest: string | null;
  window: string;
  window_name: string | null;
  commodity: string | null;
  clerk: string | null;
  clerk_name: string | null;
  status: string;
  assigned_at: string;
  closed_at: string | null;
  commodity_lines: TransactionCommodity[];
}

export interface TransactionCommodity {
  id: string;
  transaction: string;
  commodity: string;
  commodity_name: string | null;
  quantity: number;
  unit: string;
  decision: string;
  decided_at: string | null;
}

export interface CommodityDecision {
  id: string;
  line: string;
  decision: string;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string;
  reason: string;
}

export interface WindowAssignment {
  id: string;
  user: string;
  user_name: string | null;
  window: string;
  window_name: string | null;
  commodities: string[];
  is_active: boolean;
  assigned_at: string;
}

export interface WindowDashboardItem {
  id: string;
  code: string;
  name_ar: string;
  station: string;
  station_name: string;
  window_type: string;
  open_transactions: number;
  closed_today: number;
  approved: number;
  rejected: number;
  total_decisions: number;
}

export interface WindowScopeItem {
  window_id: string;
  window_name: string;
  window_code: string;
  station: string;
  commodities: Array<{ id: string; name_ar: string }>;
}
