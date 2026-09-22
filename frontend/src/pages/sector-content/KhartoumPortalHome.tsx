import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import ArticleIcon from '@mui/icons-material/Article';
import CampaignIcon from '@mui/icons-material/Campaign';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupsIcon from '@mui/icons-material/Groups';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SettingsIcon from '@mui/icons-material/Settings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SectionCard, EmptyState } from '../../components/uikit';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { getSectorDashboard } from '../../api/endpoints/reports';
import type { SectorDashboard } from '../../api/endpoints/reports';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const QUICK_LINKS = [
  { label: 'الأخبار', target: '/dashboard/sector/khartoum/content?tab=news', icon: <ArticleIcon /> },
  { label: 'التعاميم', target: '/dashboard/sector/khartoum/content?tab=circulars', icon: <CampaignIcon /> },
  { label: 'الصفحات الثابتة', target: '/dashboard/sector/khartoum/content?tab=pages', icon: <LibraryBooksIcon /> },
  { label: 'الوثائق', target: '/dashboard/sector/khartoum/content?tab=documents', icon: <Inventory2Icon /> },
  { label: 'الإعدادات', target: '/dashboard/sector/khartoum/content?tab=settings', icon: <SettingsIcon /> },
];

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'content', label: 'إدارة المحتوى', icon: <CampaignIcon fontSize="small" /> },
  { id: 'ports', label: 'أداء المنافذ', icon: <Inventory2Icon fontSize="small" /> },
] as const;

const KhartoumPortalHome = () => {
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSectorDashboard({ window: 'month' })
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const kpiCards = [
    {
      icon: <Inventory2Icon />,
      value: data?.kpis?.ports ?? 0,
      label: 'نقاط الدخول',
      color: 'primary.main' as const,
    },
    {
      icon: <GroupsIcon />,
      value: data?.kpis?.staff ?? 0,
      label: 'الموظفون',
      color: 'info.main' as const,
    },
    {
      icon: <HealthAndSafetyIcon />,
      value: data?.kpis?.shipments ?? 0,
      label: 'المعاملات الحالية',
      color: 'success.main' as const,
    },
    {
      icon: <WarningAmberIcon />,
      value: data?.alerts?.length ?? 0,
      label: 'تنبيهات',
      color: 'error.main' as const,
    },
  ];

  return (
    <Box>
      <DashboardHero
        eyebrow="بوابة قطاع الخرطوم"
        title="لوحة التحكم — قطاع الخرطوم"
        subtitle="مؤشرات تشغيلية وإدارة محتوى موقع قطاع الخرطوم، ضمن نطاق القطاع فقط."
        avatarLabel="ل"
        action={<Chip label={`${data?.sector?.name_ar ?? 'قطاع الخرطوم'}`} color="primary" variant="outlined" />}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      {loading ? (
        <Grid container spacing={1.5} sx={{ mb: 4 }}>
          {kpiCards.map((_, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rounded" height={110} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={1.5} sx={{ mb: 4 }}>
          {kpiCards.map((k) => (
            <Grid item xs={6} sm={3} key={k.label}>
              <KpiCard
                icon={k.icon}
                value={Number(k.value).toLocaleString('ar-EG')}
                label={k.label}
                accent={k.color}
              />
            </Grid>
          ))}
        </Grid>
      )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Box component="section" ref={register('content')} data-section="content" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard title="إدارة المحتوى" subtitle="أقسام موقع قطاع الخرطوم">
            <Grid container spacing={2}>
              {QUICK_LINKS.map((q) => (
                <Grid item xs={12} sm={6} key={q.target}>
                  <Button
                    component={Link}
                    to={q.target}
                    variant="outlined"
                    fullWidth
                    startIcon={q.icon}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {q.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
          </Box>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Box component="section" ref={register('ports')} data-section="ports" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard title="أداء المنافذ" subtitle="آخر مؤشرات القطاع">
            {!data || data.stations.length === 0 ? (
              <EmptyState title="لا توجد بيانات" description="لم تُسجّل منافذ ضمن هذا القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {data.stations.slice(0, 6).map((s) => (
                  <Card key={s.id} variant="outlined">
                    <CardContent sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary" dir="ltr">{s.code}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        جاهزية {s.readiness}% — {s.screens} فحص
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </SectionCard>
          </Box>
        </Grid>
      </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default KhartoumPortalHome;