import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import OutboxIcon from '@mui/icons-material/Outbox';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScienceIcon from '@mui/icons-material/Science';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { getPublicStatistics } from '../../api/endpoints/public';
import type { PublicStatistics } from '../../api/endpoints/public';

const SectorCmsFoodSafety = () => {
  const { sector, loading } = useSectorSite();
  const [stats, setStats] = useState<PublicStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  usePageTitle('سلامة الغذاء');

  useEffect(() => {
    if (!sector) return;
    setStatsLoading(true);
    getPublicStatistics({ sector: sector.code })
      .then((res) => setStats(res.data.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [sector]);

  const channels = [
    { label: 'تقديم طلبات الوارد والصادر', icon: <Inventory2Icon />, desc: `تسجيل الشحنات الغذائية للاستيراد والتصدير عبر منافذ القطاع.`, to: `/login?next=/sector/${sector?.code}/services/food-safety`, requiresAuth: true },
    { label: 'الاستعلام عن الشهادة', icon: <WorkspacePremiumIcon />, desc: 'التحقق من صحة شهادات الصحة النباتية والغذائية.', to: '/verify' },
    { label: 'متابعة الشحنة', icon: <OutboxIcon />, desc: 'تتبع حالة الشحنة الغذائية أثناء إجراءات الفحص والفسح.', to: `/login?next=/sector/${sector?.code}/services/food-safety`, requiresAuth: true },
    { label: 'التنبيهات الصحية', icon: <NotificationsActiveIcon />, desc: 'تعاميم وإجراءات رقابية على الأغذية في نقاط الدخول.', to: `/sector/${sector?.code}/circulars` },
  ];

  const workflow = [
    { label: 'الوارد', icon: <Inventory2Icon /> },
    { label: 'الصادر', icon: <OutboxIcon /> },
    { label: 'التفتيش', icon: <FactCheckIcon /> },
    { label: 'العينات', icon: <BiotechIcon /> },
    { label: 'المختبر', icon: <ScienceIcon /> },
    { label: 'الشهادات', icon: <WorkspacePremiumIcon /> },
  ];

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>سلامة الغذاء</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        واجهة عامة لخدمات رقابة الأغذية — الوارد والصادر والتفتيش والعينات والشهادات.
        لا تُعرض هنا بيانات الشحنات الحساسة، بل الخدمات والاستعلامات المصرّح بها فقط.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'شحنات غذائية', value: stats?.food_shipments ?? 0, icon: <Inventory2Icon />, scope: 'القطاع' },
          { label: 'عينات مختبر', value: stats?.lab_samples ?? 0, icon: <ScienceIcon />, scope: 'المنصة' },
          { label: 'شهادات صادرة', value: stats?.certificates ?? 0, icon: <WorkspacePremiumIcon />, scope: 'المنصة' },
        ].map((k) => (
          <Grid item xs={12} sm={4} key={k.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ color: 'primary.main', display: 'flex', fontSize: 32 }}>{k.icon}</Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {statsLoading ? '…' : k.value.toLocaleString('ar-EG')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                </Box>
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  label={k.scope}
                  size="small"
                  sx={{ alignSelf: 'flex-start', mt: -0.5, fontSize: '0.65rem', fontWeight: 700 }}
                  color={k.scope === 'القطاع' ? 'primary' : 'default'}
                  variant="outlined"
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>مراحل الرقابة الغذائية</Typography>
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        {workflow.map((w) => (
          <Grid item xs={6} sm={4} md={2} key={w.label}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ color: 'primary.main', display: 'flex', justifyContent: 'center', mb: 1, fontSize: 32 }}>{w.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{w.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>الاستعلامات والخدمات</Typography>
      <Grid container spacing={2.5}>
        {channels.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Card
              component={c.to ? Link : Card}
              to={c.to ?? undefined}
              sx={{
                height: '100%',
                textDecoration: 'none',
                color: 'inherit',
                cursor: c.to ? 'pointer' : 'default',
                '&:hover': c.to ? { boxShadow: 4, transform: 'translateY(-3px)' } : {},
                transition: 'all .2s',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                {loading ? (
                  <Skeleton variant="rounded" height={32} width={32} />
                ) : (
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main', mb: 1.5 }}>{c.icon}</Box>
                )}
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{c.label}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>{c.desc}</Typography>
                {c.to && (
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
                    {c.requiresAuth ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
                        <LockOutlinedIcon sx={{ fontSize: 15 }} /> يتطلب حساباً موثّقاً
                      </Typography>
                    ) : (
                      <Chip label="الانتقال" size="small" variant="outlined" />
                    )}
                    <ArrowForwardIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </SectorPageShell>
  );
};

export default SectorCmsFoodSafety;
