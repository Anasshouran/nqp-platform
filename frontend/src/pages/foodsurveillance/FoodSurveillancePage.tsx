import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ScienceIcon from '@mui/icons-material/Science';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import GppBadIcon from '@mui/icons-material/GppBad';
import FactoryIcon from '@mui/icons-material/Factory';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  SectionCard,
  DataTable,
  StatusChip,
  ExportButton,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { formatDateTime } from '../../utils/formatters';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
import { fssRiskLevel, fssAlertStatus, fssAlertReason, fssNonConformityStatus, fssRecallStatus, fssRecallType } from '../../utils/status';
import { getFoodSurveillanceDashboard } from '../../api/endpoints/foodSurveillance';
import type { FssDashboard, FssAlert, FssNonConformity, FssRecall } from '../../api/endpoints/foodSurveillance';
import type { DashboardWindow } from '../../api/endpoints/reports';
import { useTranslation } from 'react-i18next';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartTooltip, Legend, Filler);

const WINDOWS = (t: (key: string, opts?: Record<string, string | number>) => string): Array<{ key: DashboardWindow; label: string }> => [
  { key: 'day', label: t('food.foodSurveillance.windows.day') },
  { key: 'week', label: t('food.foodSurveillance.windows.week') },
  { key: 'month', label: t('food.foodSurveillance.windows.month') },
  { key: 'year', label: t('food.foodSurveillance.windows.year') },
  { key: 'all', label: t('food.foodSurveillance.windows.all') },
];

const SECTIONS = (t: (key: string, opts?: Record<string, string | number>) => string) => [
  { id: 'overview', label: t('food.foodSurveillance.sections.overview'), icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'alerts', label: t('food.foodSurveillance.sections.alerts'), icon: <NotificationsActiveIcon fontSize="small" /> },
  { id: 'nonconformity', label: t('food.foodSurveillance.sections.nonconformity'), icon: <GppBadIcon fontSize="small" /> },
  { id: 'recalls', label: t('food.foodSurveillance.sections.recalls'), icon: <FactoryIcon fontSize="small" /> },
] as const;

const LEVELS: Record<string, { tone: 'success' | 'warning' | 'error' }> = {
  LEVEL_0: { tone: 'success' },
  LEVEL_1: { tone: 'success' },
  LEVEL_2: { tone: 'warning' },
  LEVEL_3: { tone: 'error' },
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, boxWidth: 14, color: '#5b6f68' } },
    tooltip: { rtl: true, backgroundColor: '#14312a', titleFont: { family: 'IBM Plex Sans Arabic' }, bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' }, grid: { color: 'rgba(16,40,34,0.06)' } },
  },
};

const barOptions = {
  ...lineOptions,
  plugins: {
    ...lineOptions.plugins,
    legend: { ...lineOptions.plugins.legend, display: true },
  },
};

const riskTone = (score: number): 'success' | 'warning' | 'error' => (score >= 60 ? 'error' : score >= 30 ? 'warning' : 'success');

const scoreColor = (score: number): string => (score >= 60 ? '#c63a3a' : score >= 30 ? '#b98a2e' : '#0c7f6a');

const RiskItem = ({ item, t }: { item: { name: string; count: number; rejected: number; score: number }; t: (key: string, opts?: Record<string, string | number>) => string }) => (
  <Stack spacing={0.5}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
      <StatusChip label={`${item.score}`} tone={riskTone(item.score)} />
    </Stack>
    <Box sx={{ bgcolor: 'rgba(16,40,34,0.06)', borderRadius: 1.5, height: 8, overflow: 'hidden' }}>
      <Box sx={{ width: `${item.score}%`, height: '100%', bgcolor: scoreColor(item.score), borderRadius: 1.5 }} />
    </Box>
    <Typography variant="caption" color="text.secondary">
      {t('food.foodSurveillance.riskItem.rejectedFrom', { rejected: item.rejected, count: item.count })}
    </Typography>
  </Stack>
);

