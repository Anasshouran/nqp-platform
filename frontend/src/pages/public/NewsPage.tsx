import { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import { getNews } from '../../api/endpoints/public';
import type { NewsArticle } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton, ErrorState } from '../../components/common';
import { useApi } from '../../hooks/useApi';

const PAGE_SIZE = 6;

const categoryLabels: Record<string, string> = {
  GENERAL: 'عام',
  HEALTH: 'صحي',
  TRAVEL: 'سفر',
  OFFICIAL: 'رسمي',
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const NewsPage = () => {
  const { data, loading, error, retry } = useApi<NewsArticle[]>(getNews);
  const news = data ?? [];
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = news.slice(0, visible);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="الأخبار والإعلانات"
        subtitle="آخر الأخبار والإعلانات الرسمية الصادرة عن الإدارة الاتحادية للحجر الصحي"
        eyebrow="مركز الأخبار"
      />
      {loading ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <ErrorState message="تعذّر تحميل الأخبار" onRetry={retry} />
      ) : news.length === 0 ? (
        <EmptyState
          icon={<NewspaperIcon />}
          title="لا توجد أخبار منشورة حالياً"
          description="سيتم نشر الأخبار والإعلانات الرسمية هنا فور صدورها."
        />
      ) : (
        <>
          <Grid container spacing={3}>
            {shown.map((article) => (
            <Grid item xs={12} md={6} lg={4} key={article.id}>
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
                {article.image && (
                  <CardMedia
                    component="img"
                    height={160}
                    image={article.image}
                    alt={article.title}
                    sx={{ objectFit: 'cover', width: '100%', aspectRatio: '16 / 9' }}
                  />
                )}
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Chip label={categoryLabels[article.category] || article.category} size="small" color="primary" variant="outlined" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(article.published_at)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                    <Box
                      aria-hidden
                      className="pulse-ring"
                      sx={{
                        position: 'relative',
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        boxShadow: '0 0 8px rgba(14,138,114,0.85)',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {article.title}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {article.content}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 3, pb: 2.5 }}>
                  <Button component={Link} to={`/news/${article.id}`} size="small" color="primary">
                    تفاصيل الخبر
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          </Grid>
          {visible < news.length && (
            <Box sx={{ mt: 5, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                endIcon={<KeyboardArrowDownIcon />}
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                sx={{ px: 4 }}
              >
                عرض المزيد من الأخبار
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                تم عرض {visible} من {news.length} خبر
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default NewsPage;
