import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useAuth } from '../../../hooks/useAuth';
import apiClient from '../../../api/client';

export const ShippingDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ vessels: 0, visits: 0, arrivals: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/v1/carriers/vessels/?page_size=1'),
      apiClient.get('/api/v1/port-health/visits/?page_size=1'),
      apiClient.get('/api/v1/borders-health/arrivals/?page_size=1'),
    ])
      .then(([v, s, a]) => setStats({ vessels: v.data.count || 0, visits: s.data.count || 0, arrivals: a.data.count || 0 }))
      .catch(() => setError('Failed to load stats'));
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Shipping Dashboard</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="h6">Vessels</Typography><Typography variant="h3">{stats.vessels}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="h6">Visits</Typography><Typography variant="h3">{stats.visits}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent><Typography variant="h6">Arrivals</Typography><Typography variant="h3">{stats.arrivals}</Typography></CardContent></Card></Grid>
      </Grid>
    </Box>
  );
};
