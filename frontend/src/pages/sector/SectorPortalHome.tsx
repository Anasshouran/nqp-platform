import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import ScienceIcon from '@mui/icons-material/Science';
import BugReportIcon from '@mui/icons-material/BugReport';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useSectorPortal } from '../../components/sectors/SectorPortalLayout';
import { EmptyState } from '../../components/common';
import { NEWS_CATEGORY_LABELS, sectorBareName } from '../sector-cms/SectorCmsShared';
import { getSectorPorts, getPublicStatistics, getNews } from '../../api/endpoints/public';
import type { PublicPort, NewsArticle } from '../../api/endpoints/public';

const portTypeLabels: Record<string, string> = {
  AIRPORT: 'منفذ جوي',
  SEAPORT: 'منفذ بحري',
  LAND_PORT: 'منفذ بري',
};

const portTypeIcons: Record<string, React.ReactNode> = {
  AIRPORT: <FlightIcon />,
  SEAPORT: <DirectionsBoatIcon />,
  LAND_PORT: <DirectionsBusIcon />,
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar') : '—';

const SectorPortalHome = () => {
  const { sector, loading } = useSectorPortal();
  const slug = sector?.code?.toLowerCase().replace('_', '-') || '';
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [stats, setStats] = useState<{ entry_points: number; screenings: number; travelers: number } | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  useEffect(() => {
    if (!sector) { setSectionsLoading(false); return; }
    setSectionsLoading(true);
    Promise.all([
      getSectorPorts(sector.id),
      getPublicStatistics({ sector: sector.code }).catch(() => null as never),
      getNews(sector.id).catch(() => []),
    ])
      .then(([portsRes, statsRes, newsData]) => {
        setPorts(portsRes.data.data);
        setStats(statsRes ? { entry_points: statsRes.data.data.entry_points, screenings: statsRes.data.data.screenings, travelers: statsRes.data.data.travelers } : null);
        setNews(newsData ?? []);
      })
      .catch(() => { setPorts([]); setNews([]); })
      .finally(() => setSectionsLoading(false));
  }, [sector]);

  if (loading) return <Skeleton variant="rounded" height={300} />;
  if (!sector) return <EmptyState icon={<LocationOnIcon />} title="القطاع غير متاح" />;

  return (
    <Box>
      {/* Hero */}
      <Paper sx={{ borderRadius: 4, p: { xs: 3, md: 5 }, mb: 4, color: '#fff', background: `linear-gradient(120deg, ${sector.color}, #0e8a72, #c8a13a)` }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>قطاع {sectorBareName(sector.name_ar)}</Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.95, maxWidth: 720 }}>
          {sector.description_ar || 'قطاع صحي تابع للإدارة الاتحادية للحجر الصحي بجمهورية السودان.'}
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 2.5 }}>
          <Chip label={`${sector.ports_count} منفذ دخول`} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.18)', fontWeight: 700 }} icon={<LocationOnIcon />} />
          <Chip label="مراقبة مستمرة 24/7" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.18)', fontWeight: 700 }} icon={<HealthAndSafetyIcon />} />
        </Stack>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { value: sector.ports_count, label: 'منافذ دخول', icon: <LocationOnIcon /> },
          { value: stats?.entry_points ?? '—', label: 'منفذ نشط', icon: <CompareArrowsIcon /> },
          { value: stats?.screenings ?? '—', label: 'فحص صحي', icon: <HealthAndSafetyIcon /> },
          { value: stats?.travelers ?? '—', label: 'مسافر', icon: <FlightIcon /> },
        ].map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card sx={{ height: '100%', borderTop: (theme) => `4px solid ${theme.palette.primary.main}` }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{sectionsLoading ? '…' : stat.value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Specialized services */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>الخدمات المتخصصة</Typography>
        <Button component={Link} to={`/sector/${slug}/services`} endIcon={<ArrowForwardIcon />} size="small">
          جميع الخدمات
        </Button>
      </Stack>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'سلامة الغذاء', desc: 'الوارد والصادر والتفتيش والشهادات', path: `/sector/${slug}/services`, icon: <ScienceIcon />, color: '#0e8a72' },
          { label: 'مكافحة النواقل', desc: 'التوعية والإرشادات والبلاغات', path: `/sector/${slug}/services`, icon: <BugReportIcon />, color: '#2f6f9f' },
          { label: 'المنافذ', desc: 'المطارات والموانئ والمعابر', path: `/sector/${slug}/ports`, icon: <LocationOnIcon />, color: '#b3544b' },
          { label: 'التعميمات', desc: 'القرارات والإجراءات الرسمية', path: `/sector/${slug}/news`, icon: <CampaignIcon />, color: '#7a5c9e' },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Button
              component={Link}
              to={item.path}
              fullWidth
              sx={{
                p: 2,
                height: '100%',
                borderRadius: 3,
                color: 'text.primary',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                textTransform: 'none',
                flexDirection: 'column',
                gap: 1,
                alignItems: 'flex-start',
                '&:hover': { borderColor: item.color, transform: 'translateY(-3px)', boxShadow: 3 },
              }}
            >
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: item.color, bgcolor: `${item.color}1a` }}>{item.icon}</Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.label}</Typography>
                <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
              </Box>
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Ports preview */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>نقاط الدخول</Typography>
        <Button component={Link} to={`/sector/${slug}/ports`} endIcon={<ArrowForwardIcon />}>عرض الكل</Button>
      </Stack>
      {ports.length === 0 ? (
        <EmptyState icon={<LocationOnIcon />} title="لا توجد نقاط دخول" />
      ) : (
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {ports.slice(0, 3).map((port) => (
            <Grid item xs={12} sm={4} key={port.id}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { boxShadow: 3, transform: 'translateY(-3px)' } }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main' }}>{portTypeIcons[port.type] || <LocationOnIcon />}</Box>
                    <Chip label={portTypeLabels[port.type] || port.type} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 1.5 }}>{port.name_ar}</Typography>
                  <Typography variant="caption" color="text.secondary" dir="ltr">{port.code}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* News preview */}
      {news.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>آخر الأخبار</Typography>
          <Grid container spacing={2}>
            {news.slice(0, 3).map((article) => (
              <Grid item xs={12} sm={4} key={article.id}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Chip label={NEWS_CATEGORY_LABELS[article.category] || 'عام'} size="small" color="primary" variant="outlined" sx={{ mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{article.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(article.published_at)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default SectorPortalHome;
