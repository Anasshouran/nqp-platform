import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Alert, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip,
} from '@mui/material';

import { listFacilityOwnerships } from '../../../api/endpoints/registry';
import type { FacilityOwnership } from '../../../types/registry';

interface Props { facilityId: string; }

export function OwnershipTab({ facilityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<FacilityOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // M4-4-C-Part2-A: server-side filter via ?facility=
    listFacilityOwnerships(facilityId)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setError(t('registry.facility.ownership.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facilityId, t]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (items.length === 0) {
    return <Alert severity="info">{t('registry.facility.ownership.empty')}</Alert>;
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Owner</TableCell>
          <TableCell>Primary</TableCell>
          <TableCell>Valid from</TableCell>
          <TableCell>Valid to</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((o) => (
          <TableRow key={o.id}>
            <TableCell>{o.owner_name ?? o.owner}</TableCell>
            <TableCell>{o.is_primary ? <Chip label="primary" size="small" color="primary" /> : '—'}</TableCell>
            <TableCell>{o.valid_from}</TableCell>
            <TableCell>{o.valid_to ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
