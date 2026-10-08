import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import apiClient from '../../../api/client';

export const NotificationList = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/api/v1/notifications/').then(r => setItems(r.data.results || r.data || [])).catch(() => setItems([]));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Notifications</Typography>
      <Typography>{items.length} notification(s)</Typography>
    </Box>
  );
};
