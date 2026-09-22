import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CampaignIcon from '@mui/icons-material/Campaign';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { PageHeader, SectionCard, EmptyState } from '../../../../components/uikit';
import { getVectorDashboard, getSurveys, getOperations } from '../../../../api/endpoints/vectorControl';
import { useList } from './shared';
import type { VectorSurvey, VectorControlOperation, VectorDashboardOverview } from '../../../../types/vectorControl';
import { useEffect, useState } from 'react';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '../../../../types/api';

const densityColor: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'success',
};

const RedSeaVectorControlPage = () => {
  const surveys = useList<VectorSurvey>(getSurveys, { page_size: 10 });
  const operations = useList<VectorControlOperation>(getOperations, { page_size: 8 });
  const [overview, setOverview] = useState<VectorDashboardOverview | null>(null);
  const [loadingOv, setLoadingOv] = useState(true);

  useEffect(() => {
    getVectorDashboard()
      .then((res: AxiosResponse<ApiResponse<VectorDashboardOverview>>) => setOverview(res.data.data))
      .catch(() => setOverview(null))
      .finally(() => setLoadingOv(false));
  }, []);

  const kpis = [
    { label: 'المسوحات هذا الشهر', value: overview?.surveys_this_month ?? '-', icon: <AssessmentIcon />, color: 'primary.main' as const },
    { label: 'البلاغات الجديدة', value: overview?.reports_new ?? '-', icon: <BugReportIcon />, color: 'info.main' as const },
    { label: 'عمليات نشطة', value: overview?.operations_active ?? '-', icon: <CampaignIcon />, color: 'warning.main' as const },
    { label: 'عمليات منفذة', value: overview?.operations_completed ?? '-', icon: <TaskAltIcon />, color: 'success.main' as const },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="الأنظمة التشغيلية"
        title="مكافحة النواقل — قطاع البحر الأحمر"
        subtitle="مسوحات النواقل وأوامر العمل ضمن منافذ القطاع."
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={3} key={k.label}>
            {loadingOv ? (
              <Skeleton variant="rounded" height={110} />
            ) : (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: k.color, display: 'flex' }}>{k.icon}</Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>{k.value}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="المسوحات الأخيرة" subtitle="مسوحات النواقل في القطاع">
            {surveys.loading ? (
              <Stack spacing={1}><Skeleton height={46} /><Skeleton height={46} /></Stack>
            ) : surveys.data.length === 0 ? (
              <EmptyState title="لا توجد مسوحات" description="لم تُسجّل مسوحات نواقل ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {surveys.data.map((s) => (
                  <Stack key={s.id} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: 'primary.main', display: 'flex' }}><BugReportIcon /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {s.entry_point_name || s.entry_point} — {s.area}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {s.survey_number} · {s.vector_name || s.vector} · {s.survey_date}
                      </Typography>
                    </Box>
                    <Chip size="small" label={s.proposed_risk} color={densityColor[s.proposed_risk] ?? 'default'} variant="outlined" />
                    <Chip size="small" label={s.status} variant="outlined" />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="عمليات المكافحة" subtitle="عمليات المكافحة الأخيرة">
            {operations.loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : operations.data.length === 0 ? (
              <EmptyState title="لا توجد عمليات" description="لم تُسجّل عمليات مكافحة ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {operations.data.slice(0, 6).map((w) => (
                  <Stack key={w.id} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: 'warning.main', display: 'flex' }}><CampaignIcon fontSize="small" /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{w.op_number}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {w.entry_point_name} — {w.operation_type_display || w.operation_type}
                      </Typography>
                    </Box>
                    <Chip size="small" label={w.status_display || w.status} color={w.status === 'COMPLETED' ? 'success' : w.status === 'IN_PROGRESS' ? 'info' : 'default'} variant="outlined" />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaVectorControlPage;
