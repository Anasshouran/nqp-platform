import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import apiClient from '../../../api/client';

export const ClearanceList = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/api/v1/shipping/clearance-decisions/').then(r => setItems(r.data.results || r.data || []));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Clearance Decisions</Typography>
      <Table>
        <TableHead><TableRow><TableCell>Vessel</TableCell><TableCell>Decision</TableCell><TableCell>Decided At</TableCell></TableRow></TableHead>
        <TableBody>
          {items.map((it: any) => (
            <TableRow key={it.id}><TableCell>{it.vessel_name || '-'}</TableCell><TableCell>{it.decision || '-'}</TableCell><TableCell>{it.decided_at || '-'}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};
