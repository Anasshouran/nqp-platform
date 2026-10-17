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

/* -------------------------------------------------------------------------- */
/* Vessel relationships — علاقات الشركات بالسفن                               */
/* -------------------------------------------------------------------------- */

export type VesselCompanyRole = 'OWNER' | 'OPERATOR' | 'MANAGER' | 'CHARTERER';

export interface VesselRelationship {
  id: string;
  vessel: string;
  vessel_name: string;
  vessel_imo: string;
  company: string;
  company_name: string;
  company_id: string;
  role: VesselCompanyRole;
  valid_from: string | null;
  valid_until: string | null;
  is_primary: boolean;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const VESSEL_RELATIONSHIPS_BASE = '/shipping/vessel-relationships';

/** Paginated vessel↔company relationships (`?role=`, `?is_active=`, `?vessel=`, `?company=`). */
export const getVesselRelationships = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VesselRelationship>>>(`${VESSEL_RELATIONSHIPS_BASE}/`, { params });

export const getVesselRelationship = (id: string) =>
  apiClient.get<ApiResponse<VesselRelationship>>(`${VESSEL_RELATIONSHIPS_BASE}/${id}/`);

/* -------------------------------------------------------------------------- */
/* Vessel documents — مستندات السفن                                            */
/* -------------------------------------------------------------------------- */

export const VESSEL_DOCUMENT_TYPES = [
  'BILL_OF_LADING',
  'CARGO_MANIFEST',
  'CREW_LIST',
  'PASSENGER_LIST',
  'HEALTH_CERTIFICATE',
  'SANITATION_CERTIFICATE',
  'AGENT_AUTHORISATION',
  'OTHER',
] as const;
export type VesselDocumentType = typeof VESSEL_DOCUMENT_TYPES[number];

export const VESSEL_DOCUMENT_TYPE_LABELS: Record<VesselDocumentType, string> = {
  BILL_OF_LADING: 'بوليصة الشحن',
  CARGO_MANIFEST: 'بيان الحمولة',
  CREW_LIST: 'قائمة الطاقم',
  PASSENGER_LIST: 'قائمة المسافرين',
  HEALTH_CERTIFICATE: 'شهادة صحية',
  SANITATION_CERTIFICATE: 'شهادة تعقيم',
  AGENT_AUTHORISATION: 'تفويض الوكيل',
  OTHER: 'أخرى',
};

export interface VesselDocument {
  id: string;
  vessel_visit: string;
  vessel_name: string;
  vessel_imo: string;
  document_type: VesselDocumentType;
  document_type_label: string;
  title: string;
  file: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  uploaded_by_name: string;
  pre_arrival: string | null;
  clearance_decision: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVesselDocumentInput {
  vessel_visit: string;
  document_type: VesselDocumentType;
  title: string;
  file: File;
  pre_arrival?: string | null;
  clearance_decision?: string | null;
}

const VESSEL_DOCUMENTS_BASE = '/shipping/documents';

/** Paginated vessel documents (`?search=`, `?document_type=`, `?ordering=`). */
export const getVesselDocuments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VesselDocument>>>(`${VESSEL_DOCUMENTS_BASE}/`, { params });

export const getVesselDocument = (id: string) =>
  apiClient.get<ApiResponse<VesselDocument>>(`${VESSEL_DOCUMENTS_BASE}/${id}/`);

/** Upload a document as multipart/form-data against a VesselVisit. */
export const createVesselDocument = (input: CreateVesselDocumentInput) => {
  const form = new FormData();
  form.append('vessel_visit', input.vessel_visit);
  form.append('document_type', input.document_type);
  form.append('title', input.title);
  form.append('file', input.file);
  if (input.pre_arrival) form.append('pre_arrival', input.pre_arrival);
  if (input.clearance_decision) form.append('clearance_decision', input.clearance_decision);
  return apiClient.post<ApiResponse<VesselDocument>>(
    `${VESSEL_DOCUMENTS_BASE}/`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const deleteVesselDocument = (id: string) =>
  apiClient.delete(`${VESSEL_DOCUMENTS_BASE}/${id}/`);