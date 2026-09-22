import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocationOnOutlineIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { SectorPageShell, SectorHomeLink, sectorBareName, useSectorSite, usePageTitle } from './SectorCmsShared';
import KpiCard from '../../components/dashboard/KpiCard';
import { getSectorPorts } from '../../api/endpoints/public';
import type { PublicPort } from '../../api/endpoints/public';

type PortType = PublicPort['type'];
type AccentColor = 'primary' | 'info' | 'success';

const typeMeta: Record<PortType, { label: string; chip: AccentColor; icon: React.ReactNode }> = {
  AIRPORT: { label: 'منفذ جوي', chip: 'info', icon: <FlightIcon /> },
  SEAPORT: { label: 'منفذ بحري', chip: 'primary', icon: <DirectionsBoatIcon /> },
  LAND_PORT: { label: 'منفذ بري', chip: 'success', icon: <DirectionsBusIcon /> },
};

const groupOrder: PortType[] = ['AIRPORT', 'SEAPORT', 'LAND_PORT'];
const groupLabels: Record<PortType, string> = { AIRPORT: 'المطارات', SEAPORT: 'الموانئ البحرية', LAND_PORT: 'المعابر البرية' };

type PortsState = { status: 'loading' | 'error' | 'ready'; ports: PublicPort[] };

const tint = (theme: Theme, color: AccentColor) => ({
  bg: alpha(theme.palette[color].main, 0.1),
  fg: theme.palette[color].main,
});

