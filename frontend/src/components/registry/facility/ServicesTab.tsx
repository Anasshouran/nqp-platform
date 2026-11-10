import { Box, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { ServiceAvailability } from '../../../types/registry';

interface Props { items: ServiceAvailability[]; }

export function ServicesTab({ items }: Props) {
  const { t } = useTranslation();
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