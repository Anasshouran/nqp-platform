const KHARTOUM_TIMEZONE = 'Africa/Khartoum';

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ar-SD', { timeZone: KHARTOUM_TIMEZONE });
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  return `${d.toLocaleDateString('ar-SD', { timeZone: KHARTOUM_TIMEZONE })} ${d.toLocaleTimeString('ar-SD', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KHARTOUM_TIMEZONE,
  })}`;
};

export const formatTemperature = (temp: number | null | undefined): string =>
  temp == null ? '—' : `${temp.toFixed(1)}°C`;

export const formatPercent = (value: number | null | undefined): string =>
  value == null ? '—' : `${value}%`;

/**
 * Locale-aware number for Arabic UI. `ar-SD` defaults to Arabic-Indic digits
 * (١٢٣٤٥), which breaks alignment against the Latin system codes they sit
 * beside (`SYS-FIN-GEDA`) and against `tabular-nums` columns. `-u-nu-latn`
 * keeps Arabic locale rules (separators, ordering) with Latin digits.
 */
const AR_NUMBER = new Intl.NumberFormat('ar-SD-u-nu-latn');

/**
 * In an RTL locale Intl prefixes negative numbers with U+200E LEFT-TO-RIGHT
 * MARK so the sign does not get absorbed into the surrounding Arabic run. The
 * character is invisible but survives into copied text, CSV exports and
 * equality checks, so it is stripped here and the sign re-attached plainly.
 */
const LRM = /\u200e|\u200f|\u061c/g;

const formatSigned = (value: number): string => {
  const formatted = AR_NUMBER.format(value).replace(LRM, '');
  return value < 0 && !formatted.startsWith('-') ? `-${formatted}` : formatted;
};

export const formatNumber = (value: number | null | undefined): string =>
  value == null ? '—' : formatSigned(value);

/** Compact form for tight tiles: 12.3K / 1.2M. */
export const formatCompact = (value: number | null | undefined): string => {
  if (value == null) return '—';
  if (Math.abs(value) < 1000) return formatSigned(value);
  return new Intl.NumberFormat('ar-SD-u-nu-latn', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(value)
    .replace(LRM, '');
};

const AR_RELATIVE = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/**
 * "منذ 5 دقائق" style stamp for operational dashboards. Picks the largest unit
 * that fits so the string stays short enough for dense table cells.
 *
 * Under a minute in *either* direction reads as "الآن": small negative deltas
 * are past timestamps (the comparison must be on the absolute value, or every
 * past date falls through to the seconds branch), and small positive deltas
 * are clock skew. A materially future stamp is a genuine fault and is reported
 * truthfully — use `isFutureStamp` to detect and flag it rather than masking it.
 */
export const formatRelativeTime = (date: string | Date | null | undefined, now: Date = new Date()): string => {
  if (!date) return '—';
  const then = new Date(date);
  if (Number.isNaN(then.getTime())) return '—';

  const deltaSeconds = Math.round((then.getTime() - now.getTime()) / 1000);
  if (Math.abs(deltaSeconds) < 60) return 'الآن';

  for (const [unit, seconds] of RELATIVE_STEPS) {
    if (Math.abs(deltaSeconds) >= seconds) return AR_RELATIVE.format(Math.round(deltaSeconds / seconds), unit);
  }
  return 'الآن';
};

/**
 * A "last synced / last checked" stamp that lands meaningfully in the future is
 * a clock or backfill fault, not a schedule. Callers use this to render an
 * explicit anomaly instead of either hiding the fault behind "الآن" or showing
 * a future age that reads as a planned event.
 *
 * `toleranceSeconds` absorbs benign client/server clock skew.
 */
export const isFutureStamp = (
  date: string | Date | null | undefined,
  now: Date = new Date(),
  toleranceSeconds = 60
): boolean => {
  if (!date) return false;
  const then = new Date(date);
  if (Number.isNaN(then.getTime())) return false;
  return then.getTime() - now.getTime() > toleranceSeconds * 1000;
};

export type StampAnomaly = { text: string; anomaly: true } | { text: string; anomaly: false };

/**
 * Ops-domain stamp: relative age plus an explicit anomaly flag. Keeps the
 * formatting decision in one place so every table cell reacts the same way to a
 * broken clock.
 */
export const formatStamp = (
  date: string | Date | null | undefined,
  now: Date = new Date()
): StampAnomaly => {
  if (isFutureStamp(date, now)) return { text: 'وقت غير صالح', anomaly: true };
  return { text: formatRelativeTime(date, now), anomaly: false };
};

/** Percentage of `part` out of `total`, clamped to 0–100. */
export const sharePercent = (part: number, total: number): number => {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
};
