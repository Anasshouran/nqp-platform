import En from '../../components/uikit/En';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { getDiseases } from '../../api/endpoints/public';
import type { PublicDisease } from '../../api/endpoints/public';
import { PageHeader, EmptyState, CardsGridSkeleton, ErrorState } from '../../components/common';
import { useApi } from '../../hooks/useApi';

const PAGE_SIZE = 6;

/* IHR classification doubles as a severity signal, so each level gets its own
   semantic colour: red = public-health emergency, amber = targeted eradication,
   blue = surveillance only, grey = not under IHR. */
const IHR_META: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default'; tone: string }> = {
  PHEIC: { label: 'طوارئ صحية عامة', color: 'error', tone: '#c63a3a' },
  TARGETED_ERADICATION: { label: 'استئصال مستهدف', color: 'warning', tone: '#a86400' },
  SURVEILLANCE_ONLY: { label: 'ترصد فقط', color: 'info', tone: '#2f6dd0' },
  NOT_IHR: { label: 'غير مدرج', color: 'default', tone: '#3f584f' },
};

const ihrMeta = (category?: string | null) => (category ? IHR_META[category] : undefined);

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
  const { data, loading, error, retry } = useApi<PublicDisease[]>(() =>
    getDiseases().then((response) => response.data.data),
  );
  const diseases = data ?? [];
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = diseases.slice(0, visible);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="الأمراض والإرشادات"
        subtitle="معلومات توعوية حول الأمراض الوبائية ذات الاهتمام الصحي العام وإرشادات الوقاية"
        eyebrow="المرجع الصحي"
      />
      {loading ? (
        <CardsGridSkeleton count={6} />
      ) : error ? (
        <ErrorState message="تعذّر تحميل البيانات الصحية" onRetry={retry} />
      ) : diseases.length === 0 ? (
        <EmptyState
          icon={<BiotechIcon />}
          title="لا توجد أمراض مسجلة"
          description="سيتم إضافة المعلومات التوعوية قريباً."
        />
      ) : (
        <>
          <Grid container spacing={3}>
            {shown.map((disease) => {
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
                    <DetailChips label="الأعراض الرئيسية" items={disease.symptoms} />
                  )}

                  {disease.transmission_methods && disease.transmission_methods.length > 0 && (
                    <DetailChips
                      label="طرق الانتقال"
                      items={disease.transmission_methods}
                      color="default"
                    />
                  )}

                  <Box sx={{ mt: 'auto', pt: 2 }}>
                    {disease.incubation_period_min != null && (
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary', fontSize: 13, mb: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 16 }} />
                        <span>
                          فترة الحضانة: {disease.incubation_period_min}
                          {disease.incubation_period_max ? ` - ${disease.incubation_period_max}` : ''} يوم
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
          {visible < diseases.length && (
            <Box sx={{ mt: 5, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                endIcon={<KeyboardArrowDownIcon />}
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                sx={{ px: 4 }}
              >
                عرض المزيد من الأمراض
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                تم عرض {visible} من {diseases.length} مرض
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default DiseasePage;
