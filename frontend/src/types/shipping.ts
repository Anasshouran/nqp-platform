/** Maritime pre-arrival notification (Phase 1B-1). */
export type PreArrivalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface PreArrivalNotification {
  id: string;
  /** The VesselVisit (port call) this notification concerns. */
  vessel_visit: string;
  // Resolved from the visit — never client-supplied.
  vessel_name: string;
  vessel_imo: string;
  company_id?: string | null;
  company_name?: string | null;
  port_code: string;
  port_name: string;
  entry_point_id?: string | null;
  arrival_date: string;
  status: PreArrivalStatus;
  submitted_by?: string | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

/** Legal transitions, mirroring the backend `TRANSITIONS` map. */
export const PRE_ARRIVAL_TRANSITIONS: Record<PreArrivalStatus, PreArrivalStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: [],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Port Health clearance decision (Phase 1B-2) — a government determination for
 * a port call. Append-only history: several decisions may exist per visit and
 * `is_current` marks the one in force.
 */
export type ClearanceDecisionType = 'CLEARED' | 'CONDITIONAL' | 'REFUSED';

export interface PortClearanceDecision {
  id: string;
  /** The VesselVisit (port call) this decision concerns. */
  vessel_visit: string;
  // Resolved from the visit — never client-supplied.
  vessel_name: string;
  vessel_imo: string;
  company_id?: string | null;
  company_name?: string | null;
  port_code: string;
  port_name: string;
  entry_point_id?: string | null;
  decision: ClearanceDecisionType;
  reason: string;
  conditions: string;
  decided_by: string;
  decided_by_name?: string | null;
  decided_at: string;
  /** False once a later decision supersedes this one. */
  is_current: boolean;
  supersedes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Departure (Phase 1B-3) is a port-authority action, not a client-set field:
 * `VesselVisit.status` / `departure_date` are read-only on the wire, and the
 * server generates the timestamp.
 */
export interface VesselDepartureResult {
  id: string;
  vessel: string;
  vessel_name?: string;
  vessel_imo?: string;
  port: string;
  port_name?: string;
  berth?: string | null;
  arrival_date: string;
  /** Server-generated; never supplied by the client. */
  departure_date: string;
  status: string;
}