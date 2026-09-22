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
import VaccinesTwoToneIcon from '@mui/icons-material/VaccinesTwoTone';
import { PageHeader } from '../../components/common';
import { publicVerifyCertificate, type VaccineCertificateVerifyResult } from '../../api/endpoints/vaccination';
import { formatDate, formatDateTime } from '../../utils/formatters';

const statusLabels: Record<string, string> = {
  ACTIVE: 'سارية',
  EXPIRED: 'منتهية',
  REVOKED: 'ملغاة',
};

const VaccineCertificateVerifyPage = () => {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<VaccineCertificateVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(null);
    publicVerifyCertificate(code)
      .then((res) => setResult(res.data.data))
      .catch((err) =>
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'تعذر التحقق من الشهادة'),
      )
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <PageHeader
        title="التحقق من شهادة التطعيم الدولية"
        subtitle="تحقق موثوق من الشهادات الصادرة عبر بوابة التطعيم الدولي"
        eyebrow="خدمة التحقق"
      />

      <Card
        className="fade-up"
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}
      >
        <Box sx={{ px: 3, py: 2.5, bgcolor: 'rgba(12,127,106,0.06)' }}>
          <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{code}</Typography>
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
                  تم التحقق بنجاح — الشهادة سارية وصلبة
                </Alert>
              ) : (
                <Alert icon={<HighlightOffIcon />} severity="error" sx={{ borderRadius: 2.5 }}>
                  الشهادة ملغاة أو منتهية الصلاحية
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
                  <VaccinesTwoToneIcon sx={{ fontSize: 34 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {result.traveler_name || '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {result.vaccine_name_ar || '—'} ({result.vaccine_code || '—'})
                  </Typography>
                </Box>
                <Chip
                  label={statusLabels[result.status] || result.status}
                  color={result.verified ? 'success' : 'error'}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2">
                  رقم الشهادة: <b style={{ fontFamily: 'monospace' }}>{result.certificate_number}</b>
                </Typography>
                <Typography variant="body2">
                  جواز السفر: <b style={{ fontFamily: 'monospace' }}>{result.passport_number || '—'}</b>
                </Typography>
                <Typography variant="body2">
                  تاريخ الإصدار: <b>{formatDateTime(result.issued_at)}</b>
                </Typography>
                <Typography variant="body2">
                  صالحة حتى: <b>{formatDate(result.valid_until)}</b>
                </Typography>
              </Stack>
            </Stack>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
};

export default VaccineCertificateVerifyPage;