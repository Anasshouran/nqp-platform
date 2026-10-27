import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import EditIcon from '@mui/icons-material/Edit';
import ReviewIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
  type StatusTone,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import {
  addSampleTest,
  approveTest,
  enterTestResult,
  getWorklist,
  returnTestResult,
  reviewTest,
  reviseTest,
  saveTestResult,
  startTest,
} from '../../api/endpoints/laboratory';
import type { SampleTest } from '../../types/laboratory';
import { sampleOutcome, samplePriority, sampleTestStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const NqlisWorklist = () => {
  const { t } = useTranslation();
  const { sector } = useLabScope();
  const table = useServerTable<SampleTest>({ fetchData: getWorklist });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const statusMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => Object.fromEntries(Object.entries(sampleTestStatus).map(([k, v]) => [k, { label: t(`laboratory.nqlisWorklist.status.${k}`), tone: v.tone }])),
    [t],
  );
  const outcomeMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => Object.fromEntries(Object.entries(sampleOutcome).map(([k, v]) => [k, { label: t(`laboratory.nqlisWorklist.outcome.${k}`), tone: v.tone }])),
    [t],
  );
  const priorityMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => Object.fromEntries(Object.entries(samplePriority).map(([k, v]) => [k, { label: t(`laboratory.nqlisWorklist.priority.${k}`), tone: v.tone }])),
    [t],
  );

  const statusOptions = Object.entries(sampleTestStatus).map(([v]) => ({ value: v, label: statusMeta[v].label }));
  const outcomeOptions = Object.entries(sampleOutcome).map(([v]) => ({ value: v, label: outcomeMeta[v].label }));

  const [active, setActive] = useState<SampleTest | null>(null);
  const [dialogKind, setDialogKind] = useState<'result' | 'addtest' | 'return'>('result');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [outcome, setOutcome] = useState('POSITIVE');
  const [resultValue, setResultValue] = useState('');
  const [resultText, setResultText] = useState('');
  const [unit, setUnit] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [addTestName, setAddTestName] = useState('');
  const [addTestMethod, setAddTestMethod] = useState('');

  const openResult = (row: SampleTest) => {
    setActive(row);
    setDialogKind('result');
    setOutcome(row.outcome || 'POSITIVE');
    setResultValue(row.result_value != null ? String(row.result_value) : '');
    setResultText(row.result_text || '');
    setUnit(row.unit || '');
    setReferenceRange(row.reference_range || '');
    setNotes(row.notes || '');
    setOpen(true);
  };

  const openReturn = (row: SampleTest) => {
    setActive(row);
    setDialogKind('return');
    setReason('');
    setOpen(true);
  };

  const runStep = async (row: SampleTest, step: 'start' | 'enter' | 'review' | 'approve' | 'revise') => {
    try {
      const map = { start: startTest, enter: enterTestResult, review: reviewTest, approve: approveTest, revise: reviseTest };
      await map[step](row.id);
      notifySuccess(t('laboratory.nqlisWorklist.stepSuccess'));
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisWorklist.stepError'));
    }
  };

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      if (dialogKind === 'result') {
        await saveTestResult(active.id, {
          outcome,
          result_value: resultValue ? Number(resultValue) : null,
          result_text: resultText || undefined,
          unit: unit || undefined,
          reference_range: referenceRange || undefined,
          notes: notes || undefined,
        });
        notifySuccess(t('laboratory.nqlisWorklist.saveSuccess'));
      } else if (dialogKind === 'return') {
        await returnTestResult(active.id, reason || t('laboratory.nqlisWorklist.defaultReturnReason'));
        notifySuccess(t('laboratory.nqlisWorklist.returnSuccess'));
      } else if (dialogKind === 'addtest' && active) {
        await addSampleTest(active.sample, { test_name: addTestName, method: addTestMethod || undefined });
        notifySuccess(t('laboratory.nqlisWorklist.addTestSuccess'));
      }
      setOpen(false);
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisWorklist.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<SampleTest>[] = [
    { key: 'sample_number', label: t('laboratory.nqlisWorklist.colSampleNumber'), render: (row) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.sample_number}</Typography> },
    { key: 'test_name', label: t('laboratory.nqlisWorklist.colTestName'), render: (row) => <Typography fontWeight={700}>{row.test_name}</Typography> },
    { key: 'disease_name', label: t('laboratory.nqlisWorklist.colDiseaseName'), render: (row) => row.disease_name || '—', hideOnMobile: true },
    { key: 'section_name', label: t('laboratory.nqlisWorklist.colSectionName'), render: (row) => row.section_name || '—', hideOnMobile: true },
    { key: 'priority', label: t('laboratory.nqlisWorklist.colPriority'), render: (row) => { const m = priorityMeta[row.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : row.priority; } },
    { key: 'status', label: t('laboratory.nqlisWorklist.colStatus'), render: (row) => { const m = statusMeta[row.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={row.status} tone="neutral" />; } },
    { key: 'is_critical', label: t('laboratory.nqlisWorklist.colIsCritical'), render: (row) => row.is_critical ? <StatusChip label={t('laboratory.nqlisWorklist.critical')} tone="error" /> : null },
    { key: 'assigned_name', label: t('laboratory.nqlisWorklist.colAssignedName'), render: (row) => row.assigned_name || '—', hideOnMobile: true },
    { key: 'actions', label: t('laboratory.nqlisWorklist.colActions'), render: (row) => (
        <Stack direction="row" spacing={0.5}>
          {row.status === 'PENDING' && (
            <Tooltip title={t('laboratory.nqlisWorklist.tooltipStart')}>
              <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); runStep(row, 'start'); }}><PlayCircleIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {(row.status === 'IN_PROGRESS' || row.status === 'DRAFT') && (
            <Tooltip title={t('laboratory.nqlisWorklist.tooltipEnterResult')}>
              <IconButton size="small" color="primary" onClick={() => openResult(row)}><EditIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {row.status === 'DRAFT' && (
            <Tooltip title={t('laboratory.nqlisWorklist.tooltipSubmitForReview')}>
              <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); runStep(row, 'enter'); }}><AddIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {row.status === 'SUBMITTED' && (
            <Tooltip title={t('laboratory.nqlisWorklist.tooltipReview')}>
              <IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); runStep(row, 'review'); }}><ReviewIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {row.status === 'REVIEWED' && (
            <Tooltip title={t('laboratory.nqlisWorklist.tooltipApprove')}>
              <IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); runStep(row, 'approve'); }}><CheckCircleIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {row.status === 'SUBMITTED' && (
            <Tooltip title={t('laboratory.nqlisWorklist.tooltipReturn')}>
              <IconButton size="small" color="warning" onClick={(e) => { e.stopPropagation(); openReturn(row); }}><ReplayIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {row.status === 'COMPLETED' && (
            <Tooltip title={t('laboratory.nqlisWorklist.tooltipRevise')}>
              <IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); runStep(row, 'revise'); }}><WarningAmberIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('laboratory.nqlisWorklist.pageTitle')}
        subtitle={t('laboratory.nqlisWorklist.pageSubtitle')}
        eyebrow="NQLIS"
      />
      <DataTable<SampleTest>
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('laboratory.nqlisWorklist.tableTitle')}
        subtitle={t('laboratory.nqlisWorklist.tableSubtitle', { count })}
        filters={[
          { key: 'status', label: t('laboratory.nqlisWorklist.filterStatus'), options: statusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle={t('laboratory.nqlisWorklist.emptyTitle')}
        emptyDescription={t('laboratory.nqlisWorklist.emptyDescription')}
      />

      <FormDialog
        open={open && dialogKind === 'result'}
        title={t('laboratory.nqlisWorklist.dialogResultTitle')}
        subtitle={active ? `${active.sample_number} · ${active.test_name}` : ''}
        icon={<EditIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <FormSelect label={t('laboratory.nqlisWorklist.formOutcome')} value={outcome} onChange={setOutcome} options={outcomeOptions} />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisWorklist.formResultValue')} value={resultValue} onChange={(e) => setResultValue(e.target.value)} />
        <Box sx={{ height: 16 }} />
        <Stack direction="row" spacing={2}>
          <FormTextField label={t('laboratory.nqlisWorklist.formUnit')} value={unit} onChange={(e) => setUnit(e.target.value)} />
          <FormTextField label={t('laboratory.nqlisWorklist.formReferenceRange')} value={referenceRange} onChange={(e) => setReferenceRange(e.target.value)} />
        </Stack>
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisWorklist.formResultText')} multiline minRows={2} value={resultText} onChange={(e) => setResultText(e.target.value)} />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisWorklist.formNotes')} multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormDialog>

      <FormDialog
        open={open && dialogKind === 'return'}
        title={t('laboratory.nqlisWorklist.dialogReturnTitle')}
        subtitle={active ? `${active.sample_number} · ${active.test_name}` : ''}
        icon={<ReplayIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <FormTextField label={t('laboratory.nqlisWorklist.formReturnReason')} multiline minRows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisWorklist;
