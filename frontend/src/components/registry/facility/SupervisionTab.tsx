import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Alert, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button, Typography, Stack,
} from '@mui/material';

import { listTechnicalSupervisionsPaginated } from '../../../api/endpoints/registry';
import type { TechnicalSupervision } from '../../../types/registry';
import type { PaginatedResponse } from '../../../api/endpoints/registry';

interface Props { facilityId: string; }

export function SupervisionTab({ facilityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TechnicalSupervision[]>([]);
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
    listTechnicalSupervisionsPaginated(facilityId, 1)
      .then((resp: PaginatedResponse<TechnicalSupervision>) => {
        if (cancelled) return;
        setItems(resp.results ?? []);
        setTotal(resp.count ?? 0);
        setHasMore(resp.next !== null);
      })
      .catch(() => { if (!cancelled) setError(t('registry.facility.supervision.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facilityId, t]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    listTechnicalSupervisionsPaginated(facilityId, next)
      .then((resp) => {
        setItems((prev) => [...prev, ...(resp.results ?? [])]);
        setTotal(resp.count ?? total);
        setHasMore(resp.next !== null);
        setPage(next);
      })
      .catch(() => setError(t('registry.facility.supervision.error')))
      .finally(() => setLoadingMore(false));
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (items.length === 0) {
    return <Alert severity="info">{t('registry.facility.supervision.empty')}</Alert>;
  }
  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Supervisor</TableCell>
            <TableCell>Domain</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Primary</TableCell>
            <TableCell>Valid from</TableCell>
            <TableCell>Valid to</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.supervisor_name}</TableCell>
              <TableCell>{s.supervisor_domain}</TableCell>
              <TableCell>{s.supervision_level}</TableCell>
              <TableCell>{s.is_primary ? <Chip label="primary" size="small" color="primary" /> : '—'}</TableCell>
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
