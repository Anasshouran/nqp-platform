import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import { PageHeader, EmptyState, ErrorState } from '../../components/common';
import KpiCard from '../../components/dashboard/KpiCard';
import StatusChip from '../../components/ui/StatusChip';
import { getHrDashboard } from '../../api/endpoints/hr';
import type { HrDashboard, HrLabelCount } from '../../types/hr';
import { employmentTypeLabel, timelineEventLabel, TIMELINE_EVENT_TONES } from '../../utils/hrLabels';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/toast';

/** شريط أفقي لنسبة كل فئة من إجمالي معروف. */
const DistributionBar = ({
  rows,
  total,
  resolveLabel,
}: {
  rows: HrLabelCount[];
  total: number;
  resolveLabel?: (raw: string) => string;
}) => {
  if (rows.length === 0) {
    return <Typography variant="body2" color="text.disabled">لا توجد بيانات</Typography>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Stack spacing={1.25}>
      {rows.map((row) => {
        const label = resolveLabel ? resolveLabel(row.label) : row.label;
        return (
          <Box key={row.label}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" noWrap>
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {row.value}
                {total > 0 && ` (${Math.round((row.value / total) * 100)}%)`}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(row.value / max) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        );
      })}
    </Stack>
  );
};

const HrDashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HrDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getHrDashboard();
      setData(res.data.data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'تعذر تحميل لوحة الموارد البشرية'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'تعذر تحميل البيانات'} onRetry={() => load()} />;
  }

  return (
    <Box>
      <PageHeader
        title="لوحة الموارد البشرية"
        subtitle={
          data.is_national
            ? 'أرقام وطنية عبر كامل المنصة'
            : 'الأرقام محصورة بنطاق صلاحياتك'
        }
        action={
          <Stack direction="row" spacing={1}>
            <Tooltip title="تحديث">
              <Box component="span" sx={{ display: 'inline-flex' }}>
                <IconButton onClick={() => load(true)} disabled={refreshing}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Tooltip>
            <Button variant="outlined" onClick={() => navigate('/app/hr/establishments')}>
              الوحدات
            </Button>
          </Stack>
        }
      />

      <Alert
        severity={data.is_national ? 'info' : 'warning'}
        icon={data.is_national ? <PublicIcon /> : <LockIcon />}
        sx={{ mb: 3 }}
      >
        {data.is_national
          ? 'صلاحيتك وطنية، لذا تعرض اللوحة أرقام كل الموظفين على مستوى المنصة.'
          : 'هذه الأرقام تخص نطاقك فقط. الموظفون خارج نطاقك غير محسوبين.'}
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<PeopleAltIcon />}
            label="إجمالي الموظفين"
            value={data.total_employees}
            accent="primary.main"
            hint={data.is_national ? 'وطني' : 'نطاقك'}
            onClick={() => navigate('/app/hr/employees')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<HowToRegIcon />}
            label="على رأس العمل"
            value={data.active_employees}
            accent="success.main"
            onClick={() => navigate('/app/hr/employees?employment_status=ACTIVE')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<PersonAddAlt1Icon />} label="تعيينات 30 يوم" value={data.new_hires_30d} accent="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<WorkspacePremiumIcon />}
            label="نهاية اختبار خلال 30 يوم"
            value={data.probations_ending_30d}
            accent="warning.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<EventBusyIcon />} label="في إجازة" value={data.on_leave} accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<PauseCircleOutlineIcon />} label="موقوف" value={data.suspended} accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<EventBusyIcon />} label="منتهي الخدمة" value={data.terminated} accent="neutral" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                حسب نوع التعيين
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DistributionBar
                rows={data.by_employment_type}
                total={data.total_employees}
                resolveLabel={employmentTypeLabel}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                حسب القسم
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DistributionBar rows={data.by_department} total={data.total_employees} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                حسب القطاع
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DistributionBar rows={data.by_sector} total={data.total_employees} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimelineIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    أحدث أحداث المسار الوظيفي
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/app/hr/timeline')}
                >
                  عرض الكل
                </Button>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              {data.recent_events.length === 0 ? (
                <EmptyState
                  title="لا توجد أحداث"
                  description="ستظهر الترقية والنقل والإجازات هنا فور تسجيلها."
                />
              ) : (
                data.recent_events.map((event) => (
                  <Box
                    key={event.id}
                    onClick={() => navigate(`/app/hr/employees/${event.employee}?tab=timeline`)}
                    sx={{
                      py: 1.25,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <StatusChip
                        label={timelineEventLabel(event.event)}
                        tone={TIMELINE_EVENT_TONES[event.event] ?? 'neutral'}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {event.employee_name || '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(event.start_date)}
                      </Typography>
                    </Stack>
                    {event.title && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {event.title}
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
        آخر تحديث: {formatDateTime(data.generated_at)}
      </Typography>
    </Box>
  );
};

export default HrDashboardPage;
