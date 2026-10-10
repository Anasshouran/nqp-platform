type Labelish = string | { label?: string };

export const labelOf = <M extends Record<string, Labelish | undefined>>(
  map: M,
  key: string | number | null | undefined,
  fallback?: string,
): string => {
  if (key === null || key === undefined || key === '') return fallback ?? '—';
  const entry = map[key as string];
  if (entry === undefined) return fallback ?? String(key);
  return typeof entry === 'string' ? entry : entry.label ?? fallback ?? String(key);
};

export const toneOf = <M extends Record<string, { tone?: T } | undefined>, T>(
  map: M,
  key: string | number | null | undefined,
): NonNullable<T> | undefined => {
  if (key === null || key === undefined || key === '') return undefined;
  return map[key as string]?.tone as NonNullable<T> | undefined;
};

export const colorOf = (
  map: Record<string, Record<string, unknown> | undefined>,
  key: string | number | null | undefined,
  prop: string,
  fallback = '',
): string => {
  if (key === null || key === undefined || key === '') return fallback;
  const value = map[key as string]?.[prop];
  return typeof value === 'string' ? value : fallback;
};

export const styleOf = <V>(fn: (v: V) => string | undefined, value: V, fallback = ''): string =>
  fn(value) ?? fallback;