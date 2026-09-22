import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useSectorPortal } from '../../components/sectors/SectorPortalLayout';
import { EmptyState } from '../../components/common';
import { getSectorNews } from '../../api/endpoints/public';
import type { NewsArticle } from '../../api/endpoints/public';

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('ar') : '—';

const SectorPortalNews = () => {
  const { sector } = useSectorPortal();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sector) { setLoading(false); return; }
    setLoading(true);
    getSectorNews(sector.id)
      .then((res) => setNews(res.data.data))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [sector]);

  if (loading) return <Skeleton variant="rounded" height={200} />;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>أخبار القطاع</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>آخر الأخبار والتحديثات من {sector?.name_ar || 'القطاع'}</Typography>

      {news.length === 0 ? (
        <EmptyState icon={<CampaignIcon />} title="لا توجد أخبار حالياً" />
      ) : (
        <Grid container spacing={3}>
          {news.map((article) => (
            <Grid item xs={12} sm={6} md={4} key={article.id}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Chip label={article.category || 'عام'} size="small" color="primary" variant="outlined" />
                    <Typography variant="caption" color="text.secondary">{formatDate(article.published_at)}</Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{article.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {article.content}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SectorPortalNews;
