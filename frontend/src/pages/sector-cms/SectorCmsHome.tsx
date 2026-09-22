import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ScienceIcon from '@mui/icons-material/Science';
import BugReportIcon from '@mui/icons-material/BugReport';
import CampaignIcon from '@mui/icons-material/Campaign';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import {
  SectorPageShell,
  SectorBreadcrumbs,
  sectorBareName,
  useSectorSite,
  ErrorNotice,
  NEWS_CATEGORY_LABELS,
  usePageTitle,
} from './SectorCmsShared';
import { EmptyState, ErrorState } from '../../components/common';
import { getSectorPorts, getNews, getPublicStatistics } from '../../api/endpoints/public';
import type { PublicPort, NewsArticle } from '../../api/endpoints/public';
import { getServiceCategories } from '../../api/endpoints/services';
import type { Service } from '../../api/endpoints/services';
import { iconFor } from '../../utils/iconMap';

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

const SectorCmsHome = () => {
  const { sector, slug, loading } = useSectorSite();
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [stats, setStats] = useState<{
    entry_points: number;
    screenings: number;
    certificates: number;
  } | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  usePageTitle('الرئيسية');

  const loadSections = useCallback(async (sectorId: string, sectorCode: string) => {
    const [portsRes, statsRes, newsData, servicesRes] = await Promise.all([
      getSectorPorts(sectorId).catch(() => null),
      getPublicStatistics({ sector: sectorCode }).catch(() => null),
      getNews(sectorId).catch(() => null),
      getServiceCategories({ sector: sectorCode }).catch(() => null),
    ]);
    setPorts(portsRes?.data.data ?? []);
    setStats(
      statsRes?.data?.data
        ? {
            entry_points: statsRes.data.data.entry_points,
            screenings: statsRes.data.data.screenings,
            certificates: statsRes.data.data.certificates,
          }
        : null,
    );
    setNews(newsData ?? []);
    setServices(servicesRes?.data.data?.flatMap((c) => c.services) ?? []);
    setSectionsError(portsRes === null || newsData === null);
  }, []);

  useEffect(() => {
    if (!sector) {
      setSectionsLoading(false);
      return undefined;
    }
    let active = true;
    setSectionsLoading(true);
    const run = async () => {
      await loadSections(sector.id, sector.code);
      if (active) setSectionsLoading(false);
    };
    void run();
    const refreshId = window.setInterval(() => {
      void loadSections(sector.id, sector.code);
    }, 60000);
    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, [sector, loadSections, retryTick]);

  const retry = () => setRetryTick((t) => t + 1);

  if (loading) {
    return (
      <SectorPageShell>
        <Skeleton variant="rounded" height={200} />
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rounded" height={96} />
            </Grid>
          ))}
        </Grid>
      </SectorPageShell>
    );
  }

  if (!sector) {
    return (
      <SectorPageShell>
        <ErrorNotice title={`قطاع غير متاح`} />
      </SectorPageShell>
    );
  }

  return (
    <SectorPageShell>
      <SectorBreadcrumbs />

      <Paper
        sx={{
          borderRadius: 4,
          p: { xs: 3, md: 5 },
          mb: 4,
          color: '#fff',
          background: 'linear-gradient(135deg, #075447 0%, #0e8a72 55%, #12a585 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(760px 320px at 88% 120%, rgba(255,255,255,0.10), transparent 55%)',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Typography component="h1" variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            قطاع {sectorBareName(sector.name_ar)}
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.96, maxWidth: 720 }}>
            منصة رقمية تخدم المسافرين وأصحاب الأعمال عبر منافذ القطاع، برقابة صحية ووبائية على مدار الساعة.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" sx={{ mt: 3 }}>
            <Button
              component={Link}
              to={`/sector/${slug}/travel-requirements`}
              variant="contained"
              size="large"
              startIcon={<FactCheckIcon />}
              sx={{
                bgcolor: '#fff',
                color: 'primary.darker',
                '&:hover': { bgcolor: '#eef6f4' },
              }}
            >
              متطلبات الدخول والخروج
            </Button>
            <Button
              component={Link}
              to={`/sector/${slug}/ports`}
              variant="outlined"
              size="large"
              startIcon={<LocationOnIcon />}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.55)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              استكشف المنافذ
            </Button>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 3 }}>
            <Chip
              label={`${sector.ports_count} منفذ تحت المراقبة`}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.16)', fontWeight: 700 }}
              icon={<LocationOnIcon />}
            />
            <Chip
              label="مراقبة مستمرة 24/7"
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.16)', fontWeight: 700 }}
              icon={<HealthAndSafetyIcon />}
            />
          </Stack>
        </Box>
      </Paper>

      {sectionsError && (
        <Box sx={{ mb: 3 }}>
          <ErrorState
            compact
            message="تعذّر تحميل بعض البيانات (المنافذ أو الأخبار)"
            onRetry={retry}
          />
        </Box>
      )}

      <Grid
        container
        spacing={2.5}
        sx={{ mb: 4 }}
        aria-live="polite"
        aria-busy={sectionsLoading}
      >
        {[
          { value: sector.ports_count, label: 'منافذ دخول', icon: <LocationOnIcon /> },
          { value: stats?.entry_points ?? '—', label: 'منفذ نشط', icon: <CompareArrowsIcon /> },
          { value: stats?.screenings ?? '—', label: 'فحص صحي', icon: <HealthAndSafetyIcon /> },
          { value: stats?.certificates ?? '—', label: 'شهادات صحية', icon: <WorkspacePremiumIcon /> },
        ].map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card sx={{ height: '100%', borderTop: (theme) => `4px solid ${theme.palette.primary.main}` }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    bgcolor: 'primary.light',
                    flexShrink: 0,
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  {sectionsLoading ? (
                    <Skeleton variant="text" width={44} height={36} />
                  ) : (
                    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                      {stat.value}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {stat.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>حول القطاع</Typography>
                <Button component={Link} to={`/sector/${slug}/about`} endIcon={<ArrowForwardIcon />} size="small">
                  اقرأ المزيد
                </Button>
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {(sector.description_ar || '').split('\n')[0] || 'قطاع صحي تابع للإدارة الاتحادية للحجر الصحي.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>أبرز الخدمات</Typography>
              <Stack spacing={1}>
                {[
                  { label: 'فحص المسافرين والوافدين', icon: <HealthAndSafetyIcon /> },
                  { label: 'إصدار الشهادات الصحية', icon: <WorkspacePremiumIcon /> },
                  { label: 'رقابة الأغذية الواردة', icon: <ScienceIcon /> },
                ].map((s) => (
                  <Stack key={s.label} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: 'primary.main', display: 'flex' }}>{s.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 6 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap gap={1.5} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>خدمات القطاع</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {!sectionsLoading && services.length > 0 && (
              <Chip label={`${services.length} خدمة`} size="small" sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.08), color: 'primary.main', fontWeight: 800 }} />
            )}
            <Button component={Link} to={`/sector/${slug}/services`} endIcon={<ArrowForwardIcon />} size="small">
              جميع الخدمات
            </Button>
          </Stack>
        </Stack>
        {sectionsLoading ? (
          <Grid container spacing={2.5}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}><Skeleton variant="rounded" height={140} /></Grid>
            ))}
          </Grid>
        ) : services.length === 0 ? (
          <EmptyState title="لا توجد خدمات بعد" description="تُضاف خدمات القطاع هنا عند توفرها." />
        ) : (
          <Grid container spacing={2.5}>
            {services.slice(0, 8).map((s) => {
              const Icon = iconFor(s.icon);
              const external = Boolean(s.external_url);
              const to = s.external_url || s.route || `/sector/${slug}/services`;
              return (
                <Grid item xs={12} sm={6} md={3} key={s.id}>
                  <Card
                    component={Link}
                    to={to}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      textDecoration: 'none',
                      color: 'inherit',
                      border: '1px solid rgba(16,40,34,0.09)',
                      borderBottom: (t) => `3px solid ${alpha(t.palette.primary.main, 0.14)}`,
                      borderRadius: 3.5,
                      transition:
                        'transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease, border-color 260ms ease, border-bottom-color 260ms ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: (t) => t.shadows[6],
                        borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                        borderBottomColor: 'primary.main',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5, flex: 1 }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2.5,
                            display: 'grid',
                            placeItems: 'center',
                            color: '#fff',
                            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                          }}
                        >
                          <Icon />
                        </Box>
                        <ArrowForwardIcon sx={{ fontSize: 18, color: (t) => alpha(t.palette.primary.main, 0.5) }} />
                      </Stack>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.35, mt: 1.5 }}>
                        {s.name_ar}
                      </Typography>
                      {s.description_ar && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mt: 0.5,
                            fontSize: '0.7rem',
                            lineHeight: 1.6,
                          }}
                        >
                          {s.description_ar}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      <Box sx={{ mt: 6 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>منافذ الدخول</Typography>
          <Button component={Link} to={`/sector/${slug}/ports`} endIcon={<ArrowForwardIcon />} size="small">
            عرض الكل
          </Button>
        </Stack>
        {sectionsLoading ? (
          <Grid container spacing={2.5}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={120} /></Grid>
            ))}
          </Grid>
        ) : ports.length === 0 ? (
          <EmptyState title="لا توجد منافذ" description="لم تُسجّل منافذ في هذا القطاع بعد." />
        ) : (
          <Grid container spacing={2.5}>
            {ports.slice(0, 3).map((port) => {
              const single = ports.length === 1;
              return (
                <Grid item xs={12} md={single ? 12 : 4} key={port.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      {single ? (
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ width: '100%' }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                              sx={{
                                width: 46,
                                height: 46,
                                borderRadius: 2,
                                display: 'grid',
                                placeItems: 'center',
                                color: '#fff',
                                bgcolor: 'primary.main',
                                flexShrink: 0,
                              }}
                            >
                              {portTypeIcons[port.type] || <LocationOnIcon />}
                            </Box>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {port.name_ar}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" dir="ltr">
                                {port.code}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip label={portTypeLabels[port.type] || port.type} size="small" variant="outlined" />
                            {port.name_en && (
                              <Chip
                                label={port.name_en}
                                size="small"
                                sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}
                              />
                            )}
                          </Stack>
                        </Stack>
                      ) : (
                        <>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box
                              sx={{
                                width: 42,
                                height: 42,
                                borderRadius: 2,
                                display: 'grid',
                                placeItems: 'center',
                                color: '#fff',
                                bgcolor: 'primary.main',
                              }}
                            >
                              {portTypeIcons[port.type] || <LocationOnIcon />}
                            </Box>
                            <Chip label={portTypeLabels[port.type] || port.type} size="small" variant="outlined" />
                          </Stack>
                          <Typography variant="h6" sx={{ fontWeight: 700, mt: 1.5 }}>
                            {port.name_ar}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" dir="ltr">
                            {port.code}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      <Box sx={{ mt: 6 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>آخر الأخبار</Typography>
          <Button component={Link} to={`/sector/${slug}/news`} endIcon={<ArrowForwardIcon />} size="small">
            عرض الكل
          </Button>
        </Stack>
        {sectionsLoading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} md={4} key={i}><Skeleton variant="rounded" height={200} /></Grid>
            ))}
          </Grid>
        ) : news.length === 0 ? (
          <Typography color="text.secondary">لا توجد أخبار حالياً.</Typography>
        ) : (
          <Grid container spacing={3}>
            {news.slice(0, 3).map((article) => (
              <Grid item xs={12} md={4} key={article.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {article.image && (
                    <CardMedia
                      component="img"
                      height={130}
                      image={article.image}
                      alt={article.title}
                      loading="lazy"
                      decoding="async"
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ p: 3, flex: 1 }}>
                    <Chip label={NEWS_CATEGORY_LABELS[article.category] || 'عام'} size="small" color="primary" variant="outlined" sx={{ mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{article.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(article.published_at)}</Typography>
                  </CardContent>
                  <CardActions sx={{ px: 3, pb: 2 }}>
                    <Button component={Link} to={`/sector/${slug}/news/${article.id}`} size="small" color="primary">تفاصيل الخبر</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Box
        sx={{
          borderRadius: 4,
          p: { xs: 4, md: 5 },
          textAlign: 'center',
          mt: 7,
          background: 'linear-gradient(135deg, #075447, #0e8a72, #12a585)',
          color: '#fff',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>تحتاج مساعدة أو لديك استفسار؟</Typography>
        <Typography variant="body1" sx={{ mb: 3, opacity: 0.92 }}>
          تواصل مع قطاع {sectorBareName(sector.name_ar)} أو استفد من خدمات المنصة الإلكترونية.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button component={Link} to={`/sector/${slug}/contact`} variant="contained" sx={{ bgcolor: '#fff', color: 'primary.darker' }}>
            اتصل بنا
          </Button>
          <Button component={Link} to={`/sector/${slug}/ports`} variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}>
            استكشف المنافذ
          </Button>
        </Stack>
      </Box>
    </SectorPageShell>
  );
};

export default SectorCmsHome;
