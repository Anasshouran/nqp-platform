import { getUserSectorCode } from './scopes';
import { sectorDashboardRoute } from '../config/cmsSectors';

export type RoleCode =
  | 'ADMIN'
  | 'PORT_OFFICER'
  | 'LAB_MANAGER'
  | 'LAB_TECHNICIAN'
  | 'LAB_RECEPTIONIST'
  | 'LAB_COORDINATOR'
  | 'CHEM_SECTION_HEAD'
  | 'CHEM_ANALYST'
  | 'MICRO_SECTION_HEAD'
  | 'MICRO_ANALYST'
  | 'QUALITY_ASSURANCE'
  | 'LAB_DIRECTOR'
  | 'STANDARDS_OFFICER'
  | 'EOC_OPERATOR'
  | 'IT_ADMIN'
  | 'SECTOR_IT_MANAGER'
  | 'FOOD_INSPECTOR'
  | 'SECTOR_MANAGER'
  | 'SECTOR_HEAD'
  | 'DG_MANAGER'
  | 'QUARANTINE_INSPECTOR'
  | 'AIRPORT_INSPECTOR'
  | 'CLERK'
  | 'ACCOUNTANT'
  | 'STATION_HEAD'
  | 'DEPT_MANAGER'
  | 'EPIDEMIC_CONTROL_MANAGER'
  | 'FOOD_SURVEILLANCE_MANAGER'
  | 'FOOD_DIRECTOR'
  | 'AIRPORT_DIRECTOR'
  | 'POE_MANAGER'
  | 'FEDERAL_DIRECTOR'
  | 'VIEWER'
  | 'RISK_ANALYST'
  | 'CARRIER'
  | 'CLINIC_DOCTOR'
  | 'NATIONAL_IT_DIRECTOR'
  | 'IHR_NFP'
  | 'WHO_INTEGRATION_OFFICER'
  | 'NATIONAL_SURVEILLANCE_OFFICER'
  | 'SECTOR_IHR_OFFICER'
  | 'POE_HEALTH_OFFICER'
  | 'VACCINATION_MANAGER'
  | 'VACCINATION_OFFICER'
  | 'TRAVELER';

export const ROLE_HOME: Record<RoleCode, string> = {
  ADMIN: '/app',
  PORT_OFFICER: '/app/port-officer',
  LAB_MANAGER: '/app/laboratory',
  LAB_TECHNICIAN: '/app/food-lab',
  LAB_RECEPTIONIST: '/app/reception',
  LAB_COORDINATOR: '/app/food-lab',
  CHEM_SECTION_HEAD: '/app/chemistry',
  CHEM_ANALYST: '/app/chemistry-analyst',
  MICRO_SECTION_HEAD: '/app/microbiology',
  MICRO_ANALYST: '/app/microbiology-analyst',
  QUALITY_ASSURANCE: '/app/quality',
  LAB_DIRECTOR: '/app/lab-director',
  STANDARDS_OFFICER: '/app/standards',
  EOC_OPERATOR: '/app/emergency',
  IT_ADMIN: '/dashboard/sector/red-sea',
  SECTOR_IT_MANAGER: '/dashboard/sector/red-sea/it',
  FOOD_INSPECTOR: '/app/inspector-dashboard',
  SECTOR_MANAGER: '/dashboard/sector/red-sea',
  SECTOR_HEAD: '/dashboard/sector/red-sea',
  DG_MANAGER: '/app/national-command',
  QUARANTINE_INSPECTOR: '/app/quarantine-inspector',
  AIRPORT_INSPECTOR: '/app/airport',
  CLERK: '/food-safety/clerk/dashboard',
  ACCOUNTANT: '/app/accountant-dashboard',
  STATION_HEAD: '/app/station-dashboard',
  DEPT_MANAGER: '/app/food-ops',
  EPIDEMIC_CONTROL_MANAGER: '/app/epidemic-dashboard',
  FOOD_SURVEILLANCE_MANAGER: '/app/food-surveillance',
  FOOD_DIRECTOR: '/app/food-director',
  AIRPORT_DIRECTOR: '/app/airport-director',
  RISK_ANALYST: '/app/food-surveillance',
  CARRIER: '/app/carrier',
  CLINIC_DOCTOR: '/app/clinic/dashboard',
  NATIONAL_IT_DIRECTOR: '/dashboard/national/it',
  IHR_NFP: '/app/integration/who/events',
  WHO_INTEGRATION_OFFICER: '/app/integration/who',
  NATIONAL_SURVEILLANCE_OFFICER: '/app/integration/who/events',
  SECTOR_IHR_OFFICER: '/app/integration/who/events',
  POE_HEALTH_OFFICER: '/app/integration/who/events',
  VACCINATION_MANAGER: '/app/vaccination',
  VACCINATION_OFFICER: '/app/vaccination/register',
  TRAVELER: '/traveler/dashboard',
  POE_MANAGER: '/app/surveillance',
  FEDERAL_DIRECTOR: '/app',
  VIEWER: '/app',
};

export const roleHomePath = (role?: string | null): string =>
  (role && role in ROLE_HOME ? ROLE_HOME[role as RoleCode] : '/app');

interface ScopeHomeUser {
  role?: string | null;
  sector?: string | null;
  sector_code?: string | null;
  role_assignments?: Array<{
    role?: string;
    scope_type?: string;
    scope_id?: string | null;
  }>;
}

const SECTOR_DASHBOARD_ROLE_CODES: readonly RoleCode[] = [
  'SECTOR_MANAGER',
  'SECTOR_HEAD',
  'IT_ADMIN',
  'SECTOR_IT_MANAGER',
];

/**
 * توجيه المستخدم لمساره الرئيسي مع احترام قطاعه المعيَّن (عبر /auth/me sector_code
 * أو نطاق RoleAssignment ذي scope=SECTOR). للأدوار غير القطاعية يعمل كـ roleHomePath.
 */
export const roleHomePathFor = (user?: ScopeHomeUser | null): string => {
  const role = user?.role ?? null;
  const sectorCode = user ? getUserSectorCode(user) : null;
  if (
    sectorCode &&
    role &&
    (SECTOR_DASHBOARD_ROLE_CODES as string[]).includes(role)
  ) {
    const route = sectorDashboardRoute(sectorCode.toLowerCase());
    if (route) return route;
  }
  return roleHomePath(role);
};
