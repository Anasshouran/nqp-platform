import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import {
  deleteCarrierDocument,
  downloadCarrierDocument,
  getCarrierDocuments,
  uploadCarrierDocument,
} from '../../api/endpoints/carriers';
import type { CarrierDocument } from '../../types/carrier';
import { ConfirmDialog } from '../../components/uikit';
import { notifySuccess, notifyError } from '../../utils/toast';

const DOCUMENT_TYPES = [
  { value: 'AIRCRAFT_DOCUMENT', label: 'مستند طائرة' },
  { value: 'FLIGHT_DOCUMENT', label: 'مستند رحلة' },
  { value: 'MANIFEST_DOCUMENT', label: 'مستند كشف' },
  { value: 'HEALTH_DOCUMENT', label: 'مستند صحي' },
  { value: 'LICENSE', label: 'رخصة' },
  { value: 'CERTIFICATE', label: 'شهادة' },
  { value: 'OTHER', label: 'أخرى' },
];

const formatFileSize = (size?: number) => {
  if (!size) return '—';
  return `${(size / 1024).toFixed(1)} KB`;
};

const CarrierDocumentsPage = () => {
  const [documents, setDocuments] = useState<CarrierDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('OTHER');
  const [flightId, setFlightId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CarrierDocument | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (typeFilter) params.document_type = typeFilter;
      const response = await getCarrierDocuments(params);
      setDocuments(response.data.data.results);
    } catch {
      setError('تعذر تحميل المستندات');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('document_type', docType);
      if (title) formData.append('title', title);
      if (flightId) formData.append('flight', flightId);
      formData.append('file', file);
      await uploadCarrierDocument(formData);
      setTitle('');
      setFlightId('');
      setFile(null);
      await load();
    } catch {
      setError('تعذر رفع المستند');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadCarrierDocument(id);
    } catch {
      setError('تعذر تنزيل المستند');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteCarrierDocument(deleteTarget.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      notifySuccess('تم حذف المستند');
      setDeleteTarget(null);
    } catch {
      notifyError('تعذر حذف المستند');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
        المستندات
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1">رفع مستند جديد</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="العنوان"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="النوع"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              fullWidth
            >
              {DOCUMENT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Flight ID (اختياري)"
              value={flightId}
              onChange={(e) => setFlightId(e.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button component="label" variant="outlined">
              اختيار ملف
              <input hidden accept=".pdf,.csv,.jpg,.jpeg,.png,.xls,.xlsx" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>
            {file && <Chip label={file.name} size="small" />}
            <Button variant="contained" disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? 'جارٍ الرفع…' : 'رفع'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">الملفات المرفوعة</Typography>
          <TextField select label="تصفية النوع" size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">الكل</MenuItem>
            {DOCUMENT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'grid', minHeight: 160, placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : documents.length === 0 ? (
          <Alert severity="info">لا توجد مستندات</Alert>
        ) : (
          <List disablePadding>
            {documents.map((doc) => (
              <ListItem key={doc.id} disableGutters sx={{ py: 1.25, justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{doc.title || doc.original_filename || 'مستند'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {doc.document_type_label ?? doc.document_type}
                    {doc.flight_number ? ` · ${doc.flight_number}` : ''}
                    {` · ${formatFileSize(doc.file_size)}`}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => handleDownload(doc.id)}>تنزيل</Button>
                  <Button size="small" color="error" variant="outlined" onClick={() => setDeleteTarget(doc)}>حذف</Button>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف المستند"
        message={`هل تريد حذف «${deleteTarget?.title || deleteTarget?.original_filename || 'المستند'}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        tone="error"
        loading={deleteBusy}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};

export default CarrierDocumentsPage;
