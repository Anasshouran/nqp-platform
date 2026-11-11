import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Alert, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';

import { listDepartmentAssignments } from '../../../api/endpoints/registry';
import type { DepartmentNodeAssignment } from '../../../types/registry';

interface Props { facilityId: string; }

export function DepartmentsTab({ facilityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<DepartmentNodeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // D-M4-4-B-4 fix: filter via ?department__facility= (department's facility).
    listDepartmentAssignments(facilityId)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setError(t('registry.facility.departments.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facilityId, t]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
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
