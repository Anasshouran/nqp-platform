import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Alert, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button, Typography, Stack,
} from '@mui/material';

import { listDepartmentAssignmentsPaginated } from '../../../api/endpoints/registry';
import type { DepartmentNodeAssignment } from '../../../types/registry';
import type { PaginatedResponse } from '../../../api/endpoints/registry';

interface Props { facilityId: string; }

export function DepartmentsTab({ facilityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<DepartmentNodeAssignment[]>([]);
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
    listDepartmentAssignmentsPaginated(facilityId, 1)
      .then((resp: PaginatedResponse<DepartmentNodeAssignment>) => {
        if (cancelled) return;
        setItems(resp.results ?? []);
        setTotal(resp.count ?? 0);
        setHasMore(resp.next !== null);
      })
      .catch(() => { if (!cancelled) setError(t('registry.facility.departments.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facilityId, t]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    listDepartmentAssignmentsPaginated(facilityId, next)
      .then((resp) => {
        setItems((prev) => [...prev, ...(resp.results ?? [])]);
        setTotal(resp.count ?? total);
        setHasMore(resp.next !== null);
        setPage(next);
      })
      .catch(() => setError(t('registry.facility.departments.error')))
      .finally(() => setLoadingMore(false));
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (items.length === 0) {
    return <Alert severity="info">{t('registry.facility.departments.empty')}</Alert>;
  }
  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Department</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Node</TableCell>
            <TableCell>Primary</TableCell>
            <TableCell>Valid from</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.department_name}</TableCell>
              <TableCell>{d.department_code}</TableCell>
              <TableCell>{d.node_code}</TableCell>
              <TableCell>{d.is_primary ? 'yes' : '—'}</TableCell>
              <TableCell>{d.valid_from}</TableCell>
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
