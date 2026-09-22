import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { PageHeader } from '../../components/common';
import apiClient from '../../api/client';
import type { CertificateVerifyResult } from '../../types/clinic';
import { formatDateTime } from '../../utils/formatters';

const certTypeLabels: Record<string, string> = {
  CLEARANCE: 'شهادة خلو من الأمراض',
  NEGATIVE: 'شهادة نتيجة سلبية',
  MEDICAL: 'تقرير طبي',
};

const verdictLabels: Record<string, string> = {
  RELEASE: 'خروج/إجازة',
  HOSPITAL: 'تحويل للمستشفى',
  ISOLATION: 'عزل/حجر صحي',
};

const CertificateVerifyPage = () => {
  const { number } = useParams<{ number: string }>();
  const [result, setResult] = useState<CertificateVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!number) return;
    setLoading(true);
    setError(null);
    apiClient
      .get(`/clinic/public/certificates/${encodeURIComponent(number)}/verify/`)
      .then((res: { data?: { data?: CertificateVerifyResult } }) => setResult(res.data?.data ?? null))
      .catch((err) => setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'تعذر التحقق من الشهادة'))
      .finally(() => setLoading(false));
  }, [number]);

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <PageHeader
        title="التحقق من الشهادة الصحية"
        subtitle="تحقق موثوق من الشهادات الصحية الصادرة عن عيادات الحجر الصحي"
        eyebrow="خدمة التحقق"
      />

      <Card
        className="fade-up"
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 3, py: 2.5, bgcolor: 'rgba(14,116,144,0.06)' }}>
          <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{number}</Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          {loading ? (
            <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
              <CircularProgress />
              <Typography color="text.secondary">جارٍ التحقق…</Typography>
            </Stack>
          ) : error ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 3 }}>
              <HighlightOffIcon sx={{ fontSize: 56, color: 'error.main' }} />
              <Alert severity="error" sx={{ borderRadius: 2.5 }}>{error}</Alert>
            </Stack>
          ) : result ? (
            <Stack spacing={2}>
              {result.verified ? (
                <Alert icon={<VerifiedUserIcon />} severity="success" sx={{ borderRadius: 2.5 }}>
                  تم التحقق بنجاح — الشهادة صالحة وسارية
                </Alert>
              ) : (
                <Alert icon={<HighlightOffIcon />} severity="error" sx={{ borderRadius: 2.5 }}>
                  الشهادة ملغاة أو غير صالحة
                </Alert>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    display: 'grid',
                    placeItems: 'center',
                    color: result.verified ? 'success.main' : 'error.main',
                    bgcolor: result.verified ? 'success.light' : 'error.light',
                  }}
                >
                  <WorkspacePremiumIcon sx={{ fontSize: 34 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {result.traveler_name || '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {certTypeLabels[result.certificate_type] || result.certificate_type}
                  </Typography>
                </Box>
                <Chip
                  label={result.status === 'ACTIVE' ? 'سارية' : 'ملغاة'}
                  color={result.status === 'ACTIVE' ? 'success' : 'error'}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2">
                  الجهة المصدرة: <b>{result.clinic_name || '—'}</b>
                </Typography>
                <Typography variant="body2">
                  التوصية النهائية: <b>{verdictLabels[result.verdict] || result.verdict}</b>
                </Typography>
                {result.decision && <Typography variant="body2">مضمون الشهادة: {result.decision}</Typography>}
                <Typography variant="body2">
                  تاريخ الإصدار: <b>{formatDateTime(result.issued_at)}</b>
                </Typography>
              </Stack>
            </Stack>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
};

export default CertificateVerifyPage;