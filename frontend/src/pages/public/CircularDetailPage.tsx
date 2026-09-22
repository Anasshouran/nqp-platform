import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import { getCircularById } from '../../api/endpoints/public';
import type { Circular } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton } from '../../components/common';

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

const CircularDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [circular, setCircular] = useState<Circular | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCircularById(id)
      .then(setCircular)
      .catch(() => setCircular(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Button component={Link} to="/circulars" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
        العودة إلى التعميمات
      </Button>

      {loading ? (
        <ListSkeleton count={3} />
      ) : !circular ? (
        <EmptyState
          icon={<DescriptionIcon />}
          title="التعميم غير متاح"
          description="لم يتم العثور على هذا التعميم."
        />
      ) : (
        <>
          <PageHeader
            title={circular.title}
            subtitle={`مرجع التعميم: ${circular.reference_number}`}
            eyebrow="تعميم"
            action={
              <Stack direction="row" spacing={1}>
                <Chip label={categoryLabels[circular.category] || circular.category} color="primary" variant="outlined" />
                <Chip
                  label={priorityLabels[circular.priority] || circular.priority}
                  color={priorityColors[circular.priority] || 'default'}
                />
              </Stack>
            }
          />
          <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box
              sx={{
                py: 2.5,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'primary.lighter',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <DescriptionIcon sx={{ color: 'primary.main' }} />
              <Stack>
                <Typography variant="body2" color="text.secondary">
                  تاريخ الإصدار: {formatDate(circular.published_at)}
                </Typography>
                {circular.author && (
                  <Typography variant="body2" color="text.secondary">
                    صادر عن: {circular.author}
                  </Typography>
                )}
              </Stack>
            </Box>
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                component="div"
                variant="body1"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}
              >
                {circular.body}
              </Typography>
            </Box>
          </Card>
        </>
      )}
    </Container>
  );
};

export default CircularDetailPage;
