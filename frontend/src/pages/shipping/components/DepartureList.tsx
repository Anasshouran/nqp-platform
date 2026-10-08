import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import apiClient from '../../../api/client';

export const DepartureList = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/api/v1/port-health/visits/?status=DEPARTED').then(r => setItems(r.data.results || r.data || []));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Departures</Typography>
      <Table>
        <TableHead><TableRow><TableCell>Vessel</TableCell><TableCell>Port</TableCell><TableCell>Departure Date</TableCell></TableRow></TableHead>
        <TableBody>
          {items.map((it: any) => (
            <TableRow key={it.id}><TableCell>{it.vessel_name || '-'}</TableCell><TableCell>{it.port_name || '-'}</TableCell><TableCell>{it.departure_date || '-'}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};
