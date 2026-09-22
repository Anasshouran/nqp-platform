import { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedIcon from '@mui/icons-material/Verified';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getExternalEntities, getIhrPheicReport, getIntegrationLogs, getIhrWeeklyReport, submitIhrReport } from '../../api/endpoints/integration';
import type { ExternalEntity, IhrEvent, IhrReport, IntegrationLog } from '../../types/integration';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const LogsTab = () => {
  const table = useServerTable<IntegrationLog>({ fetchData: getIntegrationLogs });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `integration-logs-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['التكامل', 'نوع الطلب', 'رمز الحالة', 'الوقت'],
    mapRow: (l) => [
      l.integration_name,
      l.request_type,
      String(l.status_code ?? ''),
      formatDateTime(l.request_timestamp),
    ],
    message: 'تم تصدير سجلات التكامل',
  });

  return (
    <DataTable<IntegrationLog>
      columns={[
        {
          key: 'integration_name',
          label: 'التكامل',
          sortable: true,
          render: (l) => <StatusChip label={l.integration_name} tone="primary" variant="outlined" />,
        },
        { key: 'request_type', label: 'نوع الطلب', sortable: true, render: (l) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{l.request_type}</Typography> },
        {
          key: 'status_code',
          label: 'رمز الحالة',
          render: (l) => {
            if (!l.status_code) return '—';
            const ok = l.status_code >= 200 && l.status_code < 300;
            return <StatusChip label={String(l.status_code)} tone={ok ? 'success' : 'error'} />;
          },
        },
        { key: 'request_timestamp', label: 'الوقت', sortable: true, render: (l) => formatDateTime(l.request_timestamp), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(l) => l.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="سجلات التكامل"
      subtitle={`${count} سجل`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث باسم التكامل أو نوع الطلب..."
      filters={[
        {
          key: 'integration_name',
          label: 'التكامل',
          options: Array.from(new Set(rows.map((r) => r.integration_name))).map((name) => ({ value: name, label: name })),
          value: '',
          onChange: (v) => setFilter('integration_name', v),
        },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle="لا توجد سجلات تكامل"
      emptyDescription="سجلات التبادل مع الأنظمة الخارجية تظهر هنا"
    />
  );
};

const EntitiesTab = () => {
  const table = useServerTable<ExternalEntity>({ fetchData: getExternalEntities });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  return (
    <DataTable<ExternalEntity>
      columns={[
        { key: 'name', label: 'الاسم', sortable: true, render: (e) => <Typography sx={{ fontWeight: 700 }}>{e.name}</Typography> },
        { key: 'api_key', label: 'مفتاح API', render: (e) => (e.api_key ? <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{e.api_key.slice(0, 8)}••••</Typography> : '—'), hideOnMobile: true },
        { key: 'is_active', label: 'الحالة', render: (e) => (e.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />) },
      ]}
      rows={rows}
      rowKey={(e) => e.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="الأنظمة الخارجية"
      subtitle={`${count} نظام`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالاسم..."
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد أنظمة خارجية"
      emptyDescription="الأنظمة المتصلة بالمنصة تظهر هنا"
    />
  );
};

const IhrTab = () => {
  const [reportType, setReportType] = useState<'PHEIC' | 'WEEKLY'>('PHEIC');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<IhrReport | null>(null);
  const [sparXml, setSparXml] = useState<string | null>(null);
  const [showXml, setShowXml] = useState(false);
  const [sealed, setSealed] = useState<{ report_id: string; receipt: string; submitted_at: string; channel: string } | null>(null);

  const load = async (runSeal = false) => {
    setBusy(true);
    try {
      if (runSeal) {
        const res = await submitIhrReport({ report_type: reportType === 'WEEKLY' ? 'WEEKLY' : 'PHEIC', output: 'xml' });
        const d = res.data?.data ?? res.data;
        setReport(d?.report ?? null);
        setSparXml(d?.spar_xml ?? null);
        setSealed({ report_id: d?.report_id, receipt: d?.receipt, submitted_at: d?.submitted_at, channel: d?.channel });
        notifySuccess('تم إقفال التقرير وإرساله للمركز الوطني');
      } else {
        const res = reportType === 'WEEKLY' ? await getIhrWeeklyReport() : await getIhrPheicReport('xml');
        const d = res.data?.data ?? res.data;
        setReport(d?.report ?? null);
        setSparXml(d?.spar_xml ?? null);
        setSealed(null);
      }
    } catch {
      notifyError('تعذّر إنشاء التقرير');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (!sparXml) return;
    void navigator.clipboard.writeText(sparXml).then(() => notifySuccess('تم نسخ XML'));
  };

  const handleDownload = () => {
    if (!sparXml || !report) return;
    const ext = report.report_type === 'WEEKLY' ? 'weekly' : 'pheic';
    const blob = new Blob([sparXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IHR-${ext}-${report.report_date}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = report ? [
    { label: 'الدولة', value: report.country === 'SDN' ? 'السودان' : report.country },
    { label: 'رقم التقرير', value: report.report_id, mono: true },
    { label: 'عدد الأحداث', value: String(report.events?.length ?? 0) },
    { label: 'المؤكدة', value: String(report.summary?.confirmed ?? report.summary?.confirmed_cases ?? 0) },
    { label: 'المشتبه بها', value: String(report.summary?.suspected ?? report.summary?.probable_cases ?? 0) },
  ] : [];

  const eventRows = report?.events ?? [];

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        إعداد تقارير اللوائح الصحية الدولية (IHR) وإرسالها للمركز الوطني — تُولد تلقائياً من بيانات الترصد والطوارئ.
      </Alert>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={reportType}
          onChange={(_, v) => v && setReportType(v)}
        >
          <ToggleButton value="PHEIC">تقرير طارئ (PHEIC)</ToggleButton>
          <ToggleButton value="WEEKLY">التقرير الأسبوعي</ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AssignmentIcon />}
            disabled={busy}
            onClick={() => void load(false)}
          >
            {busy ? 'جارٍ التوليد…' : 'توليد التقرير'}
          </Button>
          {report && (
            <Button
              variant={sealed ? 'outlined' : 'contained'}
              color={sealed ? 'success' : 'primary'}
              startIcon={sealed ? <VerifiedIcon /> : <RefreshIcon />}
              onClick={() => void load(true)}
            >
              {sealed ? 'إقفال وإرسال مجدداً' : 'إقفال وإرسال (SEAL)'}
            </Button>
          )}
        </Stack>
      </Stack>

      {sealed && (
        <Alert severity="success" sx={{ borderRadius: 2 }} icon={<VerifiedIcon />}>
          أُقفل التقرير وأُرسل — {sealed.receipt} · {formatDateTime(sealed.submitted_at)} عبر {sealed.channel}
        </Alert>
      )}

      {report && (
        <>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {summaryCards.map((c) => (
              <Card key={c.label} sx={{ minWidth: 120, flex: '1 1 150px' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">{c.label}</Typography>
                  <Typography sx={{ fontWeight: 700, fontFamily: c.mono ? 'monospace' : 'inherit', fontSize: 14 }}>
                    {c.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: -1 }}>
            <Chip size="small" variant="outlined" label={`تاريخ التقرير: ${report.report_date}`} />
            {report.period && (
              <Chip size="small" variant="outlined" label={`الفترة: ${report.period.start} ← ${report.period.end}`} />
            )}
            {sparXml && (
              <>
                <Tooltip title={showXml ? 'إخفاء XML' : 'عرض XML'}>
                  <IconButton size="small" onClick={() => setShowXml((s) => !s)}>
                    <CodeIcon fontSize="small" color={showXml ? 'primary' : 'inherit'} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="نسخ XML">
                  <IconButton size="small" onClick={handleCopy}><ContentCopyIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="تحميل XML">
                  <IconButton size="small" onClick={handleDownload}><DownloadIcon fontSize="small" /></IconButton>
                </Tooltip>
              </>
            )}
          </Stack>

          {showXml && sparXml && (
            <Box
              component="pre"
              dir="ltr"
              sx={{
                bgcolor: 'grey.900', color: 'grey.100', p: 2, borderRadius: 2,
                fontSize: 12, maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap',
              }}
            >
              {sparXml}
            </Box>
          )}

          <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المرض (ICD-11)</TableCell>
                  <TableCell>المنفذ</TableCell>
                  <TableCell align="center">مؤكدة</TableCell>
                  <TableCell align="center">محتملة</TableCell>
                  <TableCell align="center">مشتبه بها</TableCell>
                  <TableCell>الإجراءات / المصدر</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      لا توجد أحداث في هذا التقرير
                    </TableCell>
                  </TableRow>
                )}
                {eventRows.map((ev: IhrEvent, i) => (
                  <TableRow key={ev.case_id ?? i} hover>
                    <TableCell>
                      {ev.disease ? (
                        <>
                          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{ev.disease.name_ar || ev.disease.name_en}</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{ev.disease.icd_11_code}</Typography>
                        </>
                      ) : (
                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{ev.description || '—'}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{ev.location?.port_code ? <Chip size="small" label={ev.location.port_code} variant="outlined" /> : '—'}</TableCell>
                    <TableCell align="center">{ev.cases?.confirmed ?? 0}</TableCell>
                    <TableCell align="center">{ev.cases?.probable ?? 0}</TableCell>
                    <TableCell align="center">{ev.cases?.suspected ?? 0}</TableCell>
                    <TableCell>
                      {ev.actions_taken?.length ? (
                        <Box>
                          {ev.actions_taken.map((a) => (
                            <StatusChip key={a} label={a} tone="neutral" variant="outlined" size="small" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">{ev.source ?? ''}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Stack>
  );
};

const IntegrationPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <PageHeader
        title="التكاملات الخارجية"
        subtitle="مراقبة التبادل مع الأنظمة الخارجية (وزارة الصحة، الجمارك، منظمة الصحة...)"
        eyebrow="العمليات"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { borderRadius: 2 } }}>
        <Tab label="سجلات التكامل" />
        <Tab label="الأنظمة الخارجية" />
        <Tab label="تقارير IHR" />
      </Tabs>
      {tab === 0 ? <LogsTab /> : tab === 1 ? <EntitiesTab /> : <IhrTab />}
    </Box>
  );
};

export default IntegrationPage;
