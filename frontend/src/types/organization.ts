export interface OrgPosition {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  parent: string | null;
  parent_name: string | null;
  description: string;
  order: number;
  is_active: boolean;
  children_count: number;
  assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrgPositionInput {
  code: string;
  name_ar: string;
  name_en?: string;
  level?: number;
  parent?: string | null;
  description?: string;
  order?: number;
  is_active?: boolean;
}

export interface Sector {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  region: string;
  description: string;
  color: string;
  order: number;
  is_active: boolean;
  department_count: number;
  assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface SectorInput {
  code: string;
  name_ar: string;
  name_en?: string;
  region?: string;
  description?: string;
  color?: string;
  order?: number;
  is_active?: boolean;
}

export interface Department {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  sector: string | null;
  sector_name: string | null;
  manager_position: string | null;
  manager_name: string | null;
  description: string;
  order: number;
  is_active: boolean;
  assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentInput {
  code: string;
  name_ar: string;
  name_en?: string;
  sector?: string | null;
  manager_position?: string | null;
  description?: string;
  order?: number;
  is_active?: boolean;
}

export interface Station {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  department: string | null;
  department_name: string | null;
  sector: string | null;
  sector_name: string | null;
  location: string;
  description: string;
  order: number;
  is_active: boolean;
  assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface StationInput {
  code: string;
  name_ar: string;
  name_en?: string;
  department?: string | null;
  sector?: string | null;
  location?: string;
  description?: string;
  order?: number;
  is_active?: boolean;
}

export interface OrgAssignment {
  id: string;
  user: string;
  user_email: string;
  user_name: string;
  position: string | null;
  position_name: string | null;
  sector: string | null;
  sector_name: string | null;
  department: string | null;
  department_name: string | null;
  station: string | null;
  station_name: string | null;
  entry_point: string | null;
  entry_point_name: string | null;
  is_primary: boolean;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgAssignmentInput {
  user: string;
  position?: string | null;
  sector?: string | null;
  department?: string | null;
  station?: string | null;
  entry_point?: string | null;
  is_primary?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

export interface OrgTreeNode {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  people: string[];
  children: OrgTreeNode[];
}

export interface OrgUnitPosition {
  id: string;
  code: string;
  name_ar: string;
}

export interface DepartmentNode {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: string;
  people?: string[];
  positions?: OrgUnitPosition[];
  stations?: OrgStationNode[];
  children?: DepartmentNode[];
}

export interface OrgStationNode {
  id: string;
  code: string;
  name_ar: string;
  location?: string;
}

export interface OrgSectorNode {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  color: string;
  departments: DepartmentNode[];
  people: string[];
}

export interface OrgHierarchy {
  positions: OrgTreeNode[];
  sectors: OrgSectorNode[];
}