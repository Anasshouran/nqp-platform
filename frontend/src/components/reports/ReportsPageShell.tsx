import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import PageHeader from '../common/PageHeader';

export interface ReportsPageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Header action slot (e.g. the window selector on the sector report). */
  action?: ReactNode;
  /**
   * Optional element rendered between the header and the KPI grid
   * (e.g. the "back to dashboard" button on the IT report).
   */
  headerExtra?: ReactNode;
  /** KPI `<Grid item>` cards. */
  kpis: ReactNode;
  /** Content `<Grid item>` blocks (usually `SectionCard`s). */
  children: ReactNode;
}

/**
 * Shared layout chrome for report pages: page header + KPI grid + content grid.
 *
 * Purely presentational — data fetching, loading skeletons and error handling
 * stay in the page, because report pages render per-card / per-section
 * skeletons rather than a single page-level loader.
 */
export const ReportsPageShell = ({
  eyebrow,
  title,
  subtitle,
  action,
  headerExtra,
  kpis,
  children,
}: ReportsPageShellProps) => (
  <Box>
    <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} />
    {headerExtra}
    <Grid container spacing={2.5} sx={{ mb: 4 }}>
      {kpis}
    </Grid>
    <Grid container spacing={3}>
      {children}
    </Grid>
  </Box>
);

export default ReportsPageShell;
