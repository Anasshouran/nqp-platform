import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { PageHeader, DataTable, StatusChip, FormDialog, FormTextField, FormSelect } from '../../../../components/uikit';
import { useServerTable } from '../../../../hooks/useServerTable';
import { getItTickets, createItTicket, updateItTicket } from '../../../../api/endpoints/it';
import type { SupportTicket, TicketPriority, TicketStatus } from '../../../../types/it';

const PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: 'حرجة' },
  { value: 'HIGH', label: 'عالية' },
  { value: 'MEDIUM', label: 'متوسطة' },
  { value: 'LOW', label: 'منخفضة' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'مفتوحة' },
  { value: 'IN_PROGRESS', label: 'قيد المعالجة' },
  { value: 'RESOLVED', label: 'مُعالجة' },
  { value: 'CLOSED', label: 'مغلقة' },
];

const PRIORITY_TONE: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'neutral',
};

const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const EMPTY_FORM: Partial<SupportTicket> = { subject: '', description: '', priority: 'MEDIUM', status: 'OPEN' };

const RedSeaItTicketsPage = () => {
  const navigate = useNavigate();
  const table = useServerTable<SupportTicket>({ fetchData: getItTickets });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<SupportTicket>>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (t: SupportTicket) => {
    setForm({
      subject: t.subject,
      description: t.description,
      priority: t.priority,
      status: t.status,
    });
    setEditingId(t.id);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!(form.subject ?? '').trim()) return;
    setSaving(true);
    const payload = { ...form };
    const op = editingId
      ? updateItTicket(editingId, payload)
      : createItTicket(payload);
    op.then(() => {
      setDialogOpen(false);
      refresh();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  return (
    <Box>
      <PageHeader
        eyebrow="قسم تقنية المعلومات"
        title="تذاكر الدعم الفني"
        subtitle="تتبع بلاغات وأعطال وأنظمة عبر الأولوية والحالة."
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={openCreate}>
            إنشاء تذكرة
          </Button>
        }
      />
      <Box sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/sector/red-sea/it')} color="inherit">
          لوحة تقنية المعلومات
        </Button>
      </Box>
      <DataTable<SupportTicket>
        columns={[
          {
            key: 'subject',
            label: 'التذكرة',
            sortable: true,
            render: (t) => (
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 700 }}>{t.subject}</Typography>
                <Typography variant="caption" color="text.secondary">{t.ticket_no}</Typography>
              </Stack>
            ),
          },
          {
            key: 'priority',
            label: 'الأولوية',
            render: (t) => <StatusChip label={PRIORITY_OPTIONS.find((o) => o.value === t.priority)?.label ?? t.priority} tone={PRIORITY_TONE[t.priority] ?? 'neutral'} />,
          },
          {
            key: 'status',
            label: 'الحالة',
            render: (t) => <StatusChip label={STATUS_OPTIONS.find((o) => o.value === t.status)?.label ?? t.status} tone={STATUS_TONE[t.status] ?? 'neutral'} />,
          },
          { key: 'entry_point_name', label: 'نقطة الدخول', hideOnMobile: true, render: (t) => t.entry_point_name || '—' },
          { key: 'assigned_to_name', label: 'المُسند إليه', hideOnMobile: true, render: (t) => t.assigned_to_name || '—' },
        ]}
        rows={rows}
        rowKey={(t) => t.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة تذاكر الدعم"
        subtitle={`${count} تذكرة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث برقم التذكرة أو الموضوع..."
        filters={[
          { key: 'priority', label: 'الأولوية', options: PRIORITY_OPTIONS, value: '', onChange: (v) => setFilter('priority', v) },
          { key: 'status', label: 'الحالة', options: STATUS_OPTIONS, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد تذاكر"
        emptyDescription="ابدأ بإنشاء تذكرة دعم جديدة."
        actions={(t) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="تعديل">
              <IconButton aria-label="تعديل" size="small" onClick={() => openEdit(t)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      />

      <FormDialog
        open={dialogOpen}
        title={editingId ? 'تعديل تذكرة' : 'إنشاء تذكرة'}
        subtitle="بيانات التذكرة والأولوية والحالة"
        icon={<SupportAgentIcon />}
        onSubmit={handleSubmit}
        loading={saving}
        submitDisabled={!(form.subject ?? '').trim()}
        onClose={() => setDialogOpen(false)}
      >
        <FormTextField label="الموضوع" requiredMark value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="ملخص البلاغ أو الطلب" />
        <FormTextField label="الوصف" multiline minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل المشكلة والخطوات المتخذة" />
        <Stack direction="row" spacing={2}>
          <FormSelect label="الأولوية" value={form.priority ?? ''} onChange={(v) => setForm({ ...form, priority: v as TicketPriority })} options={PRIORITY_OPTIONS} />
          <FormSelect label="الحالة" value={form.status ?? ''} onChange={(v) => setForm({ ...form, status: v as TicketStatus })} options={STATUS_OPTIONS} />
        </Stack>
      </FormDialog>
    </Box>
  );
};

export default RedSeaItTicketsPage;