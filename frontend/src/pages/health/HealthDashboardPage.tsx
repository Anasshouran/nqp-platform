import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import BiotechIcon from '@mui/icons-material/Biotech';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { DataTable, StatusChip, ExportButton, NotificationPanel } from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { EmptyState, ErrorState } from '../../components/common';
import { getPublicStatistics } from '../../api/endpoints/public';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/formatters';
import i18n from '../../i18n';

const todayArabic = () => new Date().toLocaleDateString(i18n.language || 'ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

interface StatRow {
  key: string;
  label: string;
  value: number;
}

/** مصادر حقيقية من واجهة الإحصائيات العامة — لا أيّ قيم مخترعة. */
const statRows = (s: {
  screenings: number;
  certificates: number;
  lab_samples: number;
  diseases: number;
  entry_points: number;
  vector_activities: number;
  notices: number;
}, t: (key: string) => string): StatRow[] => [
  { key: 'screenings', label: t('clinic.healthDashboard.stats.screenings'), value: s.screenings ?? 0 },
  { key: 'certificates', label: t('clinic.healthDashboard.stats.certificates'), value: s.certificates ?? 0 },
  { key: 'lab_samples', label: t('clinic.healthDashboard.stats.labSamples'), value: s.lab_samples ?? 0 },
  { key: 'diseases', label: t('clinic.healthDashboard.stats.diseases'), value: s.diseases ?? 0 },
  { key: 'entry_points', label: t('clinic.healthDashboard.stats.entryPoints'), value: s.entry_points ?? 0 },
  { key: 'vector_activities', label: t('clinic.healthDashboard.stats.vectorActivities'), value: s.vector_activities ?? 0 },
  { key: 'notices', label: t('clinic.healthDashboard.stats.notices'), value: s.notices ?? 0 },
];

const HealthDashboardPage = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const sections = useMemo(
    () => [
      { id: 'overview', label: t('clinic.healthDashboard.sections.overview'), icon: <MonitorHeartIcon fontSize="small" /> },
      { id: 'cases', label: t('clinic.healthDashboard.sections.cases'), icon: <PersonSearchIcon fontSize="small" /> },
      { id: 'alerts', label: t('clinic.healthDashboard.sections.alerts'), icon: <WarningAmberIcon fontSize="small" /> },
    ],
    [t]
  );

  const { active, register, scrollTo } = useCommandSections(sections as unknown as CommandSectionDef[]);

  const { data: stats, loading, error, retry } = useApi(async () => (await getPublicStatistics()).data.data);

  // وقت آخر تحديث حقيقي — يُستمد من اكتمال الجلب الفعلي.
  const lastUpdated = stats ? new Date() : null;
  const rows = useMemo(() => (stats ? statRows(stats, t) : []), [stats, t]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          r.label.includes(search) ||
          r.key.includes(search) ||
          String(r.value).includes(search),
      ),
    [rows, search],
  );

  const kpis = useMemo(() => {
    if (!stats) return [];
    return [
      { icon: <PersonSearchIcon />, value: stats.screenings ?? 0, label: t('clinic.healthDashboard.kpi.screeningsLabel'), accent: 'primary.main', hint: t('clinic.healthDashboard.kpi.screeningsHint') },
      { icon: <LocalHospitalIcon />, value: stats.certificates ?? 0, label: t('clinic.healthDashboard.kpi.certificatesLabel'), accent: 'info.main', hint: t('clinic.healthDashboard.kpi.certificatesHint') },
      { icon: <BiotechIcon />, value: stats.lab_samples ?? 0, label: t('clinic.healthDashboard.kpi.labSamplesLabel'), accent: 'success.main', hint: t('clinic.healthDashboard.kpi.labSamplesHint') },
      { icon: <WarningAmberIcon />, value: stats.vector_activities ?? 0, label: t('clinic.healthDashboard.kpi.vectorActivitiesLabel'), accent: 'error.main', hint: t('clinic.healthDashboard.kpi.vectorActivitiesHint') },
      { icon: <MonitorHeartIcon />, value: stats.diseases ?? 0, label: t('clinic.healthDashboard.kpi.diseasesLabel'), accent: 'warning.main', hint: t('clinic.healthDashboard.kpi.diseasesHint') },
      { icon: <TrendingUpIcon />, value: stats.entry_points ?? 0, label: t('clinic.healthDashboard.kpi.entryPointsLabel'), accent: 'secondary.main', hint: t('clinic.healthDashboard.kpi.entryPointsHint') },
    ];
  }, [stats, t]);

  const exportRows = stats ? statRows(stats, t) : [];

  return (
    <Box>
      <DashboardHero
        eyebrow="Health Command Center"
        title={t('clinic.healthDashboard.header.title')}
        subtitle={t('clinic.healthDashboard.header.subtitle')}
        gradient="emerald"
        avatarLabel="ل"
        action={
          <ExportButton
            filename="health-overview"
            headers={[t('clinic.healthDashboard.export.metric'), t('clinic.healthDashboard.export.value')]}
            rows={exportRows.map((r) => [r.label, String(r.value)])}
            disabled={loading || Boolean(error)}
          />
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          ...(stats && lastUpdated
            ? [
                <Box key="updated" component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  {t('clinic.healthDashboard.chips.lastUpdated', { at: formatDateTime(lastUpdated) })}
                </Box>,
              ]
            : []),
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={sections as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('clinic.shared.queueRail.label')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          {error ? (
            <ErrorState message={t('clinic.healthDashboard.errors.load')} onRetry={retry} />
          ) : loading && !stats ? (
            <Box component="section" data-section="overview" sx={{ scrollMarginTop: '80px', mb: 3 }}>
              <Grid container spacing={1.5}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Grid item xs={12} sm={6} md={2.4} key={i}>
                    <Card sx={{ height: 148, border: '1px solid', borderColor: 'divider' }} aria-hidden>
                      <CardContent />
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Typography color="text.secondary" sx={{ mt: 2 }}>{t('clinic.healthDashboard.loading')}</Typography>
            </Box>
          ) : !stats ? (
            <EmptyState
              icon={<MonitorHeartIcon />}
              title={t('clinic.healthDashboard.empty.title')}
              description={t('clinic.healthDashboard.empty.description')}
            />
          ) : (
            <>
              {/* KPI layer — قيم حقيقية من الإحصائيات */}
              <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px', mb: 3 }}>
                <Grid container spacing={1.5}>
                  {kpis.map((k) => (
                    <Grid item xs={12} sm={6} md={2.4} key={k.label}>
                      <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} hint={k.hint} />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* جدول المؤشرات — بيانات حقيقية */}
              <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                  <Box component="section" ref={register('cases')} data-section="cases" sx={{ scrollMarginTop: '80px' }}>
                    <DataTable<StatRow>
                      columns={[
                        { key: 'label', label: t('clinic.healthDashboard.table.metric'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.label}</Typography> },
                        { key: 'value', label: t('clinic.healthDashboard.table.value'), render: (r) => <StatusChip label={String(r.value)} tone="neutral" /> },
                      ]}
                      rows={filtered}
                      rowKey={(r) => r.key}
                      count={filtered.length}
                      page={page}
                      rowsPerPage={10}
                      onPageChange={setPage}
                      searchInput={search}
                      onSearchChange={setSearch}
                      searchPlaceholder={t('clinic.healthDashboard.table.searchPlaceholder')}
                      title={t('clinic.healthDashboard.table.title')}
                      subtitle={t('clinic.healthDashboard.table.subtitle', { count: filtered.length })}
                      emptyTitle={t('clinic.healthDashboard.table.emptyTitle')}
                      emptyDescription={t('clinic.healthDashboard.table.emptyDescription')}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} lg={4}>
                  <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px', position: { lg: 'sticky' }, top: 96 }}>
                    <NotificationPanel height={460} subtitle={t('clinic.healthDashboard.notifications.subtitle')} />
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default HealthDashboardPage;