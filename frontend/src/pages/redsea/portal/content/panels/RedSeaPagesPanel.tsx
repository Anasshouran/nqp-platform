import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DataTable, SectionCard, FormDialog, ConfirmDialog } from '../../../../../components/uikit';
import type { DataTableColumn } from '../../../../../components/uikit';
import { getCmsPages, createCmsPage, updateCmsPage, deleteCmsPage } from '../../../../../api/endpoints/cms';
import type { CmsPage } from '../../../../../api/endpoints/cms';

const EMPTY: Partial<CmsPage> = { slug: '', title: '', content: '', is_published: true };

const RedSeaPagesPanel = () => {
  const [rows, setRows] = useState<CmsPage[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CmsPage | null>(null);
  const [form, setForm] = useState<Partial<CmsPage>>(EMPTY);

  const load = () => {
    setLoading(true);
    getCmsPages()
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

  const openEdit = (row: CmsPage) => {
    setEditing(row);
    setForm({ slug: row.slug, title: row.title, content: row.content, is_published: row.is_published });
    setOpened(true);
  };

  const save = () => {
    setSaving(true);
    const op = editing ? updateCmsPage(editing.slug, form) : createCmsPage(form);
    op.then(() => {
      setOpened(false);
      load();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const columns: DataTableColumn<CmsPage>[] = [
    {
      key: 'title',
      label: 'العنوان',
      render: (r) => (
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography>
          <Typography variant="caption" color="text.secondary" dir="ltr">/{r.slug}</Typography>
        </Box>
      ),
    },
    {
      key: 'is_published',
      label: 'الحالة',
      render: (r) => (
        <Chip size="small" label={r.is_published ? 'منشور' : 'مسودة'} color={r.is_published ? 'success' : 'warning'} variant="outlined" />
      ),
    },
  ];

  return (
    <SectionCard
      title="الصفحات الثابتة"
      subtitle="تحرير محتوى صفحات الموقع العام للقطاع"
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          صفحة جديدة
        </Button>
      }
    >
      <Stack spacing={1.5} direction="row" flexWrap="wrap" sx={{ mb: 2 }}>
        {['home', 'about', 'services', 'contact'].map((s) => (
          <Chip
            key={s}
            label={`/${s}`}
            onClick={() => {
              const existing = rows.find((r) => r.slug === s);
              if (existing) openEdit(existing);
              else openCreate();
            }}
            color="primary"
            variant="outlined"
          />
        ))}
      </Stack>

      <DataTable<CmsPage>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.slug}
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
        title={editing ? 'تعديل الصفحة' : 'إضافة صفحة'}
        maxWidth="md"
        onClose={() => setOpened(false)}
        onSubmit={save}
        loading={saving}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="الرابط (slug)" required disabled={Boolean(editing)} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField fullWidth label="العنوان" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="المحتوى" required multiline minRows={8} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف الصفحة"
        message={`هل أنت متأكد من حذف "${deleting?.slug}"؟`}
        confirmLabel="حذف"
        onConfirm={() => {
          if (!deleting) return;
          deleteCmsPage(deleting.slug).then(() => {
            setDeleting(null);
            load();
          });
        }}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default RedSeaPagesPanel;
