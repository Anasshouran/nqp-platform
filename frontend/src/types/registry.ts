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
  facility: string;
  facility_name: string;
  node: string;
  node_code: string;
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
  facility: string;
  facility_name: string;
  owner: string;
  owner_name: string;
  owner_kind: string;
  is_primary: boolean;
  valid_from: string;
  valid_to: string | null;
  note?: string;
}

export type TechnicalSupervisorKind =
  | 'FEDERAL_PROGRAM'
  | 'STATE_HEALTH_DEPT'
  | 'ACADEMIC'
  | 'UN_AGENCY'
  | 'NGO'
  | 'OTHER';

export type TechnicalDomain =
  | 'TB' | 'HIV' | 'IMMUNIZATION' | 'SURVEILLANCE'
  | 'MATERNAL' | 'CHILD' | 'NUTRITION' | 'QUARANTINE'
  | 'LABORATORY' | 'GENERAL' | 'OTHER';

export interface TechnicalSupervisor {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  kind: TechnicalSupervisorKind;
  domain: TechnicalDomain;
  description?: string;
  is_active: boolean;
}

export type SupervisionLevel = 'PRIMARY' | 'SUPPORTIVE' | 'OVERSIGHT';

export interface TechnicalSupervision {
  id: string;
  target_type: 'FACILITY';
  facility: string;
  facility_name: string;
  supervisor: string;
  supervisor_name: string;
  supervisor_domain: TechnicalDomain;
  supervision_level: SupervisionLevel;
  is_primary: boolean;
  valid_from: string;
  valid_to: string | null;
  note?: string;
}

export interface DepartmentNodeAssignment {
  id: string;
  department: string;
  department_code: string;
  department_name: string;
  node: string;
  node_code: string;
  node_kind: 'DEPARTMENT';
  is_primary: boolean;
  valid_from: string;
  valid_to: string | null;
  note?: string;
}

export type ServiceCategory =
  | 'PRIMARY_CARE' | 'EMERGENCY' | 'SURGERY' | 'MATERNAL' | 'CHILD'
  | 'NUTRITION' | 'TB' | 'HIV' | 'IMMUNIZATION' | 'SURVEILLANCE'
  | 'QUARANTINE' | 'LABORATORY' | 'IMAGING' | 'PHARMACY'
  | 'MENTAL_HEALTH' | 'OTHER';

export interface Service {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  category: ServiceCategory;
  category_display: string;
  description?: string;
  is_active: boolean;
  availability_count?: number;
}

export interface ReportingNodeTree {
  id: string;
  kind: ReportingNodeKind;
  code: string;
  name_ar: string;
  name_en?: string;
  depth: number;
  facility_id: string | null;
  children: ReportingNodeTree[];
}

export type ServiceTargetType = 'FACILITY' | 'DEPARTMENT';

export interface ServiceAvailability {
  id: string;
  service: string;
  service_code: string;
  service_name: string;
  target_type: ServiceTargetType;
  facility: string | null;
  facility_name: string | null;
  department: string | null;
  department_name: string | null;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  note?: string;
}

export interface FacilitySummaryScopeRef {
  id: string | null;
  name_ar: string | null;
}

export interface FacilitySummary {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  kind?: string;
  sector: FacilitySummaryScopeRef;
  locality: FacilitySummaryScopeRef;
  entry_point: FacilitySummaryScopeRef;
  is_active: boolean;
}