const SectorCmsPorts = () => {
  const theme = useTheme();
  const { sector, slug, loading } = useSectorSite();
  const [state, setState] = useState<PortsState>({ status: 'loading', ports: [] });
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  usePageTitle('المنافذ');

  const loadPorts = useCallback(() => {
    if (!sector) return;
    setState({ status: 'loading', ports: [] });
    getSectorPorts(sector.id)
      .then((res) => setState({ status: 'ready', ports: res.data.data ?? [] }))
      .catch(() => setState({ status: 'error', ports: [] }));
  }, [sector]);

  useEffect(() => {
    loadPorts();
  }, [loadPorts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const term = search.trim().toLowerCase();
  const isSearching = term.length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return state.ports;
    return state.ports.filter(
      (p) =>
        p.name_ar.toLowerCase().includes(term) ||
        (p.name_en || '').toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.country_name || '').toLowerCase().includes(term) ||
        typeMeta[p.type].label.toLowerCase().includes(term) ||
        (p.address || '').toLowerCase().includes(term)
    );
  }, [state.ports, term, isSearching]);

  const countFor = (t: PortType) => filtered.filter((p) => p.type === t).length;

  const renderPortCards = (list: PublicPort[], animate: boolean) => (
    <Grid container spacing={2.5}>
      {list.map((port, i) => (
        <Grid
          item
          xs={12}
          sm={6}
          md={4}
          key={port.id}
          className={animate ? 'fade-up' : undefined}
          style={animate ? { animationDelay: `${Math.min(i * 60, 420)}ms` } : undefined}
        >
          <PortCard port={port} slug={slug} theme={theme} />
        </Grid>
      ))}
    </Grid>
  );

  if (loading) {
    return (
      <SectorPageShell>
        <Skeleton variant="text" width={96} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={420} sx={{ mb: 4 }} />
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={4} key={i}><Skeleton variant="rounded" height={96} /></Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={48} width={520} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={160} sx={{ mb: 3 }} />
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={168} /></Grid>
          ))}
        </Grid>
      </SectorPageShell>
    );
  }

  if (!sector) {
    return (
      <SectorPageShell>
        <SectorHomeLink current="المنافذ" />
        <CenteredState icon={<TravelExploreIcon />} title="قطاع غير متاح" body="لم نتمكن من العثور على هذا القطاع." />
      </SectorPageShell>
    );
  }

  return (
    <SectorPageShell>
      <SectorHomeLink current="المنافذ" />

      <Box sx={{ position: 'relative', mb: 4, overflow: 'hidden' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 'auto -96px -120px auto',
            width: 360,
            height: 220,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, ${alpha(theme.palette.primary.light, 0.55)}, transparent)`,
            filter: 'blur(6px)',
            pointerEvents: 'none',
          }}
        />
        <Typography
          variant="overline"
          color="primary.main"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, '& .MuiSvgIcon-root': { fontSize: 15 } }}
        >
          <TravelExploreIcon /> نقاط الدخول — {sectorBareName(sector.name_ar)}
        </Typography>
        <Typography component="h1" variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.01em' }}>
          المنافذ
          <Box component="span" sx={{ color: 'primary.main' }}> والصحة الحدودية</Box>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620 }}>
          مطارات وموانئ ومعابر برية تابعة لقطاع {sectorBareName(sector.name_ar)}، مرتبة حسب نوع المنفذ لتصل إلى نقطة الدخول المناسبة.
        </Typography>
      </Box>

      {state.status === 'error' ? (
        <CenteredState
          icon={<RefreshIcon />}
          title="تعذّر تحميل المنافذ"
          body="تعذّر جلب البيانات من الخادم. يرجى المحاولة مرة أخرى."
          action={<Button variant="contained" startIcon={<RefreshIcon />} onClick={loadPorts} size="large">إعادة المحاولة</Button>}
        />
      ) : (
        <Box aria-busy={state.status === 'loading'}>
          <Grid container spacing={1.5} sx={{ mb: 4 }}>
            {groupOrder.map((t) => (
              <Grid item xs={12} sm={4} key={t}>
                {state.status === 'loading' ? (
                  <Skeleton variant="rounded" height={118} />
                ) : (
                  <KpiCard icon={typeMeta[t].icon} value={countFor(t)} label={typeMeta[t].label} accent={`${typeMeta[t].chip}.main`} />
                )}
              </Grid>
            ))}
          </Grid>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ mb: isSearching ? 3 : 4 }}
          >
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                minWidth: 0,
                p: 1.5,
                borderRadius: 3,
                borderColor: alpha(theme.palette.primary.main, 0.22),
                boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.06)}`,
              }}
            >
              <TextField
                inputRef={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منفذ بالاسم أو الرمز أو المنطقة..."
                aria-label="بحث عن منفذ"
                size="medium"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ gap: 0.5 }}>
                      {isSearching ? (
                        <IconButton onClick={() => setSearch('')} aria-label="مسح البحث" size="small" edge="end">
                          <ClearIcon />
                        </IconButton>
                      ) : (
                        <Box
                          sx={{
                            display: { xs: 'none', sm: 'inline-flex' },
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 1,
                            minHeight: 26,
                            borderRadius: 1.5,
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'text.secondary',
                            bgcolor: 'rgba(16,40,34,0.05)',
                            border: '1px solid rgba(16,40,34,0.1)',
                          }}
                        >
                          /
                        </Box>
                      )}
                    </InputAdornment>
                  ),
                }}
              />
            </Paper>
            <Chip
              label={isSearching ? `${filtered.length} نتيجة مطابقة` : `${state.ports.length} منفذ`}
              sx={{
                alignSelf: { xs: 'flex-start', md: 'center' },
                px: 1,
                py: 2,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
                fontWeight: 800,
              }}
            />
          </Stack>

          {state.status === 'ready' && filtered.length === 0 ? (
            <CenteredState icon={<SearchIcon />} title="لا توجد منافذ مطابقة" body="جرّب كلمة بحث أخرى مثل الاسم أو الرمز أو المنطقة." />
          ) : state.status === 'loading' ? (
            <Grid container spacing={2.5}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={168} /></Grid>
              ))}
            </Grid>
          ) : isSearching ? (
            renderPortCards(filtered, false)
          ) : (
            groupOrder.map((t, gi) => {
              const list = filtered.filter((p) => p.type === t);
              return (
                <Box key={t} sx={{ mb: 5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="overline" color="text.disabled" sx={{ m: 0 }}>
                      {String(gi + 1).padStart(2, '0')}
                    </Typography>
                    <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>{groupLabels[t]}</Typography>
                    <Chip label={`${list.length}`} size="small" sx={{ bgcolor: alpha(theme.palette[typeMeta[t].chip].main, 0.1), color: theme.palette[typeMeta[t].chip].main, fontWeight: 800 }} />
                  </Stack>
                  <Box sx={{ height: 1, bgcolor: 'divider', mb: 2.5, width: '100%' }} />
                  {list.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      لا توجد منافذ في هذه الفئة حالياً.
                    </Typography>
                  ) : (
                    renderPortCards(list, true)
                  )}
                </Box>
              );
            })
          )}
        </Box>
      )}
    </SectorPageShell>
  );
};

