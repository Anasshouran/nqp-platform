import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';

export const CardSkeleton = () => (
  <Stack spacing={1}>
    <Skeleton variant="rounded" height={18} width="60%" />
    <Skeleton variant="rounded" height={14} width="90%" />
    <Skeleton variant="rounded" height={14} width="80%" />
  </Stack>
);

export const CardsGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <Grid container spacing={3}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid item xs={12} sm={6} md={4} key={i}>
        <CardSkeleton />
      </Grid>
    ))}
  </Grid>
);

export const ListSkeleton = ({ count = 4 }: { count?: number }) => (
  <Stack spacing={2}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant="rounded" height={84} />
    ))}
  </Stack>
);

export const TableSkeleton = ({ count = 5 }: { count?: number }) => (
  <Stack spacing={1}>
    <Skeleton variant="rounded" height={48} />
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant="rounded" height={44} />
    ))}
  </Stack>
);
