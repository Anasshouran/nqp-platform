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
  | 'TRAVELER'
  | 'CARRIER_ADMIN'
  | 'BORDER_SYSTEM_ADMIN'
  | 'BORDER_STATION_MANAGER'
  | 'BORDER_HEALTH_OFFICER'
  | 'BORDER_DIRECTOR'
  | 'NATIONAL_QUARANTINE_DIRECTOR'
  | 'QUARANTINE_SECTOR_DIRECTOR'
  | 'QUARANTINE_DOCTOR'
  | 'TRAVELER_REGISTRATION_OFFICER'
  | 'CUSTOMS_OFFICER'
  | 'IMMIGRATION_OFFICER'
  | 'ENV_INSPECTOR'
  | 'EPIDEMIOLOGY_OFFICER'
  | 'EMERGENCY_OFFICER'
  | 'FOOD_WINDOW_CLERK'
  | 'FOOD_WINDOW_SUPERVISOR'
  | 'HR_MANAGER'
  | 'HR_SPECIALIST'
  | 'HR_APPROVER'
  | 'NATIONAL_LAB_ADMIN';

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
  CARRIER_ADMIN: '/app/carrier/members',
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
  /* أدوار لها مساحة عمل في الواجهة لكنها كانت بلا مسار رئيسي، فتهبط
     على لوحة القيادة الوطنية — أول عنصر في قائمتها الجانبية هو بيتها. */
  BORDER_SYSTEM_ADMIN: '/app/borders-health',
  BORDER_STATION_MANAGER: '/app/borders-health',
  BORDER_HEALTH_OFFICER: '/app/borders-health',
  BORDER_DIRECTOR: '/app/borders-health',
  NATIONAL_QUARANTINE_DIRECTOR: '/app/borders-health',
  QUARANTINE_SECTOR_DIRECTOR: '/app/borders-health',
  QUARANTINE_DOCTOR: '/app/borders-health',
  TRAVELER_REGISTRATION_OFFICER: '/app/borders-health',
  CUSTOMS_OFFICER: '/app/borders-health',
  IMMIGRATION_OFFICER: '/app/borders-health',
  ENV_INSPECTOR: '/app/borders-health',
  EPIDEMIOLOGY_OFFICER: '/app/borders-health',
  EMERGENCY_OFFICER: '/app/borders-health',
  FOOD_WINDOW_CLERK: '/app/food-window',
  FOOD_WINDOW_SUPERVISOR: '/app/food-window',
  HR_MANAGER: '/app/hr',
  HR_SPECIALIST: '/app/hr',
  HR_APPROVER: '/app/hr',
  NATIONAL_LAB_ADMIN: '/app/laboratory/national',
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
