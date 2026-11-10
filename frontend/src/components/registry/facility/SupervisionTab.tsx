import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Alert, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Chip,
} from '@mui/material';

import { listTechnicalSupervisions } from '../../../api/endpoints/registry';
import type { TechnicalSupervision } from '../../../types/registry';

interface Props { facilityId: string; }

export function SupervisionTab({ facilityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TechnicalSupervision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // M4-4-C-Part2-A: server-side filter via ?facility=
    listTechnicalSupervisions(facilityId)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setError(t('registry.facility.supervision.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facilityId, t]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (items.length === 0) {
    return <Alert severity="info">{t('registry.facility.supervision.empty')}</Alert>;
  }
  return (
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
  );
}
