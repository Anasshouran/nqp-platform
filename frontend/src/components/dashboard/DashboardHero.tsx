import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type DashboardHeroGradient = 'emerald' | 'ocean' | 'amber';

interface DashboardHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  avatarLabel: string;
  /** Content rendered inside frosted-glass chips on the hero meta row. */
  chips?: ReactNode[];
  /** Optional action controls (e.g. period select, export button) placed before chips. */
  action?: ReactNode;
  gradient?: DashboardHeroGradient;
}

const backgrounds: Record<DashboardHeroGradient, { bg: string; glow: string }> = {
  emerald: { bg: 'linear-gradient(135deg, #06463c 0%, #0c7f6a 55%, #12a585 100%)', glow: 'rgba(12,127,106,0.55)' },
  ocean: { bg: 'linear-gradient(135deg, #0d2f63 0%, #2f6dd0 55%, #52a2f0 100%)', glow: 'rgba(47,109,208,0.5)' },
  amber: { bg: 'linear-gradient(135deg, #5c4410 0%, #8c6d1f 55%, #c59a35 100%)', glow: 'rgba(140,109,31,0.5)' },
};

const chipSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  px: 1.5,
  py: 0.75,
  borderRadius: 99,
  bgcolor: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.22)',
  backdropFilter: 'blur(6px)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: 'nowrap',
} as const;

/**
 * Shared glass-gradient welcome banner for SaaS dashboards. Carries a greeting,
 * eyebrow, optional chips row and a decorative watermark, tuned to a chosen
 * gradient family.
 */
const DashboardHero = ({ eyebrow, title, subtitle, avatarLabel, chips, action, gradient = 'emerald' }: DashboardHeroProps) => {
  const { bg, glow } = backgrounds[gradient];

  return (
    <Box
      className="fade-up"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        borderRadius: 4.5,
        p: { xs: 3, md: 4 },
        color: '#fff',
        background: bg,
        boxShadow: `0 18px 44px -14px ${glow}`,
        border: '1px solid rgba(255,255,255,0.16)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetInlineEnd: -64,
          insetBlockStart: -84,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 62%)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetInlineStart: -48,
          insetBlockEnd: -104,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.13), transparent 60%)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetInlineEnd: '22%',
          insetBlockEnd: -30,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 60%)',
        }}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        useFlexGap
        sx={{ position: 'relative' }}
      >
        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            sx={{
              width: { xs: 56, md: 66 },
              height: { xs: 56, md: 66 },
              bgcolor: 'rgba(255,255,255,0.18)',
              border: '2px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(6px)',
              fontSize: { xs: 24, md: 28 },
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {avatarLabel || '؟'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em', fontWeight: 700, mb: 0.5, display: 'block' }}
            >
              {eyebrow}
            </Typography>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {chips?.length || action ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            {action}
            {chips?.map((chip, i) => (
              <Box key={i} component="span" sx={chipSx}>
                {chip}
              </Box>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
};

export default DashboardHero;