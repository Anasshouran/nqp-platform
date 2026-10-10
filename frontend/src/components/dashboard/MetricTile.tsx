import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import { formatNumber } from '../../utils/formatters';

export interface SparkPoint {
  label: string;
  value: number;
}

interface MetricTileProps {
  label: string;
  value: number | null | undefined;
  icon?: ReactNode;
  /** Palette token e.g. 'success.main'. */
  accent?: string;
  /** Context line under the value, e.g. "من 80 نظامًا". */
  caption?: ReactNode;
  /** Optional trailing trend badge. */
  delta?: { label: string; positive?: boolean };
  /** Bar series for the inline sparkline. */
  series?: SparkPoint[];
  /** Renders the tile as a link/button. */
  onClick?: () => void;
  loading?: boolean;
  /** Forces the alert treatment (error ink + border) regardless of accent. */
  alert?: boolean;
}

const resolveToken = (theme: Theme, token?: string): string => {
  if (!token) return theme.palette.primary.main;
  if (token.includes('.')) {
    const [group, shade] = token.split('.');
    const entry = theme.palette[group as keyof typeof theme.palette];
    if (entry && typeof entry === 'object') {
      const v = (entry as unknown as Record<string, unknown>)[shade];
      if (typeof v === 'string') return v;
    }
  }
  const fallback = theme.palette[token as keyof typeof theme.palette];
  return typeof fallback === 'string' ? fallback : theme.palette.primary.main;
};

/**
 * Glass KPI tile. Renders as a real `<button>` when `onClick` is supplied so it
 * is keyboard-reachable and announced as actionable without a bespoke
 * role/tabIndex/keydown triple. The sparkline is decorative — the value is
 * already in text — so it carries `aria-hidden`.
 */
const MetricTile = ({
  label,
  value,
  icon,
  accent = 'primary.main',
  caption,
  delta,
  series,
  onClick,
  loading = false,
  alert = false,
}: MetricTileProps) => {
  const theme = useTheme();
  const color = alert ? theme.palette.error.main : resolveToken(theme, accent);
  const max = series?.length ? Math.max(...series.map((p) => p.value), 1) : 1;

  const body = (
    <>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: `linear-gradient(180deg, ${color}, ${alpha(color, 0.25)})`,
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 600, lineHeight: 1.5, textWrap: 'balance' }}
        >
          {label}
        </Typography>
        {icon && (
          <Box
            aria-hidden
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              color,
              bgcolor: alpha(color, 0.1),
              border: `1px solid ${alpha(color, 0.18)}`,
              flexShrink: 0,
              '& svg': { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {loading ? (
        <Skeleton variant="text" width="60%" height={44} />
      ) : (
        <Typography
          sx={{
            fontSize: { xs: '1.6rem', sm: '1.85rem' },
            lineHeight: 1.15,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: alert ? 'error.dark' : 'text.primary',
          }}
        >
          {formatNumber(value)}
        </Typography>
      )}

      {series && series.length > 0 && !loading && (
        <Box
          aria-hidden
          sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 26, mt: 0.25 }}
        >
          {series.map((p) => (
            <Box
              key={p.label}
              title={`${p.label}: ${formatNumber(p.value)}`}
              sx={{
                flex: 1,
                minWidth: 3,
                height: `${Math.max((p.value / max) * 100, 6)}%`,
                borderRadius: '3px 3px 1px 1px',
                bgcolor: alpha(color, p.value === 0 ? 0.1 : 0.55),
              }}
            />
          ))}
        </Box>
      )}

      {(caption || delta) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {caption && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {caption}
            </Typography>
          )}
          {delta && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: delta.positive === false ? 'error.main' : 'success.main',
                whiteSpace: 'nowrap',
              }}
            >
              {delta.label}
            </Typography>
          )}
        </Box>
      )}
    </>
  );

  const sx = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    p: 2.25,
    height: '100%',
    overflow: 'hidden',
    borderRadius: 4,
    textAlign: 'start' as const,
    font: 'inherit',
    color: 'inherit',
    border: `1px solid ${alert ? alpha(theme.palette.error.main, 0.32) : 'rgba(16,40,34,0.08)'}`,
    bgcolor: alert ? alpha(theme.palette.error.main, 0.04) : 'rgba(255,255,255,0.82)',
    backgroundImage: alert ? 'none' : 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0))',
    backdropFilter: 'blur(18px) saturate(1.35)',
    boxShadow: alert
      ? '0 1px 2px rgba(16,40,34,0.03), 0 10px 26px rgba(198,58,58,0.1)'
      : '0 1px 2px rgba(16,40,34,0.03), 0 10px 26px rgba(16,40,34,0.06)',
    transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
    cursor: onClick ? 'pointer' : 'default',
    ...(onClick && {
      '&:hover': {
        transform: 'translateY(-2px)',
        borderColor: alpha(color, 0.34),
        boxShadow: `0 8px 20px -10px ${alpha(color, 0.4)}, 0 14px 44px rgba(16,40,34,0.1)`,
      },
      '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 4px ${alpha(color, 0.32)}` },
    }),
  };

  if (onClick) {
    return (
      <Box component="button" type="button" onClick={onClick} sx={sx}>
        {body}
      </Box>
    );
  }

  return <Box sx={sx}>{body}</Box>;
};

export default MetricTile;
