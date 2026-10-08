import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import apiClient from '../../../api/client';

export const PreArrivalList = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/api/v1/shipping/pre-arrival-notifications/').then(r => setItems(r.data.results || r.data || []));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Pre-Arrival Notifications</Typography>
      <Table>
        <TableHead><TableRow><TableCell>Vessel</TableCell><TableCell>Expected Arrival</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>
          {items.map((it: any) => (
            <TableRow key={it.id}><TableCell>{it.vessel_name || '-'}</TableCell><TableCell>{it.expected_arrival || '-'}</TableCell><TableCell>{it.status || '-'}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};
