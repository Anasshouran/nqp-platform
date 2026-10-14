import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  ClearanceDecisionType,
  PortClearanceDecision,
  PreArrivalNotification,
  VesselDepartureResult,
} from '../../types/shipping';

const BASE = '/shipping/pre-arrivals';

export const getPreArrivals = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<PreArrivalNotification>>>(`${BASE}/`, { params });

export const getPreArrival = (id: string) =>
  apiClient.get<ApiResponse<PreArrivalNotification>>(`${BASE}/${id}/`);

/** Files a new notification as DRAFT against a VesselVisit. */
export const createPreArrival = (vesselVisit: string, body?: { remarks?: string }) =>
  apiClient.post<ApiResponse<PreArrivalNotification>>(`${BASE}/`, {
    vessel_visit: vesselVisit,
    ...body,
  });

export const submitPreArrival = (id: string) =>
  apiClient.post<ApiResponse<PreArrivalNotification>>(`${BASE}/${id}/submit/`);

export const reviewPreArrival = (id: string, notes?: string) =>
  apiClient.post<ApiResponse<PreArrivalNotification>>(`${BASE}/${id}/review/`, { notes });

export const acceptPreArrival = (id: string, notes?: string) =>
  apiClient.post<ApiResponse<PreArrivalNotification>>(`${BASE}/${id}/accept/`, { notes });

export const rejectPreArrival = (id: string, notes?: string) =>
  apiClient.post<ApiResponse<PreArrivalNotification>>(`${BASE}/${id}/reject/`, { notes });

export const cancelPreArrival = (id: string, notes?: string) =>
  apiClient.post<ApiResponse<PreArrivalNotification>>(`${BASE}/${id}/cancel/`, { notes });

const CLEARANCE_BASE = '/shipping/clearance-decisions';

/** Read-only: a clearance decision is recorded by port health, never patched. */
export const getClearanceDecisions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<PortClearanceDecision>>>(`${CLEARANCE_BASE}/`, { params });

export const getClearanceDecision = (id: string) =>
  apiClient.get<ApiResponse<PortClearanceDecision>>(`${CLEARANCE_BASE}/${id}/`);

/** Decision history for one port call, newest first. */
export const getVisitClearanceDecisions = (vesselVisitId: string) =>
  apiClient.get<ApiResponse<PaginatedResponse<PortClearanceDecision>>>(
    `/shipping/vessel-visits/${vesselVisitId}/clearance-decision/`,
  );

/**
 * Records a clearance decision. Port-health only; `REFUSED` requires a reason
 * and `CONDITIONAL` requires conditions.
 */
export const recordClearanceDecision = (
  vesselVisitId: string,
  body: { decision: ClearanceDecisionType; reason?: string; conditions?: string },
) =>
  apiClient.post<ApiResponse<PortClearanceDecision>>(
    `/shipping/vessel-visits/${vesselVisitId}/clearance-decision/`,
    body,
  );

/**
 * Records the vessel's departure (port authority only).
 *
 * There is deliberately no way to set `status`/`departure_date` directly: the
 * server validates the current clearance decision, safety blocks and port
 * scope, and stamps the departure time itself.
 */
export const departVessel = (vesselVisitId: string, notes?: string) =>
  apiClient.post<ApiResponse<VesselDepartureResult>>(
    `/shipping/vessel-visits/${vesselVisitId}/depart/`,
    { notes },
  );

/* -------------------------------------------------------------------------- */
/* Agents — الوكلاء الملاحيون                                                 */
/* -------------------------------------------------------------------------- */

export type ShippingAgentType =
  | 'PORT_AGENT'
  | 'SHIP_AGENT'
  | 'CARGO_AGENT'
  | 'MANNING_AGENT'
  | 'PROTECTING_AGENT';

export type ShippingAgentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED';

export interface ShippingAgent {
  id: string;
  company: string;
  company_id: string;
  company_name: string;
  name: string;
  name_en: string;
  agent_type: ShippingAgentType;
  license_number: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  status: ShippingAgentStatus;
  valid_from: string | null;
  valid_until: string | null;
  ports: string[];
  ports_count: number;
  user: string | null;
  user_email: string | null;
  is_active: boolean;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

const AGENTS_BASE = '/shipping/agents';

/** Paginated registry of shipping agents (`?search=`, `?status=`, `?agent_type=`, `?is_active=`). */
export const getAgents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ShippingAgent>>>(`${AGENTS_BASE}/`, { params });

export const getAgent = (id: string) =>
  apiClient.get<ApiResponse<ShippingAgent>>(`${AGENTS_BASE}/${id}/`);