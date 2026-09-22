import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { createSite, getSites } from '../../api/endpoints/vaccination';
import type { VaccinationSite } from '../../types/vaccination';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';

const kindMeta: Record<string, { label: string; tone: 'primary' | 'info' }> = {
  CLINIC: { label: 'عيادة تطعيم', tone: 'primary' },
  PORT_POINT: { label: 'نقطة تطعيم بمنفذ', tone: 'info' },
};

const emptySite: Partial<VaccinationSite> = {
  name_ar: '',
  name_en: '',
  kind: 'CLINIC',
  location: '',
  address: '',
  phone: '',
  is_active: true,
};

const VaccinationSitesPage = () => {
  const table = useServerTable<VaccinationSite>({ fetchData: getSites });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<Partial<VaccinationSite>>(emptySite);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(emptySite);
  }, [dialog]);

  const save = async () => {
    if (!form.name_ar?.trim()) {
      notifyError('اسم العيادة مطلوب');
      return;
    }
    setSaving(true);
    try {
      await createSite({
        name_ar: form.name_ar,
        name_en: form.name_en || '',
        kind: form.kind,
        location: form.location || '',
        address: form.address || '',
        phone: form.phone || '',
        is_active: form.is_active,
      });
      notifySuccess('تمت إضافة نقطة التطعيم');
      setDialog(false);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر حفظ نقطة التطعيم'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="نقاط التطعيم"
        subtitle="عيادات ونقاط تطعيم تابعة للمنافذ يتم منها تسجيل الجرعات"
        eyebrow="بوابة التطعيم الدولي"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog(true)} sx={{ fontWeight: 700, textTransform: 'none' }}>
            إضافة نقطة
          </Button>
        }
      />
      <DataTable<VaccinationSite>
        columns={[
          { key: 'name_ar', label: 'الاسم', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.name_ar}</Typography> },
          {
            key: 'kind',
            label: 'النوع',
            render: (v) => {
              const m = kindMeta[v.kind];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.kind;
            },
          },
          {
            key: 'location',
            label: 'الموقع',
            hideOnMobile: true,
            render: (v) =>
              v.location ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LocationOnIcon fontSize="small" color="action" />
                  <Typography variant="body2">{v.location}</Typography>
                </Stack>
              ) : (
                '—'
              ),
          },
          {
            key: 'phone',
            label: 'الهاتف',
            hideOnMobile: true,
            render: (v) =>
              v.phone ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">{v.phone}</Typography>
                </Stack>
              ) : (
                '—'
              ),
          },
          {
            key: 'is_active',
            label: 'الحالة',
            render: (v) => <StatusChip label={v.is_active ? 'نشط' : 'موقوف'} tone={v.is_active ? 'success' : 'neutral'} />,
          },
        ]}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="نقاط التطعيم"
        subtitle={`${count} نقطة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو الموقع..."
        filters={[
          {
            key: 'kind',
            label: 'النوع',
            options: Object.entries(kindMeta).map(([v, m]) => ({ value: v, label: m.label })),
            value: '',
            onChange: (v) => setFilter('kind', v),
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد نقاط تطعيم"
        emptyDescription="أضف عيادات ونقاط التطعيم المرخصة."
      />

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة نقطة تطعيم</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="الاسم بالعربية *" value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="الاسم بالإنجليزية" value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} dir="ltr" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              >
                {Object.entries(kindMeta).map(([v, m]) => (
                  <MenuItem key={v} value={v}>{m.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="الموقع" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="العنوان" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الهاتف" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialog(false)} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={save}
            disabled={saving}
            sx={{ fontWeight: 700 }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VaccinationSitesPage;