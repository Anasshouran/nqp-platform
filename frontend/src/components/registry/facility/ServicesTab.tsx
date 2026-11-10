import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Alert, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip,
} from '@mui/material';

import { listServiceAvailability } from '../../../api/endpoints/registry';
import type { ServiceAvailability } from '../../../types/registry';

interface Props { facilityId: string; }

export function ServicesTab({ facilityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ServiceAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // M4-4-C-Part2-A: server-side filter via ?facility=
    listServiceAvailability(facilityId)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setError(t('registry.facility.services.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facilityId, t]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (items.length === 0) {
    return <Alert severity="info">{t('registry.facility.services.empty')}</Alert>;
  }
  return (
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
  );
}
