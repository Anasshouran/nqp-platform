import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import VerifiedIcon from '@mui/icons-material/Verified';
import TimelineIcon from '@mui/icons-material/Timeline';
import BiotechIcon from '@mui/icons-material/Biotech';
import EmergencyShareIcon from '@mui/icons-material/EmergencyShare';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import { SectionCard, DataTable, ExportButton } from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { getNationalLabDashboard } from '../../api/endpoints/laboratory';
import type { NationalLabDashboard, NationalLabSector } from '../../types/laboratory';
import { formatDateTime } from '../../utils/formatters';
import { notifyError } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const PRA = '#0c7f6a';
const WARN = '#a98a2e';
const DANGER = '#c63a3a';
const INFO = '#2f6dd0';
const ASH = '#5b6f68';

const chartTooltipStyle = {
  rtl: true as const,
  backgroundColor: '#14312a',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontFamily: 'IBM Plex Sans Arabic',
  fontSize: 12,
};

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const toneFor = (color?: string | null) => color || PRA;

const NationalLabDashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<NationalLabDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sections = useMemo<CommandSectionDef[]>(
    () => [
      { id: 'kpis', label: t('laboratory.nationalLab.sectionKpis'), icon: <DashboardIcon fontSize="small" /> },
      { id: 'charts', label: t('laboratory.nationalLab.sectionCharts'), icon: <TrendingUpIcon fontSize="small" /> },
      { id: 'radar', label: t('laboratory.nationalLab.sectionRadar'), icon: <TimelineIcon fontSize="small" /> },
      { id: 'sectors', label: t('laboratory.nationalLab.sectionSectors'), icon: <FactCheckIcon fontSize="small" /> },
      { id: 'alerts', label: t('laboratory.nationalLab.sectionAlerts'), icon: <EmergencyShareIcon fontSize="small" /> },
    ],
    [t],
  );

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getNationalLabDashboard();
      setData(res.data.data);
    } catch {
      notifyError(t('laboratory.nationalLab.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    getNationalLabDashboard()
      .then((res) => mounted && setData(res.data.data))
      .catch(() => mounted && notifyError(t('laboratory.nationalLab.loadError')))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    if (!data) return [];
    const totals = data.totals;
    return [
      { icon: <DashboardIcon />, value: totals.samples, label: t('laboratory.nationalLab.kpiSamples'), accent: 'primary.main', trend: { label: t('laboratory.nationalLab.sectorsCount', { count: data.sectors.length }), positive: true } },
      { icon: <ScienceIcon />, value: totals.under_testing, label: t('laboratory.nationalLab.kpiUnderTesting'), accent: 'info.main' },
      { icon: <VerifiedIcon />, value: totals.completed, label: t('laboratory.nationalLab.kpiCompleted'), accent: 'success.main' },
      { icon: <FactCheckIcon />, value: totals.positive, label: t('laboratory.nationalLab.kpiPositive'), accent: 'error.main' },
      { icon: <FactCheckIcon />, value: totals.negative, label: t('laboratory.nationalLab.kpiNegative'), accent: 'success.main' },
      { icon: <WarningAmberIcon />, value: totals.critical, label: t('laboratory.shared.criticalOpenResults'), accent: 'error.main' },
      { icon: <TimelineIcon />, value: totals.avg_tat_hours, label: t('laboratory.nationalLab.kpiTat'), accent: 'info.main' },
      { icon: <BiotechIcon />, value: totals.tests_count, label: t('laboratory.nationalLab.kpiTests'), accent: 'primary.main' },
    ];
  }, [data, t]);

  const perSectorBars = useMemo(() => {
    if (!data) return [];
    return data.sectors.map((s) => ({
      name: s.name,
      count: s.totals.samples,
      fill: s.color || PRA,
    }));
  }, [data]);

  const outcomeDonut = useMemo(() => {
    if (!data) return { items: [], total: 0 };
    const totals = data.totals;
    const items = [
      { name: t('laboratory.shared.positive'), value: totals.positive, color: DANGER },
      { name: t('laboratory.shared.negative'), value: totals.negative, color: PRA },
      { name: t('laboratory.shared.underTesting'), value: totals.under_testing, color: INFO },
      { name: t('laboratory.shared.criticalResult'), value: totals.critical, color: '#8a5a00' },
    ].filter((i) => i.value > 0);
    return { items, total: totals.samples };
  }, [data, t]);

  const radarData = useMemo(() => {
    if (!data) return [];
    return data.sectors.map((s) => ({
      sector: s.name,
      incoming: Math.min(s.totals.samples, 100),
      positive: Math.min(s.totals.positive, 100),
      critical: Math.min(s.totals.critical, 100),
      tat: Math.min(s.totals.avg_tat_hours, 100),
    }));
  }, [data]);

  const radarSeries = useMemo(
    () => [
      { key: 'incoming', label: t('laboratory.nationalLab.radarIncoming'), stroke: INFO, fill: INFO, opacity: 0.18 },
      { key: 'positive', label: t('laboratory.nationalLab.radarPositive'), stroke: DANGER, fill: DANGER, opacity: 0.16 },
      { key: 'critical', label: t('laboratory.nationalLab.radarCritical'), stroke: '#8a5a00', fill: '#8a5a00', opacity: 0.16 },
      { key: 'tat', label: t('laboratory.nationalLab.radarTat'), stroke: PRA, fill: PRA, opacity: 0.16 },
    ],
    [t],
  );

  const exportHeaders = useMemo(
    () => [
      t('laboratory.nationalLab.colSector'),
      t('laboratory.nationalLab.colLab'),
      t('laboratory.shared.samplesUnit'),
      t('laboratory.shared.underTesting'),
      t('laboratory.shared.positive'),
      t('laboratory.shared.negative'),
      t('laboratory.shared.criticalResult'),
      t('laboratory.nationalLab.colAvgTat'),
      t('laboratory.nationalLab.colEquipment'),
      t('laboratory.nationalLab.colReagents'),
    ],
    [t],
  );

  const sectorColumns = useMemo<DataTableColumn<NationalLabSector>[]>(
    () => [
      { key: 'name', label: t('laboratory.nationalLab.colSector'), render: (s) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color || PRA, flexShrink: 0 }} />
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{s.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>({s.code})</Typography>
          </Stack>
        </Stack>
      ) },
      { key: 'lab', label: t('laboratory.nationalLab.colLab'), render: (s) => s.laboratory ? <Typography variant="body2">{s.laboratory.name}</Typography> : '—' },
      { key: 'samples', label: t('laboratory.shared.samplesUnit'), render: (s) => <Typography fontWeight={700}>{s.totals.samples}</Typography> },
      { key: 'under_testing', label: t('laboratory.shared.underTesting'), render: (s) => s.totals.under_testing },
      { key: 'positive', label: t('laboratory.shared.positive'), render: (s) => <Typography sx={{ color: DANGER, fontWeight: 700 }}>{s.totals.positive}</Typography> },
      { key: 'negative', label: t('laboratory.shared.negative'), render: (s) => <Typography sx={{ color: PRA, fontWeight: 700 }}>{s.totals.negative}</Typography> },
      { key: 'critical', label: t('laboratory.shared.criticalResult'), render: (s) => <Typography sx={{ color: '#8a5a00', fontWeight: 700 }}>{s.totals.critical}</Typography> },
      { key: 'avg_tat', label: t('laboratory.nationalLab.colAvgTat'), render: (s) => `${s.totals.avg_tat_hours} ${t('laboratory.nationalLab.hourUnit')}` },
      { key: 'equipment', label: t('laboratory.nationalLab.colEquipment'), render: (s) => <Typography sx={{ color: s.equipment.overdue ? DANGER : 'inherit' }}>{s.equipment.overdue} / {s.equipment.total}</Typography> },
      { key: 'reagents', label: t('laboratory.nationalLab.colReagents'), render: (s) => <Typography sx={{ color: s.reagents.expired + s.reagents.low_stock ? WARN : 'inherit' }}>{s.reagents.expired} / {s.reagents.low_stock}</Typography> },
      { key: 'qc', label: t('laboratory.nationalLab.colQc'), render: (s) => `${s.quality.open_nc} / ${s.quality.pending_qc}` },
      { key: 'alerts', label: t('laboratory.nationalLab.colAlerts'), render: (s) => <Chip size="small" color={s.epidemic_alerts ? 'error' : 'default'} label={s.epidemic_alerts} /> },
    ],
    [t]
  );

  const { active, register, scrollTo } = useCommandSections(sections, [loading, sections]);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 14 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <DashboardHero
        eyebrow={t('laboratory.nationalLab.eyebrow')}
        title={t('laboratory.nationalLab.title')}
        subtitle={t('laboratory.nationalLab.subtitle')}
        gradient="emerald"
        avatarLabel={t('laboratory.nationalLab.avatarFallback')}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={t('laboratory.shared.refreshTip')}>
              <Box component="span" sx={{ display: 'inline-flex' }}>
                <IconButton aria-label={t('laboratory.shared.refreshAria')} size="small" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }} disabled={refreshing} onClick={() => load(true)}>
                  <RefreshIcon fontSize="small" sx={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
                </IconButton>
              </Box>
            </Tooltip>
            <ExportButton
              filename={`national-lab-${new Date().toISOString().slice(0, 10)}`}
              headers={exportHeaders}
              rows={data ? data.sectors.map((s) => [s.name, s.laboratory?.name || '', String(s.totals.samples), String(s.totals.under_testing), String(s.totals.positive), String(s.totals.negative), String(s.totals.critical), String(s.totals.avg_tat_hours), String(s.equipment.overdue), `${s.reagents.expired}/${s.reagents.low_stock}`]) : []}
              disabled={loading || !data || data.sectors.length === 0}
            />
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {data ? t('laboratory.nationalLab.activeLabs', { count: data.sectors.length }) : '—'}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={sections}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('laboratory.shared.sectionsRail')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>

      {/* KPI */}
      <Box component="section" ref={register('kpis')} data-section="kpis" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={4} md={3} key={k.label}>
            {loading ? <Skeleton variant="rounded" height={118} /> : <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />}
          </Grid>
        ))}
      </Grid>
      </Box>

      {/* الرسوم البيانية */}
      <Box component="section" ref={register('charts')} data-section="charts" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={5}>
          <SectionCard title={t('laboratory.nationalLab.chartSectorsTitle')} subtitle={t('laboratory.nationalLab.chartSectorsSub')}>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perSectorBars} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: ASH }} axisLine={false} tickLine={false} width={28} />
                  <ChartTooltip cursor={{ fill: 'rgba(12,127,106,0.06)' }} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" name={t('laboratory.shared.samplesUnit')} radius={[8, 8, 0, 0]} maxBarSize={42}>
                    {perSectorBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <SectionCard title={t('laboratory.nationalLab.chartOutcomeTitle')} subtitle={t('laboratory.nationalLab.chartOutcomeSub')}>
            <Box sx={{ width: '100%', height: 260, display: 'grid', placeItems: 'center', position: 'relative' }}>
              {outcomeDonut.items.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 8 }}>{t('laboratory.nationalLab.noResults')}</Typography>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={outcomeDonut.items} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2} stroke="rgba(255,255,255,0.9)" strokeWidth={2}>
                        {outcomeDonut.items.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip contentStyle={chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{outcomeDonut.total}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('laboratory.shared.sampleUnit')}</Typography>
                  </Box>
                </>
              )}
            </Box>
            <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ mt: 1, gap: 1 }}>
              {outcomeDonut.items.map((s) => (
                <LegendDot key={s.name} color={s.color} label={s.name} value={s.value} />
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SectionCard title={t('laboratory.nationalLab.chartTopTitle')} subtitle={t('laboratory.nationalLab.chartTopSub')} action={
            <Chip icon={<TrendingUpIcon sx={{ fontSize: 16 }} />} label={t('laboratory.nationalLab.topFive')} size="small" color="primary" variant="outlined" />
          }>
            {!data || data.top_tests_global.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>{t('laboratory.shared.noData')}</Typography>
            ) : (
              <Stack spacing={1.5}>
                {data.top_tests_global.map((test, i) => (
                  <Stack key={test.name} direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: toneFor(data.sectors[i % data.sectors.length]?.color) }}>{i + 1}.</Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5 }}>{test.name}</Typography>
                      <Box sx={{ height: 6, borderRadius: 2, bgcolor: 'divider', overflow: 'hidden', mt: 0.4 }}>
                        <Box sx={{ height: '100%', width: `${Math.min(100, Math.round((test.count / (data.top_tests_global[0]?.count || 1)) * 100))}%`, bgcolor: PRA, borderRadius: 2 }} />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{test.count}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
      </Box>

      {/* مؤشر الأداء */}
      <Box component="section" ref={register('radar')} data-section="radar" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <SectionCard title={t('laboratory.nationalLab.radarTitle')} subtitle={t('laboratory.nationalLab.radarSub')}>
            {!data || radarData.length < 2 ? (
              <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>{t('laboratory.nationalLab.radarNeedTwo')}</Typography>
            ) : (
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="rgba(16,40,34,0.12)" />
                    <PolarAngleAxis dataKey="sector" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} />
                    {radarSeries.map((s) => (
                      <Radar key={s.key} name={s.label} dataKey={s.key} stroke={s.stroke} fill={s.fill} fillOpacity={s.opacity} />
                    ))}
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12 }} />
                    <ChartTooltip contentStyle={chartTooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>
      </Box>

      {/* مقارنة القطاعات + الإنذارات */}
      <Box component="section" ref={register('sectors')} data-section="sectors" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <DataTable<NationalLabSector>
            columns={sectorColumns}
            rows={data ? data.sectors : []}
            rowKey={(s) => s.code}
            count={data ? data.sectors.length : 0}
            page={1}
            rowsPerPage={data ? data.sectors.length : 0}
            hidePagination
            loading={loading}
            title={t('laboratory.nationalLab.tableTitle')}
            subtitle={t('laboratory.nationalLab.tableSubtitle')}
            onRefresh={() => load(true)}
            refreshing={refreshing}
            emptyTitle={t('laboratory.nationalLab.emptyTitle')}
            emptyDescription={t('laboratory.nationalLab.emptyDescription')}
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard title={t('laboratory.nationalLab.alertsTitle')} subtitle={t('laboratory.nationalLab.alertsSub')} action={
            <Chip icon={<EmergencyShareIcon sx={{ fontSize: 16 }} />} label={t('laboratory.nationalLab.activeChip')} size="small" color="error" variant="outlined" />
          }>
            {!data || data.recent_alerts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <VerifiedIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography color="text.secondary">{t('laboratory.nationalLab.noAlerts')}</Typography>
              </Box>
            ) : (
              <Stack spacing={1.25}>
                {data.recent_alerts.map((a) => (
                  <Stack key={a.id} direction="row" spacing={1.25} alignItems="center" sx={{ p: 1.25, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.55)' }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: DANGER, bgcolor: '#fdeaea', flexShrink: 0 }}>
                      <EmergencyShareIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{a.alert_type === 'RED_ALERT' ? t('laboratory.nationalLab.redAlert') : t('laboratory.nationalLab.outbreak')} — {a.port || t('laboratory.nationalLab.noPort')}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>{a.description}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDateTime(a.triggered_at)}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
          </Box>
        </Grid>
      </Grid>
      </Box>

        </Grid>
      </Grid>
    </Box>
  );
};

const LegendDot = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <Stack direction="row" alignItems="center" spacing={0.6}>
    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
    <Typography variant="caption" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>({value})</Typography>
  </Stack>
);

export default NationalLabDashboard;