import { useState } from 'react';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import BiotechIcon from '@mui/icons-material/Biotech';
import SearchIcon from '@mui/icons-material/Search';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common';
import { lookupLabResult, type LabResultLookupResult } from '../../api/endpoints/public';
import { generateQR } from '../../utils/qr-generator';
import { formatDate } from '../../utils/formatters';

const outcomeColor = (outcome?: string) => {
  if (outcome === 'POSITIVE') return 'error' as const;
  if (outcome === 'NEGATIVE') return 'success' as const;
  return 'warning' as const;
};

const ResultQrPanel = ({ qrPayload }: { qrPayload: string }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const qrImage = qrPayload ? generateQR(qrPayload) : '';

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard غير متاح — عرض النص يدوياً
    }
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" sx={{ mt: 3 }}>
      <Box
        sx={{
          width: 168,
          height: 168,
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: '#fff',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {qrImage ? (
          <img src={qrImage} alt="رمز QR للنتيجة المعتمدة" style={{ width: 148, height: 148 }} />
        ) : (
          <QrCode2Icon sx={{ fontSize: 64, color: 'text.disabled' }} />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <QrCode2Icon fontSize="small" color="success" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            رمز QR للنتيجة المعتمدة
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          امسح الرمز للتحقق الرسمي من النتيجة، أو ألصق بياناته داخل «أداة التحقق بالرمز QR» في أدوات التحقق الذكية.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setExpanded((v) => !v)}
            endIcon={<ExpandMoreIcon />}
          >
            عرض البيانات المضمّنة
          </Button>
          <IconButton size="small" onClick={copyPayload} title="نسخ البيانات">
            {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
          </IconButton>
        </Stack>
        <Collapse in={expanded}>
          <Typography
            component="pre"
            sx={{
              mt: 1,
              p: 1,
              borderRadius: 1,
              bgcolor: 'grey.100',
              fontSize: '0.72rem',
              direction: 'ltr',
              textAlign: 'left',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {qrPayload}
          </Typography>
        </Collapse>
      </Box>
    </Stack>
  );
};

const LabResultsLookupPage = () => {
  const { user } = useAuth();
  const [reference, setReference] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LabResultLookupResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reference.trim() || !code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await lookupLabResult(reference.trim(), code.trim());
      setResult(response.data.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'تعذّر الاستعلام، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="نتائج التحاليل المخبرية"
        subtitle="الاستعلام عن النتيجة المعتمدة برقم العينة (أو باركودها) ورمز التحقق المطبوع في التقرير"
        eyebrow="خدمة المختبر المعتمدة"
      />

      <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 4 }}>
        <CardContent sx={{ p: 3.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2.5 }}>
            أدخل رقم المرجع ورمز التحقق
          </Typography>
          <Stack
            component="form"
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            onSubmit={handleSearch}
          >
            <TextField
              label="رقم العينة أو الباركود"
              placeholder="مثال: NQL-2026-000123"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="رمز التحقق"
              placeholder="مثال: LNC-A3F9K2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              sx={{ minWidth: 160 }}
            >
              استعلام
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result?.found === false && (
        <Alert severity="info" sx={{ mb: 3 }}>
          لم يتم العثور على نتيجة مطابقة لهذا الرقم والرمز. تحقّق من صحة الإدخال أو تواصل مع المختبر المصدر.
        </Alert>
      )}

      {result?.found && result.sample && (
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  bgcolor: 'success.main',
                }}
              >
                <FactCheckIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  نتيجة معتمدة
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  صدرت نتائجك بتاريخ{' '}
                  {result.sample.public_issued_at ? formatDate(result.sample.public_issued_at) : '—'}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mb: 3 }}
            >
              <Chip label={`رقم العينة: ${result.sample.sample_number}`} variant="outlined" />
              <Chip label={`النوع: ${result.sample.sample_type_label}`} variant="outlined" />
              {result.sample.section_name && (
                <Chip label={`القسم: ${result.sample.section_name}`} variant="outlined" />
              )}
              {result.sample.sector_name && (
                <Chip label={`القطاع: ${result.sample.sector_name}`} variant="outlined" />
              )}
            </Stack>

            {result.tests && result.tests.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الفحص</TableCell>
                      <TableCell>النتيجة</TableCell>
                      <TableCell>القيمة</TableCell>
                      <TableCell>الوحددة/المرجع</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.tests.map((test, index) => (
                      <TableRow key={`${test.test_name}-${index}`} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {test.test_name}
                          {test.disease_name ? (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {test.disease_name}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={outcomeColor(test.outcome)}
                            label={test.outcome_label || test.outcome}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell>
                          {test.result_value ?? ''}
                          {test.unit ? ` ${test.unit}` : ''}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{test.reference_range}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {result.sample.verification_code && (
              <>
                <Divider sx={{ my: 3 }} />
                <ResultQrPanel
                  qrPayload={JSON.stringify({
                    type: 'NQL_RESULT',
                    reference: result.sample.sample_number,
                    code: result.sample.verification_code,
                    issued_at: result.sample.public_issued_at,
                  })}
                />
              </>
            )}

            <Typography variant="caption" display="block" sx={{ mt: 3, color: 'text.secondary' }}>
              هذه النتيجة صادرة للمعني في العينة، ورمز التحقق يُعامل كوسيلة تحقق عامة. لا تشاركه مع أي طرف آخر.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 4, color: 'text.secondary' }}>
          <BiotechIcon fontSize="small" />
          <Typography variant="body2">
            خدمة عامة متاحة للجميع — لا يلزم تسجيل الدخول.
          </Typography>
        </Stack>
      )}
    </Container>
  );
};

export default LabResultsLookupPage;