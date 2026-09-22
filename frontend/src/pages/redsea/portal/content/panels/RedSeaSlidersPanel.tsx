import { useRef, useState } from 'react';
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
import { SectionCard, FormDialog, ConfirmDialog } from '../../../../../components/uikit';
import { getCmsSliders, createCmsSlider, updateCmsSlider, deleteCmsSlider } from '../../../../../api/endpoints/cms';
import type { CmsSlider } from '../../../../../api/endpoints/cms';

const EMPTY: Partial<CmsSlider> = {
  title_ar: '',
  title_en: '',
  subtitle_ar: '',
  subtitle_en: '',
  button_text: '',
  button_link: '',
  sort_order: 0,
  is_active: true,
};

const RedSeaSlidersPanel = () => {
  const [rows, setRows] = useState<CmsSlider[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<CmsSlider | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CmsSlider | null>(null);
  const [form, setForm] = useState<Partial<CmsSlider>>(EMPTY);
  const [image, setImage] = useState<File | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getCmsSliders()
      .then((res) => {
        setRows([...res.data.data.results].sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setImage(null);
    setOpened(true);
  };

  const openEdit = (row: CmsSlider) => {
    setEditing(row);
    setForm({
      title_ar: row.title_ar ?? '',
      title_en: row.title_en ?? '',
      subtitle_ar: row.subtitle_ar ?? '',
      subtitle_en: row.subtitle_en ?? '',
      button_text: row.button_text ?? '',
      button_link: row.button_link ?? '',
      sort_order: row.sort_order,
      is_active: row.is_active,
    });
    setImage(null);
    setOpened(true);
  };

  const save = () => {
    setSaving(true);
    const payload = { ...form };
    const op = editing ? updateCmsSlider(editing.id, payload) : createCmsSlider(payload);
    op.then(() => {
      setOpened(false);
      load();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  return (
    <SectionCard
      title="الشرائح الدعائية (Sliders)"
      subtitle="إدارة الصور البانر في أعلى صفحة القطاع الرئيسية"
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          إضافة شريحة
        </Button>
      }
    >
      <Stack spacing={2}>
        {rows.map((r) => (
          <Box
            key={r.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {r.image ? (
              <Box component="img" src={r.image} alt={r.title_ar} sx={{ width: 120, height: 64, objectFit: 'cover', borderRadius: 2 }} />
            ) : (
              <Box sx={{ width: 120, height: 64, borderRadius: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'text.disabled' }}>لا صورة</Box>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>{r.title_ar || 'بدون عنوان'}</Typography>
              <Typography variant="caption" color="text.secondary">الترتيب: {r.sort_order}</Typography>
            </Box>
            <Chip size="small" label={r.is_active ? 'نشط' : 'مخفي'} color={r.is_active ? 'success' : 'default'} variant="outlined" />
            <IconButton aria-label="تعديل" onClick={() => openEdit(r)} color="primary"><EditIcon /></IconButton>
            <IconButton aria-label="حذف" onClick={() => setDeleting(r)} color="error"><DeleteIcon /></IconButton>
          </Box>
        ))}
        {!loading && rows.length === 0 && (
          <Typography color="text.secondary">لا توجد شرائح بعد.</Typography>
        )}
      </Stack>

      <FormDialog
        open={opened}
        title={editing ? 'تعديل الشريحة' : 'إضافة شريحة'}
        maxWidth="md"
        onClose={() => setOpened(false)}
        onSubmit={save}
        loading={saving}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="العنوان (عربي)" value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="العنوان (English)" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="العنوان الفرعي (عربي)" value={form.subtitle_ar} onChange={(e) => setForm((f) => ({ ...f, subtitle_ar: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="العنوان الفرعي (English)" value={form.subtitle_en} onChange={(e) => setForm((f) => ({ ...f, subtitle_en: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="نص الزر" value={form.button_text} onChange={(e) => setForm((f) => ({ ...f, button_text: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="رابط الزر" value={form.button_link} onChange={(e) => setForm((f) => ({ ...f, button_link: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth type="number" label="الترتيب" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
          </Grid>
          <Grid item xs={12}>
            <input ref={imageInput} type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            <Button variant="outlined" component="span" onClick={() => imageInput.current?.click()}>
              {image ? image.name : editing ? 'تغيير الصورة (اختياري)' : 'اختيار صورة'}
            </Button>
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف الشريحة"
        message={`هل أنت متأكد من حذف "${deleting?.title_ar || 'هذه الشريحة'}"؟`}
        confirmLabel="حذف"
        onConfirm={() => {
          if (!deleting) return;
          deleteCmsSlider(deleting.id).then(() => {
            setDeleting(null);
            load();
          });
        }}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default RedSeaSlidersPanel;
