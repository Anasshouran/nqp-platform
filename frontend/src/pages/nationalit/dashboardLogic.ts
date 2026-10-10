import type { ItSystemStatus } from '../../types/nationalIt';
import type { SparkPoint } from '../../components/dashboard/MetricTile';

/** Severity order for the "needs attention" triage list — worst first. */
const SEVERITY: Record<ItSystemStatus, number> = { OFFLINE: 0, WARNING: 1, ONLINE: 2 };

export interface SystemLike {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  status: ItSystemStatus;
  request_count: number;
  last_checked_at: string | null;
  last_error: string;
}

/**
 * Systems that are not fully healthy, worst first, and within each severity
 * band the busiest first — an offline system carrying more traffic is the more
 * urgent one. Pure so the triage order can be asserted without a DOM.
 */
export const selectDegraded = <T extends SystemLike>(systems: T[]): T[] =>
  systems
    .filter((s) => s.status !== 'ONLINE')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || b.request_count - a.request_count);

/** Top-N systems by request volume, used for the KPI sparkline. */
export const selectBusiest = <T extends SystemLike>(systems: T[], limit = 8): T[] =>
  [...systems].sort((a, b) => b.request_count - a.request_count).slice(0, limit);

export const toSparkPoints = (systems: SystemLike[]): SparkPoint[] =>
  systems.map((s) => ({ label: s.code, value: s.request_count }));

export const countByStatus = (systems: SystemLike[]): Record<ItSystemStatus, number> => ({
  ONLINE: systems.filter((s) => s.status === 'ONLINE').length,
  WARNING: systems.filter((s) => s.status === 'WARNING').length,
  OFFLINE: systems.filter((s) => s.status === 'OFFLINE').length,
});

/**
 * One-line verdict for the infrastructure banner. Ordered worst-first so an
 * offline system is never described as merely "under observation".
 */
export const healthVerdict = (counts: Record<ItSystemStatus, number>, fmt: (n: number) => string): string => {
  if (counts.OFFLINE > 0) return `${fmt(counts.OFFLINE)} نظام متوقف — تدخل مطلوب`;
  if (counts.WARNING > 0) return `${fmt(counts.WARNING)} نظام بتحذير — مراقبة مطلوبة`;
  return 'جميع الأنظمة تعمل بشكل طبيعي';
};
