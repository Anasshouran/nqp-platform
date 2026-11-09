import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  ReportingNode,
  StateMinistry,
  StateNodeAssignment,
  LocalityNodeAssignment,
  HealthFacilityNodeAssignment,
  RegistryChangeLog,
  FacilityOwner,
  FacilityOwnership,
} from '../../types/registry';

const BASE = '/api/v1/registry';

/**
 * The AFYATNA API wraps all responses in an envelope:
 *   { status: "...", data: <actual payload>, message: "..." }
 *
 * This helper unwraps it. If the response is NOT wrapped (e.g. a future
 * endpoint that returns raw data), it returns r.data as-is — defensive
 * against envelope removal.
 */
const unwrap = <T,>(r: AxiosResponse): T => {
  const body = r.data;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
};

// --- Tree & Nodes ---
export const getRegistryTree = (): Promise<ReportingNode[]> =>
  axios.get(`${BASE}/dashboard/tree/`).then((r) => unwrap<ReportingNode[]>(r));

export const listNodes = (params?: {
  kind?: string;
  parent?: string;
}): Promise<ReportingNode[]> =>
  axios.get(`${BASE}/nodes/`, { params }).then((r) => unwrap<ReportingNode[]>(r));

export const getNode = (id: string): Promise<ReportingNode> =>
  axios.get(`${BASE}/nodes/${id}/`).then((r) => unwrap<ReportingNode>(r));

export const createNode = (data: Partial<ReportingNode>): Promise<ReportingNode> =>
  axios.post(`${BASE}/nodes/`, data).then((r) => unwrap<ReportingNode>(r));

export const updateNode = (
  id: string,
  data: Partial<ReportingNode>,
): Promise<ReportingNode> =>
  axios.patch(`${BASE}/nodes/${id}/`, data).then((r) => unwrap<ReportingNode>(r));

// --- Ministries ---
export const listStateMinistries = (): Promise<StateMinistry[]> =>
  axios.get(`${BASE}/ministries/`).then((r) => unwrap<StateMinistry[]>(r));

export const getStateMinistry = (id: string): Promise<StateMinistry> =>
  axios.get(`${BASE}/ministries/${id}/`).then((r) => unwrap<StateMinistry>(r));

export const createStateMinistry = (
  data: Partial<StateMinistry>,
): Promise<StateMinistry> =>
  axios.post(`${BASE}/ministries/`, data).then((r) => unwrap<StateMinistry>(r));

export const updateStateMinistry = (
  id: string,
  data: Partial<StateMinistry>,
): Promise<StateMinistry> =>
  axios.patch(`${BASE}/ministries/${id}/`, data).then((r) => unwrap<StateMinistry>(r));

// --- Assignments ---
export const listStateAssignments = (): Promise<StateNodeAssignment[]> =>
  axios
    .get(`${BASE}/states/assignments/`)
    .then((r) => unwrap<StateNodeAssignment[]>(r));

export const listLocalityAssignments = (): Promise<LocalityNodeAssignment[]> =>
  axios
    .get(`${BASE}/localities/assignments/`)
    .then((r) => unwrap<LocalityNodeAssignment[]>(r));

export const listFacilityAssignments = (): Promise<HealthFacilityNodeAssignment[]> =>
  axios
    .get(`${BASE}/facilities/assignments/`)
    .then((r) => unwrap<HealthFacilityNodeAssignment[]>(r));

// --- ChangeLog ---
export const listChangeLog = (params?: {
  entity_type?: string;
  entity_id?: string;
}): Promise<RegistryChangeLog[]> =>
  axios.get(`${BASE}/changelog/`, { params }).then((r) => unwrap<RegistryChangeLog[]>(r));

// --- Dashboard ---
export const getRegistrySummary = (): Promise<Record<string, unknown>> =>
  axios.get(`${BASE}/dashboard/summary/`).then((r) => unwrap<Record<string, unknown>>(r));

// --- Facility Ownership (M3-2) ---
export const listFacilityOwners = (): Promise<FacilityOwner[]> =>
  axios.get(`${BASE}/owners/`).then((r) => unwrap<FacilityOwner[]>(r));

export const createFacilityOwner = (data: Partial<FacilityOwner>): Promise<FacilityOwner> =>
  axios.post(`${BASE}/owners/`, data).then((r) => unwrap<FacilityOwner>(r));

export const listFacilityOwnerships = (): Promise<FacilityOwnership[]> =>
  axios.get(`${BASE}/facility-ownerships/`).then((r) => unwrap<FacilityOwnership[]>(r));

export const createFacilityOwnership = (data: Partial<FacilityOwnership>): Promise<FacilityOwnership> =>
  axios.post(`${BASE}/facility-ownerships/`, data).then((r) => unwrap<FacilityOwnership>(r));
