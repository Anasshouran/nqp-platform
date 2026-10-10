import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import apiClient from '../../../api/client';

export const VesselList = () => {
  const [vessels, setVessels] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/api/v1/carriers/vessels/').then(r => setVessels(r.data.results || r.data || [])).catch(() => setError('Failed to load vessels'));
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Vessels</Typography>
      <Card><CardContent>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>IMO</TableCell><TableCell>Type</TableCell></TableRow></TableHead>
          <TableBody>
            {vessels.map((v: any) => (
              <TableRow key={v.id}><TableCell>{v.name || v.vessel_name}</TableCell><TableCell>{v.imo_number || '-'}</TableCell><TableCell>{v.vessel_type || '-'}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </Box>
  );
};
