import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import StatusChip from '../../components/ui/StatusChip';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import { useServerTable } from '../../hooks/useServerTable';
import { getDepartments } from '../../api/endpoints/organization';
import {
  closePerformanceCycle,
  getPerformanceCycles,
  openPerformanceCycle,
} from '../../api/endpoints/hr';
import type { PerformanceCycle } from '../../types/hr';
import type { Department } from '../../types/organization';
import { CYCLE_STATUS_LABELS } from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const PerformanceCyclesPage = () => {
  const navigate = useNavigate();

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh,
  } = useServerTable<PerformanceCycle>({
    fetchData: (params) => getPerformanceCycles(params),
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [closing, setClosing] = useState<PerformanceCycle | null>(null);
  const [opening, setOpening] = useState<PerformanceCycle | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getDepartments({ page_size: 100 })
      .then(({ data }) => setDepartments(data.data?.results ?? []))
      .catch(() => setDepartments([]));
  }, []);

  const reload = useCallback(async () => {
    refresh();
  }, [refresh]);

  const columns = useMemo<DataTableColumn<PerformanceCycle>[]>(
    () => [
      {
        key: 'name',
        label: 'الدورة',
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(row.period_start)} ← {formatDate(row.period_end)}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => (
          <StatusChip
            label={CYCLE_STATUS_LABELS[row.status] ?? row.status}
            tone={
              row.status === 'OPEN'
                ? 'info'
                : row.status === 'CLOSED'
                  ? 'success'
                  : 'neutral'
            }
          />
        ),
      },
      {
        key: 'kpi_weight_total',
        label: 'مجموع أوزان KPIs',
        align: 'center' as const,
        render: (row) => `${row.kpi_weight_total}%`,
      },
      {
        key: 'review_count',
        label: 'التقييمات',
        sortable: true,
        align: 'center' as const,
        render: (row) =>
          row.review_count === null || row.approved_count === null
            ? '—'
            : `${row.approved_count}/${row.review_count}`,
      },
      {
        key: 'review_due_date',
        label: 'موعد الاعتماد',
        sortable: true,
        hideOnMobile: true,
        render: (row) => formatDate(row.review_due_date),
      },
      {
        key: 'actions',
        label: 'إجراءات',
        align: 'right' as const,
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Button size="small" onClick={() => navigate(`/app/hr/performance/cycles/${row.id}`)}>
              المؤشرات
            </Button>
            {row.status === 'DRAFT' && (
              <Button
                size="small"
                color="success"
                startIcon={<LockOpenIcon />}
                onClick={() => setOpening(row)}
              >
                فتح
              </Button>
            )}
            {row.status === 'OPEN' && (
              <Button
                size="small"
                color="secondary"
                startIcon={<CloseIcon />}
                onClick={() => setClosing(row)}
              >
                إغلاق
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [navigate],
  );

  const onOpen = async () => {
    if (!opening) return;
    setBusy(true);
    setFormError(null);
    try {
      await openPerformanceCycle(opening.id);
      notifySuccess('فُتحت الدورة للتقييم');
      setOpening(null);
      await reload();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'تعذر فتح الدورة'));
    } finally {
      setBusy(false);
    }
  };

  const onClose = async () => {
    if (!closing) return;
    setBusy(true);
    setFormError(null);
    try {
      await closePerformanceCycle(closing.id, note.trim());
      notifySuccess('تم إغلاق الدورة');
      setClosing(null);
      setNote('');
      await reload();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'تعذر إغلاق الدورة'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="دورات تقييم الأداء"
        subtitle="الإغلاق يتطلب أن يساوي مجموع أوزان المؤشرات 100 وأن تُعتمد كل التقييمات"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ListAltIcon />}
              onClick={() => navigate('/app/hr/performance/reviews')}
            >
              التقييمات
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/hr/performance/cycles/new')}
            >
              دورة جديدة
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          pageSizeOptions={pageSizeOptions}
          loading={loading}
          error={null}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="بحث باسم الدورة..."
          filters={[
            {
              key: 'status',
              label: 'الحالة',
              options: [
                { value: '', label: 'كل الحالات' },
                ...Object.entries(CYCLE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ],
              value: '',
              onChange: (v) => setFilter('status', v),
            },
            {
              key: 'department',
              label: 'الإدارة',
              options: [
                { value: '', label: 'كل الإدارات' },
                ...departments.map((d) => ({ value: d.id, label: d.name_ar })),
              ],
              value: '',
              onChange: (v) => setFilter('department', v),
            },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSorting}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onRefresh={refresh}
          actionsLabel="إجراءات"
          actions={() => null}
          emptyTitle="لا توجد دورات تقييم"
          emptyDescription="أنشئ دورة، عرّف مؤشراتها بأوزان، ثم افتحها للتقييم."
        />
      )}

      {opening && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              فتح دورة للتقييم: {opening.name}
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              بعد الفتح يمكن إضافة التقييمات لها. الفتح يحتاج مؤشراً واحداً على الأقل،
              ومجموع أوزان المؤشرات يجب أن يبلغ 100 قبل الإغلاق.
            </Alert>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
            )}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="success"
                startIcon={<LockOpenIcon />}
                disabled={busy}
                onClick={onOpen}
              >
                تأكيد الفتح
              </Button>
              <Button onClick={() => { setOpening(null); setFormError(null); }}>إلغاء</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {closing && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              إغلاق: {closing.name}
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              الإغلاق نهائي: لن تُقبل تقييمات جديدة، ومجموع أوزان المؤشرات يجب أن يساوي
              100 وجميع التقييمات معتمدة.
            </Alert>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
            )}
            <FormTextField
              label="ملاحظة الإغلاق"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" color="secondary" disabled={busy} onClick={onClose}>
                تأكيد الإغلاق
              </Button>
              <Button onClick={() => { setClosing(null); setFormError(null); }}>
                إلغاء
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PerformanceCyclesPage;
