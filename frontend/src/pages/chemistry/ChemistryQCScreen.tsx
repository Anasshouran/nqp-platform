import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import {
  AppButton,
  DataTable,
  PageHeader,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { getLabSampleTests, markSampleTestQC } from '../../api/endpoints/foodlab';
import type { SampleTest } from '../../types/food';
import { labQc, labTestStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const ChemistryQCScreen = () => {
  const navigate = useNavigate();
  const [qcNotes, setQcNotes] = useState('');
  const [selected, setSelected] = useState<SampleTest | null>(null);

  const tests = useServerTable<SampleTest>({ fetchData: getLabSampleTests });

  useEffect(() => {
    tests.setFilter('bench', 'CHEMISTRY');
    tests.setFilter('qc_status', 'PENDING');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitQc = useCallback(
    async (t: SampleTest, passed: boolean) => {
      try {
        await markSampleTestQC(t.id, { qc_status: passed ? 'PASSED' : 'FAILED', qc_notes: qcNotes });
        notifySuccess(passed ? 'تم اعتماد الجودة (QC)' : 'سُجِّلت مخالفة جودة (QC)');
        setQcNotes('');
        setSelected(null);
        tests.refresh();
      } catch {
        notifyError('تعذر تسجيل مراجعة الجودة');
      }
    },
    [qcNotes, tests]
  );

  const columns: DataTableColumn<SampleTest>[] = [
    { key: 'parameter', label: 'الفحص', render: (t) => <b>{t.parameter?.name_ar ?? '—'}</b> },
    { key: 'sample_number', label: 'رقم العينة', render: (t) => t.sample },
    { key: 'status', label: 'الحالة', render: (t) => <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} /> },
    { key: 'result_value', label: 'النتيجة', render: (t) => (t.result_value != null ? `${t.result_value} ${t.unit}` : t.result_text || '—') },
    { key: 'qc_status', label: 'مراجعة QC', render: (t) => <StatusChip label={labQc[t.qc_status]?.label ?? t.qc_status} tone={labQc[t.qc_status]?.tone} /> },
    { key: 'qc_reviewed_by_name', label: 'مراجِع QC', render: (t) => t.qc_reviewed_by_name ?? '—' },
    { key: 'qc_reviewed_at', label: 'تاريخ المراجعة', render: (t) => (t.qc_reviewed_at ? formatDateTime(new Date(t.qc_reviewed_at)) : '—') },
    {
      key: 'actions', label: '', render: (t) => (
        <AppButton size="small" variant="secondary" onClick={() => setSelected(t)}>مراجعة QC</AppButton>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="مراجعة الجودة — QC"
        subtitle="التحاليل المنتظرة لمراجعة الجودة قبل الاعتماد"
        action={<AppButton variant="secondary" onClick={tests.refresh}>🔄 تحديث</AppButton>}
      />

      <DataTable<SampleTest>
        columns={columns}
        rows={tests.rows}
        rowKey={(r) => r.id}
        count={tests.count}
        page={tests.page}
        rowsPerPage={tests.rowsPerPage}
        pageSizeOptions={tests.pageSizeOptions}
        loading={tests.loading}
        error={tests.error}
        title="مهام مراجعة QC"
        search={tests.search}
        searchInput={tests.searchInput}
        onSearchChange={tests.setSearchInput}
        sortBy={tests.sortBy}
        sortOrder={tests.sortOrder}
        onSortChange={tests.setSorting}
        onPageChange={tests.setPage}
        onRowsPerPageChange={tests.setRowsPerPage}
        onRefresh={tests.refresh}
      />

      {selected && (
        <Paper sx={{ mt: 3, p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            مراجعة QC — {selected.parameter?.name_ar ?? '—'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2">
                النتيجة: <b>{selected.result_value != null ? `${selected.result_value} ${selected.unit}` : selected.result_text || '—'}</b>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box
                component="textarea"
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                rows={2}
                placeholder="ملاحظات مراجعة QC..."
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'inherit' }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <AppButton variant="secondary" onClick={() => submitQc(selected, true)}>✓ اعتماد</AppButton>
                <AppButton variant="danger" onClick={() => submitQc(selected, false)}>✗ مخالفة</AppButton>
                <AppButton variant="ghost" onClick={() => setSelected(null)}>إلغاء</AppButton>
              </Box>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            لا يمكن للمحلل تحويل نتيجة غير مطابقة إلى مطابقة يدويًا.
          </Alert>
        </Paper>
      )}

      <Box sx={{ mt: 2 }}>
        <AppButton variant="ghost" onClick={() => navigate('/app/chemistry-analyst')}>
          عودة للوحة
        </AppButton>
      </Box>
    </Box>
  );
};

export default ChemistryQCScreen;
