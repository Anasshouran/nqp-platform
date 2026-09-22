import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
}

/**
 * Unified page header for list/detail/form views across the platform.
 * Upgraded to the modern SaaS language (gradient eyebrow chip + refined
 * typography) while keeping a compact, non-hero footprint and identical API.
 */
const PageHeader = ({ title, subtitle, eyebrow, action }: PageHeaderProps) => {
  usePageTitle(title);

  return (
  <Box
    component="header"
    sx={{
      mb: 3.5,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 2,
    }}
  >
    <Box sx={{ minWidth: 0, maxWidth: 760 }}>
      {eyebrow && (
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          component="span"
          sx={{
            display: 'inline-flex',
            mb: 1.25,
            px: 1.6,
            py: 0.5,
            borderRadius: '999px',
            bgcolor: 'rgba(12,127,106,0.08)',
            border: '1px solid rgba(12,127,106,0.22)',
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(12,127,106,0.14)',
            }}
          />
          <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.dark', letterSpacing: '0.1em', fontSize: 11, lineHeight: 1.6 }}>
            {eyebrow}
          </Typography>
        </Stack>
      )}
      <Typography
        variant="h1"
        component="h1"
        sx={{ mb: subtitle ? 1 : 0, textWrap: 'balance', fontWeight: 800, letterSpacing: '-0.01em' }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680, textWrap: 'pretty', lineHeight: 1.7 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{action}</Box>}
  </Box>
  );
};

export default PageHeader;