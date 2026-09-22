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
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import {
  createRule,
  createVaccine,
  getRules,
  getVaccines,
  updateRule,
  updateVaccine,
} from '../../api/endpoints/vaccination';
import type { Vaccine, VaccinationRule } from '../../types/vaccination';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';

const routeLabels: Record<string, string> = {
  ORAL: 'فموي',
  INJECTION: 'حقن',
  INTRANASAL: 'بخاخ أنفي',
  OTHER: 'أخرى',
};

const routeTone: Record<string, 'info' | 'primary' | 'neutral'> = {
  ORAL: 'info',
  INJECTION: 'primary',
  INTRANASAL: 'neutral',
  OTHER: 'neutral',
};

const emptyVaccine: Partial<Vaccine> = {
  code: '',
  who_code: '',
  name_ar: '',
  name_en: '',
  route: 'INJECTION',
  series: 1,
  booster_required: false,
  interval_days: undefined,
  validity_days: undefined,
  required: false,
  description: '',
  order: 0,
  is_active: true,
};

const emptyRule: Partial<VaccinationRule> = {
  vaccine: '',
  title_ar: '',
  destination_region: '',
  min_age_days: undefined,
  max_age_days: undefined,
  required: true,
  doses_required: 1,
  validity_days: undefined,
  note: '',
};

