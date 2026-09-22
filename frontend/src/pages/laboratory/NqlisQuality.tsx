import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import PendingIcon from '@mui/icons-material/PendingActions';
import CloseIcon from '@mui/icons-material/Cancel';
import RocketIcon from '@mui/icons-material/RocketLaunch';
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
import {
  createCapaRecord,
  createNonConformity,
  getCapaRecords,
  getNonConformities,
  setCapaStatus,
  setNonConformityStatus,
} from '../../api/endpoints/laboratory';
import type { CapaRecord, NonConformity } from '../../types/laboratory';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const ncStatusMap: Record<string, { label: string; tone: 'info' | 'warning' | 'error' | 'success' }> = {
  OPEN: { label: 'مفتوحة', tone: 'error' },
  UNDER_INVESTIGATION: { label: 'قيد التحقيق', tone: 'warning' },
  AWAITING_CAPA: { label: 'بانتظار الإجراء التصحيحي', tone: 'warning' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

const ncTypeMap: Record<string, string> = {
  SAMPLE: 'عينة', TEST: 'فحص', QC: 'جودة', EQUIPMENT: 'جهاز', REAGENT: 'مادة',
  METHOD: 'طريقة', PERSONNEL: 'كادر', DOCUMENTATION: 'توثيق', RESULT: 'نتيجة', SLA: 'مدة إنجاز',
};

const capaStatusMap: Record<string, { label: string; tone: 'info' | 'warning' | 'success' }> = {
  OPEN: { label: 'مفتوح', tone: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'warning' },
  VERIFICATION: { label: 'قيد التحقق', tone: 'warning' },
  CLOSED: { label: 'مغلق', tone: 'success' },
};

const severityMap = [
  { value: 'MINOR', label: 'طفيف' },
  { value: 'MAJOR', label: 'جوهري' },
  { value: 'CRITICAL', label: 'حرج' },
];

const NqlisQuality = () => {
  const { sector } = useLabScope();
  const ncs = useServerTable<NonConformity>({ fetchData: getNonConformities });
  const capas = useServerTable<CapaRecord>({ fetchData: getCapaRecords });

  useEffect(() => {
    ncs.setFilter('sector', sector ?? '');
    capas.setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [tab, setTab] = useState<'nc' | 'capa'>('nc');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ncForm, setNcForm] = useState({ title: '', description: '', nc_type: 'SAMPLE', severity: 'MAJOR', reference_number: '' });
  const [capaForm, setCapaForm] = useState<{ title: string; corrective_action: string; preventive_action: string; due_date: string; non_conformity?: string }>({ title: '', corrective_action: '', preventive_action: '', due_date: '', non_conformity: '' });

  const ncOptions = ncs.rows.map((n) => ({ value: n.id, label: `${n.nc_number} — ${n.title}` }));

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      if (tab === 'nc') {
        await createNonConformity(ncForm);
        notifySuccess('تم إنشاء عدم المطابقة');
        setNcForm({ title: '', description: '', nc_type: 'SAMPLE', severity: 'MAJOR', reference_number: '' });
        ncs.refresh();
      } else {
        if (!capaForm.non_conformity) {
          notifyError('اختر عدم المطابقة');
          return;
        }
        await createCapaRecord(capaForm);
        notifySuccess('تم إنشاء الإجراء التصحيحي والوقائي');
        setCapaForm({ title: '', corrective_action: '', preventive_action: '', due_date: '', non_conformity: '' });
        capas.refresh();
        ncs.refresh();
      }
      setOpen(false);
    } catch {
      notifyError('تعذر الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNcStatus = async (nc: NonConformity, status: string) => {
    try {
      await setNonConformityStatus(nc.id, status);
      notifySuccess('تم تحديث حالة عدم المطابقة');
      ncs.refresh();
    } catch {
      notifyError('تعذر التحديث');
    }
  };

  const handleCapaStatus = async (capa: CapaRecord, status: string) => {
    try {
      await setCapaStatus(capa.id, status);
      notifySuccess('تم تحديث حالة الإجراء');
      capas.refresh();
      ncs.refresh();
    } catch {
      notifyError('تعذر التحديث');
    }
  };

  const ncColumns: DataTableColumn<NonConformity>[] = [
    { key: 'nc_number', label: 'الرقم', render: (n) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{n.nc_number}</Typography> },
    { key: 'title', label: 'العنوان', render: (n) => <Typography fontWeight={700}>{n.title}</Typography> },
    { key: 'nc_type', label: 'النوع', render: (n) => ncTypeMap[n.nc_type] || n.nc_type, hideOnMobile: true },
    { key: 'severity', label: 'الخطورة', render: (n) => <StatusChip label={severityMap.find((s) => s.value === n.severity)?.label || n.severity} tone={n.severity === 'CRITICAL' ? 'error' : n.severity === 'MAJOR' ? 'warning' : 'success'} /> },
    { key: 'status', label: 'الحالة', render: (n) => { const m = ncStatusMap[n.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={n.status} tone="neutral" />; } },
    { key: 'capa_count', label: 'الإجراءات', render: (n) => n.capa_count, hideOnMobile: true },
    { key: 'reported_by_name', label: 'المبلّغ', render: (n) => n.reported_by_name || '—', hideOnMobile: true },
    { key: 'actions', label: 'إجراء', render: (n) => (
        <Stack direction="row" spacing={0.5}>
          {n.status !== 'CLOSED' && (
            <Tooltip title="قيد التحقيق">
              <IconButton size="small" color="warning" onClick={() => handleNcStatus(n, 'UNDER_INVESTIGATION')}><PendingIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {(n.status === 'UNDER_INVESTIGATION' || n.status === 'AWAITING_CAPA') && (
            <Tooltip title="إغلاق">
              <IconButton size="small" color="success" onClick={() => handleNcStatus(n, 'CLOSED')}><CloseIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  const capaColumns: DataTableColumn<CapaRecord>[] = [
    { key: 'nc_number', label: 'عدم المطابقة', render: (c) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.nc_number}</Typography> },
    { key: 'title', label: 'الإجراء', render: (c) => <Typography fontWeight={700}>{c.title}</Typography> },
    { key: 'corrective_action', label: 'التصحيحي', hideOnMobile: true },
    { key: 'responsible_name', label: 'المسؤول', render: (c) => c.responsible_name || '—', hideOnMobile: true },
    { key: 'due_date', label: 'الاستحقاق', render: (c) => c.due_date ? c.due_date.slice(0, 10) : '—' },
    { key: 'status', label: 'الحالة', render: (c) => { const m = capaStatusMap[c.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={c.status} tone="neutral" />; } },
    { key: 'actions', label: 'إجراء', render: (c) => (
        <Stack direction="row" spacing={0.5}>
          {c.status === 'OPEN' && (
            <Tooltip title="بدء التنفيذ">
              <IconButton size="small" color="primary" onClick={() => handleCapaStatus(c, 'IN_PROGRESS')}><RocketIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {c.status === 'IN_PROGRESS' && (
            <Tooltip title="إرسال للتحقق">
              <IconButton size="small" color="warning" onClick={() => handleCapaStatus(c, 'VERIFICATION')}><PendingIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {c.status === 'VERIFICATION' && (
            <Tooltip title="إغلاق">
              <IconButton size="small" color="success" onClick={() => handleCapaStatus(c, 'CLOSED')}><CloseIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="الجودة"
        subtitle="عدم المطابقة والإجراءات التصحيحية والوقائية"
        eyebrow="NQLIS"
      />
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Box
          onClick={() => setTab('nc')}
          sx={{ px: 2, py: 1, borderRadius: 2, cursor: 'pointer', fontWeight: 700, bgcolor: tab === 'nc' ? 'primary.main' : 'action.hover', color: tab === 'nc' ? 'primary.contrastText' : 'inherit' }}
        >
          عدم المطابقة ({ncs.count})
        </Box>
        <Box
          onClick={() => setTab('capa')}
          sx={{ px: 2, py: 1, borderRadius: 2, cursor: 'pointer', fontWeight: 700, bgcolor: tab === 'capa' ? 'primary.main' : 'action.hover', color: tab === 'capa' ? 'primary.contrastText' : 'inherit' }}
        >
          الإجراءات CAPA ({capas.count})
        </Box>
      </Box>

      {tab === 'nc' ? (
        <DataTable<NonConformity>
          columns={ncColumns}
          rows={ncs.rows}
          rowKey={(n) => n.id}
          count={ncs.count}
          page={ncs.page}
          rowsPerPage={ncs.rowsPerPage}
          pageSizeOptions={ncs.pageSizeOptions}
          loading={ncs.loading}
          error={ncs.error}
          title="عدم المطابقة"
          subtitle={`${ncs.count} سجل`}
          onPageChange={ncs.setPage}
          onRowsPerPageChange={ncs.setRowsPerPage}
          onRefresh={ncs.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>سجل جديد</AppButton>
          }
        />
      ) : (
        <DataTable<CapaRecord>
          columns={capaColumns}
          rows={capas.rows}
          rowKey={(c) => c.id}
          count={capas.count}
          page={capas.page}
          rowsPerPage={capas.rowsPerPage}
          pageSizeOptions={capas.pageSizeOptions}
          loading={capas.loading}
          error={capas.error}
          title="الإجراءات التصحيحية والوقائية"
          subtitle={`${capas.count} إجراء`}
          onPageChange={capas.setPage}
          onRowsPerPageChange={capas.setRowsPerPage}
          onRefresh={capas.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>إجراء جديد</AppButton>
          }
        />
      )}

      <FormDialog
        open={open}
        title={tab === 'nc' ? 'إنشاء عدم مطابقة' : 'إنشاء إجراء تصحيحي ووقائي'}
        icon={<FactCheckIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        {tab === 'nc' ? (
          <>
            <FormTextField label="العنوان" value={ncForm.title} onChange={(e) => setNcForm({ ...ncForm, title: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label="الوصف" multiline minRows={2} value={ncForm.description} onChange={(e) => setNcForm({ ...ncForm, description: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormSelect label="النوع" value={ncForm.nc_type} options={Object.entries(ncTypeMap).map(([v, l]) => ({ value: v, label: l }))} onChange={(v) => setNcForm({ ...ncForm, nc_type: v })} />
            <Box sx={{ height: 16 }} />
            <FormSelect label="الخطورة" value={ncForm.severity} options={severityMap} onChange={(v) => setNcForm({ ...ncForm, severity: v })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label="رقم المرجع" value={ncForm.reference_number} onChange={(e) => setNcForm({ ...ncForm, reference_number: e.target.value })} />
          </>
        ) : (
          <>
            <FormSelect label="عدم المطابقة" value={capaForm.non_conformity || ''} options={ncOptions} onChange={(v) => setCapaForm({ ...capaForm, non_conformity: v })} placeholder="اختر عدم المطابقة" />
            <Box sx={{ height: 16 }} />
            <FormTextField label="عنوان الإجراء" value={capaForm.title} onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label="الإجراء التصحيحي" multiline minRows={2} value={capaForm.corrective_action} onChange={(e) => setCapaForm({ ...capaForm, corrective_action: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label="الإجراء الوقائي" multiline minRows={2} value={capaForm.preventive_action} onChange={(e) => setCapaForm({ ...capaForm, preventive_action: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label="تاريخ الاستحقاق" type="date" value={capaForm.due_date} onChange={(e) => setCapaForm({ ...capaForm, due_date: e.target.value })} />
          </>
        )}
      </FormDialog>
    </Box>
  );
};

export default NqlisQuality;