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
