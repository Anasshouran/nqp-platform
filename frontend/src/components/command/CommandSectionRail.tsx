import { Stack } from '@mui/material';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { CommandSectionDef } from './useCommandSections';

export interface CommandSectionRailProps {
  sections: CommandSectionDef[];
  active: string;
  onNavigate: (id: string) => void;
  /** Color token e.g. "primary.main" — shapes the active chip. */
  accent?: string;
  /** Label shown above the chip bar on wide screens. */
  label?: string;
}

const resolveToken = (theme: Theme, token: string): string => {
  if (!token.includes('.')) return token;
  const [group, shade] = token.split('.');
  const entry = theme.palette[group as keyof typeof theme.palette];
  if (entry && typeof entry === 'object' && shade) {
    const v = (entry as unknown as Record<string, unknown>)[shade];
    if (typeof v === 'string') return v;
  }
  return theme.palette.primary.main;
};

/**
 * Command-center section navigation. Renders a horizontal chip bar above the
 * page content on all breakpoints (an app sidebar already exists), so it never
 * competes with the role drawer. Scrols horizontally on narrow screens and
 * wraps into rows on wide screens.
 */
const CommandSectionRail = ({
  sections,
  active,
  onNavigate,
  accent = 'primary.main',
  label = 'الأقسام',
}: CommandSectionRailProps) => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up('md'));
  const color = resolveToken(theme, accent);

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        flexWrap: isWide ? 'wrap' : 'nowrap',
        overflowX: isWide ? 'visible' : 'auto',
        alignItems: 'center',
        rowGap: 1,
        pb: isWide ? 0 : 0.5,
        mb: 2,
        '::-webkit-scrollbar': { height: 3 },
      }}
    >
      {isWide ? (
        <Typography
          variant="overline"
          sx={{ mr: 0.5, color: 'text.disabled', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}
        >
          {label}
        </Typography>
      ) : null}
      {sections.map((s) => {
        const current = active === s.id;
        return (
          <Chip
            key={s.id}
            icon={s.icon}
            label={s.label}
            onClick={() => onNavigate(s.id)}
            sx={{
              flexShrink: 0,
              fontWeight: 700,
              color: current ? '#fff' : 'text.secondary',
              bgcolor: current ? color : 'rgba(255,255,255,0.7)',
              border: `1px solid ${alpha(color, current ? 1 : 0.25)}`,
              borderRadius: 99,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        );
      })}
    </Stack>
  );
};

export default CommandSectionRail;