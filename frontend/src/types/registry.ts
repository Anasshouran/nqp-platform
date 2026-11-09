export type ReportingNodeKind =
  | 'FEDERAL'
  | 'STATE'
  | 'LOCALITY'
  | 'FACILITY'
  | 'DEPARTMENT'
  | 'SERVICE';

export interface ReportingNode {
  id: string;
  kind: ReportingNodeKind;
  code: string;
  name_ar: string;
  name_en?: string;
  parent_id: string | null;
  path: string;
  depth: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StateMinistry {
  id: string;
  state_id: string;
  ministry_name_ar: string;
  ministry_name_en?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  is_active: boolean;
}

export interface StateNodeAssignment {
  id: string;
  state_id: string;
  node_id: string;
  valid_from: string;
  valid_to: string | null;
  is_primary: boolean;
  note?: string;
}

export interface LocalityNodeAssignment extends Omit<StateNodeAssignment, 'state_id'> {
  locality_id: string;
}

export interface HealthFacilityNodeAssignment extends Omit<StateNodeAssignment, 'state_id'> {
  health_facility_id: string;
}

export type RegistryChangeAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ASSIGN'
  | 'REASSIGN'
  | 'DEACTIVATE';

export interface RegistryChangeLog {
  id: string;
  user_id: string | null;
  action: RegistryChangeAction;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export type FacilityOwnerKind =
  | 'FEDERAL_MINISTRY'
  | 'STATE_MINISTRY'
  | 'LOCALITY'
  | 'MILITARY'
  | 'PRIVATE'
  | 'NGO'
  | 'FAITH_BASED'
  | 'UN_AGENCY'
  | 'OTHER';

export interface FacilityOwner {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  kind: FacilityOwnerKind;
  description?: string;
  reference_type?: string;
  reference_id?: string | null;
  is_active: boolean;
}

export interface FacilityOwnership {
  id: string;
  facility_id: string;
  owner_id: string;
  is_primary: boolean;
  valid_from: string;
  valid_to: string | null;
  note?: string;
}
