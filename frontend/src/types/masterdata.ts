export type SectorKind = 'SEA' | 'LAND' | 'AIR';
export type EntryKind = 'SEAPORT' | 'LAND_PORT' | 'AIRPORT';

export interface MasterSector {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  color: string;
  description: string;
  order: number;
  is_active: boolean;
  states_count: number;
  entry_points_count: number;
  created_at: string;
  updated_at: string;
}

export interface MasterState {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  sector: string;
  sector_name: string;
  description: string;
  order: number;
  is_active: boolean;
  entry_points_count: number;
  created_at: string;
  updated_at: string;
}

export interface MasterEntryPoint {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: EntryKind;
  state: string;
  state_name: string;
  location: string;
  description: string;
  order: number;
  is_active: boolean;
  terminals_count: number;
  created_at: string;
  updated_at: string;
}

export interface MasterTerminal {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  entry_point: string;
  entry_point_name: string;
  description: string;
  order: number;
  is_active: boolean;
  stations_count: number;
  created_at: string;
  updated_at: string;
}

export interface MasterStation {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  terminal: string | null;
  terminal_name: string | null;
  entry_point: string | null;
  entry_point_name: string | null;
  location: string;
  description: string;
  order: number;
  is_active: boolean;
  sections_count: number;
  created_at: string;
  updated_at: string;
}

export interface MasterSection {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  station: string;
  station_name: string;
  description: string;
  order: number;
  is_active: boolean;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface MasterMember {
  id: string;
  user: string;
  user_email: string;
  user_name: string;
  section: string;
  section_name: string;
  role_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ---------------- شجرة العرض ---------------- */

export interface TreeMember {
  id: string;
  user: string;
  user_name: string;
  user_email: string;
  role_label: string;
}

export interface TreeSection {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  station: string | null;
  description: string;
  order: number;
  members: TreeMember[];
}

export interface TreeStation {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  location: string;
  terminal: string | null;
  entry_point: string | null;
  description: string;
  order: number;
  sections: TreeSection[];
}

export interface TreeTerminal {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  entry_point: string | null;
  description: string;
  order: number;
  stations: TreeStation[];
}

export interface TreeEntryPoint {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: EntryKind;
  state: string | null;
  location: string;
  description: string;
  order: number;
  terminals: TreeTerminal[];
  stations: TreeStation[];
}

export interface TreeState {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  sector: string | null;
  description: string;
  order: number;
  entry_points: TreeEntryPoint[];
}

export interface TreeSector {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  color: string;
  description: string;
  order: number;
  states: TreeState[];
}