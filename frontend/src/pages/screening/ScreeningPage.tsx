import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AddIcon from '@mui/icons-material/Add';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RiskIcon from '@mui/icons-material/Insights';
import Alert from '@mui/material/Alert';
import { PageHeader } from '../../components/common';
import { AppButton, DataTable, StatusChip, ConfirmDialog } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { getScreenings, getLatestRisk, referScreening } from '../../api/endpoints/screening';
import type { ScreeningRiskAssessment } from '../../api/endpoints/screening';
import type { HealthScreening } from '../../types/screening';
import { formatDateTime, formatTemperature } from '../../utils/formatters';
import { exportToCsv } from '../../utils/csv';
import { notifySuccess, notifyError } from '../../utils/toast';
import { riskLevel, riskRecommendation } from '../../utils/status/screening';
import { labelOf, toneOf } from '../../utils/labels';
import ScreeningForm from '../../components/forms/ScreeningForm';

const ScreeningPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const table = useServerTable<HealthScreening>({ fetchData: getScreenings });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, fetchAllRows } = table;
  const [exporting, setExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [referTarget, setReferTarget] = useState<HealthScreening | null>(null);
  const [referring, setReferring] = useState(false);
  const [riskTarget, setRiskTarget] = useState<HealthScreening | null>(null);
  const [assessment, setAssessment] = useState<ScreeningRiskAssessment | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const searchFilter = searchParams.get('search');
  useEffect(() => {
    if (searchFilter) {
      setSearchInput(searchFilter);
    }
  }, [searchFilter, setSearchInput]);

  const goToTraveler = (passportNumber: string) =>
    navigate(`/app/travelers?search=${encodeURIComponent(passportNumber)}`);

  const temperatureTone = (temp: number | null) => {
    if (temp == null) return 'neutral' as const;
    if (temp >= 38) return 'error' as const;
    if (temp >= 37.5) return 'warning' as const;
    return 'success' as const;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await fetchAllRows();
      const headers = ['المسافر', 'جواز السفر', 'الحرارة', 'التشبع بالأكسجين', 'الضغط (sys/dia)', 'ملاحظات', 'وقت الفحص'];
      const data = all.map((s) => [
        s.traveler_name,
        s.passport_number,
        s.body_temperature != null ? s.body_temperature.toFixed(1) : '',
        s.oxygen_saturation != null ? `${s.oxygen_saturation}%` : '',
        [s.systolic_bp, s.diastolic_bp].filter((v) => v != null).join('/'),
        s.officer_notes,
        formatDateTime(s.screened_at),
      ]);
      exportToCsv(`screening-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
      notifySuccess(`تم تصدير ${all.length} فحص`);
    } catch {
      notifyError('تعذر تصدير الفحوصات');
    } finally {
      setExporting(false);
    }
  };

  const openRisk = async (s: HealthScreening) => {
    setRiskTarget(s);
    setAssessment(null);
    setRiskLoading(true);
    try {
      const res = await getLatestRisk(s.id);
      setAssessment(res.data.data);
    } catch {
      notifyError('لا يوجد تقييم مخاطر لهذا الفحص بعد');
    } finally {
      setRiskLoading(false);
    }
  };

  const confirmRefer = async () => {
    if (!referTarget || referring) return;
    setReferring(true);
    try {
      await referScreening(referTarget.id);
      notifySuccess('تم تحويل المسافر إلى العيادة');
      setReferTarget(null);
    } catch {
      notifyError('تعذر إجراء التحويل — تأكد من ربط منفذ بعيادة');
    } finally {
      setReferring(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="الفحوصات الصحية"
        subtitle="تسجيل ومراجعة الفحوصات الصحية عند منافذ الدخول وقرارات الإحالة"
        eyebrow="العمليات"
        action={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            فحص جديد
          </AppButton>
        }
      />

      <DataTable<HealthScreening>
        columns={[
          {
            key: 'traveler_name',
            label: 'المسافر',
            render: (s) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.light', color: 'info.main', fontWeight: 700, fontSize: 14 }}>
                  {s.traveler_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {s.traveler_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" dir="ltr">
                    {s.passport_number}
                  </Typography>
                </Box>
              </Box>
            ),
          },
          {
            key: 'body_temperature',
            label: 'الحرارة',
            render: (s) => <StatusChip label={formatTemperature(s.body_temperature)} tone={temperatureTone(s.body_temperature)} />,
          },
          {
            key: 'oxygen_saturation',
            label: 'التشبع O2',
            render: (s) =>
              s.oxygen_saturation != null ? (
                <StatusChip
                  label={`${s.oxygen_saturation}%`}
                  tone={s.oxygen_saturation < 92 ? 'error' : s.oxygen_saturation < 95 ? 'warning' : 'success'}
                />
              ) : (
                '—'
              ),
            hideOnMobile: true,
          },
          {
            key: 'blood_pressure',
            label: 'الضغط',
            render: (s) => (s.systolic_bp && s.diastolic_bp ? `${s.systolic_bp}/${s.diastolic_bp}` : '—'),
            hideOnMobile: true,
          },
          { key: 'officer_notes', label: 'ملاحظات', render: (s) => s.officer_notes || '—', hideOnMobile: true },
          {
            key: 'screened_at',
            label: 'وقت الفحص',
            sortable: true,
            render: (s) => formatDateTime(s.screened_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(s) => s.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="سجل الفحوصات"
        subtitle={`${count} فحص`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث باسم المسافر أو رقم الجواز..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد فحوصات"
        emptyDescription="الفحوصات الصحية تظهر هنا عند تسجيلها من شاشة الفحص"
      actions={(s) => (
            <>
              <Tooltip title="تقييم المخاطر">
                <AppButton
                  variant="ghost"
                  size="small"
                  startIcon={<RiskIcon />}
                  onClick={() => openRisk(s)}
                >
                  المخاطر
                </AppButton>
              </Tooltip>
              <Tooltip title="تحويل إلى العيادة">
                <AppButton
                  variant="ghost"
                  size="small"
                  startIcon={<LocalHospitalIcon />}
                  onClick={() => setReferTarget(s)}
                >
                  إحالة
                </AppButton>
              </Tooltip>
              <Tooltip title="عرض ملف المسافر">
                <AppButton
                  variant="ghost"
                  size="small"
                  startIcon={<PersonSearchIcon />}
                  onClick={() => goToTraveler(s.passport_number)}
                >
                  المسافر
                </AppButton>
              </Tooltip>
            </>
          )}
        />

      <ScreeningForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setTimeout(refresh, 200);
        }}
      />

      <ConfirmDialog
        open={Boolean(referTarget)}
        title="تحويل إلى العيادة"
        message={
          referTarget
            ? `تأكيد تحويل ${referTarget.traveler_name} إلى العيادة المرتبطة بالمنفذ؟`
            : ''
        }
        confirmLabel="تحويل"
        loading={referring}
        tone="info"
        onConfirm={confirmRefer}
        onClose={() => setReferTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(riskTarget)}
        title="تقييم المخاطر"
        message="نتيجة تقييم المخاطر التلقائية لهذا الفحص من نظام تقييم المخاطر."
        confirmLabel="حسناً"
        cancelLabel="إغلاق"
        tone="info"
        onConfirm={() => setRiskTarget(null)}
        onClose={() => setRiskTarget(null)}
      >
        {riskLoading ? (
          <Typography color="text.secondary">جارٍ التحميل…</Typography>
        ) : assessment ? (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <StatusChip label={labelOf(riskLevel, assessment.risk_level)} tone={toneOf(riskLevel, assessment.risk_level)} />
              <StatusChip label={labelOf(riskRecommendation, assessment.recommendation)} tone={toneOf(riskRecommendation, assessment.recommendation)} />
            </Stack>
            <Typography variant="body2">درجة الخطر: {assessment.risk_score}</Typography>
            <Typography variant="body2" color="text.secondary">
              التقييم: {formatDateTime(assessment.assessed_at)}
            </Typography>
          </Box>
        ) : (
          <Alert severity="info">لا يوجد تقييم مخاطر لهذا الفحص بعد.</Alert>
        )}
      </ConfirmDialog>
    </Box>
  );
};

export default ScreeningPage;
