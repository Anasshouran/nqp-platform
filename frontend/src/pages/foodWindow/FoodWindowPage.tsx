import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import {
  PageHeader, SectionCard, EmptyState, DataTable, StatusChip, PageTabs, FormDialog, FormTextField, FormSelect, AppButton, ConfirmDialog,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import {
  getWindowDashboard,
  getWindows,
  getTransactions,
  getMyScope,
  getDecisions,
  getAuditLogs,
  closeTransaction,
  createTransaction,
  createDecision,
} from '../../api/endpoints/foodWindow';
import type {
  WindowDashboardItem,
  ServiceWindow,
  ShipmentTransaction,
  CommodityDecision,
  WindowScopeItem,
} from '../../types/foodWindow';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { useAuth } from '../../hooks/useAuth';

const TX_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  OPEN: { label: 'مفتوحة', tone: 'info' },
  IN_PROGRESS: { label: 'قيد المعالجة', tone: 'warning' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

const DECISION_LABELS: Record<string, { label: string; tone: 'success' | 'error' | 'warning' }> = {
  APPROVED: { label: 'مطابق', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
  HOLD: { label: 'موقوف', tone: 'warning' },
};

const TAB_KEYS = ['dashboard', 'transactions', 'decisions', 'scope', 'audit'] as const;

const tabs = [
    { label: 'نظرة عامة' },
    { label: 'المعاملات' },
    { label: 'القرارات' },
    { label: 'نطاق الصلاحيات' },
    { label: 'السجل' },
  ];

const FoodWindowPage = () => {
  const { user } = useAuth();
  const [tabIdx, setTabIdx] = useState(0);
  const tab = TAB_KEYS[tabIdx];
  const [dashboard, setDashboard] = useState<WindowDashboardItem[]>([]);
  const [windows, setWindows] = useState<ServiceWindow[]>([]);
  const [transactions, setTransactions] = useState<ShipmentTransaction[]>([]);
  const [decisions, setDecisions] = useState<CommodityDecision[]>([]);
  const [myScope, setMyScope] = useState<WindowScopeItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      getWindowDashboard().then((r) => setDashboard(r.data.data)),
      getWindows({ page_size: 20 }).then((r) => setWindows(r.data.data.results)),
      getTransactions({ page_size: 20 }).then((r) => setTransactions(r.data.data.results)),
      getDecisions({ page_size: 20 }).then((r) => setDecisions(r.data.data.results)),
      getMyScope().then((r) => setMyScope(r.data.data)),
      getAuditLogs({ page_size: 20 }).then((r) => setAuditLogs(r.data.data.results)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCloseTx = async (id: string) => {
    try {
      await closeTransaction(id);
      notifySuccess('تم إغلاق المعاملة');
      refresh();
    } catch { notifyError('تعذّر إغلاق المعاملة'); }
  };

  const txColumns: DataTableColumn<ShipmentTransaction>[] = [
    { key: 'shipment_manifest', label: 'رقم البيان', render: (r) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.shipment_manifest ?? '—'}</Typography> },
    { key: 'window_name', label: 'النافذة', render: (r) => r.window_name ?? '—' },
    { key: 'clerk_name', label: 'الموظّف', render: (r) => r.clerk_name ?? '—' },
    {
      key: 'status',
      label: 'الحالة',
      render: (r) => {
        const meta = TX_STATUS[r.status] ?? { label: r.status, tone: 'neutral' };
        return <StatusChip label={meta.label} tone={meta.tone as any} />;
      },
    },
    { key: 'assigned_at', label: 'التاريخ', render: (r) => formatDateTime(r.assigned_at) },
  ];

  const decColumns: DataTableColumn<CommodityDecision>[] = [
    { key: 'decided_by_name', label: 'صادر القرار', render: (r) => r.decided_by_name ?? '—' },
    {
      key: 'decision',
      label: 'القرار',
      render: (r) => {
        const meta = DECISION_LABELS[r.decision] ?? { label: r.decision, tone: 'neutral' };
        return <StatusChip label={meta.label} tone={meta.tone as any} />;
      },
    },
    { key: 'reason', label: 'السبب', render: (r) => r.reason || '—' },
    { key: 'decided_at', label: 'التاريخ', render: (r) => formatDateTime(r.decided_at) },
  ];

  const auditColumns: DataTableColumn<any>[] = [
    { key: 'window_name', label: 'النافذة', render: (r) => r.window_name ?? '—' },
    { key: 'user_name', label: 'المستخدم', render: (r) => r.user_name ?? '—' },
    { key: 'action', label: 'الإجراء' },
    { key: 'timestamp', label: 'الوقت', render: (r) => formatDateTime(r.timestamp) },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="نافذة الأغذية الموحدة"
        title="إدارة نوافذ الأغذية"
        subtitle="نافذة موحدة لإدارة معاملات الشحنات وقرارات السلع على مستوى القطاع."
        action={
          <Chip label={user?.full_name ?? ''} variant="outlined" size="small" />
        }
      />

      <PageTabs tabs={tabs} value={tabIdx} onChange={setTabIdx} />

      {/* Dashboard */}
      {tab === 'dashboard' && (
        <>
          <Grid container spacing={2.5} sx={{ mt: 1, mb: 4 }}>
            {loading ? (
              [0, 1, 2].map((i) => <Grid item xs={12} sm={4} key={i}><Skeleton variant="rounded" height={110} /></Grid>)
            ) : dashboard.length === 0 ? (
              <Grid item xs={12}><EmptyState icon={<Typography>🏢</Typography>} title="لا توجد نوافذ" description="لم يتم إنشاء أي نافذة خدمة بعد." /></Grid>
            ) : dashboard.map((d) => (
              <Grid item xs={12} sm={6} lg={4} key={d.id}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{d.name_ar}</Typography>
                      <Chip size="small" label={d.window_type === 'SINGLE' ? 'نافذة واحدة' : 'عدة نوافذ'} variant="outlined" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{d.station_name}</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Grid container spacing={1}>
                      {[
                        { v: d.open_transactions, l: 'مفتوحة', color: 'info.main' },
                        { v: d.closed_today, l: 'أغلقت اليوم', color: 'success.main' },
                        { v: d.approved, l: 'مطابق', color: 'success.main' },
                        { v: d.rejected, l: 'مرفوض', color: 'error.main' },
                      ].map((m) => (
                        <Grid item xs={3} key={m.l}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: m.color }}>{m.v}</Typography>
                          <Typography variant="caption" color="text.secondary">{m.l}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <SectionCard title="معاملات الشحنات" subtitle="آخر المعاملات المسجلة على النوافذ">
          <DataTable<ShipmentTransaction>
            columns={txColumns}
            rows={transactions}
            rowKey={(r) => r.id}
            count={transactions.length}
            page={1}
            rowsPerPage={20}
            loading={loading}
            hidePagination
            actions={(r) => r.status !== 'CLOSED' ? (
              <AppButton size="small" variant="ghost" onClick={() => handleCloseTx(r.id)}>إغلاق</AppButton>
            ) : null}
          />
        </SectionCard>
      )}

      {/* Decisions */}
      {tab === 'decisions' && (
        <SectionCard title="قرارات السلع" subtitle="آخر القرارات الصادرة عن النوافذ">
          <DataTable<CommodityDecision>
            columns={decColumns}
            rows={decisions}
            rowKey={(r) => r.id}
            count={decisions.length}
            page={1}
            rowsPerPage={20}
            loading={loading}
            hidePagination
          />
        </SectionCard>
      )}

      {/* Scope */}
      {tab === 'scope' && (
        <SectionCard title="نطاق الصلاحيات" subtitle="النوافذ والسلع المرتبطة بحسابك">
          {myScope.length === 0 ? (
            <EmptyState icon={<Typography>🔒</Typography>} title="لا توجد صلاحيات" description="لم يتم تعيينك على أي نافذة بعد." />
          ) : (
            <Grid container spacing={2}>
              {myScope.map((s) => (
                <Grid item xs={12} sm={6} lg={4} key={s.window_id}>
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>{s.window_name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{s.window_code} — {s.station}</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {s.commodities.map((c) => (
                          <Chip key={c.id} label={c.name_ar} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </SectionCard>
      )}

      {/* Audit */}
      {tab === 'audit' && (
        <SectionCard title="سجل التدقيق" subtitle="آخر الحركات على النوافذ">
          <DataTable
            columns={auditColumns}
            rows={auditLogs}
            rowKey={(r: any) => r.id}
            count={auditLogs.length}
            page={1}
            rowsPerPage={20}
            loading={loading}
            hidePagination
          />
        </SectionCard>
      )}
    </Box>
  );
};

export default FoodWindowPage;
