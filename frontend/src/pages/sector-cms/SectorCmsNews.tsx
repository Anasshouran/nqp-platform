import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { NewsCategoryChip } from '../../components/common/NewsCategoryChip';
import { EmptyState } from '../../components/common';
import { getNews } from '../../api/endpoints/public';
import type { NewsArticle } from '../../api/endpoints/public';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar') : '—';

const SectorCmsNews = () => {
  const { sector, slug } = useSectorSite();
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle(t('sector-cms.news.pageTitle'));

  useEffect(() => {
    getNews(sector?.id)
      .then((data) => setNews(data ?? []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [sector?.id]);

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{t('sector-cms.news.pageTitle')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('sector-cms.news.subtitle')}
      </Typography>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={220} /></Grid>
          ))}
        </Grid>
      ) : news.length === 0 ? (
        <EmptyState title={t('sector-cms.news.emptyTitle')} description={t('sector-cms.news.emptyDescription')} />
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
                    <NewsCategoryChip category={article.category} />
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
                    {t('sector-cms.news.details')}
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
