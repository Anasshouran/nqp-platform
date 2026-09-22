import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BugReportIcon from '@mui/icons-material/BugReport';
import CampaignIcon from '@mui/icons-material/Campaign';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ScienceIcon from '@mui/icons-material/Science';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { getPublicStatistics, getNotices } from '../../api/endpoints/public';
import type { PublicStatistics, HealthNotice } from '../../api/endpoints/public';

const services = [
  { label: 'التوعية بمكافحة النواقل', icon: <CampaignIcon />, desc: 'برامج توعوية وقائية لعامة الجمهور حول الأمراض المنقولة بالنواقل.' },
  { label: 'الإرشادات الوقائية', icon: <HealthAndSafetyIcon />, desc: 'إرشادات للحماية من اللدغات والقضاء على مواقع التكاثر.' },
  { label: 'البلاغ عن موقع', icon: <ReportProblemIcon />, desc: 'إبلاغ الجهات المختصة عن مواقع تكاثر أو تجمعات نواقل.' },
  { label: 'الحملات والإعلانات', icon: <BugReportIcon />, desc: 'يتيح الاطلاع على الحملات العامة والإعلانات المتعلقة بمكافحة النواقل.' },
];

const SectorCmsVectorControl = () => {
  const { sector, loading } = useSectorSite();
  const [stats, setStats] = useState<PublicStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notices, setNotices] = useState<HealthNotice[]>([]);

  usePageTitle('مكافحة النواقل');

  useEffect(() => {
    if (!sector) return;
    setStatsLoading(true);
    getPublicStatistics({ sector: sector.code })
      .then((res) => setStats(res.data.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
    getNotices()
      .then((res) => setNotices(res.data.data ?? []))
      .catch(() => setNotices([]));
  }, [sector]);

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>مكافحة النواقل</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        التوعية والخدمات والإرشادات العامة لمكافحة نواقل الأمراض.
        تُنشر هنا البيانات العامة فقط؛ أما بيانات المسح الميداني التفصيلية فتبقى داخل نظام مكافحة النواقل.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'أنشطة مكافحة النواقل', value: stats?.vector_activities ?? 0, icon: <BugReportIcon /> },
          { label: 'أمراض متابعة', value: stats?.diseases ?? 0, icon: <ScienceIcon /> },
          { label: 'تنبيهات صحة', value: stats?.notices ?? 0, icon: <NotificationsActiveIcon /> },
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
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>الخدمات والتوعية</Typography>
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        {services.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main', mb: 1.5 }}>{s.icon}</Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{s.label}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>{s.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>التنبيهات والإعلانات</Typography>
      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={80} />
        </Stack>
      ) : notices.length === 0 ? (
        <Card sx={{ border: '1px solid', borderColor: 'divider', p: 3, textAlign: 'center' }}>
          <WorkspacePremiumIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">لا توجد تنبيهات منشورة حالياً.</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {notices.map((n) => (
            <Card key={n.id} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{n.title}</Typography>
                  <Chip label={n.priority} size="small" color={n.priority === 'HIGH' ? 'error' : 'warning'} variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{n.description}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {new Date(n.published_at).toLocaleDateString('ar')}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </SectorPageShell>
  );
};

export default SectorCmsVectorControl;
