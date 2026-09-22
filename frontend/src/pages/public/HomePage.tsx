import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { MapContainer, Marker, Tooltip, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VerifiedIcon from '@mui/icons-material/Verified';
import BiotechIcon from '@mui/icons-material/Biotech';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import DomainIcon from '@mui/icons-material/Domain';
import SearchIcon from '@mui/icons-material/Search';
import CampaignIcon from '@mui/icons-material/Campaign';
import PeopleIcon from '@mui/icons-material/People';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import DescriptionIcon from '@mui/icons-material/Description';
import { getNews, getCirculars, getPublicStatistics, getPorts } from '../../api/endpoints/public';
import type { NewsArticle, Circular, PublicStatistics, PublicPort } from '../../api/endpoints/public';
import { SectionTitle, CardsGridSkeleton, Particles } from '../../components/common';
import { accentTokens } from '../../styles/theme';

const categoryLabels: Record<string, string> = {
  GENERAL: 'عام',
  HEALTH: 'صحي',
  TRAVEL: 'سفر',
  OFFICIAL: 'رسمي',
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar') : '—';

const QUICK_SERVICES = [
  {
    label: 'متطلبات السفر',
    path: '/travel-requirements',
    icon: <FlightIcon />,
    color: accentTokens.air,
    desc: 'الاطلاع على متطلبات الدخول وفق دولة القدوم',
  },
  {
    label: 'التحقق من الشهادات',
    path: '/verify',
    icon: <VerifiedIcon />,
    color: accentTokens.brand,
    desc: 'التحقق الإلكتروني من صحة الشهادات الصادرة',
  },
  {
    label: 'التطعيم الدولي',
    path: '/verify',
    icon: <BiotechIcon />,
    color: accentTokens.health,
    desc: 'شهادات التطعيم الدولية والتحقق منها',
  },
  {
    label: 'المنافذ',
    path: '/ports',
    icon: <DomainIcon />,
    color: accentTokens.sea,
    desc: 'دليل منافذ الحجر الصحي حسب النوع والقطاع',
  },
  {
    label: 'الشهادات والوثائق',
    path: '/verify',
    icon: <WorkspacePremiumIcon />,
    color: accentTokens.lab,
    desc: 'الشهادات الصحية والنتائج ووثائق المنصة',
  },
  {
    label: 'الاستعلام',
    path: '/services/tools',
    icon: <SearchIcon />,
    color: accentTokens.land,
    desc: 'خدمات استعلام ذكية وتتبع ونتائج مختبرات',
  },
];

const PORT_TYPE_GROUPS = [
  { label: 'المطارات', type: 'AIRPORT', icon: <FlightIcon />, color: accentTokens.air },
  { label: 'الموانئ', type: 'SEAPORT', icon: <DirectionsBoatIcon />, color: accentTokens.sea },
  { label: 'المعابر البرية', type: 'LAND_PORT', icon: <DirectionsBusIcon />, color: accentTokens.land },
];

const FEATURED_STATS: { key: keyof PublicStatistics; label: string; icon: ReactNode; color: string }[] = [
  { key: 'entry_points', label: 'نقاط الدخول', icon: <LocalShippingIcon />, color: accentTokens.brand },
  { key: 'travelers', label: 'المسافرون', icon: <PeopleIcon />, color: accentTokens.air },
  { key: 'screenings', label: 'الحالات', icon: <MonitorHeartIcon />, color: accentTokens.health },
  { key: 'certificates', label: 'الشهادات', icon: <DescriptionIcon />, color: accentTokens.lab },
];

const PORT_MARKER_COLORS: Record<string, string> = {
  AIRPORT: accentTokens.air,
  SEAPORT: accentTokens.sea,
  LAND_PORT: accentTokens.land,
};

function portMarker(type: string): L.DivIcon {
  const color = PORT_MARKER_COLORS[type] ?? accentTokens.brand;
  return L.divIcon({
    className: 'port-marker',
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -18],
  });
}

function geoCoords(geo: Record<string, unknown> | undefined): [number, number] | null {
  if (geo?.type !== 'Point' || !Array.isArray(geo.coordinates) || geo.coordinates.length !== 2) return null;
  const [lon, lat] = geo.coordinates as [number, number];
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;
  return [lon, lat];
}

function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [36, 36] });
  }, [map, bounds]);
  return null;
}

