import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import PrescriptionIcon from '@mui/icons-material/Inventory2';
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
import { createReagent, createReagentLot, getReagentLots, getReagents } from '../../api/endpoints/laboratory';
import type { Reagent, ReagentLot } from '../../types/laboratory';
import { notifyError, notifySuccess } from '../../utils/toast';

const NqlisReagents = () => {
  const { sector } = useLabScope();
  const reagents = useServerTable<Reagent>({ fetchData: getReagents });
  const lots = useServerTable<ReagentLot>({ fetchData: getReagentLots });

  useEffect(() => {
    reagents.setFilter('sector', sector ?? '');
    lots.setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [tab, setTab] = useState<'reagents' | 'lots'>('reagents');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reagentForm, setReagentForm] = useState({ name_ar: '', material_type: 'REAGENT', unit: '' });
  const [lotForm, setLotForm] = useState({ reagent: '', lot_number: '', quantity: '', unit: '', expiry_date: '' });

  const reagentOptions = reagents.rows.map((r) => ({ value: r.id, label: r.name_ar }));

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      if (tab === 'reagents') {
        await createReagent(reagentForm);
        notifySuccess('تمت إضافة المادة');
        setReagentForm({ name_ar: '', material_type: 'REAGENT', unit: '' });
        reagents.refresh();
      } else {
        await createReagentLot({ ...lotForm, quantity: lotForm.quantity ? Number(lotForm.quantity) : 0 });
        notifySuccess('تمت إضافة الدفعة');
        setLotForm({ reagent: '', lot_number: '', quantity: '', unit: '', expiry_date: '' });
        lots.refresh();
        reagents.refresh();
      }
      setOpen(false);
    } catch {
      notifyError('تعذر الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const reagentColumns: DataTableColumn<Reagent>[] = [
    { key: 'name_ar', label: 'المادة', render: (r) => <Typography fontWeight={700}>{r.name_ar}</Typography> },
    { key: 'name_en', label: 'الاسم الإنجليزي', hideOnMobile: true },
    { key: 'section_name', label: 'القسم', hideOnMobile: true },
    { key: 'material_type', label: 'النوع', render: (r) => r.material_type },
    { key: 'total_quantity', label: 'الكمية', render: (r) => `${r.total_quantity} ${r.unit}` },
    { key: 'low_stock', label: 'المخزون', render: (r) => r.low_stock ? <StatusChip label="منخفض" tone="error" /> : <StatusChip label="كافٍ" tone="success" /> },
    { key: 'reorder_level', label: 'حد إعادة الطلب', render: (r) => r.reorder_level || '—', hideOnMobile: true },
  ];

  const lotColumns: DataTableColumn<ReagentLot>[] = [
    { key: 'reagent_name', label: 'المادة', render: (l) => <Typography fontWeight={700}>{l.reagent_name}</Typography> },
    { key: 'lot_number', label: 'رقم الدفعة', render: (l) => <Typography sx={{ fontFamily: 'monospace' }}>{l.lot_number}</Typography> },
    { key: 'batch_number', label: 'رقم التشغيلة', hideOnMobile: true },
    { key: 'quantity', label: 'الكمية', render: (l) => `${l.quantity} ${l.unit}` },
    { key: 'expiry_date', label: 'تاريخ الانتهاء', render: (l) => formatDate(l.expiry_date) },
    { key: 'status', label: 'الحالة', render: (l) => {
        if (l.is_expired) return <StatusChip label="منتهي" tone="error" />;
        if (l.status === 'EXPIRING_SOON') return <StatusChip label="قريب الانتهاء" tone="warning" />;
        return <StatusChip label="سارٍ" tone="success" />;
      } },
  ];

  return (
    <Box>
      <PageHeader
        title="المواد والكواشف"
        subtitle="إدارة الكواشف ودفعاتها في مختبرات NQLIS"
        eyebrow="NQLIS"
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Box
          onClick={() => setTab('reagents')}
          sx={{
            px: 2, py: 1, borderRadius: 2, cursor: 'pointer', fontWeight: 700,
            bgcolor: tab === 'reagents' ? 'primary.main' : 'action.hover',
            color: tab === 'reagents' ? 'primary.contrastText' : 'inherit',
          }}
        >
          المواد ({reagents.count})
        </Box>
        <Box
          onClick={() => setTab('lots')}
          sx={{
            px: 2, py: 1, borderRadius: 2, cursor: 'pointer', fontWeight: 700,
            bgcolor: tab === 'lots' ? 'primary.main' : 'action.hover',
            color: tab === 'lots' ? 'primary.contrastText' : 'inherit',
          }}
        >
          الدفعات ({lots.count})
        </Box>
      </Stack>

      {tab === 'reagents' ? (
        <DataTable<Reagent>
          columns={reagentColumns}
          rows={reagents.rows}
          rowKey={(r) => r.id}
          count={reagents.count}
          page={reagents.page}
          rowsPerPage={reagents.rowsPerPage}
          pageSizeOptions={reagents.pageSizeOptions}
          loading={reagents.loading}
          error={reagents.error}
          title="المواد"
          subtitle={`${reagents.count} مادة`}
          onPageChange={reagents.setPage}
          onRowsPerPageChange={reagents.setRowsPerPage}
          onRefresh={reagents.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>مادة جديدة</AppButton>
          }
        />
      ) : (
        <DataTable<ReagentLot>
          columns={lotColumns}
          rows={lots.rows}
          rowKey={(l) => l.id}
          count={lots.count}
          page={lots.page}
          rowsPerPage={lots.rowsPerPage}
          pageSizeOptions={lots.pageSizeOptions}
          loading={lots.loading}
          error={lots.error}
          title="دفعات المواد"
          subtitle={`${lots.count} دفعة`}
          onPageChange={lots.setPage}
          onRowsPerPageChange={lots.setRowsPerPage}
          onRefresh={lots.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>دفعة جديدة</AppButton>
          }
        />
      )}

      <FormDialog
        open={open}
        title={tab === 'reagents' ? 'إضافة مادة/كاشف' : 'إضافة دفعة'}
        icon={<PrescriptionIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        {tab === 'reagents' ? (
          <>
            <FormTextField label="اسم المادة (عربي)" value={reagentForm.name_ar} onChange={(e) => setReagentForm({ ...reagentForm, name_ar: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormSelect label="نوع المادة" value={reagentForm.material_type} options={[{ value: 'REAGENT', label: 'كاشف' }, { value: 'CONTROL', label: 'عينة ضبط' }, { value: 'CONSUMABLE', label: 'مستهلك' }]} onChange={(v) => setReagentForm({ ...reagentForm, material_type: v })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label="الوحدة" value={reagentForm.unit} onChange={(e) => setReagentForm({ ...reagentForm, unit: e.target.value })} />
          </>
        ) : (
          <>
            <FormSelect label="المادة" value={lotForm.reagent} options={reagentOptions} onChange={(v) => setLotForm({ ...lotForm, reagent: v })} placeholder="اختر المادة" />
            <Box sx={{ height: 16 }} />
            <FormTextField label="رقم الدفعة" value={lotForm.lot_number} onChange={(e) => setLotForm({ ...lotForm, lot_number: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <Stack direction="row" spacing={2}>
              <FormTextField label="الكمية" value={lotForm.quantity} onChange={(e) => setLotForm({ ...lotForm, quantity: e.target.value })} />
              <FormTextField label="الوحدة" value={lotForm.unit} onChange={(e) => setLotForm({ ...lotForm, unit: e.target.value })} />
            </Stack>
            <Box sx={{ height: 16 }} />
            <FormTextField label="تاريخ الانتهاء" type="date" value={lotForm.expiry_date} onChange={(e) => setLotForm({ ...lotForm, expiry_date: e.target.value })} />
          </>
        )}
      </FormDialog>
    </Box>
  );
};

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('ar-EG') : '—');

export default NqlisReagents;
