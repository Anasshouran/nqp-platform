export const DOSE_TYPE_OPTIONS = [
  { value: 'FIRST', label: 'الجرعة الأولى' },
  { value: 'SECOND', label: 'الجرعة الثانية' },
  { value: 'THIRD', label: 'الجرعة الثالثة' },
  { value: 'BOOSTER', label: 'جرعة تنشيطية' },
];

export const doseTypeLabel = (value: string | undefined | null): string =>
  value ? DOSE_TYPE_OPTIONS.find((d) => d.value === value)?.label ?? value : '—';

export interface DoseFormValues {
  vaccine: string;
  batch: string;
  dose_number: string;
  administered_at: string;
  eligibleBatchIds: string[];
}

export const validateDoseForm = (f: DoseFormValues): string | null => {
  if (!f.vaccine) return 'اختر اللقاح';

  const doseNum = Number(f.dose_number);
  if (!Number.isInteger(doseNum) || doseNum < 1 || doseNum > 20) {
    return 'رقم الجرعة يجب أن يكون بين 1 و 20';
  }

  if (f.batch && !f.eligibleBatchIds.includes(f.batch)) {
    return 'التشغيلة غير متاحة لهذا اللقاح';
  }

  if (!f.administered_at) return 'حدد تاريخ التطعيم';

  const date = new Date(f.administered_at).getTime();
  if (Number.isNaN(date)) return 'تاريخ التطعيم غير صحيح';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today.getTime()) return 'تاريخ التطعيم لا يمكن أن يكون في المستقبل';

  return null;
};