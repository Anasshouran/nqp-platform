import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import InventoryIcon from '@mui/icons-material/Inventory';
import ScienceIcon from '@mui/icons-material/Science';
import { useSectorPortal } from '../../components/sectors/SectorPortalLayout';
import { EmptyState } from '../../components/common';
import { getSectorStatistics } from '../../api/endpoints/public';
import type { SectorStatistics } from '../../api/endpoints/public';

const SectorPortalStatistics = () => {
  const { sector } = useSectorPortal();
  const [stats, setStats] = useState<SectorStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sector) { setLoading(false); return; }
    setLoading(true);
    getSectorStatistics(sector.id)
      .then((res) => setStats(res.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [sector]);

  if (loading) return <Skeleton variant="rounded" height={200} />;
  if (!stats) return <EmptyState icon={<LocationOnIcon />} title="لا توجد إحصائيات" />;

  const statCards = [
    { value: stats.entry_points, label: 'نقاط الدخول', icon: <LocationOnIcon />, color: '#0e8a72', scope: 'القطاع' },
    { value: stats.screenings, label: 'الفحوصات الصحية', icon: <HealthAndSafetyIcon />, color: '#2f6f9f', scope: 'القطاع' },
    { value: stats.certificates, label: 'الشهادات الصادرة', icon: <WorkspacePremiumIcon />, color: '#c8a13a', scope: 'المنصة' },
    { value: stats.food_shipments, label: 'الشحنات الغذائية', icon: <InventoryIcon />, color: '#b3544b', scope: 'القطاع' },
    { value: stats.lab_samples, label: 'العينات المخبرية', icon: <ScienceIcon />, color: '#7a5c9e', scope: 'المنصة' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>إحصائيات القطاع</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        أداء {sector?.name_ar || 'القطاع'} — «المنصة» مؤشرات وطنية مشتركة.
      </Typography>

      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={4} key={stat.label}>
            <Card sx={{ height: '100%', borderTop: `4px solid ${stat.color}` }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: stat.color, bgcolor: `${stat.color}1a`, flexShrink: 0 }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{stat.value}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>{stat.label}</Typography>
                </Box>
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  label={stat.scope}
                  size="small"
                  sx={{ alignSelf: 'flex-start', mt: -0.5, fontSize: '0.65rem', fontWeight: 700 }}
                  color={stat.scope === 'القطاع' ? 'primary' : 'default'}
                  variant="outlined"
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SectorPortalStatistics;
