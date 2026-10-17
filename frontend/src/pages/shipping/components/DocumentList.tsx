/**
 * المستندات — vessel documents registry for the shipping portal.
 *
 * Built on the typed `shipping.ts` layer (`getVesselDocuments` /
 * `createVesselDocument` / `deleteVesselDocument`). `useServerTable` drives
 * pagination, server-side search and the `document_type` filter.
 *
 * Upload is a raw `<input type="file">` inside a `FormDialog` (no extra deps):
 * the client enforces the same 10 MB cap and MIME allow-list as the backend.
 */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormTextField,
  FormSelect,
  ConfirmDialog,
} from '../../../components/uikit';
import type { DataTableColumn, DataTableFilterDef } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  getVesselDocuments,
  createVesselDocument,
  deleteVesselDocument,
  VESSEL_DOCUMENT_TYPES,
  VESSEL_DOCUMENT_TYPE_LABELS,
} from '../../../api/endpoints/shipping';
import type { VesselDocument, VesselDocumentType } from '../../../api/endpoints/shipping';
import { getVesselVisits } from '../../../api/endpoints/portHealth';
import { notifyError, notifySuccess } from '../../../utils/toast';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.csv,.xls,.xlsx';
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const TYPE_OPTIONS = VESSEL_DOCUMENT_TYPES.map((value) => ({
  value,
  label: VESSEL_DOCUMENT_TYPE_LABELS[value],
}));

const typeLabel = (d: VesselDocument) =>
  d.document_type_label || VESSEL_DOCUMENT_TYPE_LABELS[d.document_type] || d.document_type;

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface VesselOption {
  value: string;
  label: string;
}

