import apiClient from '../client';
import type { ApiResponse } from '../../types/api';
import type { DashboardWindow } from './reports';

export type FssRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FssWindow {
  key: DashboardWindow;
  start: string | null;
  today: string;
}

export interface FssKpis {
  shipments: number;
  samples: number;
  nonconforming: number;
  alerts: number;
  recalls_active: number;
  non_conformities_open: number;
  imports: number;
  exports: number;
  rejected: number;
  released: number;
}

export interface FssRiskItem {
  name: string;
  count: number;
  rejected: number;
  score: number;
}

export interface FssAlert {
  id: string;
  alert_number: string;
  title: string;
  reason: string;
  risk_level: FssRiskLevel;
  product: string;
  origin_country: string;
  supplier: string;
  description: string;
  recommended_action: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ACTIONED' | 'CLOSED';
  raised_at: string;
}

export interface FssNonConformity {
  id: string;
  nc_number: string;
  source: string;
  product: string;
  origin_country: string;
  supplier: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'CORRECTIVE_ACTION' | 'RESOLVED' | 'CLOSED';
  risk_level: FssRiskLevel;
  description: string;
  reported_at: string;
}

export interface FssRecall {
  id: string;
  recall_number: string;
  product: string;
  origin_country: string;
  recall_type: string;
  status: string;
  risk_level: FssRiskLevel;
  decided_at: string;
}

export interface FssDashboard {
  window: FssWindow;
  kpis: FssKpis;
  risk: {
    countries: FssRiskItem[];
    suppliers: FssRiskItem[];
    products: FssRiskItem[];
  };
  trend: Array<{ date: string; count: number }>;
  lab_top: Array<{ code: string; name: string; count: number }>;
  nc_distribution: {
    open: number;
    under_investigation: number;
    corrective_action: number;
    resolved: number;
    closed: number;
  };
  alerts: FssAlert[];
  non_conformities: FssNonConformity[];
  recalls: FssRecall[];
  response_level: 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
}

export const getFoodSurveillanceDashboard = (window?: DashboardWindow) =>
  apiClient.get<ApiResponse<FssDashboard>>('/food-surveillance/dashboard/', { params: { window } });

export const getFssAlerts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<{ results: FssAlert[] }>>('/food-surveillance/alerts/', { params });

export const getFssNonConformities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<{ results: FssNonConformity[] }>>('/food-surveillance/non-conformities/', { params });

export const getFssRecalls = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<{ results: FssRecall[] }>>('/food-surveillance/recalls/', { params });