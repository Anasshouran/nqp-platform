import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import { getNewsById, getNews } from '../../api/endpoints/public';
import type { NewsArticle } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton } from '../../components/common';

const categoryLabels: Record<string, string> = {
  GENERAL: 'عام',
  HEALTH: 'صحي',
  TRAVEL: 'سفر',
  OFFICIAL: 'رسمي',
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getNewsById(id), getNews()])
      .then(([data, list]) => {
        setArticle(data);
        setRelated(list.filter((n) => n.id !== id).slice(0, 3));
      })
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="تفاصيل الخبر"
        subtitle="تفاصيل الخبر والإعلان الرسمي"
        eyebrow="مركز الأخبار"
      />
      <Button component={Link} to="/news" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
        العودة إلى الأخبار
      </Button>

      {loading ? (
        <ListSkeleton count={3} />
      ) : !article ? (
        <EmptyState
          icon={<NewspaperIcon />}
          title="الخبر غير متاح"
          description="لم يتم العثور على هذا الخبر، أو أن الخبر غير منشور بعد."
        />
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {article.image && (
                <CardMedia
                  component="img"
                  height={360}
                  image={article.image}
                  alt={article.title}
                  sx={{ objectFit: 'cover', width: '100%', aspectRatio: { xs: '16 / 9', md: 'auto' } }}
                />
              )}
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Chip label={categoryLabels[article.category] || article.category} size="small" color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(article.published_at)}
                  </Typography>
                </Stack>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, lineHeight: 1.3 }}>
                  {article.title}
                </Typography>
                <Typography
                  component="div"
                  variant="body1"
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {article.content}
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              أخبار أخرى
            </Typography>
            <Stack spacing={2}>
              {related.map((n) => (
                <Card
                  key={n.id}
                  component={Link}
                  to={`/news/${n.id}`}
                  sx={{
                    display: 'block',
                    textDecoration: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'box-shadow 300ms ease, transform 300ms ease',
                    '&:hover': { boxShadow: 4, transform: 'translateY(-3px)' },
                  }}
                >
                  {n.image && (
                    <CardMedia component="img" height={140} image={n.image} alt={n.title} sx={{ objectFit: 'cover', width: '100%', aspectRatio: '16 / 9' }} />
                  )}
                  <Box sx={{ p: 2 }}>
                    <Chip label={categoryLabels[n.category] || n.category} size="small" color="primary" variant="outlined" sx={{ mb: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(n.published_at)}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Stack>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default NewsDetailPage;