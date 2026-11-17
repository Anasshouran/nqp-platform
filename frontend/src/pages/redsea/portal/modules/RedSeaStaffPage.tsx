import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import GroupsIcon from '@mui/icons-material/Groups';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BadgeIcon from '@mui/icons-material/Badge';
import PersonIcon from '@mui/icons-material/Person';
import { PageHeader, SectionCard, EmptyState } from '../../../../components/uikit';
import { getSectorDashboard } from '../../../../api/endpoints/reports';
import type { SectorDashboard } from '../../../../api/endpoints/reports';

const RedSeaStaffPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSectorDashboard({ window: 'all' })
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(
    () => (data?.departments ?? []).slice().sort((a, b) => b.score - a.score),
    [data]
  );
  const staff = data?.staff ?? [];

  const kpis = [
    { label: t('redsea.portal.modules.staff.kpi.staff.label'), value: data?.kpis?.staff ?? 0, icon: <GroupsIcon />, color: 'primary.main' as const },
    { label: t('redsea.portal.modules.staff.kpi.departments.label'), value: departments.length, icon: <AccountTreeIcon />, color: 'info.main' as const },
    { label: t('redsea.portal.modules.staff.kpi.ports.label'), value: data?.kpis?.ports ?? 0, icon: <BadgeIcon />, color: 'success.main' as const },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow={t('redsea.portal.modules.staff.eyebrow')}
        title={t('redsea.portal.modules.staff.title')}
        subtitle={t('redsea.portal.modules.staff.subtitle')}
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={4} key={k.label}>
            {loading ? (
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
        <Grid item xs={12} lg={5}>
          <SectionCard title={t('redsea.portal.modules.staff.departmentsSection.title')} subtitle={t('redsea.portal.modules.staff.departmentsSection.subtitle')}>
            {loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : departments.length === 0 ? (
              <EmptyState title={t('redsea.portal.modules.staff.departmentsEmpty.title')} description={t('redsea.portal.modules.staff.departmentsEmpty.description')} />
            ) : (
              <Stack spacing={2}>
                {departments.map((d) => (
                  <Box key={d.id}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle', mr: 1, color: 'primary.main' }}><AccountTreeIcon fontSize="small" /></Box>
                        {d.name}
                      </Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">{t('redsea.portal.modules.staff.staffCount', { count: d.staff })}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.score}</Typography>
                      </Stack>
                    </Stack>
                    <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, height: 8, overflow: 'hidden' }}>
                      <Box sx={{ width: `${Math.min(100, d.score)}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={7}>
          <SectionCard title={t('redsea.portal.modules.staff.staffSection.title')} subtitle={t('redsea.portal.modules.staff.staffSection.subtitle')}>
            {loading ? (
              <Stack spacing={1}><Skeleton height={50} /><Skeleton height={50} /></Stack>
            ) : staff.length === 0 ? (
              <EmptyState title={t('redsea.portal.modules.staff.staffEmpty.title')} description={t('redsea.portal.modules.staff.staffEmpty.description')} />
            ) : (
              <Grid container spacing={2}>
                {staff.slice(0, 24).map((s) => (
                  <Grid item xs={12} sm={6} md={4} key={s.id}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box sx={{ color: 'primary.main', display: 'flex' }}><PersonIcon /></Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>{s.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">{s.department || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">{s.station || '—'}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaStaffPage;