const HomePage = () => {
  usePageTitle('الصفحة الرئيسية');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [stats, setStats] = useState<PublicStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [portFilter, setPortFilter] = useState('');

  const loadData = () => {
    setLoading(true);
    setError(false);
    Promise.all([getNews(), getCirculars(), getPorts(), getPublicStatistics()])
      .then(([newsData, circularsData, portsResponse, statsData]) => {
        setNews(newsData);
        setCirculars(circularsData);
        setPorts(portsResponse.data.data);
        setStats(statsData.data.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const portTypeCount = (type: string) => ports.filter((p) => p.type === type).length;

  const mapPoints = useMemo(
    () =>
      ports.filter(
        (p) =>
          (!portFilter || p.type === portFilter) &&
          geoCoords(p.location_geo) !== null,
      ),
    [ports, portFilter],
  );

  const mapBounds = useMemo<L.LatLngBounds | null>(() => {
    if (mapPoints.length === 0) return null;
    const latlngs = mapPoints
      .map((p) => geoCoords(p.location_geo))
      .filter((c): c is [number, number] => c !== null)
      .map(([lon, lat]) => L.latLng(lat, lon));
    return L.latLngBounds(latlngs);
  }, [mapPoints]);

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 20 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          تعذر تحميل الصفحة
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
        </Typography>
        <Button variant="contained" onClick={loadData} sx={{ textTransform: 'none' }}>
          إعادة المحاولة
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* ============ Hero ============ */}
      <Box
        sx={{
          background:
            'radial-gradient(1000px 420px at 12% -12%, rgba(200,161,58,0.22), transparent 55%), linear-gradient(135deg, #075447 0%, #0e8a72 55%, #12a585 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 56px -28px rgba(7,84,71,0.6)',
        }}
      >
        <Particles count={16} />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(760px 320px at 92% 112%, rgba(255,255,255,0.09), transparent 55%)',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', pt: { xs: 7, md: 11 }, pb: { xs: 7, md: 9 } }}>
          <Box sx={{ maxWidth: 820 }}>
            <Chip
              icon={<HealthAndSafetyIcon />}
              label="المنصة الوطنية الرسمية للحجر الصحي"
              size="small"
              sx={{
                mb: 3,
                px: 1,
                height: 32,
                bgcolor: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.24)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                '& .MuiChip-icon': { color: '#d9f2ea' },
              }}
            />
            <Typography variant="h1" component="h1" sx={{ mb: 1.5, textWrap: 'balance' }}>
              منصة الحجر الصحي القومي الرقمية
            </Typography>
            <Typography
              variant="h5"
              component="p"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.96)',
                textWrap: 'balance',
              }}
            >
              لتعزيز الأمن الصحي بنقاط الدخول
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                maxWidth: 680,
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.85,
                color: 'rgba(255,255,255,0.95)',
                textWrap: 'pretty',
              }}
            >
              منصة متكاملة لإدارة الحجر الصحي والرصد الوبائي بجميع منافذ الدخول،
              تخدم المسافرين وشركات الطيران والجهات الصحية وفق اللوائح الصحية الدولية (IHR).
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 1 }}>
              <Button
                component={Link}
                to="/services/tools"
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                endIcon={<ArrowBackIcon />}
                sx={{
                  bgcolor: 'primary.darker',
                  color: '#fff',
                  px: 3.5,
                  minHeight: 52,
                  boxShadow: '0 14px 34px -12px rgba(0,0,0,0.5)',
                  '& .MuiButton-icon': { color: 'inherit' },
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    color: '#fff',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 0 0 2px rgba(200,161,58,0.9), 0 20px 40px -14px rgba(0,0,0,0.55)',
                  },
                }}
              >
                الخدمات الذكية
              </Button>
              <Button
                component={Link}
                to="/travel-requirements"
                variant="outlined"
                size="large"
                startIcon={<FlightIcon />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.45)',
                  color: '#fff',
                  bgcolor: 'transparent',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                متطلبات السفر
              </Button>
            </Stack>

            {/* Entry-point types */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1, sm: 2 }}
              sx={{ flexWrap: 'wrap' }}
            >
              {[
                { label: 'المطارات', type: 'AIRPORT', icon: <FlightIcon /> },
                { label: 'الموانئ', type: 'SEAPORT', icon: <DirectionsBoatIcon /> },
                { label: 'المعابر البرية', type: 'LAND_PORT', icon: <DirectionsBusIcon /> },
                { label: 'الشحن الصحي', type: null, icon: <LocalShippingIcon />, path: '/services/food-safety' },
              ].map((item) => (
                <Button
                  key={item.label}
                  component={Link}
                  to={item.path ?? `/ports?type=${item.type}`}
                  size="small"
                  startIcon={item.icon}
                  sx={{
                    color: 'rgba(255,255,255,0.92)',
                    borderColor: 'rgba(255,255,255,0.22)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.16)' },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* ============ مؤشرات عامة ============ */}
        <Box component="section" id="stats" aria-label="مؤشرات عامة" sx={{ mb: { xs: 8, md: 11 } }}>
          <SectionTitle
            title="مؤشرات عامة"
            subtitle="أبرز مؤشرات المنصة لحظياً عبر منافذ الدخول والمسافرين والحالات والشهادات"
            align="center"
          />
          <Grid container spacing={2}>
            {FEATURED_STATS.map((stat) => (
              <Grid item xs={6} md={3} key={stat.key}>
                <Card
                  className="fade-up"
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderTop: `4px solid ${stat.color}`,
                    color: 'inherit',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          color: stat.color,
                          bgcolor: `${stat.color}1a`,
                          flexShrink: 0,
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        {loading ? (
                          <Skeleton width={54} height={34} />
                        ) : (
                          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                            {stats ? `${Number(stats[stat.key] ?? 0).toLocaleString('en-US')}+` : '—'}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                          {stat.label}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button component={Link} to="/indicators" endIcon={<ArrowBackIcon />} sx={{ fontWeight: 700 }}>
              جميع المؤشرات التفصيلية
            </Button>
          </Box>
        </Box>

        {/* ============ خريطة نقاط الدخول ============ */}
        <Box component="section" id="entry-map" aria-label="خريطة نقاط الدخول" sx={{ mb: { xs: 8, md: 11 } }}>
          <SectionTitle
            title="خريطة نقاط الدخول"
            subtitle="توزيع المطارات والموانئ والمعابر البرية على خارطة السودان"
            align="center"
          />
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} justifyContent="center">
            <Chip
              size="medium"
              label="الكل"
              color={portFilter === '' ? 'primary' : 'default'}
              variant={portFilter === '' ? 'filled' : 'outlined'}
              onClick={() => setPortFilter('')}
              sx={{ fontWeight: 700 }}
            />
            {PORT_TYPE_GROUPS.map((group) => (
              <Chip
                key={group.type}
                size="medium"
                label={`${group.label} (${portTypeCount(group.type)})`}
                color={portFilter === group.type ? 'primary' : 'default'}
                variant={portFilter === group.type ? 'filled' : 'outlined'}
                onClick={() => setPortFilter((prev) => (prev === group.type ? '' : group.type))}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
          <Box
            sx={{
              height: { xs: 360, md: 480 },
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {mapPoints.length === 0 ? (
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">لا توجد نقاط دخول مطابقة للفلتر</Typography>
              </Box>
            ) : (
              <MapContainer
                center={[15.5, 29.0]}
                zoom={6}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBounds bounds={mapBounds} />
                {mapPoints.map((p) => {
                  const coords = geoCoords(p.location_geo);
                  if (!coords) return null;
                  const [lon, lat] = coords;
                  return (
                    <Marker key={p.id} position={[lat, lon]} icon={portMarker(p.type)}>
                      <Tooltip direction="top" offset={[0, -16]}>
                        {p.name_ar}
                      </Tooltip>
                      <Popup>
                        <Box sx={{ minWidth: 200 }}>
                          <Typography sx={{ fontWeight: 700 }}>{p.name_ar}</Typography>
                          {p.name_en && <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>{p.name_en}</Typography>}
                          <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                            {PORT_TYPE_GROUPS.find((g) => g.type === p.type)?.label ?? p.type}
                            {p.address ? ` — ${p.address}` : ''}
                          </Typography>
                          <Button size="small" component={Link} to={`/ports/${p.id}`} sx={{ mt: 1 }} endIcon={<ArrowBackIcon />}>
                            تفاصيل المنفذ
                          </Button>
                        </Box>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
          </Box>
        </Box>

        {/* ============ الخدمات الأكثر استخداماً ============ */}
        <Box component="section" id="quick-services" sx={{ mb: { xs: 8, md: 11 } }}>
          <SectionTitle
            title="الخدمات الأكثر استخداماً"
            subtitle="أهم الخدمات الإلكترونية التي تقدمها المنصة للمسافرين والشركاء والجهات الصحية"
            align="center"
          />
          <Grid container spacing={2} className="stagger">
            {QUICK_SERVICES.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.label}>
                <Card
                  component={Link}
                  to={service.path}
                  className="fade-up"
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2.5,
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: (t) => t.shadows[8],
                      borderColor: service.color,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.25, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: `color-mix(in srgb, ${service.color} 14%, white)`,
                          color: service.color,
                          flexShrink: 0,
                        }}
                      >
                        {service.icon}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                        {service.label}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: '0.8rem', lineHeight: 1.6, mb: 1.25 }}
                    >
                      {service.desc}
                    </Typography>
                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                      <ArrowBackIcon sx={{ fontSize: 17, color: service.color }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button component={Link} to="/services" variant="contained" endIcon={<ArrowBackIcon />} sx={{ fontWeight: 700 }}>
              عرض جميع الخدمات
            </Button>
          </Box>
</Box>

        {/* ============ آخر الأخبار والتعاميم ============ */}
        <Box component="section" id="news" sx={{ mb: { xs: 8, md: 11 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <SectionTitle title="آخر الأخبار والتعاميم" align="right" />
            <Stack direction="row" spacing={1}>
              <Button component={Link} to="/news" endIcon={<ArrowBackIcon />} sx={{ mb: 4 }}>
                جميع الأخبار
              </Button>
              <Button component={Link} to="/circulars" endIcon={<ArrowBackIcon />} sx={{ mb: 4 }}>
                جميع التعاميم
              </Button>
            </Stack>
          </Stack>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {loading ? (
                <CardsGridSkeleton count={2} />
              ) : news.length === 0 ? (
                <Typography color="text.secondary">لا توجد أخبار حالياً.</Typography>
              ) : (
                <Grid container spacing={2.5}>
                  {news.slice(0, 4).map((article) => (
                    <Grid item xs={12} sm={6} key={article.id}>
                      <Card
                        className="fade-up"
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden',
                          transition: 'transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: (t) => t.shadows[9],
                            borderColor: (t) => `color-mix(in srgb, ${t.palette.primary.main} 35%, transparent)`,
                          },
                        }}
                      >
                        {article.image ? (
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="img"
                              loading="lazy"
                              height={150}
                              image={article.image}
                              alt={article.title}
                              sx={{ objectFit: 'cover' }}
                            />
                            <Chip
                              label={categoryLabels[article.category] || article.category}
                              size="small"
                              variant="outlined"
                              sx={{
                                position: 'absolute',
                                top: 12,
                                insetInlineStart: 12,
                                bgcolor: 'rgba(255,255,255,0.9)',
                                color: 'primary.dark',
                                borderColor: 'rgba(255,255,255,0.7)',
                                fontWeight: 700,
                                backdropFilter: 'blur(8px)',
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              px: 2.75,
                              pt: 2.75,
                              pb: 0,
                            }}
                          >
                            <Chip
                              label={categoryLabels[article.category] || article.category}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                        )}
                        <CardContent sx={{ p: 2.75, flex: 1 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25, minHeight: 24 }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(article.published_at)}
                            </Typography>
                          </Stack>
                          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.45, mb: 1 }}>
                            {article.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {article.content}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ px: 2.75, pb: 2.25, pt: 0 }}>
                          <Button
                            component={Link}
                            to={`/news/${article.id}`}
                            size="small"
                            color="primary"
                            endIcon={<ArrowBackIcon />}
                            sx={{ fontWeight: 700 }}
                          >
                            اقرأ المزيد
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                className="fade-up"
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ px: 2.5, py: 1.75, bgcolor: 'primary.lighter' }}
                >
                  <CampaignIcon sx={{ color: 'primary.dark' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, flex: 1 }}>
                    التعاميم
                  </Typography>
                  <Button component={Link} to="/circulars" size="small" endIcon={<ArrowBackIcon />} sx={{ fontWeight: 700 }}>
                    الكل
                  </Button>
                </Stack>
                <Divider />
                {loading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} height={46} sx={{ mb: 1 }} />
                    ))}
                  </Box>
                ) : circulars.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2.5 }}>
                    لا توجد تعاميم حالياً.
                  </Typography>
                ) : (
                  circulars.slice(0, 5).map((circular, index) => (
                    <Box key={circular.id}>
                      <Box
                        component={Link}
                        to={`/circulars/${circular.id}`}
                        sx={{
                          display: 'block',
                          px: 2.5,
                          py: 1.75,
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background-color 160ms ease',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.5,
                            mb: 0.5,
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            overflow: 'hidden',
                          }}
                        >
                          {circular.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {circular.reference_number} • {formatDate(circular.published_at)}
                        </Typography>
                      </Box>
                      {index < circulars.slice(0, 5).length - 1 && <Divider />}
                    </Box>
                  ))
                )}
              </Card>
            </Grid>
          </Grid>
        </Box>

{/* ============ CTA ============ */}
        <Box
          component="section"
          className="gradient-shift"
          sx={{
            borderRadius: 5,
            p: { xs: 4, md: 7 },
            textAlign: 'center',
            background: (t) => `linear-gradient(120deg, ${t.palette.primary.darker}, ${t.palette.primary.main})`,
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: (t) => t.shadows[16],
            border: '1px solid rgba(255,255,255,0.18)',
            mb: { xs: 8, md: 11 },
          }}
        >
          <Particles count={10} tint="gold" />
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(620px 220px at 82% 16%, rgba(200,161,58,0.3), transparent)',
            }}
          />
          <Box sx={{ position: 'relative', maxWidth: 640, mx: 'auto' }}>
            <Typography variant="h2" sx={{ mb: 1.5, textWrap: 'balance' }}>
              أنت على وشك السفر إلى السودان؟
            </Typography>
<Typography variant="body1" sx={{ mb: 3.5, color: 'rgba(255,255,255,0.95)', lineHeight: 1.8 }}>
                تحقق من متطلبات الدخول وسجّل مسبقاً لتوفير وقتك عند المنفذ.
              </Typography>
            <Button
              component={Link}
              to="/travel-requirements"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'common.white',
                color: 'primary.darker',
                px: 4,
                minHeight: 50,
                '&:hover': { bgcolor: 'grey.50', transform: 'translateY(-2px)' },
              }}
            >
              تعرّف على متطلبات السفر
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;