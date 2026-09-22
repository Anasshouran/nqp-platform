import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import PersonIcon from '@mui/icons-material/Person';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FlightIcon from '@mui/icons-material/Flight';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ScienceIcon from '@mui/icons-material/Science';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import BugReportIcon from '@mui/icons-material/BugReport';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import VerifiedIcon from '@mui/icons-material/Verified';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import DoorFrontIcon from '@mui/icons-material/DoorFront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getSectors, getPorts } from '../../api/endpoints/public';
import type { Sector, PublicPort } from '../../api/endpoints/public';
import { PageHeader, SectionTitle, CardsGridSkeleton } from '../../components/common';

interface Gateway {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  public: boolean;
}

const GATEWAYS: Gateway[] = [
  {
    id: 'traveler',
    title: 'بوابة المسافر',
    subtitle: 'خدمات المسافر: التسجيل المسبق، تتبع الطلبات، إدارة المستندات',
    icon: <PersonIcon />,
    color: '#0e8a72',
    path: '/traveler/login',
    public: true,
  },
  {
    id: 'sectors',
    title: 'بوابة القطاعات',
    subtitle: 'القطاعات الصحية الخمسة: البحر الأحمر، الخرطوم، كسلا، القضارف، الشمالي',
    icon: <AccountTreeIcon />,
    color: '#0c7f6a',
    path: '/gateways#sectors',
    public: true,
  },
  {
    id: 'ports',
    title: 'بوابة المنافذ',
    subtitle: 'المطارات والموانئ والمعابر البرية المنتشرة في جميع أنحاء السودان',
    icon: <FlightIcon />,
    color: '#2f6f9f',
    path: '/gateways#ports',
    public: true,
  },
  {
    id: 'clinic',
    title: 'بوابة العيادات',
    subtitle: 'نظام العيادات: الفحوصات، العزل، الأدوية، وسجلات المرضى',
    icon: <LocalHospitalIcon />,
    color: '#d32f2f',
    path: '/app/clinic',
    public: false,
  },
  {
    id: 'lab',
    title: 'بوابة المختبرات',
    subtitle: 'إدارة المختبرات: التحاليل الدموية، الكيمياء، المجهرية، مراقبة الجودة',
    icon: <ScienceIcon />,
    color: '#7a5c9e',
    path: '/app/laboratory',
    public: false,
  },
  {
    id: 'food',
    title: 'بوابة رقابة الأغذية',
    subtitle: 'فحص وتحليل ورقابة الأغذية والمستوردات الغذائية',
    icon: <RestaurantIcon />,
    color: '#c8a13a',
    path: '/app/food',
    public: false,
  },
  {
    id: 'vector',
    title: 'بوابة مكافحة النواقل',
    subtitle: 'مكافحة الحشرات الناقلة للأمراض ومراقبة المخاطر البيئية',
    icon: <BugReportIcon />,
    color: '#b3544b',
    path: '/app/vector-control',
    public: false,
  },
  {
    id: 'surveillance',
    title: 'بوابة الترصد',
    subtitle: 'الرصد الوبائي والإنذارات المبكرة وتحليل الأوبئة',
    icon: <MonitorHeartIcon />,
    color: '#1565c0',
    path: '/app/surveillance',
    public: false,
  },
  {
    id: 'vaccination',
    title: 'بوابة التطعيم الدولي',
    subtitle: 'إدارة التطعيمات والجرعات وشهادات التطعيم الدولية',
    icon: <VaccinesIcon />,
    color: '#2e7d32',
    path: '/app/vaccination',
    public: false,
  },
  {
    id: 'certificates',
    title: 'التحقق من الشهادات',
    subtitle: 'التحقق من صحة الشهادات الطبية وطلب شهادات جديدة',
    icon: <VerifiedIcon />,
    color: '#0277bd',
    path: '/verify',
    public: true,
  },
  {
    id: 'airlines',
    title: 'بوابة شركات الطيران',
    subtitle: 'خدمات شركات الطيران: إدارة الرحلات والركاب والمتطلبات الصحية',
    icon: <LocalShippingIcon />,
    color: '#1976d2',
    path: '/app/carrier',
    public: false,
  },
  {
    id: 'shipping',
    title: 'بوابة شركات الشحن والموانئ',
    subtitle: 'شركات الشحن والجهات البحرية وشحن البضائع',
    icon: <DirectionsBoatIcon />,
    color: '#6d4c41',
    path: '/app/food-ops',
    public: false,
  },
  {
    id: 'partners',
    title: 'بوابة المنظمات والشركاء',
    subtitle: 'المنظمات الدولية والشراكات الثنائية والتعاون المؤسسي',
    icon: <HandshakeIcon />,
    color: '#00838f',
    path: '/partners',
    public: true,
  },
  {
    id: 'admin',
    title: 'بوابة الإدارة العامة',
    subtitle: 'لوحة الإدارة العامة: إدارة المستخدمين، الأدوار، البلاغات، الإعدادات',
    icon: <AdminPanelSettingsIcon />,
    color: '#37474f',
    path: '/app',
    public: false,
  },
];

