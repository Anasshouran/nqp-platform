import type { CategoryChipStyle } from './CategoryChip';

/* ── News ────────────────────────────────────────────────────────────── */
export const NEWS_CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'عام',
  HEALTH: 'صحي',
  TRAVEL: 'سفر',
  OFFICIAL: 'رسمي',
};

export const NEWS_CATEGORY_STYLES: Record<string, CategoryChipStyle> = {
  HEALTH: {
    color: 'primary',
    overMedia: { bgcolor: 'rgba(255,255,255,0.92)', color: 'primary.dark', borderColor: 'rgba(255,255,255,0.7)' },
  },
  TRAVEL: {
    color: 'info',
    overMedia: { bgcolor: 'rgba(255,255,255,0.92)', color: 'info.dark', borderColor: 'rgba(255,255,255,0.7)' },
  },
  OFFICIAL: {
    sx: { bgcolor: 'secondary.light', color: 'secondary.dark' },
    overMedia: { bgcolor: 'rgba(255,255,255,0.92)', color: 'secondary.dark', borderColor: 'rgba(255,255,255,0.7)' },
  },
  GENERAL: {
    sx: { bgcolor: 'rgba(16,40,34,0.06)', color: 'text.primary' },
    overMedia: { bgcolor: 'rgba(255,255,255,0.92)', color: 'text.primary', borderColor: 'rgba(255,255,255,0.7)' },
  },
};

/* ── Circulars ──────────────────────────────────────────────────────── */
export const CIRCULAR_CATEGORY_LABELS: Record<string, string> = {
  OFFICIAL: 'رسمي',
  HEALTH: 'صحي',
  ADMIN: 'إداري',
  GENERAL: 'عام',
};

export const CIRCULAR_CATEGORY_STYLES: Record<string, CategoryChipStyle> = {
  OFFICIAL: NEWS_CATEGORY_STYLES.OFFICIAL,
  HEALTH: NEWS_CATEGORY_STYLES.HEALTH,
  ADMIN: NEWS_CATEGORY_STYLES.TRAVEL,
  GENERAL: NEWS_CATEGORY_STYLES.GENERAL,
};

/* ── Documents ──────────────────────────────────────────────────────── */
export const DOC_CATEGORY_LABELS: Record<string, string> = {
  LAW: 'قانون',
  REGULATION: 'لائحة',
  FORM: 'نموذج',
  GUIDE: 'دليل',
  OTHER: 'أخرى',
};

/* Dark tones for ink-on-light surfaces (filter text, borders, icons). */
export const DOC_CATEGORY_TONES: Record<string, string> = {
  LAW: '#075e4d',
  REGULATION: '#1d4f9e',
  FORM: '#6f5516',
  GUIDE: '#5c4f9e',
  OTHER: '#3a5a6b',
};

/* Fills safe for white ink (chip backgrounds, gradients, accents).
   White-text ratios: LAW 4.93, REGULATION 4.98, FORM 4.86, GUIDE 5.45, OTHER 5.25. */
export const DOC_CATEGORY_FILLS: Record<string, string> = {
  LAW: '#0c7f6a',
  REGULATION: '#2f6dd0',
  FORM: '#8c6d1f',
  GUIDE: '#7a5c9e',
  OTHER: '#4f6f8f',
};

/* Chip styles derived from the fills so the chip, the card icon block and the
   top accent bar of a document always share the same hue family. */
export const DOC_CATEGORY_STYLES: Record<string, CategoryChipStyle> = Object.fromEntries(
  Object.entries(DOC_CATEGORY_FILLS).map(([key, fill]) => [key, { sx: { bgcolor: fill, color: '#ffffff' } }]),
);