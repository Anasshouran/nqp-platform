import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import { createEquipment, getEquipment } from '../../api/endpoints/laboratory';
import type { LabEquipment } from '../../types/laboratory';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const equipmentStatus: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  OPERATIONAL: { label: 'تشغيلية', tone: 'success' },
  UNDER_MAINTENANCE: { label: 'قيد الصيانة', tone: 'warning' },
  OUT_OF_SERVICE: { label: 'خارج الخدمة', tone: 'error' },
};

const NqlisEquipment = () => {
  const { sector } = useLabScope();
  const table = useServerTable<LabEquipment>({ fetchData: getEquipment });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name_ar: '', name_en: '', model_number: '', serial_number: '', status: 'OPERATIONAL' });

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await createEquipment(form);
      notifySuccess('تمت إضافة الجهاز');
      setForm({ name_ar: '', name_en: '', model_number: '', serial_number: '', status: 'OPERATIONAL' });
      setOpen(false);
      refresh();
    } catch {
      notifyError('تعذر الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<LabEquipment>[] = [
    { key: 'name_ar', label: 'الجهاز', render: (e) => <Typography fontWeight={700}>{e.name_ar}</Typography> },
    { key: 'name_en', label: 'الاسم الإنجليزي', hideOnMobile: true },
    { key: 'model_number', label: 'الطراز', hideOnMobile: true },
    { key: 'section_name', label: 'القسم', hideOnMobile: true },
    { key: 'status', label: 'الحالة', render: (e) => { const m = equipmentStatus[e.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={e.status} tone="neutral" />; } },
    { key: 'calibration', label: 'المعايرة', render: (e) => {
        if (e.calibration_overdue) return <StatusChip label="متأخرة" tone="error" />;
        if (e.calibration_due_soon) return <StatusChip label="قريبة" tone="warning" />;
        return e.next_calibration_due ? formatDate(e.next_calibration_due) : '—';
      } },
  ];

  return (
    <Box>
      <PageHeader
        title="الأجهزة والمعدات"
        subtitle="أجهزة مختبرات NQLIS وحالة معايرتها"
        eyebrow="NQLIS"
      />
      <DataTable<LabEquipment>
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الأجهزة"
        subtitle={`${count} جهاز`}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>جهاز جديد</AppButton>
        }
        emptyTitle="لا توجد أجهزة"
        emptyDescription="أجهزة المختبر تظهر هنا"
      />

      <FormDialog
        open={open}
        title="إضافة جهاز"
        icon={<AddIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        <FormTextField label="اسم الجهاز (عربي)" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <FormTextField label="الاسم الإنجليزي" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormTextField label="الطراز" value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} />
          <FormTextField label="الرقم التسلسلي" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
        </Box>
        <Box sx={{ height: 16 }} />
        <FormSelect label="الحالة" value={form.status} options={Object.entries(equipmentStatus).map(([v, m]) => ({ value: v, label: m.label }))} onChange={(v) => setForm({ ...form, status: v })} />
      </FormDialog>
    </Box>
  );
};

export default NqlisEquipment;