const regionLabels: Record<string, string> = {
  KHARTOUM: 'الخرطوم',
  RED_SEA: 'البحر الأحمر',
  KASSALA: 'كسلا',
  GEDAREF: 'القضارف',
  NORTHERN: 'شمالي',
  KORDOFAN: 'كردفان',
};

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

const portTypeColors: Record<string, string> = {
  AIRPORT: '#2f6f9f',
  SEAPORT: '#c8a13a',
  LAND_PORT: '#b3544b',
};

const sectorSlug = (code: string) => code.toLowerCase().replace('_', '-');

const statsOverview = [
  { icon: <HealthAndSafetyIcon />, value: '5', label: 'قطاعات صحية', color: '#0e8a72' },
  { icon: <LocalShippingIcon />, value: '14', label: 'منافذ دخول', color: '#2f6f9f' },
  { icon: <LocalHospitalIcon />, value: '7', label: 'عيادات نشطة', color: '#d32f2f' },
  { icon: <ScienceIcon />, value: '12', label: 'مختبر', color: '#7a5c9e' },
  { icon: <VaccinesIcon />, value: '6', label: 'مواقع تطعيم', color: '#2e7d32' },
];

const GatewayHubPage = () => {
  const [search, setSearch] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [loading, setLoading] = useState(true);
  const { hash } = useLocation();

  useEffect(() => {
    Promise.all([getSectors(), getPorts()])
      .then(([sectorResponse, portResponse]) => {
        setSectors(sectorResponse.data.data);
        setPorts(portResponse.data.data);
      })
      .catch(() => {
        setSectors([]);
        setPorts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [hash]);

  const filteredGateways = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return GATEWAYS;
    return GATEWAYS.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        g.subtitle.toLowerCase().includes(query) ||
        g.id.toLowerCase().includes(query),
    );
  }, [search]);

  const publicGateways = filteredGateways.filter((g) => g.public);
  const operationalGateways = filteredGateways.filter((g) => !g.public);

  const renderGatewayCard = (gateway: Gateway) => (
    <Card
      className="fade-up"
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderTop: `5px solid ${gateway.color}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 300ms ease, box-shadow 300ms ease',
        '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
      }}
    >
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Avatar sx={{ bgcolor: gateway.color, width: 52, height: 52 }} aria-hidden="true">
            {gateway.icon}
          </Avatar>
          {gateway.public ? (
            <Chip
              icon={<PublicIcon />}
              label="عامة"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <Chip
              icon={<LockIcon />}
              label="تتطلب تسجيل"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 700, mt: 2 }}>
          {gateway.title}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
          {gateway.subtitle}
        </Typography>

        <Button
          component={Link}
          to={gateway.path}
          variant={gateway.public ? 'contained' : 'outlined'}
          fullWidth
          endIcon={<ArrowForwardIcon />}
          sx={{ fontWeight: 700 }}
        >
          دخول البوابة
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="بوابات الحجر الصحي القومي"
        subtitle="اختر البوابة المناسبة للوصول إلى الخدمات الرقمية"
        eyebrow="🏛️ بوابات المنصة"
      />

      {/* Stats overview */}
      <Box sx={{ mb: 5 }}>
        <Grid container spacing={2}>
          {statsOverview.map((stat) => (
            <Grid item xs={6} sm={4} md={2.4} key={stat.label}>
              <Card
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderTop: `4px solid ${stat.color}`,
                  '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                }}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      mx: 'auto',
                      mb: 0.5,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      color: stat.color,
                      bgcolor: `${stat.color}15`,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن بوابة..."
          aria-label="بحث عن بوابة"
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 400 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Public gateways */}
      {publicGateways.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <SectionTitle
            title="البوابات العامة"
            subtitle="خدمات متاحة بدون تسجيل الدخول"
            align="center"
          />
          <Grid container spacing={3}>
            {publicGateways.map((gateway) => (
              <Grid item xs={12} sm={6} md={4} key={gateway.id}>
                {renderGatewayCard(gateway)}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Operational gateways */}
      {operationalGateways.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <SectionTitle
            title="البوابات التشغيلية"
            subtitle="تتطلب تسجيل الدخول عبر المنصة"
            align="center"
          />
          <Grid container spacing={3}>
            {operationalGateways.map((gateway) => (
              <Grid item xs={12} sm={6} md={4} key={gateway.id}>
                {renderGatewayCard(gateway)}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {filteredGateways.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            لا توجد بوابات مطابقة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            جرّب تغيير كلمة البحث.
          </Typography>
        </Box>
      )}

      {/* Sectors section */}
      <Box id="sectors" sx={{ mb: 6, pt: 3 }}>
        <SectionTitle
          title="بوابة القطاعات"
          subtitle="الوصول إلى الخدمات والمعلومات الخاصة بكل قطاع صحي"
          align="center"
        />
        {loading ? (
          <CardsGridSkeleton count={6} />
        ) : sectors.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', display: 'block', py: 4 }}>
            لا توجد قطاعات مسجلة.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {sectors.map((sector) => (
              <Grid item xs={12} sm={6} md={4} key={sector.id}>
                <Card
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderTop: `5px solid ${sector.color || '#0c7f6a'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 300ms ease, box-shadow 300ms ease',
                    '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                  }}
                >
                  <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Avatar sx={{ bgcolor: sector.color || '#0c7f6a', width: 52, height: 52 }} aria-hidden="true">
                        <DoorFrontIcon />
                      </Avatar>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="نشط"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip label={regionLabels[sector.region] || sector.region} size="small" />
                      </Stack>
                    </Stack>

                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 2 }}>
                      {sector.name_ar}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sector.name_en}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    <Typography variant="body2" sx={{ mb: 2, flex: 1, minHeight: 40 }}>
                      {sector.description_ar || 'قطاع صحي تابع للإدارة الاتحادية للحجر الصحي.'}
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontWeight: 700, fontSize: 14 }}>
                        <LocalShippingIcon sx={{ fontSize: 18 }} />
                        {sector.ports_count} نقطة دخول
                      </Box>
                      {sector.phone && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: 13 }}>
                          <PhoneIcon sx={{ fontSize: 16 }} />
                          <span dir="ltr">{sector.phone}</span>
                        </Box>
                      )}
                    </Stack>

                    <Button
                      component={Link}
                      to={`/sector/${sectorSlug(sector.code)}`}
                      variant="contained"
                      size="small"
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 700 }}
                    >
                      دخول البوابة
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Ports section */}
      <Box id="ports" sx={{ mb: 2, pt: 3 }}>
        <SectionTitle
          title="بوابة المنافذ"
          subtitle="تصفّح جميع منافذ الحجر الصحي حسب النوع"
          align="center"
        />
        {loading ? (
          <CardsGridSkeleton count={6} />
        ) : ports.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', display: 'block', py: 4 }}>
            لا توجد منافذ مسجلة.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {ports.map((port) => (
              <Grid item xs={12} sm={6} md={4} key={port.id}>
                <Card
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'transform 300ms ease, box-shadow 300ms ease',
                    '&:hover': { transform: 'translateY(-5px)', boxShadow: 5 },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                          background: portTypeColors[port.type] || 'primary.main',
                        }}
                      >
                        {portTypeIcons[port.type] || <LocationOnIcon />}
                      </Box>
                      <Chip
                        label={portTypeLabels[port.type] || port.type}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 2 }}>
                      {port.name_ar}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {port.name_en}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack spacing={0.75}>
                      {port.address && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', fontSize: 13 }}>
                          <LocationOnIcon sx={{ fontSize: 16 }} />
                          <span>{port.address}</span>
                        </Stack>
                      )}
                      {port.phone && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', fontSize: 13 }}>
                          <PhoneIcon sx={{ fontSize: 16 }} />
                          <span dir="ltr">{port.phone}</span>
                        </Stack>
                      )}
                      {port.email && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', fontSize: 13 }}>
                          <EmailIcon sx={{ fontSize: 16 }} />
                          <span dir="ltr">{port.email}</span>
                        </Stack>
                      )}
                    </Stack>
                    <Button
                      component={Link}
                      to={`/ports/${port.id}`}
                      size="small"
                      variant="text"
                      color="primary"
                      sx={{ mt: 1.5, fontWeight: 700 }}
                    >
                      التفاصيل
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          component={Link}
          to="/login"
          variant="outlined"
          startIcon={<AdminPanelSettingsIcon />}
          sx={{ fontWeight: 700 }}
        >
          دخول موظفي المنصة
        </Button>
      </Box>
    </Container>
  );
};

export default GatewayHubPage;