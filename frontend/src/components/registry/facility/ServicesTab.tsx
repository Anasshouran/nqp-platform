import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Alert, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button, Typography, Stack,
} from '@mui/material';

import { listServiceAvailabilityPaginated } from '../../../api/endpoints/registry';
import type { ServiceAvailability } from '../../../types/registry';
import type { PaginatedResponse } from '../../../api/endpoints/registry';

interface Props { facilityId: string; }

export function ServicesTab({ facilityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ServiceAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);
    setItems([]);
    listServiceAvailabilityPaginated(facilityId, 1)
      .then((resp: PaginatedResponse<ServiceAvailability>) => {
        if (cancelled) return;
        setItems(resp.results ?? []);
        setTotal(resp.count ?? 0);
        setHasMore(resp.next !== null);
      })
      .catch(() => { if (!cancelled) setError(t('registry.facility.services.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facilityId, t]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    listServiceAvailabilityPaginated(facilityId, next)
      .then((resp) => {
        setItems((prev) => [...prev, ...(resp.results ?? [])]);
        setTotal(resp.count ?? total);
        setHasMore(resp.next !== null);
        setPage(next);
      })
      .catch(() => setError(t('registry.facility.services.error')))
      .finally(() => setLoadingMore(false));
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (items.length === 0) {
    return <Alert severity="info">{t('registry.facility.services.empty')}</Alert>;
  }
  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Service</TableCell>
            <TableCell>Target</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Valid from</TableCell>
            <TableCell>Valid to</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.service_name ?? s.service}</TableCell>
              <TableCell>{s.target_type}</TableCell>
              <TableCell>{s.is_active ? <Chip label="active" size="small" color="success" /> : '—'}</TableCell>
              <TableCell>{s.valid_from}</TableCell>
              <TableCell>{s.valid_to ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Typography variant="caption">{t('registry.common.showing_n_of_m', { shown: items.length, total })}</Typography>
        {hasMore && (
          <Button size="small" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <CircularProgress size={14} /> : t('registry.common.load_more')}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