const VaccinesPage = () => {
  const [tab, setTab] = useState(0);

  const vaccineTable = useServerTable<Vaccine>({ fetchData: getVaccines });
  const ruleTable = useServerTable<VaccinationRule>({ fetchData: getRules });

  const [vaccineDialog, setVaccineDialog] = useState<{ open: boolean; editing: Vaccine | null }>({ open: false, editing: null });
  const [vaccineForm, setVaccineForm] = useState<Partial<Vaccine>>(emptyVaccine);
  const [savingVaccine, setSavingVaccine] = useState(false);

  const [ruleDialog, setRuleDialog] = useState<{ open: boolean; editing: VaccinationRule | null }>({ open: false, editing: null });
  const [ruleForm, setRuleForm] = useState<Partial<VaccinationRule>>(emptyRule);
  const [savingRule, setSavingRule] = useState(false);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);

  useEffect(() => {
    getVaccines({ page_size: 200, ordering: 'order' }).then((res) => setVaccines(res.data.data.results ?? []));
  }, []);

  const openVaccineDialog = (editing?: Vaccine) => {
    setVaccineDialog({ open: true, editing: editing ?? null });
    setVaccineForm(editing ? { ...editing } : { ...emptyVaccine });
  };

  const saveVaccine = async () => {
    if (!vaccineForm.code?.trim() || !vaccineForm.name_ar?.trim()) {
      notifyError('الكود والاسم بالعربية مطلوبان');
      return;
    }
    setSavingVaccine(true);
    try {
      if (vaccineDialog.editing) {
        await updateVaccine(vaccineDialog.editing.id, payloadOf(vaccineForm));
        notifySuccess('تم تحديث اللقاح');
      } else {
        await createVaccine(payloadOf(vaccineForm));
        notifySuccess('تمت إضافة اللقاح');
      }
      setVaccineDialog({ open: false, editing: null });
      vaccineTable.refresh();
      getVaccines({ page_size: 200, ordering: 'order' }).then((res) => setVaccines(res.data.data.results ?? []));
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر حفظ اللقاح'));
    } finally {
      setSavingVaccine(false);
    }
  };

  const openRuleDialog = (editing?: VaccinationRule) => {
    setRuleDialog({ open: true, editing: editing ?? null });
    setRuleForm(editing ? { ...editing } : { ...emptyRule });
  };

  const saveRule = async () => {
    if (!ruleForm.vaccine || !ruleForm.title_ar?.trim()) {
      notifyError('اللقاح والعنوان مطلوبان');
      return;
    }
    setSavingRule(true);
    try {
      if (ruleDialog.editing) {
        await updateRule(ruleDialog.editing.id, {
          vaccine: ruleForm.vaccine,
          title_ar: ruleForm.title_ar,
          destination_region: ruleForm.destination_region,
          min_age_days: ruleForm.min_age_days || undefined,
          max_age_days: ruleForm.max_age_days || undefined,
          required: ruleForm.required,
          doses_required: ruleForm.doses_required,
          validity_days: ruleForm.validity_days || undefined,
          note: ruleForm.note,
        });
        notifySuccess('تم تحديث القاعدة');
      } else {
        await createRule({
          vaccine: ruleForm.vaccine,
          title_ar: ruleForm.title_ar,
          destination_region: ruleForm.destination_region,
          min_age_days: ruleForm.min_age_days || undefined,
          max_age_days: ruleForm.max_age_days || undefined,
          required: ruleForm.required,
          doses_required: ruleForm.doses_required,
          validity_days: ruleForm.validity_days || undefined,
          note: ruleForm.note,
        });
        notifySuccess('تمت إضافة القاعدة');
      }
      setRuleDialog({ open: false, editing: null });
      ruleTable.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر حفظ القاعدة'));
    } finally {
      setSavingRule(false);
    }
  };

  return (
    <>
      <PageHeader
        title="اللقاحات والقواعد"
        subtitle="أنواع اللقاحات المعتمدة وقواعد تقييم احتياج المسافرين لها"
        eyebrow="بوابة التطعيم الدولي"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => (tab === 0 ? openVaccineDialog() : openRuleDialog())}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            إضافة
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`اللقاحات (${vaccineTable.count})`} />
        <Tab label={`قواعد التطعيم (${ruleTable.count})`} />
      </Tabs>

      {tab === 0 ? (
        <DataTable<Vaccine>
          columns={[
            {
              key: 'code',
              label: 'الكود',
              render: (v) => <Chip size="small" label={v.code} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />,
            },
            { key: 'name_ar', label: 'الاسم', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.name_ar}</Typography> },
            {
              key: 'name_en',
              label: 'الاسم بالإنجليزية',
              hideOnMobile: true,
              render: (v) => v.name_en || '—',
            },
            {
              key: 'route',
              label: 'طريق الإعطاء',
              hideOnMobile: true,
              render: (v) => <StatusChip label={routeLabels[v.route] || v.route} tone={routeTone[v.route] || 'neutral'} />,
            },
            { key: 'series', label: 'الجرعات', render: (v) => v.series },
            {
              key: 'validity_days',
              label: 'الصلاحية (يوم)',
              hideOnMobile: true,
              render: (v) => v.validity_days ?? '—',
            },
            {
              key: 'required',
              label: 'إلزامي',
              render: (v) => (
                <Chip
                  size="small"
                  label={v.required ? 'إلزامي' : 'اختياري'}
                  color={v.required ? 'error' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              ),
            },
            {
              key: 'is_active',
              label: 'الحالة',
              render: (v) => (
                <StatusChip label={v.is_active ? 'نشط' : 'موقوف'} tone={v.is_active ? 'success' : 'neutral'} />
              ),
            },
          ]}
          rows={vaccineTable.rows}
          rowKey={(v) => v.id}
          count={vaccineTable.count}
          page={vaccineTable.page}
          rowsPerPage={vaccineTable.rowsPerPage}
          pageSizeOptions={vaccineTable.pageSizeOptions}
          loading={vaccineTable.loading}
          error={vaccineTable.error}
          title="اللقاحات"
          subtitle={`${vaccineTable.count} لقاح`}
          searchInput={vaccineTable.searchInput}
          onSearchChange={vaccineTable.setSearchInput}
          searchPlaceholder="بحث بالكود أو الاسم..."
          onPageChange={vaccineTable.setPage}
          onRowsPerPageChange={vaccineTable.setRowsPerPage}
          onRefresh={vaccineTable.refresh}
          emptyTitle="لا توجد لقاحات"
          emptyDescription="أضف لقاحات معتمدة لتتمكن من تسجيل الجرعات."
          actions={(v) => (
            <Tooltip title="تعديل">
              <IconButton
                aria-label="تعديل اللقاح"
                size="small"
                color="primary"
                onClick={() => openVaccineDialog(v)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        />
      ) : (
        <DataTable<VaccinationRule>
          columns={[
            { key: 'vaccine_name_ar', label: 'اللقاح', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.vaccine_name_ar}</Typography> },
            { key: 'title_ar', label: 'العنوان', render: (v) => v.title_ar },
            {
              key: 'destination_region',
              label: 'الوجهة',
              hideOnMobile: true,
              render: (v) => v.destination_region || '—',
            },
            {
              key: 'required',
              label: 'الإلزام',
              render: (v) => (
                <Chip
                  size="small"
                  label={v.required ? 'إلزامي' : 'اختياري'}
                  color={v.required ? 'error' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              ),
            },
            { key: 'doses_required', label: 'الجرعات المطلوبة', render: (v) => v.doses_required },
            {
              key: 'validity_days',
              label: 'الصلاحية (يوم)',
              hideOnMobile: true,
              render: (v) => v.validity_days ?? '—',
            },
          ]}
          rows={ruleTable.rows}
          rowKey={(v) => v.id}
          count={ruleTable.count}
          page={ruleTable.page}
          rowsPerPage={ruleTable.rowsPerPage}
          pageSizeOptions={ruleTable.pageSizeOptions}
          loading={ruleTable.loading}
          error={ruleTable.error}
          title="قواعد التطعيم"
          subtitle={`${ruleTable.count} قاعدة`}
          searchInput={ruleTable.searchInput}
          onSearchChange={ruleTable.setSearchInput}
          searchPlaceholder="بحث بالعنوان أو اللقاح..."
          onPageChange={ruleTable.setPage}
          onRowsPerPageChange={ruleTable.setRowsPerPage}
          onRefresh={ruleTable.refresh}
          emptyTitle="لا توجد قواعد"
          emptyDescription="القواعد تحدد اللقاحات المطلوبة حسب عمر المسافر والوجهة."
          actions={(v) => (
            <Tooltip title="تعديل">
              <IconButton
                aria-label="تعديل القاعدة"
                size="small"
                color="primary"
                onClick={() => openRuleDialog(v)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        />
      )}

      {/* Vaccine dialog */}
      <Dialog open={vaccineDialog.open} onClose={() => setVaccineDialog({ open: false, editing: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{vaccineDialog.editing ? 'تعديل اللقاح' : 'إضافة لقاح'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="الكود *" value={vaccineForm.code} onChange={(e) => setVaccineForm((f) => ({ ...f, code: e.target.value }))} dir="ltr" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="كود WHO" value={vaccineForm.who_code} onChange={(e) => setVaccineForm((f) => ({ ...f, who_code: e.target.value }))} dir="ltr" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="الاسم بالعربية *" value={vaccineForm.name_ar} onChange={(e) => setVaccineForm((f) => ({ ...f, name_ar: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="الاسم بالإنجليزية" value={vaccineForm.name_en} onChange={(e) => setVaccineForm((f) => ({ ...f, name_en: e.target.value }))} dir="ltr" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                select
                fullWidth
                label="طريق الإعطاء"
                value={vaccineForm.route}
                onChange={(e) => setVaccineForm((f) => ({ ...f, route: e.target.value }))}
              >
                {Object.entries(routeLabels).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="الجرعات"
                type="number"
                value={vaccineForm.series}
                onChange={(e) => setVaccineForm((f) => ({ ...f, series: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="الفاصل (يوم)"
                type="number"
                value={vaccineForm.interval_days ?? ''}
                onChange={(e) => setVaccineForm((f) => ({ ...f, interval_days: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="الصلاحية (يوم)"
                type="number"
                value={vaccineForm.validity_days ?? ''}
                onChange={(e) => setVaccineForm((f) => ({ ...f, validity_days: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="وصف"
                value={vaccineForm.description || ''}
                onChange={(e) => setVaccineForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" flexWrap="wrap" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(vaccineForm.required)}
                      onChange={(e) => setVaccineForm((f) => ({ ...f, required: e.target.checked }))}
                    />
                  }
                  label="إلزامي للسفر"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(vaccineForm.booster_required)}
                      onChange={(e) => setVaccineForm((f) => ({ ...f, booster_required: e.target.checked }))}
                    />
                  }
                  label="يتطلب جرعة تنشيطية"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(vaccineForm.is_active)}
                      onChange={(e) => setVaccineForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                  }
                  label="نشط"
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setVaccineDialog({ open: false, editing: null })} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={savingVaccine ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={saveVaccine}
            disabled={savingVaccine}
            sx={{ fontWeight: 700 }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule dialog */}
      <Dialog open={ruleDialog.open} onClose={() => setRuleDialog({ open: false, editing: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{ruleDialog.editing ? 'تعديل القاعدة' : 'إضافة قاعدة'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="اللقاح *"
                value={ruleForm.vaccine}
                onChange={(e) => setRuleForm((f) => ({ ...f, vaccine: e.target.value }))}
              >
                <MenuItem value="">— اختر اللقاح —</MenuItem>
                {vaccines.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.name_ar} ({v.code})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="العنوان *" value={ruleForm.title_ar} onChange={(e) => setRuleForm((f) => ({ ...f, title_ar: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="وجهة السفر" value={ruleForm.destination_region} onChange={(e) => setRuleForm((f) => ({ ...f, destination_region: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="أدنى عمر (يوم)"
                type="number"
                value={ruleForm.min_age_days ?? ''}
                onChange={(e) => setRuleForm((f) => ({ ...f, min_age_days: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="أقصى عمر (يوم)"
                type="number"
                value={ruleForm.max_age_days ?? ''}
                onChange={(e) => setRuleForm((f) => ({ ...f, max_age_days: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="الجرعات المطلوبة"
                type="number"
                value={ruleForm.doses_required}
                onChange={(e) => setRuleForm((f) => ({ ...f, doses_required: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="الصلاحية (يوم)"
                type="number"
                value={ruleForm.validity_days ?? ''}
                onChange={(e) => setRuleForm((f) => ({ ...f, validity_days: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(ruleForm.required)}
                    onChange={(e) => setRuleForm((f) => ({ ...f, required: e.target.checked }))}
                  />
                }
                label="إلزامي"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="ملاحظات"
                value={ruleForm.note || ''}
                onChange={(e) => setRuleForm((f) => ({ ...f, note: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRuleDialog({ open: false, editing: null })} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={savingRule ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={saveRule}
            disabled={savingRule}
            sx={{ fontWeight: 700 }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const payloadOf = (f: Partial<Vaccine>): Record<string, unknown> => ({
  code: f.code,
  who_code: f.who_code || '',
  name_ar: f.name_ar,
  name_en: f.name_en || '',
  route: f.route,
  series: f.series,
  booster_required: f.booster_required,
  interval_days: f.interval_days || undefined,
  validity_days: f.validity_days || undefined,
  required: f.required,
  description: f.description || '',
  order: f.order,
  is_active: f.is_active,
});

export default VaccinesPage;