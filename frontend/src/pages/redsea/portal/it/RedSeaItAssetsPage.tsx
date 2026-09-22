import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DnsIcon from '@mui/icons-material/Dns';
import { PageHeader, DataTable, StatusChip, FormDialog, FormTextField, FormSelect, ConfirmDialog } from '../../../../components/uikit';
import { useServerTable } from '../../../../hooks/useServerTable';
import { getItAssets, createItAsset, updateItAsset, deleteItAsset } from '../../../../api/endpoints/it';
import type { ITAsset, ITAssetStatus, ITAssetType } from '../../../../types/it';

const ASSET_TYPE_OPTIONS = [
  { value: 'COMPUTER', label: 'حاسب آلي' },
  { value: 'LAPTOP', label: 'حاسب محمول' },
  { value: 'PRINTER', label: 'طابعة' },
  { value: 'SCANNER', label: 'ماسح ضوئي' },
  { value: 'NETWORK', label: 'موجه شبكة' },
  { value: 'SERVER', label: 'خادم' },
  { value: 'OTHER', label: 'أخرى' },
];

const ASSET_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'MAINTENANCE', label: 'قيد الصيانة' },
  { value: 'REPAIR', label: 'مُعطّل' },
  { value: 'INACTIVE', label: 'متوقف' },
];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success',
  MAINTENANCE: 'warning',
  REPAIR: 'error',
  INACTIVE: 'neutral',
};

const EMPTY_FORM: Partial<ITAsset> = { name: '', asset_type: 'COMPUTER', serial_number: '', location: '', status: 'ACTIVE', notes: '' };

const RedSeaItAssetsPage = () => {
  const navigate = useNavigate();
  const table = useServerTable<ITAsset>({ fetchData: getItAssets });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ITAsset>>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ITAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (a: ITAsset) => {
    setForm({
      name: a.name,
      asset_type: a.asset_type,
      serial_number: a.serial_number,
      location: a.location,
      status: a.status,
      notes: a.notes,
    });
    setEditingId(a.id);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!(form.name ?? '').trim() || !(form.serial_number ?? '').trim()) return;
    setSaving(true);
    const payload = { ...form };
    const op = editingId
      ? updateItAsset(editingId, payload)
      : createItAsset(payload);
    op.then(() => {
      setDialogOpen(false);
      refresh();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    deleteItAsset(confirmDelete.id)
      .then(() => {
        setConfirmDelete(null);
        refresh();
      })
      .catch(() => undefined)
      .finally(() => setDeleting(false));
  };

  return (
    <Box>
      <PageHeader
        eyebrow="قسم تقنية المعلومات"
        title="الأصول والأجهزة"
        subtitle="جرد الأجهزة التقنية برقم تسلسلي فريد وموقع وتتبع حالتها."
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={openCreate}>
            إضافة جهاز
          </Button>
        }
      />
      <Box sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/sector/red-sea/it')} color="inherit">
          لوحة تقنية المعلومات
        </Button>
      </Box>
      <DataTable<ITAsset>
        columns={[
          {
            key: 'name',
            label: 'الجهاز',
            sortable: true,
            render: (a) => (
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 700 }}>{a.name}</Typography>
                <Typography variant="caption" color="text.secondary">{a.serial_number}</Typography>
              </Stack>
            ),
          },
          {
            key: 'asset_type',
            label: 'النوع',
            render: (a) => <StatusChip label={ASSET_TYPE_OPTIONS.find((o) => o.value === a.asset_type)?.label ?? a.asset_type} tone="info" variant="outlined" />,
          },
          {
            key: 'status',
            label: 'الحالة',
            render: (a) => <StatusChip label={ASSET_STATUS_OPTIONS.find((o) => o.value === a.status)?.label ?? a.status} tone={STATUS_TONE[a.status] ?? 'neutral'} />,
          },
          { key: 'entry_point_name', label: 'نقطة الدخول', hideOnMobile: true, render: (a) => a.entry_point_name || '—' },
          { key: 'location', label: 'الموقع', hideOnMobile: true, render: (a) => a.location || '—' },
        ]}
        rows={rows}
        rowKey={(a) => a.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="جرد الأجهزة"
        subtitle={`${count} جهاز`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو الرقم التسلسلي..."
        filters={[
          { key: 'status', label: 'الحالة', options: ASSET_STATUS_OPTIONS, value: '', onChange: (v) => setFilter('status', v) },
          { key: 'asset_type', label: 'النوع', options: ASSET_TYPE_OPTIONS, value: '', onChange: (v) => setFilter('asset_type', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد أجهزة"
        emptyDescription="ابدأ بإضافة جهاز جديد."
        actions={(a) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="تعديل">
              <IconButton aria-label="تعديل" size="small" onClick={() => openEdit(a)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton aria-label="حذف" size="small" color="error" onClick={() => setConfirmDelete(a)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      />

      <FormDialog
        open={dialogOpen}
        title={editingId ? 'تعديل جهاز' : 'إضافة جهاز'}
        subtitle="بيانات الجهاز التقني مع الرقم التسلسلي الفريد"
        icon={<DnsIcon />}
        onSubmit={handleSubmit}
        loading={saving}
        submitDisabled={!(form.name ?? '').trim() || !(form.serial_number ?? '').trim()}
        onClose={() => setDialogOpen(false)}
      >
        <FormTextField label="اسم الجهاز" requiredMark value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: حاسب مكتبي - إدارة المطار" />
        <Stack direction="row" spacing={2}>
          <FormSelect label="النوع" value={form.asset_type ?? 'COMPUTER'} onChange={(v) => setForm({ ...form, asset_type: v as ITAssetType })} options={ASSET_TYPE_OPTIONS} />
          <FormSelect label="الحالة" value={form.status ?? 'ACTIVE'} onChange={(v) => setForm({ ...form, status: v as ITAssetStatus })} options={ASSET_STATUS_OPTIONS} />
        </Stack>
        <FormTextField label="الرقم التسلسلي" requiredMark value={form.serial_number ?? ''} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="SN-RS-0000" />
        <FormTextField label="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="مقر التنفيذ / نقطة الدخول" />
        <FormTextField label="ملاحظات" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </FormDialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title="حذف الجهاز"
        message={`هل أنت متأكد من حذف "${confirmDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
      />
    </Box>
  );
};

export default RedSeaItAssetsPage;