import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import apiClient from '../../../api/client';

export const VesselVisitList = () => {
  const [visits, setVisits] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/api/v1/port-health/visits/').then(r => setVisits(r.data.results || r.data || []));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Vessel Visits</Typography>
      <Table>
        <TableHead><TableRow><TableCell>Vessel</TableCell><TableCell>Port</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>
          {visits.map((v: any) => (
            <TableRow key={v.id}><TableCell>{v.vessel_name || '-'}</TableCell><TableCell>{v.port_name || '-'}</TableCell><TableCell>{v.status || '-'}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};
