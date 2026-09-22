import Box from '@mui/material/Box';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DashboardHero from '../dashboard/DashboardHero';

interface AirportHeroProps {
  name: string;
  role: string;
  date: string;
  shift: string;
}

const dotSx = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  flexShrink: 0,
} as const;

/**
 * Airport-flavoured welcome banner built on the shared DashboardHero.
 */
const AirportHero = ({ name, role, date, shift }: AirportHeroProps) => (
  <DashboardHero
    eyebrow="لوحة مراقبة صحة المطارات"
    title={`مرحباً، ${name || 'المفتش'}`}
    subtitle={role}
    avatarLabel={(name || 'م').slice(0, 1)}
    chips={[
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <FlightTakeoffIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }} />
        {date}
      </Box>,
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ ...dotSx, bgcolor: '#7cf0c9', boxShadow: '0 0 0 4px rgba(124,240,201,0.25)' }} />
        الوردية: {shift}
      </Box>,
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Box className="pulse-dot" sx={{ ...dotSx, bgcolor: '#8ff5d4' }} />
        مباشر
      </Box>,
    ]}
  />
);

export default AirportHero;