export default SectorCmsPorts;

/* ------------------------------------------------------------------ */
/*  Sub-components (file-local, intentionally thin)                   */
/* ------------------------------------------------------------------ */

function PortCard({ port, slug, theme }: { port: PublicPort; slug: string; theme: Theme }) {
  const meta = typeMeta[port.type];
  const t = tint(theme, meta.chip);
  const detailTo = `/sector/${slug}/ports/${port.id}`;

  return (
    <Card
      sx={{
        position: 'relative',
        height: '100%',
        borderRadius: 4,
        border: '1px solid rgba(16,40,34,0.09)',
        borderBottom: `3px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        transition:
          'transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease, border-color 260ms ease, border-bottom-color 260ms ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: theme.shadows[6],
          borderColor: alpha(theme.palette.primary.main, 0.35),
          borderBottomColor: theme.palette.primary.main,
          '& .type-tile, & .port-chevron': { transform: 'scale(1.06) translateY(-2px)' },
        },
        '&:has(a:focus-visible)': { outline: '3px solid rgba(12,127,106,0.45)', outlineOffset: 2 },
      }}
    >
      <Box component={Link} to={detailTo} aria-label={`عرض تفاصيل ${port.name_ar}`} sx={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit' }} />
      <CardContent sx={{ p: 2.75, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Box
            className="type-tile"
            aria-hidden
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t.bg,
              color: t.fg,
              fontSize: 22,
              transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {meta.icon}
          </Box>
          {port.is_active ? (
            <Chip
              label={meta.label}
              size="small"
              sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 700, px: 0.5 }}
            />
          ) : (
            <Chip label="خارج الخدمة" size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
          )}
        </Stack>

        <Typography component="h3" variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{port.name_ar}</Typography>
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          {port.address ? (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOnOutlineIcon sx={{ fontSize: 15, color: 'action.disabled' }} aria-hidden />
              {port.address}
            </Typography>
          ) : null}
          {(port.phone || port.email) && (
            <Stack spacing={0.25}>
              {port.phone && (
                <Typography variant="body2" color="text.secondary" component="a" href={`tel:${port.phone.replace(/\s/g, '')}`} sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  <PhoneIcon sx={{ fontSize: 15 }} aria-hidden /> <span dir="ltr">{port.phone}</span>
                </Typography>
              )}
              {port.email && (
                <Typography variant="body2" color="text.secondary" component="a" href={`mailto:${port.email}`} sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  <MailIcon sx={{ fontSize: 15 }} aria-hidden /> <span dir="ltr">{port.email}</span>
                </Typography>
              )}
            </Stack>
          )}
        </Stack>

        <Box sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid rgba(16,40,34,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.disabled" dir="ltr" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>{port.code}</Typography>
            {port.country_name ? (
              <Typography variant="caption" color="text.secondary">{port.country_name}</Typography>
            ) : null}
          </Stack>
          <Box
            className="port-chevron"
            aria-hidden
            sx={{
              width: 30,
              height: 30,
              ml: 1,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
              transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1), background-color 260ms ease',
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function CenteredState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <Paper
      role={action ? 'alert' : undefined}
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
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: action ? 3 : 0 }}>{body}</Typography>
      {action}
    </Paper>
  );
}