export const DocumentList = () => {
  const table = useServerTable<VesselDocument>({ fetchData: getVesselDocuments });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput, setFilter,
  } = table;

  const [documentType, setDocumentType] = useState('');

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<VesselDocumentType>('CARGO_MANIFEST');
  const [vesselVisit, setVesselVisit] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [vesselOptions, setVesselOptions] = useState<VesselOption[]>([]);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<VesselDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!uploadOpen) return undefined;
    let active = true;
    getVesselVisits({ page_size: 100 })
      .then((res) => {
        if (!active) return;
        const results = res.data.data.results ?? [];
        setVesselOptions(
          results.map((v) => {
            const name = v.vessel_name || v.id;
            return { value: v.id, label: v.vessel_imo ? `${name} (${v.vessel_imo})` : name };
          }),
        );
      })
      .catch(() => {
        if (active) setVesselOptions([]);
      });
    return () => {
      active = false;
    };
  }, [uploadOpen]);

  const columns: DataTableColumn<VesselDocument>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'المستند',
        render: (d) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{d.title || d.original_filename || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{d.original_filename || '—'}</Typography>
          </Box>
        ),
      },
      {
        key: 'document_type',
        label: 'النوع',
        render: (d) => <StatusChip label={typeLabel(d)} tone="neutral" />,
      },
      {
        key: 'vessel',
        label: 'السفينة',
        render: (d) => (
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{d.vessel_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {d.vessel_imo || '—'}
            </Typography>
          </Box>
        ),
        hideOnMobile: true,
      },
      {
        key: 'uploaded_by_name',
        label: 'رفعها',
        render: (d) => d.uploaded_by_name || '—',
        hideOnMobile: true,
      },
      {
        key: 'file_size',
        label: 'الحجم',
        render: (d) => formatBytes(d.file_size),
        hideOnMobile: true,
      },
      {
        key: 'created_at',
        label: 'تاريخ الرفع',
        render: (d) => formatDate(d.created_at),
        hideOnMobile: true,
      },
    ],
    [],
  );

  const filters: DataTableFilterDef[] = [
    {
      key: 'document_type',
      label: 'النوع',
      options: TYPE_OPTIONS,
      value: documentType,
      onChange: (value) => {
        setDocumentType(value);
        setFilter('document_type', value);
      },
    },
  ];

  const openUpload = () => {
    setTitle('');
    setDocType('CARGO_MANIFEST');
    setVesselVisit('');
    setFile(null);
    setFileError('');
    setUploadOpen(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setFileError('');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError('حجم الملف يتجاوز 10MB');
      return;
    }
    if (selected.type && !ALLOWED_MIME.has(selected.type)) {
      setFile(null);
      setFileError('صيغة الملف غير مدعومة');
      return;
    }
    setFile(selected);
    setFileError('');
  };

  const handleUpload = async () => {
    if (!file) {
      setFileError('الملف مطلوب');
      return;
    }
    if (!vesselVisit || !title.trim()) return;
    setSaving(true);
    try {
      await createVesselDocument({
        vessel_visit: vesselVisit,
        document_type: docType,
        title: title.trim(),
        file,
      });
      notifySuccess('تم رفع المستند');
      setUploadOpen(false);
      refresh();
    } catch {
      notifyError('تعذر رفع المستند');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteVesselDocument(pendingDelete.id);
      notifySuccess('تم حذف المستند');
      setPendingDelete(null);
      refresh();
    } catch {
      notifyError('تعذر حذف المستند');
    } finally {
      setDeleting(false);
    }
  };

  const openFile = (d: VesselDocument) => {
    if (!d.file) return;
    window.open(d.file, '_blank', 'noopener,noreferrer');
  };

  const renderActions = (d: VesselDocument) => (
    <>
      <Tooltip title="عرض">
        <IconButton size="small" aria-label="عرض" onClick={() => openFile(d)}>
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="حذف">
        <IconButton size="small" color="error" aria-label="حذف" onClick={() => setPendingDelete(d)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  const canSubmit = Boolean(vesselVisit && title.trim() && file && !fileError);

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="المستندات"
        subtitle="مستندات السفن المرفقة بزيارات الموانئ"
        action={(
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={openUpload}>
            تحميل مستند
          </Button>
        )}
      />
      <DataTable<VesselDocument>
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="المستندات"
        subtitle={`${count} مستند`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالعنوان أو اسم الملف..."
        filters={filters}
        actions={renderActions}
        actionsLabel="إجراءات"
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد مستندات"
        emptyDescription="المستندات المرفوعة تظهر هنا"
      />

      {/* Upload */}
      <FormDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
        title="رفع مستند جديد"
        subtitle="أرفق مستنداً بزيارة سفينة قائمة"
        submitLabel="رفع المستند"
        cancelLabel="إلغاء"
        loading={saving}
        submitDisabled={!canSubmit}
      >
        <Stack spacing={2}>
          <FormTextField
            label="العنوان"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            requiredMark
            placeholder="مثال: بيان الحمولة — مايو"
          />
          <FormSelect
            label="نوع المستند"
            value={docType}
            onChange={(value) => setDocType(value as VesselDocumentType)}
            options={TYPE_OPTIONS}
            requiredMark
          />
          <FormSelect
            label="زيارة السفينة"
            value={vesselVisit}
            onChange={setVesselVisit}
            options={vesselOptions}
            requiredMark
            placeholder={vesselOptions.length ? 'اختر الزيارة' : 'جارٍ التحميل...'}
          />
          <Box>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} fullWidth>
              اختر ملفاً
              <input
                type="file"
                hidden
                accept={ACCEPT}
                aria-label="الملف"
                onChange={handleFileChange}
              />
            </Button>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.75, color: fileError ? 'error.main' : 'text.secondary' }}
            >
              {fileError || file?.name || 'PDF أو صورة أو CSV/XLS — بحد أقصى 10MB'}
            </Typography>
          </Box>
        </Stack>
      </FormDialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        tone="error"
        title="حذف المستند"
        message={pendingDelete ? `هل تريد حذف "${pendingDelete.title || pendingDelete.original_filename}"؟` : ''}
        confirmLabel="تأكيد الحذف"
        cancelLabel="إلغاء"
      />
    </Box>
  );
};

export default DocumentList;
