import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { DataTable, PageHeader, SectionCard, type DataTableColumn } from '../../components/uikit';
import {
  getSurveillanceByState,
  type ByStateReport,
} from '../../api/endpoints/surveillance';

/** صف موحَّد: صف ولاية مطابقة أو صف «غير معيَّن» — كلاهما مرئي في نفس الجدول. */
interface ReportRow {
  key: string;
  label: string;
  count: number;
  unassigned: boolean;
}

const ReportsByStatePage = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState<ByStateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { date_from?: string; date_to?: string } = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const response = await getSurveillanceByState(params);
      setReport(response.data.data);
    } catch {
      setError(t('surveillance.reports.byState.loadError'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, t]);

  useEffect(() => {
    void load();
    // التحميل الأول فقط؛ التحديث عبر الزر أو تغيير التواريخ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<ReportRow[]>(() => {
    if (!report) return [];
    const stateRows: ReportRow[] = report.by_state.map((bucket) => ({
      key: `state-${bucket.state_id}`,
      label: bucket.state_name_ar || bucket.state_code,
      count: bucket.count,
      unassigned: false,
    }));
    const unassignedRows: ReportRow[] = [
      { key: 'node-no-state', label: t('surveillance.reports.byState.nodeNoState'), count: report.node_no_state, unassigned: true },
      { key: 'unassigned-node', label: t('surveillance.reports.byState.unassignedNode'), count: report.unassigned_node, unassigned: true },
      { key: 'unassigned-facility', label: t('surveillance.reports.byState.unassignedFacility'), count: report.unassigned_facility, unassigned: true },
    ].filter((row) => row.count > 0);
    return [...stateRows, ...unassignedRows];
  }, [report, t]);

  const columns = useMemo<DataTableColumn<ReportRow>[]>(
    () => [
      {
        key: 'label',
        label: t('surveillance.reports.byState.state'),
        render: (row) => (
          <Typography
            variant="body2"
            fontWeight={row.unassigned ? 500 : 600}
            color={row.unassigned ? 'text.secondary' : 'text.primary'}
          >
            {row.label}
          </Typography>
        ),
      },
      {
        key: 'count',
        label: t('surveillance.reports.byState.count'),
        align: 'right',
        render: (row) => row.count,
      },
    ],
    [t],
  );

  const chip = (label: string, value: number, color: 'default' | 'success' | 'warning' | 'error' = 'default') => (
    <Chip size="small" color={color} variant="outlined" label={`${label}: ${value}`} />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title={t('surveillance.reports.byState.title')}
        subtitle={t('surveillance.reports.byState.subtitle')}
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void load()}
            disabled={loading}
          >
            {t('surveillance.reports.byState.refresh')}
          </Button>
        }
      />

      <SectionCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            type="date"
            label={t('surveillance.reports.byState.dateFrom')}
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label={t('surveillance.reports.byState.dateTo')}
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button size="small" variant="contained" onClick={() => void load()} disabled={loading}>
            {t('surveillance.reports.byState.apply')}
          </Button>
          {report?.scoped && (
            <Chip size="small" color="info" variant="outlined" label={t('surveillance.reports.byState.scoped')} />
          )}
        </Stack>
      </SectionCard>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* شريط المصالحة (الضابط 3): المجموع يجب أن يساوي الفئات الأربع. */}
      <SectionCard sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {chip(t('surveillance.reports.byState.total'), report?.total ?? 0, 'default')}
          {chip(t('surveillance.reports.byState.matched'), report?.matched ?? 0, 'success')}
          {chip(t('surveillance.reports.byState.nodeNoState'), report?.node_no_state ?? 0, 'warning')}
          {chip(t('surveillance.reports.byState.unassignedNode'), report?.unassigned_node ?? 0, 'warning')}
          {chip(t('surveillance.reports.byState.unassignedFacility'), report?.unassigned_facility ?? 0, 'warning')}
          {report && (
            <Chip
              size="small"
              color={report.reconciliation_ok ? 'success' : 'error'}
              label={
                report.reconciliation_ok
                  ? t('surveillance.reports.byState.reconciliationOk')
                  : t('surveillance.reports.byState.reconciliationBroken')
              }
            />
          )}
        </Stack>
      </SectionCard>

      <DataTable<ReportRow>
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        count={rows.length}
        page={0}
        rowsPerPage={Math.max(rows.length, 10)}
        hidePagination
        loading={loading}
        title={t('surveillance.reports.byState.title')}
        subtitle={t('surveillance.reports.byState.subtitle')}
        emptyTitle={t('surveillance.reports.byState.noData')}
        emptyDescription={t('surveillance.reports.byState.noDataDescription')}
      />
    </Box>
  );
};

export default ReportsByStatePage;
