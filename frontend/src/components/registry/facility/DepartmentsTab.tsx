import { Box, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { DepartmentNodeAssignment } from '../../../types/registry';

interface Props { items: DepartmentNodeAssignment[]; }

export function DepartmentsTab({ items }: Props) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return <Alert severity="info">{t('registry.facility.departments.empty')}</Alert>;
  }
  return (
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
  );
}