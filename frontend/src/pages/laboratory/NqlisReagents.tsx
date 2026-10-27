import { useMemo, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import PrescriptionIcon from '@mui/icons-material/Inventory2';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { sector } = useLabScope();
  const reagents = useServerTable<Reagent>({ fetchData: getReagents });
  const lots = useServerTable<ReagentLot>({ fetchData: getReagentLots });

  useEffect(() => {
    reagents.setFilter('sector', sector ?? '');
    lots.setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const materialTypeOptions = useMemo(
    () => [
      { value: 'REAGENT', label: t('laboratory.nqlisReagents.matReagent') },
      { value: 'CONTROL', label: t('laboratory.nqlisReagents.matControl') },
      { value: 'CONSUMABLE', label: t('laboratory.nqlisReagents.matConsumable') },
    ],
    [t],
  );

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
        notifySuccess(t('laboratory.nqlisReagents.materialAdded'));
        setReagentForm({ name_ar: '', material_type: 'REAGENT', unit: '' });
        reagents.refresh();
      } else {
        await createReagentLot({ ...lotForm, quantity: lotForm.quantity ? Number(lotForm.quantity) : 0 });
        notifySuccess(t('laboratory.nqlisReagents.lotAdded'));
        setLotForm({ reagent: '', lot_number: '', quantity: '', unit: '', expiry_date: '' });
        lots.refresh();
        reagents.refresh();
      }
      setOpen(false);
    } catch {
      notifyError(t('laboratory.shared.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const reagentColumns: DataTableColumn<Reagent>[] = [
    { key: 'name_ar', label: t('laboratory.nqlisReagents.colMaterial'), render: (r) => <Typography fontWeight={700}>{r.name_ar}</Typography> },
    { key: 'name_en', label: t('laboratory.nqlisReagents.colNameEn'), hideOnMobile: true },
    { key: 'section_name', label: t('laboratory.shared.colSection'), hideOnMobile: true },
    { key: 'material_type', label: t('laboratory.shared.colType'), render: (r) => r.material_type },
    { key: 'total_quantity', label: t('laboratory.nqlisReagents.colQty'), render: (r) => `${r.total_quantity} ${r.unit}` },
    { key: 'low_stock', label: t('laboratory.nqlisReagents.colStock'), render: (r) => r.low_stock ? <StatusChip label={t('laboratory.nqlisReagents.lowStock')} tone="error" /> : <StatusChip label={t('laboratory.nqlisReagents.sufficient')} tone="success" /> },
    { key: 'reorder_level', label: t('laboratory.nqlisReagents.colReorder'), render: (r) => r.reorder_level || '—', hideOnMobile: true },
  ];

  const lotColumns: DataTableColumn<ReagentLot>[] = [
    { key: 'reagent_name', label: t('laboratory.nqlisReagents.colMaterial'), render: (l) => <Typography fontWeight={700}>{l.reagent_name}</Typography> },
    { key: 'lot_number', label: t('laboratory.nqlisReagents.colLotNumber'), render: (l) => <Typography sx={{ fontFamily: 'monospace' }}>{l.lot_number}</Typography> },
    { key: 'batch_number', label: t('laboratory.shared.batchNumber'), hideOnMobile: true },
    { key: 'quantity', label: t('laboratory.nqlisReagents.colQty'), render: (l) => `${l.quantity} ${l.unit}` },
    { key: 'expiry_date', label: t('laboratory.nqlisReagents.colExpiry'), render: (l) => formatDate(l.expiry_date) },
    { key: 'status', label: t('laboratory.shared.colStatus'), render: (l) => {
        if (l.is_expired) return <StatusChip label={t('laboratory.nqlisReagents.expired')} tone="error" />;
        if (l.status === 'EXPIRING_SOON') return <StatusChip label={t('laboratory.nqlisReagents.expiring')} tone="warning" />;
        return <StatusChip label={t('laboratory.nqlisReagents.valid')} tone="success" />;
      } },
  ];

  return (
    <Box>
      <PageHeader
        title={t('laboratory.nqlisReagents.title')}
        subtitle={t('laboratory.nqlisReagents.subtitle')}
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
          {t('laboratory.nqlisReagents.tabReagents', { count: reagents.count })}
        </Box>
        <Box
          onClick={() => setTab('lots')}
          sx={{
            px: 2, py: 1, borderRadius: 2, cursor: 'pointer', fontWeight: 700,
            bgcolor: tab === 'lots' ? 'primary.main' : 'action.hover',
            color: tab === 'lots' ? 'primary.contrastText' : 'inherit',
          }}
        >
          {t('laboratory.nqlisReagents.tabLots', { count: lots.count })}
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
          title={t('laboratory.nqlisReagents.tableReagents')}
          subtitle={t('laboratory.nqlisReagents.tableReagentsSub', { count: reagents.count })}
          onPageChange={reagents.setPage}
          onRowsPerPageChange={reagents.setRowsPerPage}
          onRefresh={reagents.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('laboratory.nqlisReagents.newMaterial')}</AppButton>
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
          title={t('laboratory.nqlisReagents.tableLots')}
          subtitle={t('laboratory.nqlisReagents.tableLotsSub', { count: lots.count })}
          onPageChange={lots.setPage}
          onRowsPerPageChange={lots.setRowsPerPage}
          onRefresh={lots.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('laboratory.nqlisReagents.newLot')}</AppButton>
          }
        />
      )}

      <FormDialog
        open={open}
        title={tab === 'reagents' ? t('laboratory.nqlisReagents.dialogAddMaterial') : t('laboratory.nqlisReagents.dialogAddLot')}
        icon={<PrescriptionIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        {tab === 'reagents' ? (
          <>
            <FormTextField label={t('laboratory.nqlisReagents.formName')} value={reagentForm.name_ar} onChange={(e) => setReagentForm({ ...reagentForm, name_ar: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormSelect label={t('laboratory.nqlisReagents.formType')} value={reagentForm.material_type} options={materialTypeOptions} onChange={(v) => setReagentForm({ ...reagentForm, material_type: v })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisReagents.unit')} value={reagentForm.unit} onChange={(e) => setReagentForm({ ...reagentForm, unit: e.target.value })} />
          </>
        ) : (
          <>
            <FormSelect label={t('laboratory.nqlisReagents.colMaterial')} value={lotForm.reagent} options={reagentOptions} onChange={(v) => setLotForm({ ...lotForm, reagent: v })} placeholder={t('laboratory.nqlisReagents.formMaterialPlaceholder')} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisReagents.colLotNumber')} value={lotForm.lot_number} onChange={(e) => setLotForm({ ...lotForm, lot_number: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <Stack direction="row" spacing={2}>
              <FormTextField label={t('laboratory.nqlisReagents.colQty')} value={lotForm.quantity} onChange={(e) => setLotForm({ ...lotForm, quantity: e.target.value })} />
              <FormTextField label={t('laboratory.nqlisReagents.unit')} value={lotForm.unit} onChange={(e) => setLotForm({ ...lotForm, unit: e.target.value })} />
            </Stack>
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisReagents.colExpiry')} type="date" value={lotForm.expiry_date} onChange={(e) => setLotForm({ ...lotForm, expiry_date: e.target.value })} />
          </>
        )}
      </FormDialog>
    </Box>
  );
};

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('ar-EG') : '—');

export default NqlisReagents;