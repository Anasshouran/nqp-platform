import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CampaignIcon from '@mui/icons-material/Campaign';
import DescriptionIcon from '@mui/icons-material/Description';
import { getCirculars } from '../../api/endpoints/public';
import type { Circular } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton, ErrorState } from '../../components/common';
import { CategoryChip } from '../../components/common/CategoryChip';
import { CIRCULAR_CATEGORY_LABELS, CIRCULAR_CATEGORY_STYLES } from '../../components/common/categoryMaps';
import { useApi } from '../../hooks/useApi';

const PAGE_SIZE = 6;

const priorityColors: Record<string, 'error' | 'warning' | 'info'> = {
  URGENT: 'error',
  IMPORTANT: 'warning',
  NORMAL: 'info',
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const CircularsPage = () => {
  const { t } = useTranslation();

  const priorityLabels: Record<string, string> = useMemo(
    () => ({
      URGENT: t('public.عاجل'),
      IMPORTANT: t('public.مهم'),
      NORMAL: t('public.عادي'),
    }),
    [t],
  );

  const { data, loading, error, retry } = useApi<Circular[]>(getCirculars);
  const circulars = data ?? [];
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = circulars.slice(0, visible);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title={t('public.التعميمات')}
        subtitle={t('public.التعميمات والقرارات الإدارية الصادرة عن الإدارة الاتحادية للحجر الصحي')}
        eyebrow={t('public.مركز التعميمات')}
      />
      {loading ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <ErrorState message={t('public.تعذّر تحميل التعميمات')} onRetry={retry} />
      ) : circulars.length === 0 ? (
        <EmptyState
          icon={<CampaignIcon />}
          title={t('public.لا توجد تعميمات منشورة حالياً')}
          description={t('public.سيتم نشر التعميمات الرسمية هنا فور صدورها')}
        />
      ) : (
        <>
          <Grid container spacing={3}>
            {shown.map((circular) => (
            <Grid item xs={12} md={6} key={circular.id}>
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
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={1}>
                      <CategoryChip category={circular.category} labels={CIRCULAR_CATEGORY_LABELS} styles={CIRCULAR_CATEGORY_STYLES} />
                      <Chip
                        label={priorityLabels[circular.priority] || circular.priority}
                        size="small"
                        color={priorityColors[circular.priority] || 'default'}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(circular.published_at)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                    <Box
                      aria-hidden
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    >
                      <DescriptionIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {circular.title}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.disabled" dir="ltr" sx={{ textAlign: 'right' }}>
                      {circular.reference_number}
                    </Typography>
                  </Stack>
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
                    {circular.body}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 3, pb: 2.5 }}>
                  <Button component={Link} to={`/circulars/${circular.id}`} size="small" color="primary">
                    {t('public.قراءة التعميم')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          </Grid>
          {visible < circulars.length && (
            <Box sx={{ mt: 5, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                endIcon={<KeyboardArrowDownIcon />}
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                sx={{ px: 4 }}
              >
                {t('public.عرض المزيد من التعميمات')}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {t('public.تم عرض')} {visible} {t('public.من')} {circulars.length} {t('public.تعميم')}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default CircularsPage;
