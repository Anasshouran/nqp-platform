import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import DomainIcon from '@mui/icons-material/Domain';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import PublicIcon from '@mui/icons-material/Public';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DoorFrontIcon from '@mui/icons-material/DoorFront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getSectors, getSectorPorts, getPorts } from '../../api/endpoints/public';
import type { Sector, PublicPort } from '../../api/endpoints/public';
import { PageHeader, EmptyState, CardsGridSkeleton, SectionTitle } from '../../components/common';
import { accentTokens } from '../../styles/theme';

const regionLabels: Record<string, string> = {
  KHARTOUM: 'الخرطوم',
  RED_SEA: 'البحر الأحمر',
  KASSALA: 'كسلا',
  GEDAREF: 'القضارف',
  NORTHERN: 'شمالي',
  KORDOFAN: 'كردفان',
};

type PortType = PublicPort['type'];

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
  AIRPORT: accentTokens.air,
  SEAPORT: accentTokens.sea,
  LAND_PORT: accentTokens.land,
};

const typeFilterOptions: Array<{ value: 'ALL' | PortType; label: string }> = [
  { value: 'ALL', label: 'الكل' },
  { value: 'AIRPORT', label: 'منافذ جوية' },
  { value: 'SEAPORT', label: 'منافذ بحرية' },
  { value: 'LAND_PORT', label: 'منافذ برية' },
];

const sectorSlug = (code: string) => code.toLowerCase().replace('_', '-');

