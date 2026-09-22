import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DomainIcon from '@mui/icons-material/Domain';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ScienceIcon from '@mui/icons-material/Science';
import CampaignIcon from '@mui/icons-material/Campaign';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PublicSudanMap from '../../components/PublicSudanMap';
import PublicNotices from '../../components/PublicNotices';
import {
  getSector,
  getSectorPorts,
  getSectors,
  getNews,
  getNotices,
  getPublicStatistics,
} from '../../api/endpoints/public';
import type { Sector, PublicPort, HealthNotice, NewsArticle } from '../../api/endpoints/public';
import { getServiceCategories } from '../../api/endpoints/services';
import type { Service, ServiceCategory } from '../../api/endpoints/services';
import { PageHeader, EmptyState, ListSkeleton, SectionTitle } from '../../components/common';

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

const regionLabels: Record<string, string> = {
  KHARTOUM: 'الخرطوم',
  RED_SEA: 'البحر الأحمر',
  KASSALA: 'كسلا',
  GEDAREF: 'القضارف',
  NORTHERN: 'شمالي',
  EL_OBEID: 'الأبيض',
  KORDOFAN: 'كردفان',
  BLUE_NILE: 'النيل الأزرق',
  W_DARFUR: 'غرب دارفور',
};

const serviceIcons: Record<string, React.ReactNode> = {
  AIRPORT: <FlightIcon />,
  SEAPORT: <DirectionsBoatIcon />,
  LAND_PORT: <DirectionsBusIcon />,
  TRAVEL: <HowToRegIcon />,
  HEALTH: <HealthAndSafetyIcon />,
  FOOD: <HealthAndSafetyIcon />,
  LAB: <ScienceIcon />,
  CERTIFICATES: <WorkspacePremiumIcon />,
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar') : '—';

const SectorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sector, setSector] = useState<Sector | null>(null);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorStats, setSectorStats] = useState<{ entry_points: number; screenings: number } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [notices, setNotices] = useState<HealthNotice[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getSector(id), getSectorPorts(id), getSectors()])
      .then(([sectorResponse, portsResponse, sectorsResponse]) => {
        const sec = sectorResponse.data.data;
        setSector(sec);
        setPorts(portsResponse.data.data);
        setAllSectors(sectorsResponse.data.data);
        if (sec?.code) {
          setSectionsLoading(true);
          Promise.all([
            getPublicStatistics({ sector: sec.code }).catch(() => null as never),
            getServiceCategories().catch(() => ({ data: { data: [] as ServiceCategory[] } })),
            getNews().catch(() => []),
            getNotices().catch(() => ({ data: { data: [] as HealthNotice[] } })),
          ])
            .then(([statsResponse, catsResponse, newsData, noticesResponse]) => {
              setSectorStats(
                statsResponse
                  ? {
                      entry_points: statsResponse.data.data.entry_points,
                      screenings: statsResponse.data.data.screenings,
                    }
                  : null,
              );
              const all = (catsResponse?.data?.data ?? []).flatMap((c) => c.services ?? []);
              setServices(all.filter((sv) => sv.is_active && sv.status === 'ACTIVE').slice(0, 8));
              setNews(newsData ?? []);
              setNotices((noticesResponse?.data?.data ?? []).slice(0, 6));
            })
            .catch(() => {})
            .finally(() => setSectionsLoading(false));
        }
      })
      .catch(() => {
        setSector(null);
        setPorts([]);
        setAllSectors([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const stats: { value: string; label: string; icon: React.ReactNode; accent?: string }[] = [
    { value: String(sector?.ports_count ?? '—'), label: 'منافذ دخول', icon: <AirportShuttleIcon /> },
    {
      value: sectorStats ? String(sectorStats.entry_points) : '—',
      label: 'منفذ نشط',
      icon: <LocationOnIcon />,
    },
    {
      value: sectorStats ? String(sectorStats.screenings) : '—',
      label: 'فحص صحي',
      icon: <HealthAndSafetyIcon />,
    },
    { value: '24/7', label: 'مراقبة مستمرة', icon: <CampaignIcon />, accent: '#c8a13a' },
  ];

  const flattenPath = (service: Service): string =>
    service.route ||
    (service.external_url ? service.external_url : '/services');

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Button component={Link} to="/sectors" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
        العودة إلى القطاعات
      </Button>

      {loading ? (
        <ListSkeleton count={3} />
      ) : !sector ? (
        <EmptyState
          icon={<DomainIcon />}
          title="القطاع غير متاح"
          description="لم يتم العثور على هذا القطاع."
        />
      ) : (
        <>
          <PageHeader
            title={sector.name_ar}
            subtitle={sector.description_ar || `القطاع الصحي لمنطقة ${regionLabels[sector.region] || sector.region}`}
            eyebrow={`القطاع · ${regionLabels[sector.region] || sector.region}`}
            action={
              <Chip
                icon={<LocationOnIcon />}
                label={`${sector.ports_count} منفذ`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, py: 1.25, px: 1, fontSize: 14 }}
              />
            }
          />

          {/* Stats band */}
          <Grid container spacing={2.5} sx={{ mb: 5 }}>
            {stats.map((stat) => (
              <Grid item xs={6} sm={3} key={stat.label}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${stat.accent || 'primary.main'}` }}>
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
                      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                        {sectionsLoading ? '…' : stat.value}
                      </Typography>
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
            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DomainIcon sx={{ color: 'primary.main' }} />
                    <Typography sx={{ fontWeight: 700 }}>الموقع الجغرافي</Typography>
                  </Stack>
                </Box>
                <Box sx={{ p: 2 }}>
                  <PublicSudanMap sectors={allSectors} selectedId={sector.id} />
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    حول القطاع
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                    {sector.description_ar || 'قطاع صحي تابع للإدارة الاتحادية للحجر الصحي.'}
                  </Typography>
                  <Stack spacing={1.5}>
                    <InfoRow label="الاسم بالعربية" value={sector.name_ar} />
                    <InfoRow label="الاسم بالإنجليزية" value={sector.name_en} dir="ltr" />
                    <InfoRow label="الإقليم" value={regionLabels[sector.region] || sector.region} />
                    <InfoRow label="عدد المنافذ" value={String(sector.ports_count)} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Ports */}
          <Box sx={{ mt: 5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              منافذ الدخول في القطاع
            </Typography>
            {ports.length === 0 ? (
              <EmptyState
                icon={<LocationOnIcon />}
                title="لا توجد منافذ في هذا القطاع"
                description="سيتم إضافة المنافذ قريباً."
              />
            ) : (
              <Grid container spacing={2.5}>
                {ports.map((port) => (
                  <Grid item xs={12} sm={6} md={4} key={port.id}>
                    <Card
                      onClick={() => navigate(`/ports/${port.id}`)}
                      sx={{
                        height: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        transition: 'box-shadow 250ms ease, transform 250ms ease',
                        '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2.5,
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
                        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>
                          {port.name_ar}
                        </Typography>
                        {port.address && (
                          <Typography variant="caption" color="text.secondary">
                            {port.address}
                          </Typography>
                        )}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary" dir="ltr">
                            {port.code}
                          </Typography>
                          <ArrowForwardIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* Services */}
          <Box sx={{ mt: 8 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
              <SectionTitle
                title="الخدمات الإلكترونية المتاحة"
                subtitle="خدمات إلكترونية متكاملة مقدمة عبر القطاع والمنصة القومية"
              />
              <Button component={Link} to="/services" endIcon={<ArrowForwardIcon />} sx={{ mb: 4 }}>
                عرض جميع الخدمات
              </Button>
            </Stack>
            {sectionsLoading ? (
              <Grid container spacing={2.5}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Grid item xs={12} sm={6} lg={3} key={i}>
                    <Skeleton variant="rounded" height={130} />
                  </Grid>
                ))}
              </Grid>
            ) : services.length === 0 ? (
              <Typography color="text.secondary">لا توجد خدمات مسجلة حالياً.</Typography>
            ) : (
              <Grid container spacing={2.5}>
                {services.map((service) => (
                  <Grid item xs={12} sm={6} lg={3} key={service.id}>
                    <Button
                      component={Link}
                      to={flattenPath(service)}
                      fullWidth
                      disableElevation
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        textAlign: 'right',
                        gap: 1.5,
                        p: 2.5,
                        borderRadius: 3,
                        height: '100%',
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        textTransform: 'none',
                        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)', boxShadow: 4 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'primary.main',
                          bgcolor: 'primary.light',
                          flexShrink: 0,
                        }}
                      >
                        {serviceIcons[service.category_code] || <WorkspacePremiumIcon />}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {service.name_ar}
                        </Typography>
                        {service.description_ar && (
                          <Typography variant="caption" color="text.secondary">
                            {service.description_ar}
                          </Typography>
                        )}
                      </Box>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* Notices */}
          <Box sx={{ mt: 8 }}>
            <SectionTitle
              title="التنبيهات الصحية"
              subtitle="آخر الإشعارات والتنبيهات الصحية الصادرة عن المنصة"
            />
            <PublicNotices notices={notices} loading={sectionsLoading} />
          </Box>

          {/* Latest news */}
          <Box sx={{ mt: 8 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
              <SectionTitle title="آخر الأخبار" subtitle="أحدث الأخبار والتحديثات من المركز الإعلامي" />
              <Button component={Link} to="/news" endIcon={<ArrowForwardIcon />} sx={{ mb: 4 }}>
                عرض الكل
              </Button>
            </Stack>
            {sectionsLoading ? (
              <Grid container spacing={3}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Grid item xs={12} md={4} key={i}>
                    <Skeleton variant="rounded" height={200} />
                  </Grid>
                ))}
              </Grid>
            ) : news.length === 0 ? (
              <Typography color="text.secondary">لا توجد أخبار حالياً.</Typography>
            ) : (
              <Grid container spacing={3}>
                {news.slice(0, 3).map((article) => (
                  <Grid item xs={12} md={4} key={article.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider' }}>
                      {article.image && (
                        <CardMedia component="img" height={130} image={article.image} alt={article.title} sx={{ objectFit: 'cover', width: '100%', aspectRatio: '16 / 9' }} />
                      )}
                      <CardContent sx={{ p: 3, flex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Chip label={article.category || 'عام'} size="small" color="primary" variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(article.published_at)}
                          </Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                          {article.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                        >
                          {article.content}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 3, pb: 2 }}>
                        <Button component={Link} to={`/news/${article.id}`} size="small" color="primary">
                          تفاصيل الخبر
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* CTA */}
          <Box
            sx={{
              borderRadius: 4,
              p: { xs: 4, md: 5 },
              textAlign: 'center',
              mt: 8,
              background: 'linear-gradient(120deg, #0a6b58, #0e8a72, #c8a13a, #0e8a72)',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Typography variant="h2" sx={{ mb: 1.5 }}>
              تحتاج مساعدة أو لديك استفسار؟
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.92 }}>
              تواصل مع القطاع أو استفد من خدمات المنصة الإلكترونية.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button component={Link} to="/contact" variant="contained" sx={{ bgcolor: '#fff', color: 'primary.darker', '&:hover': { bgcolor: '#f0f7f5' } }}>
                اتصل بنا
              </Button>
              <Button component={Link} to="/services" variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
                استكشف الخدمات
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Container>
  );
};

const InfoRow = ({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }} dir={dir}>{value}</Typography>
  </Stack>
);

export default SectorDetailPage;
