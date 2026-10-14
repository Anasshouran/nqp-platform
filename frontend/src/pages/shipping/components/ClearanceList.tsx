/**
 * قرارات التخليص الصحي البحري — typed Port Health clearance decisions.
 *
 * Read-only DataTable over `getClearanceDecisions`, with a "record decision"
 * dialog that writes through `recordClearanceDecision` (the only write path).
 * `REFUSED` requires a reason and `CONDITIONAL` requires conditions — validated
 * client-side, mirroring the backend.
 */
import { useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddTaskIcon from '@mui/icons-material/AddTask';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
} from '../../../components/uikit';
import type { DataTableColumn, DataTableFilterDef, FormSelectOption, StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { getClearanceDecisions, recordClearanceDecision } from '../../../api/endpoints/shipping';
import type { ClearanceDecisionType, PortClearanceDecision } from '../../../types/shipping';
import { notifyError, notifySuccess } from '../../../utils/toast';

const DECISION_META: Record<ClearanceDecisionType, { label: string; tone: StatusTone }> = {
  CLEARED: { label: 'مُفرج عنها', tone: 'success' },
  CONDITIONAL: { label: 'إفراج مشروط', tone: 'warning' },
  REFUSED: { label: 'مرفوض', tone: 'error' },
};

const DECISION_OPTIONS: FormSelectOption[] = (Object.keys(DECISION_META) as ClearanceDecisionType[]).map(
  (value) => ({ value, label: DECISION_META[value].label }),
);

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const ClearanceList = () => {
  const table = useServerTable<PortClearanceDecision>({ fetchData: getClearanceDecisions });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput, setFilter,
  } = table;

  const [decisionFilter, setDecisionFilter] = useState('');

  const [detail, setDetail] = useState<PortClearanceDecision | null>(null);

  const [record, setRecord] = useState<PortClearanceDecision | null>(null);
  const [decision, setDecision] = useState<ClearanceDecisionType>('CLEARED');
  const [reason, setReason] = useState('');
  const [conditions, setConditions] = useState('');
  const [saving, setSaving] = useState(false);

  const reasonRequired = decision === 'REFUSED';
  const conditionsRequired = decision === 'CONDITIONAL';
  const recordValid =
    !!decision &&
    (!reasonRequired || reason.trim() !== '') &&
    (!conditionsRequired || conditions.trim() !== '');

  const openRecord = (row: PortClearanceDecision) => {
    setRecord(row);
    setDecision('CLEARED');
    setReason('');
    setConditions('');
  };

  const handleRecord = async () => {
    if (!record || !recordValid) return;
    setSaving(true);
    try {
      await recordClearanceDecision(record.vessel_visit, {
        decision,
        ...(reasonRequired ? { reason: reason.trim() } : {}),
        ...(conditionsRequired ? { conditions: conditions.trim() } : {}),
      });
      notifySuccess('تم تسجيل القرار');
      setRecord(null);
      refresh();
    } catch {
      notifyError('تعذر تسجيل القرار');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<PortClearanceDecision>[] = useMemo(
    () => [
      {
        key: 'vessel',
        label: 'السفينة',
        render: (d) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{d.vessel_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {d.vessel_imo || ''}
            </Typography>
          </Box>
        ),
      },
      { key: 'port_name', label: 'الميناء', render: (d) => d.port_name || d.port_code || '—', hideOnMobile: true },
      {
        key: 'decision',
        label: 'القرار',
        render: (d) => {
          const meta = DECISION_META[d.decision];
          return <StatusChip label={meta?.label ?? d.decision} tone={meta?.tone ?? 'neutral'} />;
        },
      },
      { key: 'decided_at', label: 'تاريخ القرار', render: (d) => d.decided_at || '—', hideOnMobile: true },
      {
        key: 'is_current',
        label: 'الحالة',
        render: (d) =>
          d.is_current ? <StatusChip label="سارٍ" tone="success" /> : <StatusChip label="مُستبدل" tone="neutral" />,
      },
    ],
    [],
  );

  const filters: DataTableFilterDef[] = [
    {
      key: 'decision',
      label: 'القرار',
      options: DECISION_OPTIONS.map((o) => ({ value: o.value, label: String(o.label) })),
      value: decisionFilter,
      onChange: (value) => {
        setDecisionFilter(value);
        setFilter('decision', value);
      },
    },
  ];

  const renderActions = (d: PortClearanceDecision) => (
    <>
      <Tooltip title="عرض">
        <IconButton size="small" aria-label="عرض" onClick={() => setDetail(d)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="تسجيل قرار">
        <IconButton size="small" color="primary" aria-label="تسجيل قرار" onClick={() => openRecord(d)}>
          <AddTaskIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="قرارات التخليص"
        subtitle="قرارات الصحة العامة للموانئ البحرية على رحلات السفن"
      />

      <DataTable<PortClearanceDecision>
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قرارات التخليص"
        subtitle={`${count} قرار`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالسفينة أو رقم IMO..."
        filters={filters}
        actions={renderActions}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد قرارات"
        emptyDescription="قرارات التخليص المسجلة تظهر هنا"
      />

      {/* Record decision */}
      <FormDialog
        open={record !== null}
        title="تسجيل قرار تخليص"
        subtitle={record ? `${record.vessel_name} · ${record.port_name || record.port_code}` : ''}
        icon={<AddTaskIcon />}
        onClose={() => setRecord(null)}
        onSubmit={handleRecord}
        submitLabel="تسجيل القرار"
        loading={saving}
        submitDisabled={!recordValid}
      >
        <FormSelect
          label="القرار"
          value={decision}
          onChange={(v) => setDecision(v as ClearanceDecisionType)}
          options={DECISION_OPTIONS}
          requiredMark
        />
        {reasonRequired && (
          <FormTextField
            label="سبب الرفض"
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            requiredMark
            helperText="سبب الرفض مطلوب"
          />
        )}
        {conditionsRequired && (
          <FormTextField
            label="شروط الإفراج"
            multiline
            minRows={2}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            requiredMark
            helperText="شروط الإفراج مطلوبة"
          />
        )}
      </FormDialog>

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل القرار</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <Row label="السفينة" value={detail.vessel_name} />
              <Row label="IMO" value={detail.vessel_imo} />
              <Row label="الميناء" value={detail.port_name || detail.port_code} />
              <Row
                label="القرار"
                value={
                  <StatusChip
                    label={DECISION_META[detail.decision]?.label ?? detail.decision}
                    tone={DECISION_META[detail.decision]?.tone ?? 'neutral'}
                  />
                }
              />
              <Row label="سبب الرفض" value={detail.reason} />
              <Row label="الشروط" value={detail.conditions} />
              <Row label="صدر عن" value={detail.decided_by_name} />
              <Row label="تاريخ القرار" value={detail.decided_at} />
              <Row label="الحالة" value={detail.is_current ? 'سارٍ' : 'مُستبدل'} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
