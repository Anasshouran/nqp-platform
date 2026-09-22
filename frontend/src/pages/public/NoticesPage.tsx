import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import BugReportIcon from '@mui/icons-material/BugReport';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { ReactElement } from 'react';
import { getNotices } from '../../api/endpoints/public';
import type { HealthNotice } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton, ErrorState } from '../../components/common';
import { useApi } from '../../hooks/useApi';

const PAGE_SIZE = 9;

const PRIORITY_META: Record<string, { label: string; color: 'error' | 'warning' | 'info'; tone: string }> = {
  HIGH: { label: 'عاجل', color: 'error', tone: '#d32f2f' },
  MEDIUM: { label: 'متوسط', color: 'warning', tone: '#ed6c02' },
  LOW: { label: 'منخفض', color: 'info', tone: '#1976d2' },
};

const CATEGORY_META: Record<string, { label: string; icon: ReactElement }> = {
  ENTRY_REQUIREMENTS: { label: 'متطلبات الدخول', icon: <FactCheckIcon /> },
  FLIGHT_SUSPENSION: { label: 'تعليق رحلات', icon: <FlightTakeoffIcon /> },
  EPIDEMIC_ALERT: { label: 'إنذار وبائي', icon: <BugReportIcon /> },
};

const categoryMeta = (category: string): { label: string; icon: ReactElement } =>
  CATEGORY_META[category] ?? { label: 'إشعار صحي', icon: <WarningAmberIcon /> };

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '—';
  }
};

const NoticesPage = () => {
  const { data, loading, error, retry } = useApi<HealthNotice[]>(() =>
    getNotices().then((response) => response.data.data),
  );
  const notices = useMemo(() => data ?? [], [data]);
  const [priority, setPriority] = useState('ALL');
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [priority]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { ALL: notices.length };
    notices.forEach((n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
    });
    return acc;
  }, [notices]);

  const isExpired = (n: HealthNotice) =>
    n.expiry_date ? new Date(n.expiry_date).getTime() <= Date.now() : false;

  const filtered = useMemo(() => {
    if (priority === 'ALL') return notices;
    return notices.filter((n) => n.priority === priority);
  }, [notices, priority]);

  const activeUrgent = useMemo(
    () => notices.filter((n) => n.priority === 'HIGH' && !isExpired(n)).length,
    [notices],
  );

  const shown = filtered.slice(0, visible);

  const priorityOptions = [
    { value: 'ALL', label: 'الكل' },
    { value: 'HIGH', label: 'عاجل' },
    { value: 'MEDIUM', label: 'متوسط' },
    { value: 'LOW', label: 'منخفض' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="الإشعارات والتنبيهات الصحية"
        subtitle="آخر الإشعارات والتنبيهات الصحية الصادرة عن المنصة"
        eyebrow="مركز التنبيهات"
      />

      {loading ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <ErrorState message="تعذّر تحميل التنبيهات الصحية" onRetry={retry} />
      ) : notices.length === 0 ? (
        <EmptyState
          icon={<NotificationsActiveIcon />}
          title="لا توجد إشعارات صحية حالياً"
          description="ستُنشر الإشعارات والتنبيهات الصحية الصادرة عن المنصة هنا فور صدورها."
        />
      ) : (
        <>
          {priority === 'ALL' && activeUrgent > 0 && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ mb: 3, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
              action={
                <Button
                  size="small"
                  color="error"
                  onClick={() => setPriority('HIGH')}
                  sx={{ fontWeight: 700 }}
                >
                  عرضها
                </Button>
              }
            >
              يوجد {activeUrgent} تنبيه عاجل نشط — اطّلع عليها أولاً.
            </Alert>
          )}

          <ToggleButtonGroup
            value={priority}
            exclusive
            onChange={(_, value) => value && setPriority(value)}
            size="small"
            aria-label="تصفية التنبيهات حسب الأولوية"
            sx={{ mb: 3 }}
          >
            {priorityOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value} sx={{ fontWeight: 700 }}>
                {option.label}
                <Typography variant="caption" sx={{ mr: 0.5, opacity: 0.7 }}>
                  ({counts[option.value] || 0})
                </Typography>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Grid container spacing={3}>
            {shown.map((notice) => {
              const p = PRIORITY_META[notice.priority] ?? PRIORITY_META.LOW;
              const meta = categoryMeta(notice.category);
              const expired = isExpired(notice);
              return (
                <Grid item xs={12} md={6} lg={4} key={notice.id}>
                  <Card
                    className="fade-up"
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: expired ? 'divider' : p.tone,
                      opacity: expired ? 0.72 : 1,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        left: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${p.tone}, ${p.tone}55)`,
                      },
                      transition: 'box-shadow 250ms ease, transform 250ms ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 16px 32px -18px ${p.tone}cc`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5, flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          label={p.label}
                          size="small"
                          color={p.color}
                          icon={<NotificationsActiveIcon />}
                          sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
                        />
                        {expired && <Chip label="منتهي" size="small" variant="outlined" color="default" />}
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
                            color: p.tone,
                            bgcolor: `${p.tone}18`,
                            flexShrink: 0,
                          }}
                        >
                          {meta.icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {notice.title}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                        {notice.description}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Chip size="small" variant="outlined" label={meta.label} icon={meta.icon} sx={{ fontWeight: 700 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 14 }} />
                          {formatDate(notice.published_at)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {visible < filtered.length && (
            <Box sx={{ mt: 5, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                endIcon={<KeyboardArrowDownIcon />}
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                sx={{ px: 4 }}
              >
                عرض المزيد من الإشعارات
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                تم عرض {visible} من {filtered.length} إشعار
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default NoticesPage;