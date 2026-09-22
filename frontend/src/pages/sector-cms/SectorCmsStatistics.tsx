import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ScienceIcon from '@mui/icons-material/Science';
import { SectorPageShell, SectorHomeLink, sectorBareName, useSectorSite, ErrorNotice, usePageTitle } from './SectorCmsShared';
import { getPublicStatistics } from '../../api/endpoints/public';
import type { PublicStatistics } from '../../api/endpoints/public';

const SectorCmsStatistics = () => {
  const { sector, loading } = useSectorSite();
  const [stats, setStats] = useState<PublicStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  usePageTitle('الإحصائيات');

  useEffect(() => {
    if (!sector) return;
    setStatsLoading(true);
    getPublicStatistics({ sector: sector.code })
      .then((res) => setStats(res.data.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [sector]);

  if (loading) {
    return (
      <SectorPageShell>
        <Skeleton variant="rounded" height={180} />
      </SectorPageShell>
    );
  }

  if (!sector) {
    return (
      <SectorPageShell>
        <ErrorNotice title="قطاع غير متاح" />
      </SectorPageShell>
    );
  }

  const cards = [
    { label: 'منافذ دخول', value: stats?.entry_points ?? 0, icon: <LocationOnIcon />, scope: 'القطاع' },
    { label: 'فحوصات صحية', value: stats?.screenings ?? 0, icon: <HealthAndSafetyIcon />, scope: 'القطاع' },
    { label: 'شهادات صادرة', value: stats?.certificates ?? 0, icon: <WorkspacePremiumIcon />, scope: 'المنصة' },
    { label: 'شحنات غذائية', value: stats?.food_shipments ?? 0, icon: <Inventory2Icon />, scope: 'القطاع' },
    { label: 'عينات مختبر', value: stats?.lab_samples ?? 0, icon: <ScienceIcon />, scope: 'المنصة' },
  ];

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>الإحصائيات</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        مؤشرات تشغيلية لقطاع {sectorBareName(sector.name_ar)} — تشمل «المنصة» المؤشرات الوطنية المشتركة.
      </Typography>

      {statsLoading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={120} /></Grid>
          ))}
        </Grid>
      ) : !stats ? (
        <ErrorNotice title="لا توجد بيانات إحصائيات" />
      ) : (
        <Grid container spacing={2.5}>
          {cards.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.label}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light' }}>
                    {c.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                      {c.value.toLocaleString('ar-EG')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{c.label}</Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }} />
                  <Chip
                    label={c.scope}
                    size="small"
                    sx={{ alignSelf: 'flex-start', mt: -0.5, fontSize: '0.65rem', fontWeight: 700 }}
                    color={c.scope === 'القطاع' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="caption" color="text.secondary">
          الفترة: {stats?.period || '—'} — «القطاع» مؤشرات خاصة بقطاع {sectorBareName(sector.name_ar)}، و«المنصة» مؤشرات وطنية مشتركة.
        </Typography>
      </Box>
    </SectorPageShell>
  );
};

export default SectorCmsStatistics;
