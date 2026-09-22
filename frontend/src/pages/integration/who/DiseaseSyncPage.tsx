import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { formatDateTime } from '../../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../../utils/toast';
import { getWhoDiseases, syncWhoDiseases } from '../../../api/endpoints/who';
import { getDiseases as getLabDiseases } from '../../../api/endpoints/laboratory';
import type { Disease } from '../../../types/laboratory';
import type { DiseaseMaster } from '../../../types/who';

const statusTone = (s?: string | null) => {
  if (!s) return 'neutral';
  if (s === 'SUCCESS') return 'success';
  if (s === 'FAILED') return 'error';
  return 'warning';
};

const DiseaseSyncPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [diseasesLoading, setDiseasesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const table = useServerTable<DiseaseMaster>({ fetchData: getWhoDiseases });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting,
    setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const openDialog = async () => {
    setDialogOpen(true);
    setDiseasesLoading(true);
    try {
      const res = await getLabDiseases({ page_size: 200 });
      setDiseases(res.data.data.results);
    } catch {
      notifyError('تعذر تحميل قائمة الأمراض');
    } finally {
      setDiseasesLoading(false);
    }
  };

  const toggle = (id: string) => setSelection((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSync = async () => {
    const ids = Object.entries(selection).filter(([, on]) => on).map(([id]) => id);
    if (ids.length === 0) {
      notifyError('اختر مرضاً واحداً على الأقل');
      return;
    }
    setBusy(true);
    try {
      await syncWhoDiseases({ diseases: ids });
      notifySuccess(`أُضيف ${ids.length} مرض للخرائط`);
      setDialogOpen(false);
      setSelection({});
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'فشل المزامنة'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!dialogOpen) setSelection({});
  }, [dialogOpen]);

  return (
    <Box>
      <PageHeader
        title="خريطة الأمراض ونظام ICD-11"
        subtitle="مزامنة الأمراض المحلية مع رموز ICD-11 وتصنيفات اللائحة الصحية الدولية"
        eyebrow="WHO / Diseases"
        action={
          <Button variant="contained" startIcon={<AutoFixHighIcon />} onClick={() => void openDialog()}>
            مزامنة أمراض
          </Button>
        }
      />

      <Alert severity="info" sx={{ borderRadius: 2, mb: 3 }}>
        الخريطة تربط الأمراض المسجلة في المختبرات بأكواد ICD-11 العالمية وتصنيف IHR المعني بها، وتُرسل تلقائياً ضمن تقارير PHEIC.
      </Alert>

      <DataTable<DiseaseMaster>
        columns={[
          { key: 'disease_name', label: 'المرض', sortable: true, render: (d) => <Typography sx={{ fontWeight: 700 }}>{d.disease_name}</Typography> },
          {
            key: 'disease_code',
            label: 'رمز ICD-11',
            render: (d) => <Typography dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.disease_code}</Typography>,
          },
          { key: 'icd11_uri', label: 'رابط ICD-11', hideOnMobile: true, render: (d) => (d.icd11_uri ? <Typography dir="ltr" component="a" href={d.icd11_uri} target="_blank" rel="noreferrer" sx={{ fontFamily: 'monospace', fontSize: 11, color: 'primary.main' }}>{d.icd11_uri.slice(0, 30)}…</Typography> : '—') },
          {
            key: 'is_notifiable',
            label: 'واجب الإبلاغ',
            render: (d) => (d.is_notifiable ? <StatusChip label="نعم" tone="success" /> : <StatusChip label="لا" tone="neutral" />),
          },
          {
            key: 'last_sync_status',
            label: 'آخر مزامنة',
            render: (d) => <StatusChip label={d.last_sync_status ?? '—'} tone={statusTone(d.last_sync_status)} variant="outlined" />,
          },
          { key: 'last_synced_at', label: 'الوقت', render: (d) => formatDateTime(d.last_synced_at), hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(d) => d.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الأمراض المُخطّط لها"
        subtitle={`${count} مرض`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالمرض أو الرمز..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد أمراض مخططة"
        emptyDescription="ابدأ بمزامنة الأمراض من سجل المختبرات"
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>مزامنة الأمراض المحلية مع خريطة ICD-11</DialogTitle>
        <DialogContent dividers>
          {diseasesLoading ? (
            <DialogContentText>جارٍ تحميل الأمراض…</DialogContentText>
          ) : (
            <Stack spacing={0.5}>
              {diseases.map((d) => (
                <FormControlLabel
                  key={d.id}
                  control={<Checkbox checked={Boolean(selection[d.id])} onChange={() => toggle(d.id)} />}
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{d.icd_11_code}</Typography>
                      <Typography>{d.name_ar}</Typography>
                      <Typography variant="caption" color="text.secondary">{d.name_en}</Typography>
                    </Stack>
                  }
                />
              ))}
              {diseases.length === 0 && <DialogContentText>لا توجد أمراض مسجلة في المختبر.</DialogContentText>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => void handleSync()} disabled={busy || diseasesLoading}>
            {busy ? 'جارٍ المزامنة…' : `مزامنة (${Object.values(selection).filter(Boolean).length})`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiseaseSyncPage;