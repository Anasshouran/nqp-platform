import { useState } from 'react';
import { cmsContentRole } from "../../../../../api/endpoints/cmsWorkflow";
import { useAuth } from "../../../../../hooks/useAuth";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DataTable, SectionCard, FormDialog, ConfirmDialog } from '../../../../../components/uikit';
import type { DataTableColumn } from '../../../../../components/uikit';
import {
  getCmsCirculars,
  createCmsCircular,
  updateCmsCircular,
  deleteCmsCircular,
} from '../../../../../api/endpoints/cms';
import type { CmsCircular, ContentStatus } from '../../../../../api/endpoints/cms';

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' }> = {
  PUBLISHED: { label: 'منشور', color: 'success' },
  APPROVED: { label: 'معتمد', color: 'info' },
  DRAFT: { label: 'مسودة', color: 'warning' },
  REVIEW: { label: 'مراجعة', color: 'warning' },
  ARCHIVED: { label: 'مؤرشف', color: 'error' },
};

const PRIORITY_META: Record<string, { label: string; color: 'error' | 'warning' | 'default' }> = {
  URGENT: { label: 'عاجل', color: 'error' },
  IMPORTANT: { label: 'مهم', color: 'warning' },
  NORMAL: { label: 'عادي', color: 'default' },
};

const CATEGORIES = ['OFFICIAL', 'HEALTH', 'ADMIN', 'TRAVEL', 'OTHER'].map((v) => ({
  value: v,
  label: v === 'OFFICIAL' ? 'رسمي' : v === 'HEALTH' ? 'صحي' : v === 'ADMIN' ? 'إداري' : v === 'TRAVEL' ? 'سفر' : 'أخرى',
}));

const EMPTY: Partial<CmsCircular> = {
  title: '',
  body: '',
  category: 'OFFICIAL',
  priority: 'NORMAL',
  status: 'DRAFT',
  reference_number: '',
};

const RedSeaCircularsPanel = () => {
  const [rows, setRows] = useState<CmsCircular[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<CmsCircular | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CmsCircular | null>(null);
  const [form, setForm] = useState<Partial<CmsCircular>>(EMPTY);
  const { user } = useAuth();
  const role = cmsContentRole(user?.role);

  const load = (params?: Record<string, unknown>) => {
    setLoading(true);
    getCmsCirculars(params)
      .then((res) => {
        setRows(res.data.data.results);
        setCount(res.data.data.count);
      })
      .catch(() => {
        setRows([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpened(true);
  };

  const openEdit = (row: CmsCircular) => {
    setEditing(row);
    setForm({
      title: row.title,
      body: row.body,
      category: row.category,
      priority: row.priority,
      status: row.status,
      reference_number: row.reference_number ?? '',
    });
    setOpened(true);
  };

  const save = () => {
    setSaving(true);
    const payload = { ...form, status: (role === 'approver' ? (form.status === 'PUBLISHED' ? 'PUBLISHED' : form.status) : 'DRAFT') as ContentStatus, is_published: false };
    const op = editing ? updateCmsCircular(editing.id, payload) : createCmsCircular(payload);
    op.then(() => {
      setOpened(false);
      load();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const columns: DataTableColumn<CmsCircular>[] = [
    {
      key: 'title',
      label: 'العنوان',
      render: (r) => (
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography>
          {r.reference_number && (
            <Typography variant="caption" color="text.secondary" dir="ltr">
              {r.reference_number}
            </Typography>
          )}
        </Box>
      ),
      noWrap: false,
    },
    {
      key: 'category',
      label: 'الفئة',
      render: (r) => CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category,
    },
    {
      key: 'priority',
      label: 'الأولوية',
      render: (r) => {
        const m = PRIORITY_META[r.priority] ?? PRIORITY_META.NORMAL;
        return <Chip size="small" label={m.label} color={m.color} variant="outlined" />;
      },
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (r) => {
        const m = STATUS_META[r.status] ?? STATUS_META.DRAFT;
        return <Chip size="small" label={m.label} color={m.color} variant="outlined" />;
      },
    },
  ];

  return (
    <SectionCard
      title="التعاميم الرسمية"
      subtitle="نشر التعاميم والتنبيهات الرسمية للقطاع"
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          إضافة تعميم
        </Button>
      }
    >
      <DataTable<CmsCircular>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        count={count}
        page={1}
        rowsPerPage={count || 10}
        loading={loading}
        hidePagination
        actions={(r) => (
          <>
            <IconButton aria-label="تعديل" onClick={() => openEdit(r)} color="primary"><EditIcon /></IconButton>
            <IconButton aria-label="حذف" onClick={() => setDeleting(r)} color="error"><DeleteIcon /></IconButton>
          </>
        )}
      />

      <FormDialog
        open={opened}
        title={editing ? 'تعديل تعميم' : 'إضافة تعميم'}
        maxWidth="md"
        onClose={() => setOpened(false)}
        onSubmit={save}
        loading={saving}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="العنوان" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="المحتوى" required multiline minRows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth label="الفئة" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth label="الأولوية" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {Object.entries(PRIORITY_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            {role === 'approver' ? (<TextField select fullWidth label="الحالة" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}>
              {Object.entries(STATUS_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
            </TextField>) : (<TextField fullWidth label="الحالة" value={form.status ? STATUS_META[form.status] : STATUS_META.DRAFT?.label ?? form.status} InputProps={{ readOnly: true }} />)}
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="الرقم المرجعي" value={form.reference_number} onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))} />
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف التعميم"
        message={`هل أنت متأكد من حذف "${deleting?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={() => {
          if (!deleting) return;
          deleteCmsCircular(deleting.id).then(() => {
            setDeleting(null);
            load();
          });
        }}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default RedSeaCircularsPanel;
