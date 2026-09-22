import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Sheet from '@mui/icons-material/InsertDriveFile';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SectionCard, ConfirmDialog } from '../../../../../components/uikit';
import { getCmsMedia, uploadCmsMedia, deleteCmsMedia } from '../../../../../api/endpoints/cms';
import type { CmsMedia } from '../../../../../api/endpoints/cms';

const RedSeaMediaPanel = () => {
  const [rows, setRows] = useState<CmsMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<CmsMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getCmsMedia()
      .then((res) => setRows(res.data.data.results))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  const upload = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('title', title || file.name);
    fd.append('file', file);
    setUploading(true);
    uploadCmsMedia(fd)
      .then(() => {
        setTitle('');
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
        load();
      })
      .catch(() => undefined)
      .finally(() => setUploading(false));
  };

  const isImage = (m: CmsMedia) => m.kind === 'image';

  return (
    <SectionCard title="مكتبة الوسائط" subtitle="رفع وإدارة الصور والملفات المستخدمة في المحتوى">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ width: 220 }} />
        <input ref={fileInput} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button variant="outlined" component="span" onClick={() => fileInput.current?.click()} startIcon={<Sheet />}>
          {file ? file.name : 'اختيار ملف'}
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={upload} disabled={!file || uploading}>
          {uploading ? 'جارٍ الرفع...' : 'رفع'}
        </Button>
      </Box>

      <Grid container spacing={2}>
        {rows.map((m) => (
          <Grid item xs={6} sm={4} md={3} key={m.id}>
            <Card sx={{ position: 'relative' }}>
              {isImage(m) ? (
                <CardMedia component="img" image={m.url || m.file} alt={m.title} sx={{ height: 120, objectFit: 'cover' }} />
              ) : (
                <Box sx={{ height: 120, display: 'grid', placeItems: 'center', bgcolor: 'action.hover' }}>
                  <Sheet sx={{ fontSize: 44, color: 'text.disabled' }} />
                </Box>
              )}
              <CardContent sx={{ py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
                  {m.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {(m.file_size ? Math.round(m.file_size / 1024) : 0)} KB
                </Typography>
              </CardContent>
              <CardActions sx={{ position: 'absolute', top: 4, left: 4 }}>
                <IconButton size="small" aria-label="حذف" onClick={() => setDeleting(m)} color="error" sx={{ bgcolor: 'background.paper' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {!loading && rows.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">لا توجد وسائط بعد.</Typography>
          </Grid>
        )}
      </Grid>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف الوسيط"
        message={`هل أنت متأكد من حذف "${deleting?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={() => {
          if (!deleting) return;
          deleteCmsMedia(deleting.id).then(() => {
            setDeleting(null);
            load();
          });
        }}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default RedSeaMediaPanel;
