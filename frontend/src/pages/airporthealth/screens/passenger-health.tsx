import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import SearchIcon from '@mui/icons-material/Search';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GppGoodIcon from '@mui/icons-material/GppGood';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BiotechIcon from '@mui/icons-material/Biotech';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useState, useEffect } from 'react';
import { C, KpiCard, PageTitle, SurfaceCard, ProgressBar } from '../shared';
import { getAirportScreenings } from '../../../api/endpoints/airport';
import { getHealthDeclarations } from '../../../api/endpoints/carriers';
import { getRiskAssessments } from '../../../api/endpoints/risk';
import { getRecords } from '../../../api/endpoints/vaccination';
import type { AirportScreening } from '../../../types/airport';
import type { CarrierHealthDeclaration } from '../../../types/carrier';
import type { RiskAssessment as TravelerRiskAssessment } from '../../../types/risk';
import type { VaccinationRecord } from '../../../types/vaccination';
import { DataTable, EmptyState, StatusChip, type StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { useTableExport } from '../../../hooks/useTableExport';
import { formatDate, formatDateTime } from '../../../utils/formatters';

/* ============================ تسميات الحالات ============================ */

const SCREENING_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'قيد الانتظار', tone: 'warning' },
  CLEARED: { label: 'مؤهل', tone: 'success' },
  QUARANTINED: { label: 'محجور', tone: 'error' },
  REFERRED: { label: 'مُحال', tone: 'info' },
};

const RISK_LEVEL: Record<string, { label: string; tone: StatusTone }> = {
  GREEN: { label: 'أخضر', tone: 'success' },
  YELLOW: { label: 'أصفر', tone: 'warning' },
  RED: { label: 'أحمر', tone: 'error' },
};

const DECLARATION_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  SUBMITTED: { label: 'مُقدَّم', tone: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', tone: 'warning' },
  APPROVED: { label: 'مُعتمد', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};

const VACCINATION_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  GIVEN: { label: 'مُعطى', tone: 'success' },
  CANCELLED: { label: 'ملغى', tone: 'neutral' },
};

const DOSE_TYPE: Record<string, string> = {
  FIRST: 'جرعة أولى',
  SECOND: 'جرعة ثانية',
  THIRD: 'جرعة ثالثة',
  BOOSTER: 'جرعة معزّزة',
};

/* =========================== 4. فحص المسافرين =========================== */

