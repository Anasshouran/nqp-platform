import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

export interface StatusSegment {
  label: string;
  value: number;
  /** Palette token, e.g. 'success.main' */
  color: string;
}

interface StatusBarProps {
  segments: StatusSegment[];
  /** Renders the numeric legend beneath the bar. Defaults to true. */
  showLegend?: boolean;
  /** Accessible description of what the bar summarises. */
  ariaLabel: string;
  height?: number;
}

/**
 * Stacked proportional bar for a status breakdown (online / warning / offline).
 *
 * Each segment carries a text legend, so the colour split is never the only
 * carrier of meaning. The bar itself is exposed as an image with a single
 * summarised label and `aria-hidden` on the decorative fills — screen readers
 * get one clean sentence instead of five meaningless divs.
 */
const StatusBar = ({ segments, showLegend = true, ariaLabel, height = 10 }: StatusBarProps) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  if (total <= 0) {
    return (
      <Box>
        <Box
          role="img"
          aria-label={`${ariaLabel}: لا توجد بيانات`}
          sx={{ height, borderRadius: 99, bgcolor: 'rgba(16,40,34,0.08)' }}
        />
        {showLegend && (
          <Typography variant="caption" color="text.secondary">
            لا توجد بيانات
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box
        role="img"
        aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join('، ')}`}
        sx={{
          display: 'flex',
          height,
          borderRadius: 99,
          overflow: 'hidden',
          bgcolor: 'rgba(16,40,34,0.08)',
          boxShadow: 'inset 0 1px 2px rgba(16,40,34,0.1)',
          '& > span': { transition: 'flex-grow 400ms cubic-bezier(0.22,1,0.36,1)' },
        }}
      >
        {visible.map((s) => (
          <Box
            key={s.label}
            aria-hidden
            sx={{
              flexGrow: s.value,
              flexBasis: 0,
              minWidth: 4,
              bgcolor: s.color,
              boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.35)}`,
            }}
          />
        ))}
      </Box>

      {showLegend && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
          {segments.map((s) => (
            <Box key={s.label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                aria-hidden
                sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {s.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default StatusBar;
