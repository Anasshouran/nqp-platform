import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PageHeader, EmptyState } from '../../components/common';
import {
  uploadTravelerDocument,
  deleteTravelerDocument,
  getTravelerDocuments,
} from '../../api/endpoints/travelers';
import type { TravelerDocument } from '../../api/endpoints/travelers';
import { getTravelerSession } from '../../utils/travelerSession';
import { lookupTraveler } from '../../api/endpoints/public';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const documentTypes = [
  { value: 'PASSPORT', label: 'صورة جواز السفر', required: true, icon: '📄' },
  { value: 'VACCINE', label: 'شهادة التطعيم', required: false, icon: '💉' },
  { value: 'TEST_RESULT', label: 'نتيجة فحص', required: false, icon: '🧪' },
  { value: 'OTHER', label: 'مستندات أخرى', required: false, icon: '📎' },
];

const documentTypeLabel: Record<string, string> = {
  PASSPORT: 'صورة جواز السفر',
  VACCINE: 'شهادة التطعيم',
  TEST_RESULT: 'نتيجة فحص',
  OTHER: 'مستندات أخرى',
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const UploadDocumentsPage = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [travelerId, setTravelerId] = useState<string | null>(null);
  const [passport, setPassport] = useState('');
  const [dob, setDob] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<TravelerDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadDocuments = async (id: string) => {
    try {
      const res = await getTravelerDocuments(id);
      setDocuments(res.data.data || []);
    } catch {
      setError('تعذر تحميل المستندات.');
    }
  };

  const handleLookup = async () => {
    const value = passport.trim().toUpperCase();
    if (!value || !dob.trim()) {
      setLookupError(!value ? 'يرجى إدخال رقم جواز السفر.' : 'يرجى إدخال تاريخ الميلاد للتحقق من الهوية.');
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    try {
      const res = await lookupTraveler(value, dob.trim());
      const result = res.data.data;
      if (result.found && result.traveler_id) {
        setTravelerId(result.traveler_id);
        setPassport(result.passport_number || value);
        await loadDocuments(result.traveler_id);
        setError(null);
      } else {
        setTravelerId(null);
        setLookupError('لم يتم العثور على مسافر بهذا الرقم. يرجى إكمال التسجيل المسبق أولاً.');
      }
    } catch {
      setLookupError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    (async () => {
      const session = getTravelerSession();
      if (session?.traveler_id) {
        setTravelerId(session.traveler_id);
        setPassport(session.passport_number || '');
        await loadDocuments(session.traveler_id);
      }
    })();
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'نوع الملف غير مدعوم (يُسمح بـ JPEG, PNG, PDF).';
    if (file.size > MAX_SIZE) return 'حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت).';
    return null;
  };

  const uploadFiles = async (files: File[]) => {
    if (!travelerId || !files.length) return;
    const invalid = files.map((f) => ({ name: f.name, err: validateFile(f) })).find((f) => f.err);
    if (invalid) {
      setError(`${invalid.name}: ${invalid.err}`);
      return;
    }
    setUploading(true);
    setError(null);
    for (const file of files) {
      const formData = new FormData();
      formData.append('document_type', 'OTHER');
      formData.append('file', file);
      try {
        await uploadTravelerDocument(travelerId, formData);
      } catch {
        setError(`فشل رفع الملف: ${file.name}`);
      }
    }
    setUploading(false);
    await loadDocuments(travelerId);
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    uploadFiles(files);
  };

  const removeDocument = async (docId: string) => {
    if (!travelerId) return;
    try {
      await deleteTravelerDocument(travelerId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      setError('تعذر حذف المستند.');
    }
  };

  const hasRequiredDocs = () => documents.some((d) => d.document_type === 'PASSPORT');

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <PageHeader
        title="رفع المستندات"
        subtitle="ارفع المستندات الداعمة لطلبك الصحي قبل السفر"
        eyebrow="بوابة المسافرين"
      />

      {!travelerId ? (
        <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              ابحث عن طلبك برقم جواز السفر
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              أدخل رقم جواز السفر وتاريخ الميلاد للتحقق من هويتك قبل رفع المستندات.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField
                label="رقم جواز السفر"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                fullWidth
                dir="ltr"
              />
              <TextField
                label="تاريخ الميلاد"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="contained"
                onClick={handleLookup}
                disabled={!passport.trim() || !dob.trim() || lookingUp}
                startIcon={lookingUp ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              >
                بحث
              </Button>
            </Stack>
            {lookupError && <Alert severity="warning" sx={{ mt: 2 }}>{lookupError}</Alert>}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, mb: 3 }}>
            <CardContent
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: dragging ? 'primary.main' : 'divider',
                borderRadius: 3,
                bgcolor: dragging ? 'action.hover' : 'transparent',
                transition: 'all 0.2s ease',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <UploadFileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                اسحب ملفاتك هنا أو انقر للاختيار
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                يُسمح بملفات JPEG, PNG, PDF بحد أقصى 5 ميجابايت لكل ملف.
              </Typography>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,application/pdf"
                style={{ display: 'none' }}
                onChange={handlePick}
              />
              <Button variant="contained" onClick={() => inputRef.current?.click()} startIcon={<CloudUploadIcon />}>
                اختيار الملفات
              </Button>
            </CardContent>
          </Card>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {documentTypes.map((dt) => (
              <Grid item xs={12} sm={6} md={3} key={dt.value}>
                <Card variant="outlined" sx={{ textAlign: 'center', opacity: documents.some((d) => d.document_type === dt.value) ? 0.6 : 1 }}>
                  <CardContent>
                    <Typography sx={{ fontSize: 28 }}>{dt.icon}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>
                      {dt.label}
                    </Typography>
                    {documents.some((d) => d.document_type === dt.value) ? (
                      <CheckCircleIcon sx={{ color: 'success.main', mt: 1 }} />
                    ) : (
                      <Chip size="small" color={dt.required ? 'error' : 'default'} label={dt.required ? 'إلزامي' : 'اختياري'} sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {uploading && <LinearProgress sx={{ mb: 2 }} />}

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                الملفات المرفوعة ({documents.length})
              </Typography>
              {documents.length === 0 ? (
                <EmptyState title="لا توجد مستندات" description="ارفع مستنداتك أعلاه" />
              ) : (
                <Stack spacing={1}>
                  {documents.map((doc) => (
                    <Stack
                      key={doc.id}
                      direction="row"
                      alignItems="center"
                      gap={1.5}
                      sx={{
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'success.light',
                      }}
                    >
                      <InsertDriveFileIcon color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {doc.file.split('/').pop()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {documentTypeLabel[doc.document_type] || doc.document_type} · {formatBytes(doc.file_size)}
                        </Typography>
                      </Box>
                      <Chip label="مكتمل" size="small" color="success" />
                      <IconButton aria-label="حذف" onClick={() => removeDocument(doc.id)} size="small">
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Button variant="outlined" onClick={() => navigate('/traveler/register')} startIcon={<ArrowBackIcon />}>
              الرجوع للتسجيل
            </Button>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/traveler/tracking')}
              disabled={!hasRequiredDocs()}
            >
              متابعة حالة الطلب
            </Button>
          </Stack>
        </>
      )}
    </Container>
  );
};

export default UploadDocumentsPage;