const FoodSurveillancePage = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [window, setWindow] = useState<DashboardWindow>('month');
  const [data, setData] = useState<FssDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { active, register, scrollTo } = useCommandSections(SECTIONS(t) as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getFoodSurveillanceDashboard(window)
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError(t('food.foodSurveillance.errors.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const kpis = [
    { icon: <LocalShippingIcon />, value: data?.kpis.shipments ?? 0, label: t('food.foodSurveillance.kpis.shipments'), accent: 'info.main', trend: { label: t('food.foodSurveillance.kpis.shipmentsTrend', { imports: data?.kpis.imports ?? 0, exports: data?.kpis.exports ?? 0 }), positive: true } },
    { icon: <ScienceIcon />, value: data?.kpis.samples ?? 0, label: t('food.foodSurveillance.kpis.samples'), accent: 'primary.main' },
    { icon: <GppBadIcon />, value: data?.kpis.nonconforming ?? 0, label: t('food.foodSurveillance.kpis.nonconforming'), accent: 'error.main', trend: { label: t('food.foodSurveillance.kpis.rejectedTrend', { rejected: data?.kpis.rejected ?? 0 }), positive: false } },
    { icon: <NotificationsActiveIcon />, value: data?.kpis.alerts ?? 0, label: t('food.foodSurveillance.kpis.alerts'), accent: 'warning.main' },
    { icon: <FactoryIcon />, value: data?.kpis.recalls_active ?? 0, label: t('food.foodSurveillance.kpis.recalls'), accent: 'error.main' },
    { icon: <GppBadIcon />, value: data?.kpis.non_conformities_open ?? 0, label: t('food.foodSurveillance.kpis.openNonConformities'), accent: 'warning.main' },
  ];

  const levelTone = LEVELS[data?.response_level ?? 'LEVEL_0'].tone;
  const levelLabel = t(`food.foodSurveillance.levels.${data?.response_level ?? 'LEVEL_0'}`);
  const nonConformingPct = data && data.kpis.samples > 0 ? Math.round((data.kpis.nonconforming / data.kpis.samples) * 100) : 0;

  return (
    <Box>
      <DashboardHero
        eyebrow="Food Surveillance System"
        title={t('food.foodSurveillance.pageHeader.title')}
        subtitle={t('food.foodSurveillance.pageHeader.subtitle')}
        gradient="emerald"
        avatarLabel="ا"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={levelLabel} color={levelTone === 'error' ? 'error' : levelTone === 'warning' ? 'warning' : 'success'} sx={{ fontWeight: 700, px: 1 }} />
            <TextField
              select
              size="small"
              value={window}
              onChange={(e) => setWindow(e.target.value as DashboardWindow)}
              sx={{ minWidth: 130, bgcolor: 'background.paper' }}
              inputProps={{ 'aria-label': t('food.foodSurveillance.periodLabel') }}
            >
              {WINDOWS(t).map((w) => (
                <MenuItem key={w.key} value={w.key}>
                  {w.label}
                </MenuItem>
              ))}
            </TextField>
            <ExportButton
              filename="food-surveillance"
              headers={[
                t('food.foodSurveillance.export.headers.product'),
                t('food.foodSurveillance.export.headers.shipments'),
                t('food.foodSurveillance.export.headers.rejected'),
                t('food.foodSurveillance.export.headers.riskScore'),
              ]}
              rows={(data?.risk.products ?? []).map((p) => [p.name, p.count, p.rejected, p.score])}
              disabled={loading}
            />
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('food.foodSurveillance.status.live')}
          </Box>,
        ]}
      />

      {error && (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS(t) as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('food.foodSurveillance.sections.title')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          {/*نظرة عامة*/}
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            {!loading && data && (
              <SectionCard title={t('food.foodSurveillance.sections.overview.title')} subtitle={t('food.foodSurveillance.sections.overview.subtitle', { pct: nonConformingPct })} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={t('food.foodSurveillance.chips.shipments', { count: data.kpis.shipments })} size="small" variant="outlined" color="primary" />
                  <Chip label={t('food.foodSurveillance.chips.samples', { count: data.kpis.samples })} size="small" variant="outlined" color="primary" />
                  <Chip label={t('food.foodSurveillance.chips.imports', { count: data.kpis.imports })} size="small" variant="outlined" />
                  <Chip label={t('food.foodSurveillance.chips.exports', { count: data.kpis.exports })} size="small" variant="outlined" />
                  <Chip label={t('food.foodSurveillance.chips.released', { count: data.kpis.released })} size="small" variant="outlined" color="success" />
                  <Chip label={t('food.foodSurveillance.chips.rejected', { count: data.kpis.rejected })} size="small" variant="outlined" color="error" />
                </Stack>
              </SectionCard>
            )}

            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {kpis.map((k) => (
                <Grid item xs={12} sm={6} md={2.4} key={k.label}>
                  {loading ? <Skeleton variant="rounded" height={124} /> : <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />}
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} lg={7}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('food.foodSurveillance.charts.nonConformingTitle')}</Typography>
                      <TrendingUpIcon color="primary" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{t('food.foodSurveillance.charts.nonConformingSubtitle')}</Typography>
                    <Box sx={{ height: 260, mt: 2 }}>
                      {loading ? (
                        <Skeleton variant="rounded" height={260} />
                      ) : (
                        <Line
                          data={{
                            labels: (data?.trend ?? []).map((t) => t.date),
                            datasets: [
                              {
                                label: t('food.foodSurveillance.charts.nonConformingDataset'),
                                data: (data?.trend ?? []).map((t) => t.count),
                                borderColor: 'error.main',
                                backgroundColor: 'rgba(198,58,58,0.12)',
                                fill: true,
                                tension: 0.35,
                                pointBackgroundColor: 'error.main',
                              },
                            ],
                          }}
                          options={lineOptions}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} lg={5}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{t('food.foodSurveillance.charts.ncDistributionTitle')}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('food.foodSurveillance.charts.ncDistributionSubtitle')}</Typography>
                    <Box sx={{ height: 250, mt: 2 }}>
                      {loading ? (
                        <Skeleton variant="rounded" height={250} />
                      ) : (
                        <Bar
                          data={{
                            labels: [
                              t('food.foodSurveillance.charts.ncStatus.open'),
                              t('food.foodSurveillance.charts.ncStatus.underInvestigation'),
                              t('food.foodSurveillance.charts.ncStatus.correctiveAction'),
                              t('food.foodSurveillance.charts.ncStatus.resolved'),
                              t('food.foodSurveillance.charts.ncStatus.closed'),
                            ],
                            datasets: [
                              {
                                label: t('food.foodSurveillance.charts.ncStatusDataset'),
                                data: [
                                  data?.nc_distribution.open ?? 0,
                                  data?.nc_distribution.under_investigation ?? 0,
                                  data?.nc_distribution.corrective_action ?? 0,
                                  data?.nc_distribution.resolved ?? 0,
                                  data?.nc_distribution.closed ?? 0,
                                ],
                                backgroundColor: ['#c63a3a', '#2f6dd0', '#e07a1f', '#0e8b9e', '#0c7f6a'],
                                borderRadius: 8,
                              },
                            ],
                          }}
                          options={barOptions}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title={t('food.foodSurveillance.sections.highRiskCountries.title')} subtitle={t('food.foodSurveillance.sections.highRiskCountries.subtitle')}>
                  <Stack spacing={1.75}>
                    {(data?.risk.countries ?? []).length === 0 ? <Typography color="text.secondary">{t('food.foodSurveillance.noData.countries')}</Typography> : data?.risk.countries.map((c) => <RiskItem key={c.name} item={c} t={t} />)}
                  </Stack>
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title={t('food.foodSurveillance.sections.highRiskSuppliers.title')} subtitle={t('food.foodSurveillance.sections.highRiskSuppliers.subtitle')}>
                  <Stack spacing={1.75}>
                    {(data?.risk.suppliers ?? []).length === 0 ? <Typography color="text.secondary">{t('food.foodSurveillance.noData.suppliers')}</Typography> : data?.risk.suppliers.map((c) => <RiskItem key={c.name} item={c} t={t} />)}
                  </Stack>
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title={t('food.foodSurveillance.sections.highRiskProducts.title')} subtitle={t('food.foodSurveillance.sections.highRiskProducts.subtitle')}>
                  <Stack spacing={1.75}>
                    {(data?.risk.products ?? []).length === 0 ? <Typography color="text.secondary">{t('food.foodSurveillance.noData.products')}</Typography> : data?.risk.products.map((c) => <RiskItem key={c.name} item={c} t={t} />)}
                  </Stack>
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title={t('food.foodSurveillance.sections.labSurveillance.title')} subtitle={t('food.foodSurveillance.sections.labSurveillance.subtitle')}>
                  <Stack spacing={1.25}>
                    {(data?.lab_top ?? []).length === 0 ? <Typography color="text.secondary">{t('food.foodSurveillance.noData.labTop')}</Typography> : data?.lab_top.map((p) => (
                      <Stack key={p.code} direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'error.main', bgcolor: 'error.light', flexShrink: 0 }}>
                          <ScienceIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.code}</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.count}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </SectionCard>
              </Grid>
            </Grid>
          </Box>

          {/*الإنذارات*/}
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<FssAlert>
              columns={[
                { key: 'alert_number', label: t('food.foodSurveillance.tables.alerts.columns.number'), render: (a) => <Typography sx={{ fontWeight: 700 }}>{a.alert_number}</Typography> },
                { key: 'title', label: t('food.foodSurveillance.tables.alerts.columns.title'), render: (a) => <Typography sx={{ maxWidth: 300 }}>{a.title}</Typography> },
                { key: 'reason', label: t('food.foodSurveillance.tables.alerts.columns.reason'), render: (a) => { const m = fssAlertReason[a.reason]; return m ? <StatusChip label={t(`food.foodSurveillance.alertReasons.${a.reason}`) ?? a.reason} tone={m.tone} /> : a.reason; }, hideOnMobile: true },
                { key: 'risk_level', label: t('food.foodSurveillance.tables.alerts.columns.risk'), render: (a) => { const m = fssRiskLevel[a.risk_level]; return m ? <StatusChip label={t(`food.foodSurveillance.riskLevels.${a.risk_level}`) ?? a.risk_level} tone={m.tone} /> : a.risk_level; } },
                { key: 'status', label: t('food.foodSurveillance.tables.alerts.columns.status'), render: (a) => { const m = fssAlertStatus[a.status]; return m ? <StatusChip label={t(`food.foodSurveillance.alertStatuses.${a.status}`) ?? a.status} tone={m.tone} /> : <StatusChip label={a.status} tone="neutral" />; } },
                { key: 'raised_at', label: t('food.foodSurveillance.tables.alerts.columns.raisedAt'), render: (a) => formatDateTime(a.raised_at), hideOnMobile: true },
              ]}
              rows={data?.alerts ?? []}
              rowKey={(a) => a.id}
              count={data?.alerts.length ?? 0}
              page={page}
              rowsPerPage={10}
              onPageChange={setPage}
              title={t('food.foodSurveillance.tables.alerts.title')}
              subtitle={t('food.foodSurveillance.tables.alerts.subtitle')}
              emptyTitle={t('food.foodSurveillance.tables.alerts.emptyTitle')}
              emptyDescription={t('food.foodSurveillance.tables.alerts.emptyDescription')}
            />
          </Box>

          {/*عدم المطابقة*/}
          <Box component="section" ref={register('nonconformity')} data-section="nonconformity" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<FssNonConformity>
              columns={[
                { key: 'nc_number', label: t('food.foodSurveillance.tables.nonconformity.columns.number'), render: (n) => <Typography sx={{ fontWeight: 700 }}>{n.nc_number}</Typography> },
                { key: 'product', label: t('food.foodSurveillance.tables.nonconformity.columns.product'), render: (n) => n.product || '—' },
                { key: 'origin_country', label: t('food.foodSurveillance.tables.nonconformity.columns.origin'), render: (n) => n.origin_country || '—', hideOnMobile: true },
                { key: 'risk_level', label: t('food.foodSurveillance.tables.nonconformity.columns.risk'), render: (n) => { const m = fssRiskLevel[n.risk_level]; return m ? <StatusChip label={t(`food.foodSurveillance.riskLevels.${n.risk_level}`) ?? n.risk_level} tone={m.tone} /> : n.risk_level; } },
                { key: 'status', label: t('food.foodSurveillance.tables.nonconformity.columns.status'), render: (n) => { const m = fssNonConformityStatus[n.status]; return m ? <StatusChip label={t(`food.foodSurveillance.ncStatuses.${n.status}`) ?? n.status} tone={m.tone} /> : <StatusChip label={n.status} tone="neutral" />; } },
                { key: 'reported_at', label: t('food.foodSurveillance.tables.nonconformity.columns.reportedAt'), render: (n) => formatDateTime(n.reported_at), hideOnMobile: true },
              ]}
              rows={data?.non_conformities ?? []}
              rowKey={(n) => n.id}
              count={data?.non_conformities.length ?? 0}
              page={page}
              rowsPerPage={10}
              onPageChange={setPage}
              title={t('food.foodSurveillance.tables.nonconformity.title')}
              subtitle={t('food.foodSurveillance.tables.nonconformity.subtitle')}
              emptyTitle={t('food.foodSurveillance.tables.nonconformity.emptyTitle')}
              emptyDescription={t('food.foodSurveillance.tables.nonconformity.emptyDescription')}
            />
          </Box>

          {/*السحبات*/}
          <Box component="section" ref={register('recalls')} data-section="recalls" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<FssRecall>
              columns={[
                { key: 'recall_number', label: t('food.foodSurveillance.tables.recalls.columns.number'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.recall_number}</Typography> },
                { key: 'product', label: t('food.foodSurveillance.tables.recalls.columns.product'), render: (r) => r.product },
                { key: 'recall_type', label: t('food.foodSurveillance.tables.recalls.columns.type'), render: (r) => { const m = fssRecallType[r.recall_type]; return m ? <StatusChip label={t(`food.foodSurveillance.recallTypes.${r.recall_type}`) ?? r.recall_type} tone={m.tone} /> : r.recall_type; } },
                { key: 'risk_level', label: t('food.foodSurveillance.tables.recalls.columns.risk'), render: (r) => { const m = fssRiskLevel[r.risk_level]; return m ? <StatusChip label={t(`food.foodSurveillance.riskLevels.${r.risk_level}`) ?? r.risk_level} tone={m.tone} /> : r.risk_level; } },
                { key: 'status', label: t('food.foodSurveillance.tables.recalls.columns.status'), render: (r) => { const m = fssRecallStatus[r.status]; return m ? <StatusChip label={t(`food.foodSurveillance.recallStatuses.${r.status}`) ?? r.status} tone={m.tone} /> : <StatusChip label={r.status} tone="neutral" />; } },
                { key: 'decided_at', label: t('food.foodSurveillance.tables.recalls.columns.decidedAt'), render: (r) => formatDateTime(r.decided_at), hideOnMobile: true },
              ]}
              rows={data?.recalls ?? []}
              rowKey={(r) => r.id}
              count={data?.recalls.length ?? 0}
              page={page}
              rowsPerPage={10}
              onPageChange={setPage}
              title={t('food.foodSurveillance.tables.recalls.title')}
              subtitle={t('food.foodSurveillance.tables.recalls.subtitle')}
              emptyTitle={t('food.foodSurveillance.tables.recalls.emptyTitle')}
              emptyDescription={t('food.foodSurveillance.tables.recalls.emptyDescription')}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FoodSurveillancePage;
