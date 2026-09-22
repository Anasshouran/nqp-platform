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

const ihrLabels: Record<string, string> = {
  PHEIC: 'طوارئ صحية عامة',
  TARGETED_ERADICATION: 'استئصال مستهدف',
  SURVEILLANCE_ONLY: 'ترصد فقط',
  NOT_IHR: 'غير مدرج',
};

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
            {shown.map((disease) => (
            <Grid item xs={12} md={6} lg={4} key={disease.id}>
              <Card
                className="fade-up"
                sx={{ height: '100%', border: '1px solid', borderColor: 'divider', '&:hover': { boxShadow: 4 } }}
              >
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {disease.name_ar}
                    </Typography>
                    <Chip label={disease.icd_11_code} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {disease.name_en}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {disease.description}
                  </Typography>

                  {disease.symptoms && disease.symptoms.length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        الأعراض الرئيسية
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                        {disease.symptoms.map((symptom) => (
                          <Chip key={symptom} label={symptom} size="small" color="primary" variant="outlined" />
                        ))}
                      </Box>
                    </>
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
                        color={disease.ihr_category === 'PHEIC' ? 'error' : 'default'}
                        label={ihrLabels[disease.ihr_category] || disease.ihr_category}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
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
