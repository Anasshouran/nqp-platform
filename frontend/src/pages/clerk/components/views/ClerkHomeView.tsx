// Overview: queue counters, pipeline cards, weekly activity and the worklist.
// Extracted from ClerkDashboardPage without behavioural change.
import type { useClerkActions } from '../../hooks/useClerkActions';
import type { useClerkData } from '../../hooks/useClerkData';
import type { useClerkRequests } from '../../hooks/useClerkRequests';
import Grid from '@mui/material/Grid';
import DescriptionIcon from '@mui/icons-material/Description';
import PaidIcon from '@mui/icons-material/Paid';
import ScienceIcon from '@mui/icons-material/Science';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import KpiCard from '../../../../components/dashboard/KpiCard';
import { PipelineCard, WeeklyActivityCard } from '../ClerkPipeline';
import { WorklistTable } from '../ClerkWorklist';

type Props = {
  actions: Pick<ReturnType<typeof useClerkActions>, 'setDeleteTarget' | 'submitAction'>;
  data: Pick<ReturnType<typeof useClerkData>, 'counts' | 'shipments'>;
  reqs: Pick<ReturnType<typeof useClerkRequests>, 'goToRequests' | 'requestFilters' | 'table'>;
};

export const ClerkHomeView = ({ actions, data, reqs }: Props) => {
  const { setDeleteTarget, submitAction } = actions;
  const { counts, shipments } = data;
  const { goToRequests, requestFilters, table } = reqs;
  return (
    <>
                {/* بطاقات الإحصائيات */}
                <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                  <Grid item xs={12} sm={6} lg={3}>
                    <KpiCard label="المسودات" value={counts.drafts} icon={<DescriptionIcon />} hint="طلبات لم تُرسل" accent="#0c7f6a" onClick={() => goToRequests('drafts')} />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <KpiCard label="بانتظار الرسوم" value={counts.submitted} icon={<PaidIcon />} hint="مرسلة للمحاسب" accent="#8c6d1f" onClick={() => goToRequests('submitted')} />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <KpiCard label="بانتظار المراجعة" value={counts.underReview} icon={<FindInPageIcon />} hint="سُددت رسومها — لدى مدير القسم" accent="#6f5516" onClick={() => goToRequests('under-review')} />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <KpiCard label="قيد الفحص" value={counts.inspection} icon={<ScienceIcon />} hint="تفتيش ميداني ومعمل" accent="#12a585" onClick={() => goToRequests('inspection')} />
                  </Grid>
                </Grid>

                {/* الرسوم البيانية */}
                <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                  <Grid item xs={12} md={7}><PipelineCard counts={counts} /></Grid>
                  <Grid item xs={12} md={5}><WeeklyActivityCard shipments={shipments} /></Grid>
                </Grid>

                {/* قائمة العمل */}
                <WorklistTable
                  table={table}
                  filters={requestFilters}
                  title="جميع الطلبات"
                  subtitle={`${table.count} طلب`}
                  onAction={submitAction}
                  onDelete={(r) => setDeleteTarget(r)}
                  onSend={submitAction}
                />
    </>
  );
};
