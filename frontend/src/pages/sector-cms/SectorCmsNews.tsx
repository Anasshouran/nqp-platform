import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SectorPageShell, SectorHomeLink, useSectorSite, NEWS_CATEGORY_LABELS, usePageTitle } from './SectorCmsShared';
import { EmptyState } from '../../components/common';
import { getNews } from '../../api/endpoints/public';
import type { NewsArticle } from '../../api/endpoints/public';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar') : '—';

const SectorCmsNews = () => {
  const { sector, slug } = useSectorSite();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle('الأخبار');

  useEffect(() => {
    getNews(sector?.id)
      .then((data) => setNews(data ?? []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [sector?.id]);

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>الأخبار</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        آخر الأخبار والتحديثات من المركز الإعلامي لمنصة الحجر الصحي القومي.
      </Typography>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={220} /></Grid>
          ))}
        </Grid>
      ) : news.length === 0 ? (
        <EmptyState title="لا توجد أخبار" description="لا توجد أخبار منشورة حالياً." />
      ) : (
        <Grid container spacing={3}>
          {news.map((article) => (
            <Grid item xs={12} sm={6} md={4} key={article.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {article.image && (
                  <CardMedia component="img" height={140} image={article.image} alt={article.title} sx={{ objectFit: 'cover' }} />
                )}
                <CardContent sx={{ p: 3, flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Chip label={NEWS_CATEGORY_LABELS[article.category] || 'عام'} size="small" color="primary" variant="outlined" />
                    <Typography variant="caption" color="text.secondary">{formatDate(article.published_at)}</Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{article.title}</Typography>
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
                    {article.content}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 3, pb: 2 }}>
                  <Button component={Link} to={`/sector/${slug}/news/${article.id}`} size="small" color="primary">
                    تفاصيل الخبر
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

export default SectorCmsNews;
