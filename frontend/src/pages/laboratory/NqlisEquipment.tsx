import { useEffect, useMemo, useState } from 'react';
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
  type StatusTone,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import { createEquipment, getEquipment } from '../../api/endpoints/laboratory';
import type { LabEquipment } from '../../types/laboratory';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { useTranslation } from 'react-i18next';

const NqlisEquipment = () => {
  const { t } = useTranslation();
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

  const equipmentStatus = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => ({
      OPERATIONAL: { label: t('laboratory.nqlisEquipment.statusOperational'), tone: 'success' },
      UNDER_MAINTENANCE: { label: t('laboratory.nqlisEquipment.statusUnderMaintenance'), tone: 'warning' },
      OUT_OF_SERVICE: { label: t('laboratory.nqlisEquipment.statusOutOfService'), tone: 'error' },
    }),
    [t],
  );

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await createEquipment(form);
      notifySuccess(t('laboratory.nqlisEquipment.addSuccess'));
      setForm({ name_ar: '', name_en: '', model_number: '', serial_number: '', status: 'OPERATIONAL' });
      setOpen(false);
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisEquipment.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<LabEquipment>[] = [
    { key: 'name_ar', label: t('laboratory.nqlisEquipment.colDevice'), render: (e) => <Typography fontWeight={700}>{e.name_ar}</Typography> },
    { key: 'name_en', label: t('laboratory.nqlisEquipment.colDeviceNameEn'), hideOnMobile: true },
    { key: 'model_number', label: t('laboratory.nqlisEquipment.colModel'), hideOnMobile: true },
    { key: 'section_name', label: t('laboratory.nqlisEquipment.colSection'), hideOnMobile: true },
    { key: 'status', label: t('laboratory.nqlisEquipment.colStatus'), render: (e) => { const m = equipmentStatus[e.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={e.status} tone="neutral" />; } },
    { key: 'calibration', label: t('laboratory.nqlisEquipment.colCalibration'), render: (e) => {
        if (e.calibration_overdue) return <StatusChip label={t('laboratory.nqlisEquipment.calibrationOverdue')} tone="error" />;
        if (e.calibration_due_soon) return <StatusChip label={t('laboratory.nqlisEquipment.calibrationDueSoon')} tone="warning" />;
        return e.next_calibration_due ? formatDate(e.next_calibration_due) : '—';
      } },
  ];

  return (
    <Box>
      <PageHeader
        title={t('laboratory.nqlisEquipment.pageTitle')}
        subtitle={t('laboratory.nqlisEquipment.pageSubtitle')}
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
        title={t('laboratory.nqlisEquipment.tableTitle')}
        subtitle={t('laboratory.nqlisEquipment.tableSubtitle', { count })}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            {t('laboratory.nqlisEquipment.btnNewDevice')}
          </AppButton>
        }
        emptyTitle={t('laboratory.nqlisEquipment.emptyTitle')}
        emptyDescription={t('laboratory.nqlisEquipment.emptyDescription')}
      />

      <FormDialog
        open={open}
        title={t('laboratory.nqlisEquipment.dialogTitle')}
        icon={<AddIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        <FormTextField label={t('laboratory.nqlisEquipment.formDeviceNameAr')} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisEquipment.formDeviceNameEn')} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormTextField label={t('laboratory.nqlisEquipment.formModel')} value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} />
          <FormTextField label={t('laboratory.nqlisEquipment.formSerial')} value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
        </Box>
        <Box sx={{ height: 16 }} />
        <FormSelect label={t('laboratory.nqlisEquipment.formStatus')} value={form.status} options={Object.entries(equipmentStatus).map(([v, m]) => ({ value: v, label: m.label }))} onChange={(v) => setForm({ ...form, status: v })} />
      </FormDialog>
    </Box>
  );
};

export default NqlisEquipment;
