import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DataTable, SectionCard, FormDialog, ConfirmDialog } from '../../../../../components/uikit';
import type { DataTableColumn } from '../../../../../components/uikit';
import { getCmsDocuments, createCmsDocument, updateCmsDocument, deleteCmsDocument } from '../../../../../api/endpoints/cms';
import type { CmsDocument } from '../../../../../api/endpoints/cms';
import { safeExternalUrl } from '../../../../../utils/safeUrl';

const RedSeaDocumentsPanel = () => {
  const { t } = useTranslation();
  const CATEGORIES = [
    { value: 'REGULATION', label: t('redsea.portal.content.documents.category.regulation') },
    { value: 'CIRCULAR', label: t('redsea.portal.content.documents.category.circular') },
    { value: 'FORM', label: t('redsea.portal.content.documents.category.form') },
    { value: 'GUIDE', label: t('redsea.portal.content.documents.category.guide') },
    { value: 'OTHER', label: t('redsea.portal.content.documents.category.other') },
  ];
  const [rows, setRows] = useState<CmsDocument[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<CmsDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CmsDocument | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('REGULATION');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getCmsDocuments()
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
    setTitle('');
    setDescription('');
    setCategory('REGULATION');
    setFile(null);
    setOpened(true);
  };

  const openEdit = (row: CmsDocument) => {
    setEditing(row);
    setTitle(row.title);
    setDescription(row.description ?? '');
    setCategory(row.category);
    setFile(null);
    setOpened(true);
  };

  const save = () => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('category', category);
    if (file) fd.append('file', file);
    if (!file && !editing) return;
    setSaving(true);
    const op = editing ? updateCmsDocument(editing.id, fd) : createCmsDocument(fd);
    op.then(() => {
      setOpened(false);
      load();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '—';
    const m = bytes / (1024 * 1024);
    return m >= 1 ? `${m.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  };

  const columns: DataTableColumn<CmsDocument>[] = [
    {
      key: 'title',
      label: t('redsea.portal.content.documents.docLabel'),
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PictureAsPdfIcon color="error" />
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography>
            <Typography variant="caption" color="text.secondary">{formatSize(r.file_size)}</Typography>
          </Box>
        </Box>
      ),
      noWrap: false,
    },
    {
      key: 'category',
      label: t('redsea.portal.content.documents.categoryLabel'),
      render: (r) => CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category,
    },
    {
      key: 'file',
      label: '',
      render: (r) => (
        <Button size="small" startIcon={<DownloadIcon />} component="a" href={safeExternalUrl(r.file)} target="_blank" rel="noreferrer" disabled={!safeExternalUrl(r.file)}>
          {t('redsea.portal.content.documents.downloadAction')}
        </Button>
      ),
    },
  ];

  return (
    <SectionCard
      title={t('redsea.portal.content.documents.panelTitle')}
      subtitle={t('redsea.portal.content.documents.panelSubtitle')}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t('redsea.portal.content.documents.uploadDoc')}
        </Button>
      }
    >
      <DataTable<CmsDocument>
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
            <IconButton aria-label={t('redsea.portal.content.documents.editAction')} onClick={() => openEdit(r)} color="primary"><EditIcon /></IconButton>
            <IconButton aria-label={t('redsea.portal.content.documents.deleteAction')} onClick={() => setDeleting(r)} color="error"><DeleteIcon /></IconButton>
          </>
        )}
      />

      <FormDialog
        open={opened}
        title={editing ? t('redsea.portal.content.documents.editDocTitle') : t('redsea.portal.content.documents.uploadDoc')}
        maxWidth="sm"
        onClose={() => setOpened(false)}
        onSubmit={save}
        loading={saving}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label={t('redsea.portal.content.documents.titleLabel')} required value={title} onChange={(e) => setTitle(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label={t('redsea.portal.content.documents.descLabel')} multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label={t('redsea.portal.content.documents.categoryLabel')} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  <ListItemIcon>{c.value === 'FORM' ? '📋' : ''}</ListItemIcon>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <input ref={fileInput} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button variant="outlined" component="span" onClick={() => fileInput.current?.click()} startIcon={<AddIcon />}>
              {file ? file.name : editing ? t('redsea.portal.content.documents.filePickerNew') : t('redsea.portal.content.documents.filePicker')}
            </Button>
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('redsea.portal.content.documents.deleteDocTitle')}
        message={t('redsea.portal.content.documents.confirmDeleteMsg', { title: deleting?.title })}
        confirmLabel={t('redsea.portal.content.documents.deleteAction')}
        onConfirm={() => {
          if (!deleting) return;
          deleteCmsDocument(deleting.id).then(() => {
            setDeleting(null);
            load();
          });
        }}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default RedSeaDocumentsPanel;
