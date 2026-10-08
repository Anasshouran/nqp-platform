import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import apiClient from '../../../api/client';

export const AgentManagement = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/api/v1/shipping/agents/').then(r => setItems(r.data.results || r.data || []));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Shipping Agents</Typography>
      <Typography>{items.length} agent(s)</Typography>
    </Box>
  );
};
