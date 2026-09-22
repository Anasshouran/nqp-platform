import { useState } from 'react';
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
import { DataTable, FormDialog, SectionCard, ConfirmDialog } from '../../../../../components/uikit';
import type { DataTableColumn } from '../../../../../components/uikit';
import {
  getCmsAnnouncements,
  createCmsAnnouncement,
  updateCmsAnnouncement,
  deleteCmsAnnouncement,
} from '../../../../../api/endpoints/cms';
import type { CmsAnnouncement, ContentStatus } from '../../../../../api/endpoints/cms';
import { cmsContentRole } from '../../../../../api/endpoints/cmsWorkflow.ts';
import { useAuth } from '../../../../../hooks/useAuth';
import { useSectorContent } from '../../../../sector-content/sectorContentContext';

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' }> = {
  PUBLISHED: { label: 'منشور', color: 'success' },
  APPROVED: { label: 'معتمد', color: 'info' },
  DRAFT: { label: 'مسودة', color: 'warning' },
  REVIEW: { label: 'مراجعة', color: 'warning' },
  ARCHIVED: { label: 'مؤرشف', color: 'error' },
};

const PRIORITIES = [
  { value: 'NORMAL', label: 'عادي' },
  { value: 'IMPORTANT', label: 'مهم' },
  { value: 'URGENT', label: 'عاجل' },
];

const AUDIENCE_OPTIONS = [
  { value: 'TRAVELERS', label: 'المسافرون' },
  { value: 'AIRLINES', label: 'شركات الطيران' },
  { value: 'PORT_STAFF', label: 'العاملون بالمنافذ' },
  { value: 'GENERAL', label: 'عامة' },
];

const toLocalInput = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY: Partial<CmsAnnouncement> = {
  title: '',
  title_en: '',
  body: '',
  priority: 'NORMAL',
  audience: [],
  start_at: '',
  end_at: '',
  status: 'DRAFT',
  is_published: false,
};

const AnnouncementsPanel = () => {
  const { sectorName } = useSectorContent();
  const { user } = useAuth();
  const role = cmsContentRole(user?.role);
  const [rows, setRows] = useState<CmsAnnouncement[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<CmsAnnouncement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CmsAnnouncement | null>(null);
  const [form, setForm] = useState<Partial<CmsAnnouncement>>(EMPTY);

  const load = (params?: Record<string, unknown>) => {
    setLoading(true);
    getCmsAnnouncements(params)
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

  const refresh = () => {
    const params: Record<string, unknown> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    load(params);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpened(true);
  };

  const openEdit = (row: CmsAnnouncement) => {
    setEditing(row);
    setForm({
      title: row.title,
      title_en: row.title_en ?? '',
      body: row.body,
      priority: row.priority,
      audience: row.audience ?? [],
      start_at: toLocalInput(row.start_at),
      end_at: toLocalInput(row.end_at),
      status: row.status,
      is_published: row.is_published,
    });
    setOpened(true);
  };

  const save = () => {
    setSaving(true);
    const payload = {
      ...form,
      status: role === 'approver' ? (form.status === 'PUBLISHED' ? 'PUBLISHED' : form.status) as ContentStatus : 'DRAFT',
      is_published: role === 'approver' ? !!form.is_published : false,
    };
    const op = editing
      ? updateCmsAnnouncement(editing.id, payload)
      : createCmsAnnouncement(payload);
    op.then(() => {
      setOpened(false);
      refresh();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteCmsAnnouncement(deleting.id)
      .then(() => {
        setDeleting(null);
        refresh();
      })
      .catch(() => undefined);
  };

  const toggleAudience = (value: string) => {
    setForm((f) => {
      const list = f.audience ?? [];
      return {
        ...f,
        audience: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  };

  const columns: DataTableColumn<CmsAnnouncement>[] = [
    {
      key: 'title',
      label: 'العنوان',
      render: (r) => (
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography>
          {r.priority === 'URGENT' && (
            <Chip label="عاجل" size="small" color="error" sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
          )}
          {r.priority === 'IMPORTANT' && (
            <Chip label="مهم" size="small" color="warning" sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
          )}
        </Box>
      ),
      noWrap: false,
    },
    {
      key: 'audience',
      label: 'الجمهور',
      render: (r) => (r.audience ?? []).length ? (r.audience ?? []).join('، ') : '—',
    },
    {
      key: 'start_at',
      label: 'النافذة الزمنية',
      render: (r) =>
        r.start_at || r.end_at
          ? `${r.start_at ? new Date(r.start_at).toLocaleDateString('ar-EG') : '—'} → ${r.end_at ? new Date(r.end_at).toLocaleDateString('ar-EG') : '—'}`
          : '—',
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (r) => {
        const meta = STATUS_META[r.status] ?? STATUS_META.DRAFT;
        return <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />;
      },
    },
  ];

  return (
    <SectionCard
      title="الإعلانات والتنبيهات"
      subtitle={`إدارة إعلانات ${sectorName}`}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          إضافة إعلان
        </Button>
      }
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', md: 260 } }}
        />
        <TextField
          select
          size="small"
          label="الحالة"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ width: { xs: '100%', md: 180 } }}
        >
          <MenuItem value="">الكل</MenuItem>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <MenuItem key={k} value={k}>{m.label}</MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={refresh}>بحث</Button>
      </Stack>

      <DataTable<CmsAnnouncement>
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
            
            <IconButton aria-label="تعديل" onClick={() => openEdit(r)} color="primary" sx={{ ml: 0.5 }}>
              <EditIcon />
            </IconButton>
            <IconButton aria-label="حذف" onClick={() => setDeleting(r)} color="error">
              <DeleteIcon />
            </IconButton>
          </>
        )}
      />

      <FormDialog
        open={opened}
        title={editing ? 'تعديل إعلان' : 'إضافة إعلان جديد'}
        subtitle={sectorName}
        maxWidth="md"
        onClose={() => setOpened(false)}
        onSubmit={save}
        loading={saving}
        submitLabel="حفظ"
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="العنوان (عربي)" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="العنوان (English)" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="الأولوية" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="محتوى الإعلان" multiline minRows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              الجمهور المستهدف
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {AUDIENCE_OPTIONS.map((a) => (
                <Chip
                  key={a.value}
                  label={a.label}
                  color={(form.audience ?? []).includes(a.value) ? 'primary' : 'default'}
                  onClick={() => toggleAudience(a.value)}
                />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="بداية الظهور"
              type="datetime-local"
              value={form.start_at ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="نهاية الظهور"
              type="datetime-local"
              value={form.end_at ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            {role === 'approver' ? (
              <TextField select fullWidth label="الحالة" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}>
                {Object.entries(STATUS_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
              </TextField>
            ) : (
              <TextField fullWidth label="الحالة" value={form.status ? STATUS_META[form.status] : STATUS_META.DRAFT?.label ?? form.status} InputProps={{ readOnly: true }} />
            )}
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف الإعلان"
        message={`هل أنت متأكد من حذف "${deleting?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default AnnouncementsPanel;
