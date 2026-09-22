import { useState } from 'react';
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
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
import { DataTable, FormDialog, SectionCard, ConfirmDialog } from '../../../../../components/uikit';
import type { DataTableColumn } from '../../../../../components/uikit';
import {
  getCmsNews,
  createCmsNews,
  updateCmsNews,
  deleteCmsNews,
} from '../../../../../api/endpoints/cms';
import type { CmsNews, ContentStatus } from '../../../../../api/endpoints/cms';
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

const CATEGORIES = [
  { value: 'GENERAL', label: 'عام' },
  { value: 'HEALTH', label: 'صحي' },
  { value: 'TRAVEL', label: 'سفر' },
  { value: 'OFFICIAL', label: 'رسمي' },
];

const EMPTY: Partial<CmsNews> = {
  title: '',
  title_en: '',
  summary: '',
  content: '',
  category: 'GENERAL',
  status: 'DRAFT',
  is_published: false,
  is_urgent: false,
  is_featured: false,
  keywords: [],
};

const RedSeaNewsPanel = () => {
  const { sectorName } = useSectorContent();
  const { user } = useAuth();
  const role = cmsContentRole(user?.role);
  const [rows, setRows] = useState<CmsNews[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<CmsNews | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CmsNews | null>(null);
  const [form, setForm] = useState<Partial<CmsNews>>(EMPTY);
  const [keywordInput, setKeywordInput] = useState('');

  const load = (params?: Record<string, unknown>) => {
    setLoading(true);
    getCmsNews(params)
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
    setKeywordInput('');
    setOpened(true);
  };

  const openEdit = (row: CmsNews) => {
    setEditing(row);
    setForm({
      title: row.title,
      title_en: row.title_en ?? '',
      summary: row.summary ?? '',
      content: row.content,
      category: row.category,
      status: row.status,
      is_published: row.is_published,
      is_urgent: row.is_urgent ?? false,
      is_featured: row.is_featured ?? false,
      keywords: row.keywords ?? [],
    });
    setKeywordInput((row.keywords ?? []).join('، '));
    setOpened(true);
  };

  const save = () => {
    setSaving(true);
    const payload = {
      ...form,
      keywords: keywordInput.split('،').map((k) => k.trim()).filter(Boolean),
      status: (role === 'approver' ? (form.status === 'PUBLISHED' ? 'PUBLISHED' : form.status) : 'DRAFT') as ContentStatus,
      is_published: role === 'approver' ? !!form.is_published : false,
    };
    const op = editing
      ? updateCmsNews(editing.id, payload)
      : createCmsNews(payload);
    op.then(() => {
      setOpened(false);
      refresh();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteCmsNews(deleting.id)
      .then(() => {
        setDeleting(null);
        refresh();
      })
      .catch(() => undefined);
  };

  const addKeyword = () => {
    const vals = keywordInput.split('،').map((k) => k.trim()).filter(Boolean);
    setForm((f) => ({ ...f, keywords: vals }));
  };

  const columns: DataTableColumn<CmsNews>[] = [
    {
      key: 'title',
      label: 'العنوان',
      render: (r) => (
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography>
          {r.is_urgent && (
            <Chip label="عاجل" size="small" color="error" sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
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
      key: 'published_at',
      label: 'التاريخ',
      render: (r) =>
        r.published_at ? new Date(r.published_at).toLocaleDateString('ar-EG') : '—',
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
      title="الأخبار"
      subtitle={`إدارة أخبار ${sectorName}`}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          إضافة خبر جديد
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

      <DataTable<CmsNews>
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
            <IconButton aria-label="تعديل" onClick={() => openEdit(r)} color="primary">
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
        title={editing ? 'تعديل خبر' : 'إضافة خبر جديد'}
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
            <TextField select fullWidth label="التصنيف" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="ملخص الخبر" multiline minRows={2} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="المحتوى" multiline minRows={5} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            {role === 'approver' ? (
              <TextField select fullWidth label="الحالة" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}>
                {Object.entries(STATUS_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
              </TextField>
            ) : (
              <TextField fullWidth label="الحالة" value={form.status ? STATUS_META[form.status] : STATUS_META.DRAFT?.label ?? form.status} InputProps={{ readOnly: true }} />
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="الكلمات المفتاحية" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onBlur={addKeyword} helperText="افصل بين الكلمات بفاصلة" />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Chip
                label="عاجل"
                color={form.is_urgent ? 'error' : 'default'}
                onClick={() => setForm((f) => ({ ...f, is_urgent: !f.is_urgent }))}
              />
              {role === 'approver' && (
                <Chip
                  label="منشور"
                  color={form.is_published ? 'success' : 'default'}
                  onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                />
              )}
            </Stack>
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف الخبر"
        message={`هل أنت متأكد من حذف "${deleting?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default RedSeaNewsPanel;
