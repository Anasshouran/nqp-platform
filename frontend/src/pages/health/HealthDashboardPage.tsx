import { useMemo, useState } from 'react';
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

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'cases', label: 'المؤشرات', icon: <PersonSearchIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
] as const;

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
}): StatRow[] => [
  { key: 'screenings', label: 'الفحوصات الصحية', value: s.screenings ?? 0 },
  { key: 'certificates', label: 'الشهادات الصحية', value: s.certificates ?? 0 },
  { key: 'lab_samples', label: 'العينات المخبرية', value: s.lab_samples ?? 0 },
  { key: 'diseases', label: 'الأمراض المُدرجة', value: s.diseases ?? 0 },
  { key: 'entry_points', label: 'نقاط الدخول', value: s.entry_points ?? 0 },
  { key: 'vector_activities', label: 'أنشطة مكافحة النواقل', value: s.vector_activities ?? 0 },
  { key: 'notices', label: 'التنبيهات المنشورة', value: s.notices ?? 0 },
];

const HealthDashboardPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[]);

  const { data: stats, loading, error, retry } = useApi(async () => (await getPublicStatistics()).data.data);

  // وقت آخر تحديث حقيقي — يُستمد من اكتمال الجلب الفعلي.
  const lastUpdated = stats ? new Date() : null;
  const rows = useMemo(() => (stats ? statRows(stats) : []), [stats]);

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
      { icon: <PersonSearchIcon />, value: stats.screenings ?? 0, label: 'الفحوصات الصحية', accent: 'primary.main', hint: 'إجمالي مُسجَّل' },
      { icon: <LocalHospitalIcon />, value: stats.certificates ?? 0, label: 'الشهادات الصحية', accent: 'info.main', hint: 'منشورة' },
      { icon: <BiotechIcon />, value: stats.lab_samples ?? 0, label: 'العينات المخبرية', accent: 'success.main', hint: 'مُدرجة' },
      { icon: <WarningAmberIcon />, value: stats.vector_activities ?? 0, label: 'أنشطة مكافحة النواقل', accent: 'error.main', hint: 'مُسجّلة' },
      { icon: <MonitorHeartIcon />, value: stats.diseases ?? 0, label: 'أمراض مُدرجة للترصد', accent: 'warning.main', hint: 'نشطة' },
      { icon: <TrendingUpIcon />, value: stats.entry_points ?? 0, label: 'نقاط الدخول النشطة', accent: 'secondary.main', hint: 'منافذ' },
    ];
  }, [stats]);

  const exportRows = stats ? statRows(stats) : [];

  return (
    <Box>
      <DashboardHero
        eyebrow="Health Command Center"
        title="لوحة الرعاية الصحية"
        subtitle="مؤشرات المراقبة الوبائية والفحوصات والعينات وتسجيل الأوبئة — بيانات حقيقية من النظام"
        gradient="emerald"
        avatarLabel="ل"
        action={
          <ExportButton
            filename="health-overview"
            headers={['المؤشر', 'القيمة']}
            rows={exportRows.map((r) => [r.label, String(r.value)])}
            disabled={loading || Boolean(error)}
          />
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          ...(stats && lastUpdated
            ? [
                <Box key="updated" component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  آخر تحديث: {formatDateTime(lastUpdated)}
                </Box>,
              ]
            : []),
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          {error ? (
            <ErrorState message="تعذّر تحميل الإحصائيات الصحية" onRetry={retry} />
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
              <Typography color="text.secondary" sx={{ mt: 2 }}>جارٍ تحميل المؤشرات الصحية…</Typography>
            </Box>
          ) : !stats ? (
            <EmptyState
              icon={<MonitorHeartIcon />}
              title="لا توجد مؤشرات بعد"
              description="تظهر المؤشرات الصحية هنا عند توافر بيانات من المنصة."
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
                        { key: 'label', label: 'المؤشر', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.label}</Typography> },
                        { key: 'value', label: 'القيمة', render: (r) => <StatusChip label={String(r.value)} tone="neutral" /> },
                      ]}
                      rows={filtered}
                      rowKey={(r) => r.key}
                      count={filtered.length}
                      page={page}
                      rowsPerPage={10}
                      onPageChange={setPage}
                      searchInput={search}
                      onSearchChange={setSearch}
                      searchPlaceholder="بحث في المؤشرات..."
                      title="المؤشرات الصحية"
                      subtitle={`${filtered.length} مؤشر`}
                      emptyTitle="لا توجد مؤشرات"
                      emptyDescription="لم يتم العثور على مؤشرات تطابق البحث"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} lg={4}>
                  <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px', position: { lg: 'sticky' }, top: 96 }}>
                    <NotificationPanel height={460} subtitle="تنبيهات المراقبة والإرسال" />
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