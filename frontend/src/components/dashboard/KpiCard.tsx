import { useCallback, type KeyboardEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type Theme } from '@mui/material/styles';

interface KpiCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  /** Color token e.g. "primary.main". Shapes the icon tile and hover glow. */
  accent?: string;
  /** Short trailing hint, e.g. "اليوم". */
  hint?: string;
  /** Optional trend line rendered under the label. */
  trend?: { label: string; positive?: boolean };
  onClick?: () => void;
}

const resolveToken = (theme: Theme, token: string): string => {
  if (!token || typeof token !== 'string') return theme.palette.primary.main;
  if (token === 'neutral') return theme.palette.text.secondary;
  if (token.includes('.')) {
    const [group, shade] = token.split('.');
    const entry = theme.palette[group as keyof typeof theme.palette];
    if (entry && typeof entry === 'object' && shade) {
      const v = (entry as unknown as Record<string, unknown>)[shade];
      if (typeof v === 'string') return v;
    }
  }
  const fallback = theme.palette[token as keyof typeof theme.palette];
  if (typeof fallback === 'string') return fallback;
  return theme.palette.primary.main;
};

/**
 * MD3-style KPI tile for dashboard grids — frosted glass, tonal icon tile,
 * tabular numerals and a soft accent glow on hover. Also usable as a link/button
 * when an onClick handler is provided.
 */
const KpiCard = ({ icon, label, value, accent = 'primary.main', hint, trend, onClick }: KpiCardProps) => {
  const theme = useTheme();
  const color = resolveToken(theme, accent);

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

  const numeric = typeof value === 'number';

  return (
    <Box
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${label}: ${value}` : undefined}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2.5,
        height: '100%',
        borderRadius: 2,
        border: '1px solid rgba(16,40,34,0.07)',
        bgcolor: 'rgba(255,255,255,0.86)',
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))',
        backdropFilter: 'blur(18px) saturate(1.35)',
        boxShadow: '0 1px 2px rgba(16,40,34,0.03), 0 10px 26px rgba(16,40,34,0.06), inset 0 1px 0 rgba(255,255,255,0.65)',
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
        willChange: 'transform',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 8px 20px -10px ${alpha(color, 0.4)}, 0 14px 44px rgba(16,40,34,0.1), inset 0 1px 0 rgba(255,255,255,0.65)`,
          borderColor: alpha(color, 0.28),
        },
        ...(onClick
          ? { '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 4px ${alpha(color, 0.3)}` } }
          : {}),
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          insetInline: 24,
          height: 2.5,
          borderRadius: '0 0 99px 99px',
          background: `linear-gradient(90deg, transparent, ${alpha(color, 0.5)}, transparent)`,
          opacity: 0.7,
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box
          aria-hidden
          sx={{
            width: 46,
            height: 46,
            borderRadius: 1.2,
            display: 'grid',
            placeItems: 'center',
            color,
            bgcolor: alpha(color, 0.1),
            border: `1px solid ${alpha(color, 0.2)}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          {icon}
        </Box>
        {hint && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
            {hint}
          </Typography>
        )}
      </Box>
      <Box>
        <Typography
          sx={{
            fontSize: '1.85rem',
            lineHeight: 1.1,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
          }}
        >
          {numeric ? value.toLocaleString('en-US') : value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.25 }}>
          {label}
        </Typography>
        {trend && (
          <Typography
            variant="caption"
            sx={{ color: trend.positive ? 'success.main' : 'error.main', fontWeight: 700, display: 'block', mt: 0.5 }}
          >
            {trend.label}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default KpiCard;