export const Screening = () => {
  const [screenings, setScreenings] = useState<AirportScreening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getAirportScreenings()
      .then((res) => {
        if (mounted) {
          const data = res.data.data as { results?: AirportScreening[] } | AirportScreening[];
          setScreenings(Array.isArray(data) ? data : data.results ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) { setError(true); setLoading(false); }
      });
    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <Box>
        <PageTitle title="فحص المسافرين" subtitle="مكتب بوابة الفحص الصحي الأساسي والثانوي — نقطة الوصول للمسافرين" />
        <EmptyState title="تعذر التحميل" description="لم يتمكن النظام من جلب بيانات الفحص. يُرجى المحاولة لاحقًا." />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle title="فحص المسافرين" subtitle="مكتب بوابة الفحص الصحي الأساسي والثانوي — نقطة الوصول للمسافرين" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading ? (
          <Grid item xs={12}>
            <EmptyState title="قيد الإعداد" description="يتم تحميل بيانات فحص المسافرين من النظام." />
          </Grid>
        ) : (
          <>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<SearchIcon />} value={String(screenings.length)} label="مفحوصون اليوم" trend="flat" trendLabel="مباشر" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<FactCheckIcon />} value={String(screenings.filter((s) => s.status === 'CLEARED').length)} label="فحص أساسي" trend="flat" trendLabel="مباشر" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<BiotechIcon />} value={String(screenings.filter((s) => s.status === 'REFERRED').length)} label="فحص ثانوي" trend="flat" trendLabel="مباشر" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<EditNoteIcon />} value={String(screenings.filter((s) => s.risk_level === 'RED').length)} label="تقييم طبي" trend="flat" trendLabel="مباشر" />
            </Grid>
          </>
        )}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SurfaceCard
            title="طابور بوابة الفحص"
            subtitle="أحدث المسافرين المعالجين في النقاط — انقر لفتح ملف المسافر"
            action={<TextField size="small" placeholder="مسح جواز السفر / بحث بالاسم" sx={{ width: 240 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />}
          >
            <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المسافر</TableCell>
                    <TableCell>الرحلة</TableCell>
                    <TableCell align="center">درجة الحرارة</TableCell>
                    <TableCell align="center">الأعراض</TableCell>
                    <TableCell align="center">المستوى</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading || screenings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 3 }}>لا توجد فحوصات مسجّلة</TableCell>
                    </TableRow>
                  ) : (
                    screenings.map((s) => (
                      <TableRow key={s.id} hover sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{s.traveler_name || s.traveler}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.screened_by_name || ''}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{s.flight_number || s.flight || '—'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: (s.body_temperature ?? 0) >= 37.5 ? C.danger : C.text }}>{s.body_temperature ?? '—'}°</TableCell>
                        <TableCell align="center">{s.symptoms?.length ? s.symptoms.join('، ') : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                        <TableCell align="center">
                          {(() => { const m = RISK_LEVEL[s.risk_level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.risk_level; })()}
                        </TableCell>
                        <TableCell align="center">
                          {(() => { const m = SCREENING_STATUS[s.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.status; })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SurfaceCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <SurfaceCard title="نقطة الفحص الحرارية — مباشر" subtitle="كاشف الحرارة عن بعد للمسافرين">
              <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', height: 200, background: `linear-gradient(180deg,${C.primary},${C.medicalBlue})`, display: 'grid', placeItems: 'center' }}>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>لوحة الكاميرا الحرارية</Typography>
                <Chip label="مباشر — LIVE" size="small" sx={{ position: 'absolute', top: 10, right: 10, bgcolor: C.dangerBg, color: C.danger, fontWeight: 700, '& > span:first-of-type': { animation: 'pulse 1.4s infinite' } }} />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>قراءة مدخل البوابة (متوسط)</Typography>
                <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: C.success }}>36.7°</Typography>
                  <ProgressBar value={42} color={C.success} />
                </Box>
              </Box>
            </SurfaceCard>

            <SurfaceCard title="إجراءات سريعة">
              <Stack spacing={1.25}>
                <Button fullWidth variant="contained" startIcon={<PersonAddIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>تسجيل مسافر جديد</Button>
                <Button fullWidth variant="outlined" startIcon={<ImageSearchIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>تحويل إلى فحص ثانوي</Button>
                <Button fullWidth variant="outlined" startIcon={<GppGoodIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>اصدار قرار الإفراج</Button>
              </Stack>
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

/* =========================== 5. الإعلان الصحي =========================== */

export const Declaration = () => {
  const table = useServerTable<CarrierHealthDeclaration>({ fetchData: getHealthDeclarations });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-health-declarations-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['الرحلة', 'الناقل', 'تاريخ الإقرار', 'الركاب', 'الطاقم', 'حالات ممرضة', 'الحالة'],
    mapRow: (r: CarrierHealthDeclaration) => [
      r.flight_number || '',
      r.carrier_name || '',
      r.declaration_date || '',
      String(r.passenger_count),
      String(r.crew_count),
      String(r.ill_passenger_count),
      DECLARATION_STATUS[r.status]?.label || r.status_label || r.status,
    ],
    message: 'تم تصدير الإقرارات الصحية',
  });

  return (
    <Box>
      <PageTitle title="الإعلان الصحي للمسافرين" subtitle="إقرارات الحالة الصحية المقدَّمة من الناقلات لكل رحلة" />
      <DataTable<CarrierHealthDeclaration>
        columns={[
          { key: 'flight_number', label: 'الرحلة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.flight_number || '—'}</Typography> },
          { key: 'carrier_name', label: 'الناقل', render: (r) => r.carrier_name || '—', hideOnMobile: true },
          { key: 'declaration_date', label: 'تاريخ الإقرار', render: (r) => (r.declaration_date ? formatDate(r.declaration_date) : '—'), hideOnMobile: true },
          { key: 'passenger_count', label: 'الركاب', render: (r) => String(r.passenger_count), align: 'center', hideOnMobile: true },
          { key: 'crew_count', label: 'الطاقم', render: (r) => String(r.crew_count), align: 'center', hideOnMobile: true },
          { key: 'ill_passenger_count', label: 'حالات ممرضة', render: (r) => (r.ill_passenger_count > 0 ? <StatusChip label={String(r.ill_passenger_count)} tone="error" /> : '0'), align: 'center' },
          { key: 'status', label: 'الحالة', render: (r) => { const m = DECLARATION_STATUS[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : (r.status_label || r.status); } },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="الإقرارات الصحية للرحلات" subtitle={`${table.count} إقرار مسجّل`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث برقم الرحلة أو الناقل"
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(DECLARATION_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('status', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد إقرارات صحية" emptyDescription="لم تُقدَّم إقرارات صحية من الناقلات مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ========================== 6. تقييم المخاطر ========================== */

export const RiskAssessment = () => {
  const table = useServerTable<TravelerRiskAssessment>({ fetchData: getRiskAssessments });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-risk-assessments-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['المسافر', 'رقم الجواز', 'المنفذ', 'مستوى الخطر', 'الدرجة', 'التوصية', 'وقت التقييم'],
    mapRow: (r: TravelerRiskAssessment) => [
      r.traveler_name || '',
      r.passport_number || '',
      r.port_name || '',
      RISK_LEVEL[r.risk_level]?.label || r.risk_level,
      String(r.risk_score),
      r.recommendation || '',
      r.assessed_at ? formatDateTime(r.assessed_at) : '',
    ],
    message: 'تم تصدير تقييمات المخاطر',
  });

  return (
    <Box>
      <PageTitle title="تقييم مخاطر المسافر" subtitle="تقييمات المخاطر المحسوبة من محرك تقييم المسافرين" />
      <DataTable<TravelerRiskAssessment>
        columns={[
          { key: 'traveler_name', label: 'المسافر', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.traveler_name || '—'}</Typography> },
          { key: 'passport_number', label: 'رقم الجواز', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.passport_number || '—'}</Typography>, hideOnMobile: true },
          { key: 'port_name', label: 'المنفذ', render: (r) => r.port_name || '—', hideOnMobile: true },
          { key: 'risk_level', label: 'مستوى الخطر', render: (r) => { const m = RISK_LEVEL[r.risk_level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.risk_level; } },
          { key: 'risk_score', label: 'الدرجة', render: (r) => String(r.risk_score), align: 'center', hideOnMobile: true },
          { key: 'recommendation', label: 'التوصية', render: (r) => r.recommendation || '—', noWrap: false },
          { key: 'assessed_at', label: 'وقت التقييم', render: (r) => (r.assessed_at ? formatDateTime(r.assessed_at) : '—'), hideOnMobile: true },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="تقييمات مخاطر المسافرين" subtitle={`${table.count} تقييم مسجّل`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بالاسم أو رقم الجواز"
        filters={[{ key: 'risk_level', label: 'مستوى الخطر', options: Object.entries(RISK_LEVEL).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('risk_level', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد تقييمات" emptyDescription="لم تُسجَّل تقييمات مخاطر مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ============================= 7. التطعيم ============================= */

export const Vaccination = () => {
  const table = useServerTable<VaccinationRecord>({ fetchData: getRecords });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-vaccinations-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['المسافر', 'رقم الجواز', 'اللقاح', 'الجرعة', 'التاريخ', 'الموقع', 'الحالة'],
    mapRow: (r: VaccinationRecord) => [
      r.traveler?.full_name || '',
      r.traveler?.passport_number || '',
      r.vaccine_name_ar || r.vaccine_code || '',
      r.dose_type_label || DOSE_TYPE[r.dose_type] || r.dose_type,
      r.administered_at ? formatDateTime(r.administered_at) : '',
      r.site_name || '',
      VACCINATION_STATUS[r.status]?.label || r.status,
    ],
    message: 'تم تصدير سجلات التطعيم',
  });

  return (
    <Box>
      <PageTitle title="التطعيم والتحقق من الشهادات" subtitle="التحقق من التطعيم الإلزامي (الحمى الصفراء وغيرها) للمسافرين القادمين" />
      <DataTable<VaccinationRecord>
        columns={[
          { key: 'traveler', label: 'المسافر', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.traveler?.full_name || '—'}</Typography> },
          { key: 'passport_number', label: 'رقم الجواز', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.traveler?.passport_number || '—'}</Typography>, hideOnMobile: true },
          { key: 'vaccine_name_ar', label: 'اللقاح', render: (r) => r.vaccine_name_ar || r.vaccine_code || '—' },
          { key: 'dose_type', label: 'الجرعة', render: (r) => r.dose_type_label || DOSE_TYPE[r.dose_type] || r.dose_type, hideOnMobile: true },
          { key: 'administered_at', label: 'التاريخ', render: (r) => (r.administered_at ? formatDateTime(r.administered_at) : '—'), hideOnMobile: true },
          { key: 'site_name', label: 'الموقع', render: (r) => r.site_name || '—', hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = VACCINATION_STATUS[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="سجلات التطعيم" subtitle={`${table.count} سجل مسجّل`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بالاسم أو رقم الجواز"
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(VACCINATION_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('status', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد سجلات تطعيم" emptyDescription="لم تُسجَّل عمليات تطعيم مطابقة لهذه المعايير."
      />
    </Box>
  );
};
