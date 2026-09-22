import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { alpha, useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { getPort, getPortStats } from '../../api/endpoints/public';
import type { PublicPort, PortStats } from '../../api/endpoints/public';

const typeMeta: Record<PublicPort['type'], { label: string; icon: React.ReactNode }> = {
  AIRPORT: { label: 'منفذ جوي', icon: <FlightIcon /> },
  SEAPORT: { label: 'منفذ بحري', icon: <DirectionsBoatIcon /> },
  LAND_PORT: { label: 'منفذ بري', icon: <DirectionsBusIcon /> },
};

const serviceMeta = [
  { label: 'فحوصات وخدمات الحجر الصحي', icon: <HealthAndSafetyIcon /> },
  { label: 'سلامة الأغذية وفحص الشحنات', icon: <Inventory2Icon /> },
  { label: 'إصدار الشهادات الصحية', icon: <VerifiedUserIcon /> },
  { label: 'الاستعلام عن إجراءات السفر', icon: <TravelExploreIcon /> },
];

const SectorCmsPortDetail = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const { slug } = useSectorSite();
  const [port, setPort] = useState<PublicPort | null>(null);
  const [stats, setStats] = useState<PortStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  usePageTitle(port?.name_ar ? `المنفذ — ${port.name_ar}` : 'المنفذ');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    getPort(id)
      .then((res) => setPort(res.data.data))
      .catch(() => {
        setPort(null);
        setError(true);
      })
      .finally(() => setLoading(false));
    setStatsLoading(true);
    getPortStats(id)
      .then((res) => setStats(res.data.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SectorPageShell>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={170} sx={{ mb: 3 }} />
        <Skeleton variant="text" width={160} sx={{ mb: 2 }} />
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={4} key={i}><Skeleton variant="rounded" height={96} /></Grid>
          ))}
        </Grid>
      </SectorPageShell>
    );
  }

  if (error || !port) {
    return (
      <SectorPageShell>
        <SectorHomeLink current="المنفذ" />
        <Paper
          role="alert"
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: 'center',
            borderRadius: 4,
            border: '1px dashed rgba(16,40,34,0.18)',
            boxShadow: 'none',
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(12,127,106,0.09)',
              color: 'rgba(12,127,106,0.85)',
              fontSize: 30,
            }}
          >
            <RefreshIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>المنفذ غير متاح</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            لم نتمكن من جلب بيانات هذا المنفذ. يرجى المحاولة مرة أخرى.
          </Typography>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={load} size="large">إعادة المحاولة</Button>
        </Paper>
      </SectorPageShell>
    );
  }

  const meta = typeMeta[port.type];
  const statCards = [
    { label: 'إجمالي الفحوصات', value: stats?.screenings_total ?? null, icon: <HealthAndSafetyIcon /> },
    { label: 'تنبيهات نشطة', value: stats?.active_alerts ?? null, icon: <WarningAmberIcon /> },
    { label: 'رحلات / مغادرات', value: stats?.flights_total ?? null, icon: <FlightTakeoffIcon /> },
  ];

  return (
    <SectorPageShell>
      <SectorHomeLink current={port.name_ar} />
      <Button component={Link} to={`/sector/${slug}/ports`} startIcon={<ArrowForwardIcon />} size="small" sx={{ mb: 2.5, fontWeight: 700 }}>
        العودة إلى المنافذ
      </Button>

      <Card sx={{ mb: 4, borderRadius: 4, border: '1px solid rgba(16,40,34,0.09)', overflow: 'hidden' }}>
        <Box
          aria-hidden
          sx={{
            height: 6,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.1)})`,
          }}
        />
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Box
                aria-hidden
                sx={{
                  width: 64,
                  height: 64,
                  flex: '0 0 auto',
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontSize: 30,
                }}
              >
                {meta.icon}
              </Box>
              <Box>
                <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>{port.name_ar}</Typography>
                {port.name_en ? (
                  <Typography variant="body2" color="text.secondary" dir="ltr" sx={{ textAlign: 'right' }}>{port.name_en}</Typography>
                ) : null}
              </Box>
            </Stack>
            {port.is_active ? (
              <Chip
                label={meta.label}
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, fontWeight: 700 }}
              />
            ) : (
              <Chip label="خارج الخدمة" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
            )}
          </Stack>

          <Grid container spacing={1.5} sx={{ mt: 2 }}>
            <ContactRow icon={<LocationOnOutlinedIcon />} text={port.address} dir="auto" />
            <ContactRow icon={<PhoneIcon />} text={port.phone} href={port.phone ? `tel:${port.phone.replace(/\s/g, '')}` : undefined} />
            <ContactRow icon={<MailIcon />} text={port.email} href={port.email ? `mailto:${port.email}` : undefined} />
            {port.country_name ? <ContactRow icon={<TravelExploreIcon />} text={port.country_name} /> : null}
            {port.code ? <ContactRow icon={<FlightTakeoffIcon />} text={port.code} dir="ltr" mono /> : null}
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="overline" color="text.disabled" sx={{ mb: 0.5, display: 'block' }}>مؤشرات الأداء</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>إحصائيات عامة</Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }} aria-busy={statsLoading}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 3.5,
                border: '1px solid rgba(16,40,34,0.08)',
                transition: 'box-shadow 220ms ease',
                '&:hover': { boxShadow: theme.shadows[4] },
              }}
            >
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 52,
                    height: 52,
                    flex: '0 0 auto',
                    borderRadius: 3,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                    fontSize: 26,
                  }}
                >
                  {s.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                    {s.value === null ? (statsLoading ? <Skeleton width={48} /> : '—') : s.value.toLocaleString('ar-EG')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="overline" color="text.disabled" sx={{ mb: 0.5, display: 'block' }}>ماذا يمكنك أن تفعل هنا</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>الخدمات المتاحة</Typography>
      <Grid container spacing={2.5}>
        {serviceMeta.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Button
              component={Link}
              to={`/sector/${slug}/services`}
              fullWidth
              sx={{
                height: '100%',
                minHeight: 128,
                flexDirection: 'column',
                gap: 1.5,
                borderRadius: 3.5,
                justifyContent: 'center',
                alignItems: 'center',
                p: 2.5,
                color: 'text.secondary',
                bgcolor: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(16,40,34,0.1)',
                boxShadow: 'none',
                '& .MuiSvgIcon-root': { fontSize: 30, color: theme.palette.primary.main },
                '&:hover': {
                  color: 'text.primary',
                  borderColor: alpha(theme.palette.primary.main, 0.4),
                  bgcolor: 'rgba(255,255,255,0.9)',
                  boxShadow: theme.shadows[5],
                  '& .MuiSvgIcon-root': { transform: 'translateY(-2px)' },
                },
              }}
            >
              <Box sx={{ transition: 'transform 220ms ease' }}>{s.icon}</Box>
              <Typography sx={{ fontWeight: 700, textTransform: 'none', textAlign: 'center', lineHeight: 1.6 }}>{s.label}</Typography>
            </Button>
          </Grid>
        ))}
      </Grid>
    </SectorPageShell>
  );
};

export default SectorCmsPortDetail;

/* ------------------------------------------------------------------ */

function ContactRow({ icon, text, href, dir, mono }: { icon: React.ReactNode; text?: string; href?: string; dir?: 'ltr' | 'auto'; mono?: boolean }) {
  const theme = useTheme();
  if (!text) return null;
  return (
    <Grid item xs={12} sm={6}>
      <Box
        component={href ? 'a' : 'div'}
        href={href}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          p: 1.25,
          borderRadius: 2,
          bgcolor: 'rgba(16,40,34,0.035)',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'background-color 160ms ease',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 32,
            height: 32,
            flex: '0 0 auto',
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            fontSize: 17,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          dir={dir}
          sx={{
            fontWeight: 500,
           ... (mono ? { fontFamily: "'IBM Plex Mono', 'IBM Plex Sans Arabic', monospace", letterSpacing: '0.03em' } : {}),
          }}
        >
          {text}
        </Typography>
      </Box>
    </Grid>
  );
}