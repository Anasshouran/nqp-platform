export * from './core';
import { ROLE_LAYOUT_CONFIG as ADMIN_ROLES } from './admin';
import { ROLE_LAYOUT_CONFIG as LABORATORY_ROLES } from './laboratory';
import { ROLE_LAYOUT_CONFIG as FOOD_ROLES } from './food';
import { ROLE_LAYOUT_CONFIG as HEALTH_ROLES } from './health';
import { ROLE_LAYOUT_CONFIG as IT_ROLES } from './it';
import { ROLE_LAYOUT_CONFIG as VACCINATION_ROLES } from './vaccination';
import { type RoleLayoutConfig } from './core';

export const ROLE_LAYOUT_CONFIG: Record<string, RoleLayoutConfig> = Object.assign(
  {},
  ADMIN_ROLES,
  LABORATORY_ROLES,
  FOOD_ROLES,
  HEALTH_ROLES,
  IT_ROLES,
  VACCINATION_ROLES,
);