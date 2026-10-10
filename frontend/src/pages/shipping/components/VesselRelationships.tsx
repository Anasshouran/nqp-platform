import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import apiClient from '../../../api/client';

export const VesselRelationships = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/api/v1/shipping/vessel-relationships/').then(r => setItems(r.data.results || r.data || []));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Vessel Relationships</Typography>
      <Typography>{items.length} relationship(s)</Typography>
    </Box>
  );
};
