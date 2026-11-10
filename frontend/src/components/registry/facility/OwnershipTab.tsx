import { Box, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { FacilityOwnership } from '../../../types/registry';

interface Props { items: FacilityOwnership[]; }

export function OwnershipTab({ items }: Props) {
  const { t } = useTranslation();
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