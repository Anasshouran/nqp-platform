import { useCallback, type KeyboardEvent } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

export interface StatCardProps {
  icon?: ReactNode;
  value: string | number;
  label: string;
  /** Color token e.g. "primary.main", "warning.main". */
  accent?: string;
  trend?: { label: string; positive?: boolean };
  onClick?: () => void;
}

const accentColor = (t: Theme, accent: string) => {
  const [color, shade] = accent.split('.');
  const entry = t.palette[color as keyof Theme['palette']];
  if (entry && typeof entry === 'object' && shade) {
    const value = (entry as unknown as Record<string, unknown>)[shade];
    if (typeof value === 'string') return value;
  }
  return t.palette.primary.main;
};

const StatCard = ({ icon, value, label, accent = 'primary.main', trend, onClick }: StatCardProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  return (
    <Card
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${label}: ${value}` : undefined}
      sx={{
        height: '100%',
        overflow: 'visible',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        p: 0.75,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: (t) => t.shadows[12],
              borderColor: (t) => `${accentColor(t, accent)}66`,
            }
          : {},
        ...(onClick
          ? { '&:focus-visible': { outline: 'none', boxShadow: (t) => `0 0 0 4px ${t.palette.primary.main}33` } }
          : {}),
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          insetInline: 22,
          height: 3,
          borderRadius: '0 0 99px 99px',
          background: (t) => `linear-gradient(90deg, ${accentColor(t, accent)}, transparent)`,
          opacity: 0.55,
        }}
      />
      <CardContent
        sx={{
          p: 2.75,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          '&:last-child': { p: 2.75 },
        }}
      >
        {icon && (
          <Box
            sx={(t) => ({
              width: 52,
              height: 52,
              borderRadius: 3.2,
              display: 'grid',
              placeItems: 'center',
              color: accentColor(t, accent),
              bgcolor: `color-mix(in srgb, ${accentColor(t, accent)} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accentColor(t, accent)} 22%, transparent)`,
              boxShadow: `0 6px 16px -8px ${accentColor(t, accent)}`,
              flexShrink: 0,
            })}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.25 }}>
            {label}
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </Typography>
          {trend && (
            <Typography
              variant="caption"
              sx={{ color: trend.positive ? 'success.main' : 'error.main', fontWeight: 700 }}
            >
              {trend.label}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;

/* ------------------------------------------------------------------ */
/* بلاطة إحصائية عمودية (عنوان أعلى، أيقونة يمين، ملاحظة أسفل)          */
/* توحّد النسخ المحلية السابقة في صفحات الكاتب والمحاسب والمفتش         */
/* ------------------------------------------------------------------ */

export interface StatTileGridItem {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
}

export interface StatTileProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  note?: string;
  /** لون hex مباشر لتدرج صندوق الأيقونة وقيمة الرقم */
  accent: string;
  onClick?: () => void;
  /** إبراز تنبيهي (إطار أحمر) كما في لوحة الكاتب */
  highlight?: boolean;
  /** زر إجراء أسفل البلاطة */
  actionLabel?: string;
  gridItem?: StatTileGridItem;
}

export const StatTile = ({
  title,
  value,
  icon,
  note,
  accent,
  onClick,
  highlight,
  actionLabel,
  gridItem,
}: StatTileProps) => {
  const card = (
    <Card
      elevation={0}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      sx={{
        borderRadius: 3.5,
        border: highlight ? '2px solid' : '1px solid',
        borderColor: highlight ? 'error.main' : 'divider',
        bgcolor: highlight ? 'rgba(198,58,58,0.04)' : 'rgba(255,255,255,0.7)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all .18s ease',
        height: '100%',
        '&:hover': onClick ? { borderColor: accent, transform: 'translateY(-3px)', boxShadow: (t) => t.shadows[8] } : {},
        ...(onClick
          ? { '&:focus-visible': { outline: 'none', boxShadow: (t) => `0 0 0 4px ${t.palette.primary.main}33` } }
          : {}),
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                my: 0.5,
                color: highlight ? 'error.main' : 'inherit',
                lineHeight: 1.25,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </Typography>
            {note && (
              <Typography variant="caption" color="text.secondary">
                {note}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              flexShrink: 0,
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 8px 18px -8px ${accent}`,
            }}
          >
            {icon}
          </Box>
        </Stack>
        {actionLabel && (
          <Button
            size="small"
            fullWidth
            variant={highlight ? 'contained' : 'outlined'}
            color={highlight ? 'error' : 'inherit'}
            onClick={onClick}
            sx={{ mt: 1.5, borderRadius: 2.5, fontWeight: 700, minHeight: 40 }}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (!gridItem) return card;
  return (
    <Grid item {...gridItem}>
      {card}
    </Grid>
  );
};