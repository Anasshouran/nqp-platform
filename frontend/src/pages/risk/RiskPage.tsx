import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { PageHeader } from '../../components/common';
import { AppButton, DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getRiskAssessments, getRiskSettings, updateRiskSettings } from '../../api/endpoints/risk';
import type { RiskAssessment, RiskSettings } from '../../types/risk';
import { riskLevel, riskRecommendation } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const riskLevelOptions = Object.entries(riskLevel).map(([v, m]) => ({ value: v, label: m.label }));

const AssessmentsTab = () => {
  const table = useServerTable<RiskAssessment>({ fetchData: getRiskAssessments });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `risk-assessments-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['المسافر', 'جواز السفر', 'المنفذ', 'مستوى الخطر', 'الدرجة', 'التوصية', 'وقت التقييم'],
    mapRow: (r) => [
      r.traveler_name || '',
      r.passport_number || '',
      r.port_name || '',
      riskLevel[r.risk_level]?.label || r.risk_level,
      String(r.risk_score),
      riskRecommendation[r.recommendation]?.label || r.recommendation,
      formatDateTime(r.assessed_at),
    ],
    message: 'تم تصدير تقييمات المخاطر',
  });

  return (
    <DataTable<RiskAssessment>
      columns={[
        {
          key: 'traveler_name',
          label: 'المسافر',
          render: (r) => (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.traveler_name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {r.passport_number}
              </Typography>
            </Box>
          ),
        },
        { key: 'port_name', label: 'المنفذ', render: (r) => r.port_name || '—', hideOnMobile: true },
        {
          key: 'risk_level',
          label: 'مستوى الخطر',
          sortable: true,
          render: (r) => {
            const m = riskLevel[r.risk_level];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={r.risk_level} tone="neutral" />;
          },
        },
        {
          key: 'risk_score',
          label: 'الدرجة',
          sortable: true,
          render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.risk_score.toFixed?.(1) ?? r.risk_score}</Typography>,
          hideOnMobile: true,
        },
        {
          key: 'recommendation',
          label: 'التوصية',
          render: (r) => {
            const m = riskRecommendation[r.recommendation];
            return m ? <StatusChip label={m.label} tone={m.tone} variant="outlined" /> : r.recommendation;
          },
        },
        { key: 'assessed_at', label: 'وقت التقييم', sortable: true, render: (r) => formatDateTime(r.assessed_at), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="تقييمات المخاطر"
      subtitle={`${count} تقييم`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بجواز السفر أو الاسم..."
      filters={[
        { key: 'risk_level', label: 'مستوى الخطر', options: riskLevelOptions, value: '', onChange: (v) => setFilter('risk_level', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle="لا توجد تقييمات"
      emptyDescription="تقييمات المخاطر الناتجة عن الفحوصات تظهر هنا"
    />
  );
};

const SETTINGS_FIELDS: { key: keyof RiskSettings; label: string; hint?: string }[] = [
  { key: 'temp_weight', label: 'وزن درجة الحرارة' },
  { key: 'spo2_weight', label: 'وزن الأكسجين' },
  { key: 'symptom_weight', label: 'وزن الأعراض' },
  { key: 'origin_weight', label: 'وزن المنشأ' },
  { key: 'vaccine_weight', label: 'وزن التطعيم' },
  { key: 'yellow_threshold', label: 'حد التصنيف الأصفر' },
  { key: 'red_threshold', label: 'حد التصنيف الأحمر' },
  { key: 'red_temp_threshold', label: 'حد الحرارة الأحمر', hint: 'درجة مئوية' },
  { key: 'red_spo2_threshold', label: 'حد الأكسجين الأحمر', hint: 'نسبة مئوية' },
];

const SettingsTab = () => {
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRiskSettings()
      .then((response) => setSettings(response.data.data))
      .catch(() => setError('تعذر تحميل إعدادات المخاطر'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof RiskSettings, value: string) => {
    const num = Number(value);
    if (Number.isNaN(num) || !settings) return;
    setSettings({ ...settings, [key]: num });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await updateRiskSettings(settings);
      notifySuccess('تم حفظ إعدادات المخاطر');
    } catch {
      setError('تعذر حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ borderRadius: 4, p: 3, boxShadow: '0 2px 14px rgba(23,37,34,0.07)', maxWidth: 640 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        إعدادات تقييم المخاطر
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        تحكم في أوزان عوامل الخطر وعتبات التصنيف
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mt: 2 }}>
        {SETTINGS_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            helperText={field.hint}
            type="number"
            value={settings?.[field.key] ?? ''}
            onChange={(e) => update(field.key, e.target.value)}
          />
        ))}
      </Box>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton onClick={handleSave} loading={saving}>
          حفظ الإعدادات
        </AppButton>
      </Box>
    </Paper>
  );
};

const RiskPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <PageHeader
        title="تقييم المخاطر"
        subtitle="مراجعة تقييمات المخاطر وإعدادات التقييم"
        eyebrow="العمليات"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { borderRadius: 2 } }}>
        <Tab label="تقييمات المخاطر" />
        <Tab label="الإعدادات" />
      </Tabs>
      {tab === 0 ? <AssessmentsTab /> : <SettingsTab />}
    </Box>
  );
};

export default RiskPage;
