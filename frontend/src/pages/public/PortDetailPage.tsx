import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import type { ReactElement } from 'react';
import { getPort, getPortStats } from '../../api/endpoints/public';
import type { PublicPort, PortStats } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton } from '../../components/common';

const portTypeLabels: Record<string, string> = {
  AIRPORT: 'منفذ جوي',
  SEAPORT: 'منفذ بحري',
  LAND_PORT: 'منفذ بري',
};

const portTypeIcons: Record<string, ReactElement> = {
  AIRPORT: <FlightIcon />,
  SEAPORT: <DirectionsBoatIcon />,
  LAND_PORT: <DirectionsBusIcon />,
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });

const PortDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [port, setPort] = useState<PublicPort | null>(null);
  const [stats, setStats] = useState<PortStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getPort(id).then((r) => r.data.data),
      getPortStats(id)
        .then((r) => r.data.data)
        .catch(() => null),
    ])
      .then(([portData, statsData]) => {
        setPort(portData);
        setStats(statsData);
      })
      .catch(() => setPort(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Button component={Link} to="/sectors" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
        العودة إلى القطاعات والمنافذ
      </Button>

      {loading ? (
        <ListSkeleton count={3} />
      ) : !port ? (
        <EmptyState
          icon={<LocationOnIcon />}
          title="المنفذ غير متاح"
          description="لم يتم العثور على هذا المنفذ."
        />
      ) : (
        <>
          <PageHeader
            title={port.name_ar}
            subtitle={port.name_en}
            eyebrow="منفذ دخول"
            action={
              <Chip
                icon={portTypeIcons[port.type] || <LocationOnIcon />}
                label={portTypeLabels[port.type] || port.type}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, py: 1.25, px: 1, fontSize: 14 }}
              />
            }
          />

          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Box
                  sx={{
                    height: 200,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: `${portTypeColors(port.type)}18`,
                    color: portTypeColors(port.type),
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ fontSize: 64, mb: 1 }}>{portTypeIcons[port.type]}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {portTypeLabels[port.type] || port.type}
                    </Typography>
                  </Box>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    معلومات المنفذ
                  </Typography>
                  <Stack spacing={1.5}>
                    <InfoRow label="رمز المنفذ" value={port.code} dir="ltr" />
                    <InfoRow label="الاسم بالعربية" value={port.name_ar} />
                    <InfoRow label="الاسم بالإنجليزية" value={port.name_en} dir="ltr" />
                    <InfoRow label="الولاية" value={port.country_name || '—'} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                المؤشرات التشغيلية
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <StatBox
                    icon={<PeopleIcon />}
                    label="إجمالي الفحوصات الصحية"
                    value={stats?.screenings_total ?? 0}
                    accent="#0e8a72"
                  />
                </Grid>
                <Grid item xs={12}>
                  <StatBox
                    icon={<WarningAmberIcon />}
                    label="إنذارات نشطة"
                    value={stats?.active_alerts ?? 0}
                    accent={(stats?.active_alerts ?? 0) > 0 ? '#c62828' : '#2f6f9f'}
                  />
                </Grid>
                <Grid item xs={12}>
                  <StatBox
                    icon={<FlightTakeoffIcon />}
                    label="الرحلات المسجلة"
                    value={stats?.flights_total ?? 0}
                    accent="#7a5c9e"
                  />
                </Grid>
              </Grid>

              <Card sx={{ border: '1px solid', borderColor: 'divider', mt: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    ملاحظة
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    البيانات التشغيلية تُحدَّث من النظام الداخلي. آخر تحديث: {formatDate(new Date().toISOString())}.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

const portTypeColors = (type: string) =>
  type === 'AIRPORT' ? '#2f6f9f' : type === 'SEAPORT' ? '#c8a13a' : '#b3544b';

const InfoRow = ({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }} dir={dir}>{value}</Typography>
  </Stack>
);

const StatBox = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) => (
  <Card sx={{ border: '1px solid', borderColor: 'divider', borderLeft: `5px solid ${accent}` }}>
    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 46, height: 46, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: accent, bgcolor: `${accent}1a`, flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          {value.toLocaleString('en-US')}
        </Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </CardContent>
  </Card>
);

export default PortDetailPage;
