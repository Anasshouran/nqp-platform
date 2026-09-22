interface ScopeUser {
  sector?: string | null;
  sector_code?: string | null;
  role?: string | null;
  role_assignments?: Array<{
    role?: string;
    scope_type?: string;
    scope_id?: string | null;
  }>;
}

/** اشتقاق كود القطاع (مثل RED_SEA) من المستخدم: عبر حقل sector إن وُجد،
 *  أو من أول RoleAssignment ذي نطاق SECTOR. */
export const getUserSectorCode = (user?: ScopeUser | null): string | null => {
  if (!user) return null;
  if (user.sector_code) return user.sector_code;
  if (user.sector && user.sector !== 'null') return user.sector;
  const assignment = user.role_assignments?.find(
    (a) =>
      a.scope_type === 'SECTOR' &&
      a.scope_id &&
      a.scope_id !== 'null'
  );
  return assignment?.scope_id || null;
};

/** هل المستخدم في نطاق قطاع معيّن (بالمعرّف أو الكود)؟ */
export const isUserInSector = (
  user: ScopeUser | null | undefined,
  target: string
): boolean => {
  const code = getUserSectorCode(user);
  if (!target) return true;
  if (!code) return false;
  if (code === target) return true;
  if (target.indexOf('-') < 0 && !/^[0-9a-f-]{36}$/i.test(target)) {
    return false;
  }
  return code.toLowerCase() === target.toLowerCase();
};
