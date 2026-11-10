import { Box, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { TechnicalSupervision } from '../../../types/registry';

interface Props { items: TechnicalSupervision[]; }

export function SupervisionTab({ items }: Props) {
  const { t } = useTranslation();
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