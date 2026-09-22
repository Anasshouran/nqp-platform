import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const formatTime = (date: Date) =>
  date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatDate = (date: Date) =>
  date.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const LiveClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} aria-hidden="true">
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <AccessTimeIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(now)}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ opacity: 0.75 }}>
        {formatDate(now)}
      </Typography>
    </Stack>
  );
};

export default LiveClock;
