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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { getServiceCategories, type Service, type ServiceCategory } from '../../api/endpoints/services';
import { iconFor } from '../../utils/iconMap';
import { SectorPageShell, SectorHomeLink, sectorBareName, useSectorSite, usePageTitle } from './SectorCmsShared';

const audienceLabels: Record<string, string> = {
  PUBLIC: 'الكشف والتحقق',
  INDIVIDUAL: 'المسافرون',
  BUSINESS: 'الأعمال',
  GOVERNMENT: 'الجهات الحكومية',
  EMPLOYEE: 'الموظفون',
};

const filterChips = [
  { key: 'all', label: 'الكل' },
  { key: 'INDIVIDUAL', label: 'المسافرون' },
  { key: 'BUSINESS', label: 'الأعمال' },
  { key: 'GOVERNMENT', label: 'الحكومة' },
  { key: 'PUBLIC', label: 'الصحة والتحقق' },
];

type ServicesState = { status: 'loading' | 'error' | 'ready'; categories: ServiceCategory[] };

const ServiceCard = ({ service }: { service: Service }) => {
  const theme = useTheme();
  const Icon = iconFor(service.icon);
  const href = service.external_url || service.route || '/services';
  const target = service.external_url ? '_blank' : undefined;

  return (
    <Card
      component={Link}
      to={href}
      {...(target ? { target, rel: 'noopener noreferrer' } : {})}
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative',
        border: '1px solid rgba(16,40,34,0.09)',
        borderBottom: `3px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        borderRadius: 4,
        transition:
          'transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease, border-color 260ms ease, border-bottom-color 260ms ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: theme.shadows[6],
          borderColor: alpha(theme.palette.primary.main, 0.35),
          borderBottomColor: theme.palette.primary.main,
          '& .service-tile, & .service-chevron': { transform: 'scale(1.06) translateY(-2px)' },
        },
      }}
    >
      {service.requires_auth && (
        <Box component="span" title="يتطلب هوية موثقة" sx={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', color: 'success.main' }}>
          <VerifiedUserIcon sx={{ fontSize: 17 }} />
        </Box>
      )}
      <CardContent sx={{ p: 2.75, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          className="service-tile"
          aria-hidden
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.75,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: '#fff',
            mb: 2,
            transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <Icon />
        </Box>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, lineHeight: 1.3 }}>
          {service.name_ar}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontSize: '0.82rem', lineHeight: 1.7, mb: 2 }}>
          {service.description_ar}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ pt: 1.25, borderTop: '1px solid rgba(16,40,34,0.07)' }}>
          <Chip label={audienceLabels[service.audience] || 'عام'} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: 99 }} />
          <Box
            className="service-chevron"
            aria-hidden
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
              transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {service.requires_auth ? <LockOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} /> : <ArrowBackIcon sx={{ fontSize: 16 }} />}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const SectorCmsServices = () => {
  const theme = useTheme();
  const { sector } = useSectorSite();
  const [state, setState] = useState<ServicesState>({ status: 'loading', categories: [] });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const searchRef = useRef<HTMLInputElement>(null);

  usePageTitle('الخدمات');

  const loadCategories = useCallback(() => {
    if (!sector) return;
    setState({ status: 'loading', categories: [] });
    getServiceCategories({ sector: sector.code })
      .then((res) => setState({ status: 'ready', categories: res.data.data ?? [] }))
      .catch(() => setState({ status: 'error', categories: [] }));
  }, [sector]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
  const showIndex = filter === 'all' && !isSearching;

  const filtered = useMemo(() => {
    return state.categories
      .map((cat) => ({
        ...cat,
        services: cat.services.filter((s) => {
          const inFilter = filter === 'all' || s.audience === filter;
          const inSearch =
            !term ||
            s.name_ar.toLowerCase().includes(term) ||
            (s.name_en || '').toLowerCase().includes(term) ||
            (s.description_ar || '').toLowerCase().includes(term);
          return inFilter && inSearch;
        }),
      }))
      .filter((cat) => cat.services.length > 0);
  }, [state.categories, term, filter]);

  const resultCount = useMemo(() => filtered.reduce((n, c) => n + c.services.length, 0), [filtered]);
  const totalCount = useMemo(() => state.categories.reduce((n, c) => n + c.services.length, 0), [state.categories]);

  if (state.status === 'loading') {
    return (
      <SectorPageShell>
        <Skeleton variant="text" width={96} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={320} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={420} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={200} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={48} width={560} sx={{ mb: 3 }} />
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
        <SectorHomeLink current="الخدمات" />
        <CenteredState icon={<AutoAwesomeIcon />} title="قطاع غير متاح" body="لم نتمكن من العثور على هذا القطاع." />
      </SectorPageShell>
    );
  }

  return (
    <SectorPageShell>
      <SectorHomeLink current="الخدمات" />

      <Box sx={{ position: 'relative', mb: 4, overflow: 'hidden' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 'auto -96px -120px auto',
            width: 360,
            height: 220,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, ${alpha(theme.palette.warning.light, 0.7)}, transparent)`,
            filter: 'blur(6px)',
            pointerEvents: 'none',
          }}
        />
        <Typography variant="overline" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, '& .MuiSvgIcon-root': { fontSize: 15 } }}>
          <AutoAwesomeIcon /> منصة الخدمات — {sectorBareName(sector.name_ar)}
        </Typography>
        <Typography component="h1" variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.01em' }}>
          الخدمات
          <Box component="span" sx={{ color: 'warning.main' }}> والعمليات</Box>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620 }}>
          خدمات قطاع {sectorBareName(sector.name_ar)} لمنصة الحجر الصحي القومي — تشمل العمليات البحرية والجوية ورقابة الأغذية ومكافحة النواقل والتحقق من الشهادات.
        </Typography>
      </Box>

      {state.status === 'error' ? (
        <CenteredState
          icon={<RefreshIcon />}
          title="تعذّر تحميل الخدمات"
          body="تعذّر جلب الخدمات من الخادم. يرجى المحاولة مرة أخرى."
          action={<Button variant="contained" startIcon={<RefreshIcon />} onClick={loadCategories} size="large">إعادة المحاولة</Button>}
        />
      ) : (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
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
                placeholder="ابحث عن خدمة... (التسجيل المسبق، فحص شحنة، التحقق من شهادة)"
                aria-label="بحث عن خدمة"
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
              label={isSearching ? `${resultCount} نتيجة مطابقة` : `${totalCount} خدمة متاحة`}
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

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4, gap: 1 }}>
            {filterChips.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                onClick={() => setFilter(chip.key)}
                color={filter === chip.key ? 'primary' : 'default'}
                variant={filter === chip.key ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, px: 1 }}
              />
            ))}
          </Stack>

          {state.status === 'ready' && filtered.length === 0 ? (
            <CenteredState icon={<SearchIcon />} title="لا توجد خدمات مطابقة" body="جرّب تعديل كلمة البحث أو اختيار فئة أخرى." />
          ) : (
            <Stack spacing={5}>
              {filtered.map((category, gi) => (
                <Box key={category.id}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                    {showIndex && (
                      <Typography variant="overline" color="text.disabled" sx={{ m: 0 }}>
                        {String(gi + 1).padStart(2, '0')}
                      </Typography>
                    )}
                    <Box
                      aria-hidden
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      }}
                    >
                      {(() => {
                        const CatIcon = iconFor(category.icon);
                        return <CatIcon />;
                      })()}
                    </Box>
                    <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
                      {category.name_ar}
                    </Typography>
                    <Chip label={`${category.services.length}`} size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 800 }} />
                  </Stack>
                  {category.description_ar && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {category.description_ar}
                    </Typography>
                  )}
                  <Box sx={{ height: 1, bgcolor: 'divider', mb: 2.5, width: '100%' }} />
                  <Grid container spacing={2.5}>
                    {category.services.map((service, i) => (
                      <Grid item xs={12} sm={6} md={4} key={service.id} className={showIndex ? 'fade-up' : undefined} style={showIndex ? { animationDelay: `${Math.min(i * 60, 420)}ms` } : undefined}>
                        <ServiceCard service={service} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}
    </SectorPageShell>
  );
};

export default SectorCmsServices;

/* ------------------------------------------------------------------ */

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