const SectorsPortsPage = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [allPorts, setAllPorts] = useState<PublicPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [portsBySector, setPortsBySector] = useState<Record<string, PublicPort[]>>({});
  const [loadingPorts, setLoadingPorts] = useState<Record<string, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<'ALL' | PortType>('ALL');
  const [search, setSearch] = useState('');
  const [sectorSearch, setSectorSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'AIRPORT' || type === 'SEAPORT' || type === 'LAND_PORT') {
      setTypeFilter(type);
    } else {
      setTypeFilter('ALL');
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([getSectors(), getPorts()])
      .then(([sectorResponse, portResponse]) => {
        setSectors(sectorResponse.data.data);
        setAllPorts(portResponse.data.data);
      })
      .catch(() => {
        setSectors([]);
        setAllPorts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const togglePorts = (sectorId: string) => {
    if (expandedId === sectorId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sectorId);
    if (portsBySector[sectorId] === undefined) {
      setLoadingPorts((prev) => ({ ...prev, [sectorId]: true }));
      getSectorPorts(sectorId)
        .then((response) =>
          setPortsBySector((prev) => ({ ...prev, [sectorId]: response.data.data })),
        )
        .catch(() => setPortsBySector((prev) => ({ ...prev, [sectorId]: [] })))
        .finally(() => setLoadingPorts((prev) => ({ ...prev, [sectorId]: false })));
    }
  };

  const portStats = useMemo(
    () => ({
      total: allPorts.length,
      air: allPorts.filter((p) => p.type === 'AIRPORT').length,
      sea: allPorts.filter((p) => p.type === 'SEAPORT').length,
      land: allPorts.filter((p) => p.type === 'LAND_PORT').length,
      sectors: sectors.length,
    }),
    [allPorts, sectors],
  );

  const filteredPorts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allPorts.filter((port) => {
      if (typeFilter !== 'ALL' && port.type !== typeFilter) return false;
      if (!query) return true;
      return (
        port.name_ar.toLowerCase().includes(query) ||
        port.name_en.toLowerCase().includes(query) ||
        port.code.toLowerCase().includes(query) ||
        (port.country_name || '').toLowerCase().includes(query)
      );
    });
  }, [allPorts, typeFilter, search]);

  const filteredSectors = useMemo(() => {
    const query = sectorSearch.trim().toLowerCase();
    if (!query) return sectors;
    return sectors.filter(
      (s) =>
        s.name_ar.toLowerCase().includes(query) ||
        s.name_en.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        (regionLabels[s.region] || '').toLowerCase().includes(query),
    );
  }, [sectors, sectorSearch]);

  const statCards = [
    { value: portStats.total, label: 'إجمالي المنافذ', icon: <DomainIcon />, color: accentTokens.brand },
    { value: portStats.air, label: 'منافذ جوية', icon: <FlightIcon />, color: accentTokens.air },
    { value: portStats.sea, label: 'منافذ بحرية', icon: <DirectionsBoatIcon />, color: accentTokens.sea },
    { value: portStats.land, label: 'منافذ برية', icon: <DirectionsBusIcon />, color: accentTokens.land },
    { value: portStats.sectors, label: 'قطاع صحي', icon: <DomainIcon />, color: accentTokens.health },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="القطاعات والمنافذ"
        subtitle="تعرّف على القطاعات الصحية ومنافذ الحجر الصحي المنتشرة في جميع أنحاء السودان"
        eyebrow="شبكة المنافذ"
      />

      {/* Network overview */}
      <Box sx={{ mb: 6 }}>
        <SectionTitle
          title="شبكة المنافذ"
          subtitle="إحصاءات شاملة لشبكة منافذ الحجر الصحي حسب النوع والقطاع"
          align="center"
        />
        <Grid container spacing={2}>
          {statCards.map((stat) => (
            <Grid item xs={6} sm={4} md={2.4} key={stat.label}>
              <Card
                className="fade-up"
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderTop: `4px solid ${stat.color}`,
                  '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                }}
              >
                <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      mx: 'auto',
                      mb: 1,
                      borderRadius: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      color: stat.color,
                      bgcolor: `${stat.color}1a`,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
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

      {/* Ports directory */}
      <Box sx={{ mb: 6 }}>
        <SectionTitle
          title="دليل المنافذ"
          subtitle="تصفّح جميع منافذ الحجر الصحي مع إمكانية التصفية حسب النوع والبحث"
          align="center"
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={(_, value) => {
              if (!value) return;
              setTypeFilter(value);
              setSearchParams(value === 'ALL' ? {} : { type: value });
            }}
            size="small"
            aria-label="تصفية حسب نوع المنفذ"
          >
            {typeFilterOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value} sx={{ fontWeight: 700 }}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منفذ بالاسم أو الرمز أو الدولة..."
            aria-label="بحث عن منفذ"
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        {loading ? (
          <CardsGridSkeleton count={6} />
        ) : filteredPorts.length === 0 ? (
          <EmptyState
            icon={<DomainIcon />}
            title="لا توجد منافذ مطابقة"
            description="جرّب تغيير نوع المنفذ أو كلمة البحث."
          />
        ) : (
          <Grid container spacing={3}>
            {filteredPorts.map((port) => (
              <Grid item xs={12} sm={6} md={4} key={port.id}>
                <Card
                  className="fade-up"
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
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Chip label={port.code} size="small" variant="outlined" dir="ltr" sx={{ fontWeight: 700 }} />
                      {port.country_name && (
                        <Chip
                          icon={<PublicIcon />}
                          label={port.country_name}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </Stack>
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

      {/* Sectors */}
      <Box sx={{ mb: 2 }}>
        <SectionTitle
          title="بوابات"
          subtitle="الوصول إلى الخدمات والمعلومات الخاصة بكل قطاع صحي"
          align="center"
        />

        <TextField
          value={sectorSearch}
          onChange={(e) => setSectorSearch(e.target.value)}
          placeholder="ابحث عن قطاع بالاسم أو المنطقة..."
          aria-label="بحث عن قطاع"
          size="small"
          sx={{ mb: 3, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <CardsGridSkeleton count={6} />
        ) : filteredSectors.length === 0 ? (
          <EmptyState
            icon={<DomainIcon />}
            title="لا توجد قطاعات مطابقة"
            description="جرّب تغيير كلمة البحث."
          />
        ) : (
          <Grid container spacing={3}>
            {filteredSectors.map((sector) => {
              const slug = sectorSlug(sector.code);
              return (
                <Grid item xs={12} sm={6} md={4} key={sector.id}>
                  <Card
                    className="fade-up"
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
                        <Avatar
                          sx={{ bgcolor: sector.color || '#0c7f6a', width: 52, height: 52 }}
                          aria-hidden="true"
                        >
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
                          <Chip
                            label={regionLabels[sector.region] || sector.region}
                            size="small"
                          />
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

                      <Stack direction="row" spacing={1}>
                        <Button
                          component={Link}
                          to={`/sector/${slug}`}
                          variant="contained"
                          size="small"
                          fullWidth
                          endIcon={<ArrowForwardIcon />}
                          sx={{ fontWeight: 700 }}
                        >
                          دخول البوابة
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => togglePorts(sector.id)}
                          startIcon={loadingPorts[sector.id] ? <CircularProgress size={16} /> : undefined}
                          endIcon={expandedId === sector.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          aria-expanded={expandedId === sector.id}
                          sx={{ minWidth: 110 }}
                        >
                          النقاط
                        </Button>
                      </Stack>

                      <Collapse in={expandedId === sector.id} unmountOnExit>
                        {loadingPorts[sector.id] ? (
                          <Box sx={{ py: 2, textAlign: 'center' }}>
                            <CircularProgress size={28} />
                          </Box>
                        ) : (portsBySector[sector.id] || []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            لا توجد منافذ مسجلة في هذا القطاع.
                          </Typography>
                        ) : (
                          <List dense sx={{ mt: 1 }}>
                            {(portsBySector[sector.id] || []).map((port) => (
                              <ListItem key={port.id} sx={{ px: 0.5, py: 0.25, borderRadius: 2 }}>
                                <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                                  {portTypeIcons[port.type] || <LocationOnIcon />}
                                </ListItemIcon>
                                <ListItemText
                                  primary={port.name_ar}
                                  primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                                  secondary={
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                                      <Typography variant="caption" color="text.secondary" dir="ltr">
                                        {port.code}
                                      </Typography>
                                      <Chip
                                        label={portTypeLabels[port.type] || port.type}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{ height: 20, fontSize: '0.68rem' }}
                                      />
                                    </Stack>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Collapse>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default SectorsPortsPage;