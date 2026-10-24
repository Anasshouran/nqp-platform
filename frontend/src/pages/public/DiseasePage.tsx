import En from '../../components/uikit/En';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Pagination from '@mui/material/Pagination';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import { getDiseases } from '../../api/endpoints/public';
import type { PublicDisease } from '../../api/endpoints/public';
import type { PaginatedResponse } from '../../types/api';
import { PageHeader, EmptyState, CardsGridSkeleton, ErrorState } from '../../components/common';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';

const PAGE_SIZE = 20;

/* IHR classification doubles as a severity signal, so each level gets its own
   semantic colour: red = public-health emergency, amber = targeted eradication,
   blue = surveillance only, grey = not under IHR. */

const DetailChips = ({
  label,
  items,
  color = 'primary',
}: {
  label: string;
  items: string[];
  color?: 'primary' | 'default';
}) => (
  <>
    <Divider sx={{ my: 1 }} />
    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
      {items.map((item) => (
        <Chip key={item} label={item} size="small" color={color} variant="outlined" />
      ))}
    </Box>
  </>
);

const DiseasePage = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const IHR_META: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default'; tone: string }> = useMemo(
    () => (
      {
        PHEIC: { label: t('public.طوارئ صحية عامة'), color: 'error', tone: '#c63a3a' },
        TARGETED_ERADICATION: { label: t('public.استئصال مستهدف'), color: 'warning', tone: '#a86400' },
        SURVEILLANCE_ONLY: { label: t('public.ترصد فقط'), color: 'info', tone: '#2f6dd0' },
        NOT_IHR: { label: t('public.غير مدرج'), color: 'default', tone: '#3f584f' },
      }),
    [t],
  );

  const ihrMeta = (category?: string | null) => (category ? IHR_META[category] : undefined);

  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  const { data, loading, error, retry } = useApi<PaginatedResponse<PublicDisease>>(() =>
    getDiseases({
      search: debouncedSearch.trim() || undefined,
      page,
      page_size: PAGE_SIZE,
    }).then((response) => response.data.data),
  );

  const diseases = data?.results ?? [];
  const total = data?.count ?? 0;

  // Refetch when the debounced query or the page changes. The first render is
  // skipped because useApi already performs the initial fetch on mount.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    retry();
  }, [debouncedSearch, page, retry]);

  // A new query always starts from the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title={t('public.الأمراض والإرشادات')}
        subtitle={t('public.معلومات توعوية حول الأمراض الوبائية ذات الاهتمام الصحي العام وإرشادات الوقاية')}
        eyebrow={t('public.المرجع الصحي')}
      />
      <TextField
        fullWidth
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('public.ابحث عن مرض')}
        inputProps={{ 'aria-label': t('public.ابحث عن مرض 2') }}
        sx={{ maxWidth: 560, mb: 4, mx: 'auto', display: 'flex' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
      {loading ? (
        <CardsGridSkeleton count={6} />
      ) : error ? (
        <ErrorState message={t('public.تعذّر تحميل البيانات الصحية')} onRetry={retry} />
      ) : diseases.length === 0 ? (
        <EmptyState
          icon={<BiotechIcon />}
          title={debouncedSearch ? t('public.لا توجد نتائج مطابقة') : t('public.لا توجد أمراض مسجلة')}
          description={
            debouncedSearch ? t('public.جرّب كلمات بحث أخرى') : t('public.سيتم إضافة المعلومات التوعوية قريباً')
          }
        />
      ) : (
        <>
          <Grid container spacing={3}>
            {diseases.map((disease) => {
              const ihr = ihrMeta(disease.ihr_category);
              return (
            <Grid item xs={12} md={6} lg={4} key={disease.id}>
              <Card
                className="fade-up"
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  position: 'relative',
                  overflow: 'hidden',
                  ...(ihr
                    ? {
                        borderTop: `4px solid ${ihr.tone}`,
                        '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                      }
                    : { '&:hover': { boxShadow: 4 } }),
                  transition: 'box-shadow 250ms ease, transform 250ms ease',
                }}
              >
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {disease.name_ar}
                    </Typography>
                    <Chip
                      label={disease.icd_11_code}
                      size="small"
                      sx={{
                        bgcolor: 'grey.100',
                        color: 'grey.700',
                        fontWeight: 700,
                        letterSpacing: 0.6,
                        flexShrink: 0,
                      }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}><En>{disease.name_en}</En></Typography>
                  {disease.description?.trim() && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {disease.description}
                    </Typography>
                  )}

                  {disease.symptoms && disease.symptoms.length > 0 && (
                    <DetailChips label={t('public.الأعراض الرئيسية')} items={disease.symptoms} />
                  )}

                  {disease.transmission_methods && disease.transmission_methods.length > 0 && (
                    <DetailChips
                      label={t('public.طرق الانتقال')}
                      items={disease.transmission_methods}
                      color="default"
                    />
                  )}

                  <Box sx={{ mt: 'auto', pt: 2 }}>
                    {disease.incubation_period_min != null && (
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary', fontSize: 13, mb: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 16 }} />
                        <span>
                          {t('public.فترة الحضانة')}: {disease.incubation_period_min}
                          {disease.incubation_period_max ? ` - ${disease.incubation_period_max}` : ''} {t('public.يوم')}
                        </span>
                      </Stack>
                    )}
                    {disease.ihr_category && (
                      <Chip
                        size="small"
                        color={ihr?.color ?? 'default'}
                        label={ihr?.label ?? disease.ihr_category}
                        sx={{ ...(ihr?.color === 'default' ? { bgcolor: 'grey.100', color: 'grey.700' } : {}) }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
              );
            })}
          </Grid>
          {total > PAGE_SIZE && (
            <Box sx={{ mt: 5, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={Math.ceil(total / PAGE_SIZE)}
                page={page}
                onChange={(_event, value) => setPage(value)}
                color="primary"
                shape="rounded"
                aria-label={t('public.التنقل بين صفحات الأمراض')}
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default DiseasePage;
