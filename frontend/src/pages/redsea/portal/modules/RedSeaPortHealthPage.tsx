import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import AnchorIcon from '@mui/icons-material/Anchor';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import GroupsIcon from '@mui/icons-material/Groups';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { PageHeader, SectionCard, EmptyState } from '../../../../components/uikit';
import { getSeaPorts, getVessels, getVesselVisits, getCrewMembers } from '../../../../api/endpoints/portHealth';
import { useList } from './shared';
import type { VesselVisit } from '../../../../types/portHealth';

const statusLabels: Record<string, string> = {
  PENDING: 'بانتظار',
  ARRIVED: 'وصلت',
  INSPECTED: 'تم الفحص',
  CLEARED: 'مفرج عنها',
  QUARANTINED: 'حجر صحي',
  DEPARTED: 'غادرت',
};

const RedSeaPortHealthPage = () => {
  const ports = useList(getSeaPorts, { is_active: 'true' });
  const vessels = useList(getVessels);
  const visits = useList<VesselVisit>(getVesselVisits, { page_size: 8 });
  const crew = useList(getCrewMembers, { page_size: 8 });

  const kpis = [
    { label: 'الموانئ', value: ports.count, icon: <AnchorIcon />, color: 'primary.main' as const },
    { label: 'السفن', value: vessels.count, icon: <DirectionsBoatIcon />, color: 'info.main' as const },
    { label: 'زيارات السفن', value: visits.count, icon: <DirectionsBoatIcon />, color: 'success.main' as const },
    { label: 'أفراد الطاقم', value: crew.count, icon: <GroupsIcon />, color: 'warning.main' as const },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="الأنظمة التشغيلية"
        title="صحة الموانئ — قطاع البحر الأحمر"
        subtitle="سفن وزيارات وأفراد الطاقم في منافذ قطاع البحر الأحمر."
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={3} key={k.label}>
            {ports.loading && vessels.loading ? (
              <Skeleton variant="rounded" height={110} />
            ) : (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: k.color, display: 'flex' }}>{k.icon}</Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>{k.value}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="زيارات السفن الأخيرة" subtitle="آخر الزيارات في القطاع">
            {visits.loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : visits.data.length === 0 ? (
              <EmptyState title="لا توجد زيارات" description="لم تُسجّل زيارات سفن ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {visits.data.map((v) => (
                  <Stack key={v.id} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: 'primary.main', display: 'flex' }}><DirectionsBoatIcon /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {v.vessel_name || v.vessel}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {v.port_name || v.port} — {v.berth_code || 'رصيف'}
                      </Typography>
                    </Box>
                    <Chip size="small" label={statusLabels[v.status] ?? v.status} variant="outlined" color={v.status === 'QUARANTINED' ? 'error' : 'default'} />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="منافذ القطاع" subtitle="الموانئ المسجلة">
            {ports.loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : ports.data.length === 0 ? (
              <EmptyState title="لا توجد موانئ" description="لم تُسجّل موانئ ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {ports.data.map((p) => (
                  <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: 'info.main', display: 'flex' }}><AnchorIcon fontSize="small" /></Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name_ar || p.name_en}</Typography>
                    <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ mr: 'auto' }}>{p.code}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
          <SectionCard title="أفراد الطاقم" subtitle="أحدث الأطقم المسجلة" sx={{ mt: 2.5 }}>
            {crew.loading ? (
              <Skeleton height={80} />
            ) : crew.data.length === 0 ? (
              <EmptyState title="لا يوجد أطقم" description="لم تُسجّل أطقم ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {crew.data.slice(0, 5).map((c) => (
                  <Stack key={c.id} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: 'success.main', display: 'flex' }}><HealthAndSafetyIcon fontSize="small" /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{c.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{c.job_title} — {c.nationality}</Typography>
                    </Box>
                    <Chip size="small" label={c.health_status} />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaPortHealthPage;
