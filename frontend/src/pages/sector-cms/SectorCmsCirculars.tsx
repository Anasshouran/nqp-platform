import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import CampaignIcon from '@mui/icons-material/Campaign';
import DescriptionIcon from '@mui/icons-material/Description';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { getCirculars } from '../../api/endpoints/public';
import type { Circular } from '../../api/endpoints/public';

const categoryLabels: Record<string, string> = {
  OFFICIAL: 'رسمي',
  HEALTH: 'صحي',
  ADMIN: 'إداري',
  GENERAL: 'عام',
};

const priorityColors: Record<string, 'error' | 'warning' | 'info'> = {
  URGENT: 'error',
  IMPORTANT: 'warning',
  NORMAL: 'info',
};

const priorityLabels: Record<string, string> = {
  URGENT: 'عاجل',
  IMPORTANT: 'مهم',
  NORMAL: 'عادي',
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const SectorCmsCirculars = () => {
  const { sector, slug } = useSectorSite();
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle('التعميمات');

  useEffect(() => {
    if (!sector) {
      setLoading(false);
      return;
    }
    getCirculars(sector.id)
      .then(setCirculars)
      .catch(() => setCirculars([]))
      .finally(() => setLoading(false));
  }, [sector]);

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>التعميمات</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        التعميمات والقرارات الإدارية الصادرة عن الإدارة الاتحادية للحجر الصحي.
      </Typography>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={160} /></Grid>
          ))}
        </Grid>
      ) : circulars.length === 0 ? (
        <Card sx={{ border: '1px solid', borderColor: 'divider', p: 4, textAlign: 'center' }}>
          <CampaignIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>لا توجد تعميمات منشورة حالياً</Typography>
          <Typography variant="body2" color="text.secondary">سيتم نشر التعميمات الرسمية هنا فور صدورها.</Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {circulars.map((circular) => (
            <Grid item xs={12} md={6} key={circular.id}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', transition: 'transform 300ms ease, box-shadow 300ms ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 5 } }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={1}>
                      <Chip label={categoryLabels[circular.category] || circular.category} size="small" color="primary" variant="outlined" />
                      <Chip label={priorityLabels[circular.priority] || circular.priority} size="small" color={priorityColors[circular.priority] || 'default'} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{formatDate(circular.published_at)}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main', flexShrink: 0 }}>
                      <DescriptionIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{circular.title}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.disabled" dir="ltr" sx={{ display: 'block', mb: 1, textAlign: 'right' }}>
                    {circular.reference_number}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                  >
                    {circular.body}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 3, pb: 2.5 }}>
                  <Button component={Link} to={`/sector/${slug}/circulars/${circular.id}`} size="small" color="primary">
                    قراءة التعميم
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </SectorPageShell>
  );
};

export default SectorCmsCirculars;
