import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import {
  adjustBatch,
  createBatch,
  getBatches,
  getInventory,
  getVaccines,
} from '../../api/endpoints/vaccination';
import type { InventoryTransaction, Vaccine, VaccineBatch } from '../../types/vaccination';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';

const batchStatusMeta: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' }> = {
  ACTIVE: { label: 'متاحة', tone: 'success' },
  DEPLETED: { label: 'نفدت', tone: 'warning' },
  EXPIRED: { label: 'منتهية', tone: 'error' },
  RETURNED: { label: 'مرتجعة', tone: 'neutral' },
};

const txMeta: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'error' }> = {
  IN: { label: 'استلام', tone: 'success' },
  OUT: { label: 'صرف', tone: 'info' },
  ADJUST: { label: 'تسوية', tone: 'warning' },
  EXPIRED: { label: 'انتهاء صلاحية', tone: 'error' },
};

const emptyBatch: Partial<VaccineBatch> = {
  vaccine: '',
  lot_number: '',
  manufacturer: '',
  manufacture_date: '',
  expiry_date: '',
  received_quantity: 0,
};

const BatchesInventoryPage = () => {
  const [tab, setTab] = useState(0);
  const batchTable = useServerTable<VaccineBatch>({ fetchData: getBatches });
  const txTable = useServerTable<InventoryTransaction>({ fetchData: getInventory });

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [batchDialog, setBatchDialog] = useState(false);
  const [batchForm, setBatchForm] = useState<Partial<VaccineBatch>>(emptyBatch);
  const [savingBatch, setSavingBatch] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<VaccineBatch | null>(null);
  const [delta, setDelta] = useState('0');
  const [reason, setReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    getVaccines({ page_size: 200, ordering: 'order' }).then((res) => setVaccines(res.data.data.results ?? []));
  }, []);

  const saveBatch = async () => {
    if (!batchForm.vaccine || !batchForm.lot_number?.trim() || !batchForm.expiry_date) {
      notifyError('اللقاح ورقم التشغيلة وتاريخ الانتهاء مطلوبون');
      return;
    }
    setSavingBatch(true);
    try {
      await createBatch({
        vaccine: batchForm.vaccine,
        lot_number: batchForm.lot_number,
        manufacturer: batchForm.manufacturer || '',
        manufacture_date: batchForm.manufacture_date || undefined,
        expiry_date: batchForm.expiry_date,
        received_quantity: Number(batchForm.received_quantity || 0),
      });
      notifySuccess('تم استلام التشغيلة');
      setBatchDialog(false);
      setBatchForm(emptyBatch);
      batchTable.refresh();
      txTable.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر حفظ التشغيلة'));
    } finally {
      setSavingBatch(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustTarget || adjusting) return;
    const value = Number(delta);
    if (!Number.isFinite(value) || value === 0) {
      notifyError('أدخل قيمة تسوية غير صفرية');
      return;
    }
    setAdjusting(true);
    try {
      const res = await adjustBatch(adjustTarget.id, value, reason || undefined);
      notifySuccess(`أصبح الرصيد ${res.data.data.available_quantity}`);
      setAdjustTarget(null);
      setDelta('0');
      setReason('');
      batchTable.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تسوية المخزون'));
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="التشغيلات والمخزون"
        subtitle="إدارة تشغيلات اللقاح (LOT) وحركات المخزون من الاستلام حتى الصرف"
        eyebrow="بوابة التطعيم الدولي"
        action={
          tab === 0 ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBatchDialog(true)} sx={{ fontWeight: 700, textTransform: 'none' }}>
              استلام تشغيلة
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`التشغيلات (${batchTable.count})`} icon={<Inventory2Icon />} iconPosition="start" />
        <Tab label={`حركات المخزون (${txTable.count})`} />
      </Tabs>

      {tab === 0 ? (
        <DataTable<VaccineBatch>
          columns={[
            { key: 'vaccine_name_ar', label: 'اللقاح', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.vaccine_name_ar}</Typography> },
            { key: 'lot_number', label: 'رقم التشغيلة', render: (v) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.lot_number}</Typography> },
            {
              key: 'manufacturer',
              label: 'المُصنّع',
              hideOnMobile: true,
              render: (v) => v.manufacturer || '—',
            },
            {
              key: 'expiry_date',
              label: 'الانتهاء',
              sortable: true,
              render: (v) => (
                <Chip
                  size="small"
                  label={formatDate(v.expiry_date)}
                  color={v.available_quantity > 0 && v.expiry_date && new Date(v.expiry_date) <= new Date(Date.now() + 60 * 86400000) ? 'warning' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              ),
            },
            {
              key: 'available_quantity',
              label: 'الرصيد',
              render: (v) => (
                <Stack spacing={0.5} sx={{ minWidth: 120 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                    {v.available_quantity} / {v.received_quantity}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, v.remaining_percent)}
                    color={v.remaining_percent > 30 ? 'success' : v.remaining_percent > 5 ? 'warning' : 'error'}
                    sx={{ borderRadius: 4, height: 5 }}
                  />
                </Stack>
              ),
            },
            {
              key: 'status',
              label: 'الحالة',
              render: (v) => {
                const m = batchStatusMeta[v.status];
                return m ? <StatusChip label={m.label} tone={m.tone} /> : v.status;
              },
            },
          ]}
          rows={batchTable.rows}
          rowKey={(v) => v.id}
          count={batchTable.count}
          page={batchTable.page}
          rowsPerPage={batchTable.rowsPerPage}
          pageSizeOptions={batchTable.pageSizeOptions}
          loading={batchTable.loading}
          error={batchTable.error}
          title="التشغيلات"
          subtitle={`${batchTable.count} تشغيلة`}
          searchInput={batchTable.searchInput}
          onSearchChange={batchTable.setSearchInput}
          searchPlaceholder="بحث برقم التشغيلة أو المُصنّع أو اللقاح..."
          filters={[
            {
              key: 'status',
              label: 'الحالة',
              options: Object.entries(batchStatusMeta).map(([v, m]) => ({ value: v, label: m.label })),
              value: '',
              onChange: (v) => batchTable.setFilter('status', v),
            },
          ]}
          onPageChange={batchTable.setPage}
          onRowsPerPageChange={batchTable.setRowsPerPage}
          onRefresh={batchTable.refresh}
          emptyTitle="لا توجد تشغيلات"
          emptyDescription="استلم تشغيلات اللقاح لتوفير المخزون المتاح."
          actions={(v) => (
            <Tooltip title="تسوية الرصيد">
              <IconButton
                aria-label="تسوية الرصيد"
                size="small"
                color="warning"
                onClick={() => {
                  setAdjustTarget(v);
                  setDelta('0');
                  setReason('');
                }}
                sx={{ bgcolor: 'warning.light', '&:hover': { bgcolor: 'warning.main', color: '#fff' } }}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        />
      ) : (
        <DataTable<InventoryTransaction>
          columns={[
            { key: 'vaccine_name_ar', label: 'اللقاح', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.vaccine_name_ar}</Typography> },
            { key: 'batch_number', label: 'التشغيلة', render: (v) => <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{v.batch_number}</Typography> },
            {
              key: 'type',
              label: 'النوع',
              render: (v) => {
                const m = txMeta[v.type];
                return m ? <StatusChip label={m.label} tone={m.tone} /> : v.type;
              },
            },
            { key: 'quantity', label: 'الكمية', render: (v) => <Typography sx={{ fontWeight: 800 }}>{v.quantity}</Typography> },
            {
              key: 'created_by_name',
              label: 'بواسطة',
              hideOnMobile: true,
              render: (v) => v.created_by_name || '—',
            },
            {
              key: 'created_at',
              label: 'التاريخ',
              sortable: true,
              render: (v) => formatDateTime(v.created_at),
            },
            {
              key: 'note',
              label: 'ملاحظات',
              hideOnMobile: true,
              render: (v) => v.note || '—',
            },
          ]}
          rows={txTable.rows}
          rowKey={(v) => v.id}
          count={txTable.count}
          page={txTable.page}
          rowsPerPage={txTable.rowsPerPage}
          pageSizeOptions={txTable.pageSizeOptions}
          loading={txTable.loading}
          error={txTable.error}
          title="حركات المخزون"
          subtitle={`${txTable.count} حركة`}
          searchInput={txTable.searchInput}
          onSearchChange={txTable.setSearchInput}
          searchPlaceholder="بحث بالتشغيلة أو اللقاح أو الملاحظة..."
          filters={[
            {
              key: 'type',
              label: 'النوع',
              options: Object.entries(txMeta).map(([v, m]) => ({ value: v, label: m.label })),
              value: '',
              onChange: (v) => txTable.setFilter('type', v),
            },
          ]}
          onPageChange={txTable.setPage}
          onRowsPerPageChange={txTable.setRowsPerPage}
          onRefresh={txTable.refresh}
          emptyTitle="لا توجد حركات"
          emptyDescription="تظهر حركات الاستلام والصرف والتسوية هنا."
        />
      )}

      <Dialog open={batchDialog} onClose={() => setBatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>استلام تشغيلة جديدة</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="اللقاح *"
                value={batchForm.vaccine}
                onChange={(e) => setBatchForm((f) => ({ ...f, vaccine: e.target.value }))}
              >
                <MenuItem value="">— اختر اللقاح —</MenuItem>
                {vaccines.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.name_ar} ({v.code})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم التشغيلة LOT *"
                value={batchForm.lot_number}
                onChange={(e) => setBatchForm((f) => ({ ...f, lot_number: e.target.value }))}
                dir="ltr"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المُصنّع"
                value={batchForm.manufacturer}
                onChange={(e) => setBatchForm((f) => ({ ...f, manufacturer: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="تاريخ التصنيع"
                type="date"
                value={batchForm.manufacture_date}
                onChange={(e) => setBatchForm((f) => ({ ...f, manufacture_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="تاريخ الانتهاء *"
                type="date"
                value={batchForm.expiry_date}
                onChange={(e) => setBatchForm((f) => ({ ...f, expiry_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الكمية المستلمة *"
                type="number"
                value={batchForm.received_quantity}
                onChange={(e) => setBatchForm((f) => ({ ...f, received_quantity: Number(e.target.value) }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBatchDialog(false)} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={savingBatch ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={saveBatch}
            disabled={savingBatch}
            sx={{ fontWeight: 700 }}
          >
            استلام
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(adjustTarget)} onClose={() => setAdjustTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تسوية رصيد التشغيلة</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2">
              التشغيلة <b>{adjustTarget?.lot_number}</b> — الرصيد الحالي <b>{adjustTarget?.available_quantity}</b>.
            </Typography>
            <TextField
              fullWidth
              label="التسوية (+/-)"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              helperText="قيمة موجبة لزيادة الرصيد أو سالبة للخصم."
            />
            <TextField
              fullWidth
              label="السبب"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdjustTarget(null)} sx={{ fontWeight: 700 }}>تراجع</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={adjusting ? <CircularProgress size={16} color="inherit" /> : <TuneIcon />}
            onClick={handleAdjust}
            disabled={adjusting}
            sx={{ fontWeight: 700 }}
          >
            تسوية
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BatchesInventoryPage;