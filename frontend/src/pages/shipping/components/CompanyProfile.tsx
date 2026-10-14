import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import apiClient from '../../../api/client';

export const CompanyProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    apiClient.get('/carriers/company/profile/').then(r => setProfile(r.data.data || r.data));
  }, []);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Company Profile</Typography>
      <Typography>{profile?.name || 'Loading...'}</Typography>
    </Box>
  );
};
