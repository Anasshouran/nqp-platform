import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VerifiedIcon from '@mui/icons-material/Verified';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PublicIcon from '@mui/icons-material/Public';
import Autocomplete from '@mui/material/Autocomplete';
import Divider from '@mui/material/Divider';
import { EmptyState, ListSkeleton } from './common';
import { StatusChip } from './ui';
import {
  lookupLabResult,
  lookupTraveler,
  verifyQr,
  getDemoQr,
  verifyCertificate,
  getNotices,
  getWebPushVapidKey,
  subscribeWebPush,
  getCountries,
  getTravelRequirements,
  getFlightStatus,
  trackFoodShipment,
} from '../api/endpoints/public';
import type {
  LabResultLookupResult,
  TravelerLookupResult,
  QrVerifyResult,
  CertificateVerifyResult,
  PublicCountry,
  PublicFlight,
  FoodShipmentTrack,
  TravelRequirement,
} from '../api/endpoints/public';
import { notifyError } from '../utils/toast';
import { formatDateTime } from '../utils/formatters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box role="tabpanel" hidden={value !== index} id={`verify-tab-${index}`} aria-labelledby={`verify-tab-${index}`}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </Box>
);

const registrationLabels: Record<string, string> = {
  PENDING_DOCUMENTS: 'في انتظار المستندات',
  UNDER_REVIEW: 'قيد المراجعة',
  COMPLETED: 'مكتمل',
  REJECTED: 'مرفوض',
};

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  PENDING_DOCUMENTS: 'warning',
  UNDER_REVIEW: 'info',
  COMPLETED: 'success',
  REJECTED: 'error',
};

const certificateTypeLabels: Record<string, string> = {
  VACCINATION: 'شهادة تطعيم',
  MEDICAL: 'شهادة طبية',
  FITNESS: 'شهادة لياقة',
};

const LookupTab = () => {
  const [passport, setPassport] = useState('');
  const [dob, setDob] = useState('');
  const [result, setResult] = useState<TravelerLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!passport.trim() || !dob.trim()) {
      setError(!passport.trim() ? 'يرجى إدخال رقم جواز السفر.' : 'يرجى إدخال تاريخ الميلاد للتحقق من الهوية.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await lookupTraveler(passport.trim(), dob.trim());
      setResult(response.data.data);
    } catch {
      setError('تعذر البحث عن الطلب، حاول مرة أخرى لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              تتبّع حالة الطلب
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              أدخل رقم جواز السفر وتاريخ الميلاد للاستعلام عن حالة طلب التسجيل المسبق وشهادة QR الخاصة بك.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField
                label="رقم جواز السفر"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                fullWidth
                dir="ltr"
              />
              <TextField
                label="تاريخ الميلاد"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="contained"
                onClick={submit}
                disabled={!passport.trim() || !dob.trim() || loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              >
                بحث
              </Button>
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        {result && (
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              {result.found ? (
                <>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main' }}>
                      <PersonIcon />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {result.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" dir="ltr" textAlign="right">
                        {result.passport_number}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack spacing={1}>
                    <Chip
                      label={`الحالة: ${registrationLabels[result.registration_status || ''] || result.registration_status}`}
                      color={statusColors[result.registration_status || ''] || 'default'}
                      sx={{ fontWeight: 700, width: 'fit-content' }}
                    />
                    {result.qr_issued && (
                      <Chip icon={<QrCode2Icon />} label="شهادة QR متاحة" color="success" variant="outlined" sx={{ width: 'fit-content' }} />
                    )}
                    {result.rejection_reason && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {result.rejection_reason}
                      </Alert>
                    )}
                  </Stack>
                </>
              ) : (
                <EmptyState
                  icon={<TravelExploreIcon />}
                  title={result.error === 'PASSPORT_REQUIRED' ? 'أدخل رقم جواز السفر' : 'لم يتم العثور على الطلب'}
                  description={
                    result.error === 'PASSPORT_REQUIRED'
                      ? 'يرجى إدخال رقم جواز السفر للبحث.'
                      : 'تأكد من صحة الرقم أو سجّل مسبقاً عبر بوابة المسافرين.'
                  }
                />
              )}
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
};

const QrTab = () => {
  const [qrData, setQrData] = useState('');
  const [result, setResult] = useState<QrVerifyResult | null>(null);
  const [labResult, setLabResult] = useState<LabResultLookupResult | null>(null);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [parseError, setParseError] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const submit = () => {
    setParseError(null);
    setResult(null);
    setLabResult(null);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(qrData);
    } catch {
      setParseError('صيغة JSON غير صحيحة. تأكد من لصق محتوى رمز QR بشكل صحيح.');
      return;
    }
    if (payload.type === 'NQL_RESULT') {
      if (!payload.reference || !payload.code) {
        setParseError('البيانات غير مكتملة: يجب توفير reference و code لنتيجة مخبرية.');
        return;
      }
      setPhase('scanning');
      window.setTimeout(async () => {
        try {
          const response = await lookupLabResult(String(payload.reference), String(payload.code));
          setLabResult(response.data.data);
        } catch {
          setParseError('تعذر التحقق، حاول مرة أخرى لاحقاً.');
        } finally {
          setPhase('done');
        }
      }, 1500);
      return;
    }
    if (
      !payload.traveler_id ||
      !payload.passport_hash ||
      !payload.issued_at ||
      !payload.expires_at ||
      !payload.signature
    ) {
      setParseError('البيانات غير مكتملة: يجب توفير traveler_id, passport_hash, issued_at, expires_at و signature.');
      return;
    }
    setPhase('scanning');
    window.setTimeout(async () => {
      try {
        const response = await verifyQr({
          traveler_id: String(payload.traveler_id ?? ''),
          passport_hash: String(payload.passport_hash ?? ''),
          issued_at: String(payload.issued_at ?? ''),
          expires_at: String(payload.expires_at ?? ''),
          signature: String(payload.signature ?? ''),
        });
        setResult(response.data.data);
      } catch {
        setParseError('تعذر التحقق، حاول مرة أخرى لاحقاً.');
      } finally {
        setPhase('done');
      }
    }, 1500);
  };

  const loadDemo = async () => {
    setParseError(null);
    setLoadingDemo(true);
    try {
      const response = await getDemoQr();
      setQrData(JSON.stringify(response.data.data.qr_data, null, 2));
    } catch {
      setParseError('تعذر جلب النموذج التجريبي، حاول مرة أخرى لاحقاً.');
    } finally {
      setLoadingDemo(false);
    }
  };

  const sampleLabPayload = {
    type: 'NQL_RESULT',
    reference: 'NQL-2026-000000',
    code: 'LNC-XXXXXX',
    issued_at: new Date().toISOString(),
  };

  const scanStatus =
    phase === 'scanning' ? 'جارٍ المسح الضوئي وتحليل البيانات...' : 'وجّه كاميرا الماسح نحو رمز QR أو الصق بياناته';

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              التحقق من رمز QR
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              الصق محتوى رمز QR (JSON) الناتج من تطبيق المسافر أو شهادة نتيجة مخبرية، أو استخدم الماسح للتحقق من صحته وصلاحيته.
            </Typography>

            <Box
              sx={{
                position: 'relative',
                height: 210,
                borderRadius: 3,
                background: 'radial-gradient(circle at 50% 40%, rgba(14,138,114,0.18), #0c211c 70%)',
                border: '1px solid rgba(14,138,114,0.4)',
                overflow: 'hidden',
                mb: 2,
              }}
            >
              {[
                { top: 14, left: 14, borderTop: '3px solid #0e8a72', borderLeft: '3px solid #0e8a72', borderTopLeftRadius: 10 },
                { top: 14, right: 14, borderTop: '3px solid #0e8a72', borderRight: '3px solid #0e8a72', borderTopRightRadius: 10 },
                { bottom: 14, left: 14, borderBottom: '3px solid #c8a13a', borderLeft: '3px solid #c8a13a', borderBottomLeftRadius: 10 },
                { bottom: 14, right: 14, borderBottom: '3px solid #c8a13a', borderRight: '3px solid #c8a13a', borderBottomRightRadius: 10 },
              ].map((corner, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    width: 34,
                    height: 34,
                    ...corner,
                    boxShadow: '0 0 14px rgba(14,138,114,0.5)',
                  }}
                />
              ))}

              {phase === 'scanning' ? (
                <Box
                  sx={{
                    position: 'absolute',
                    left: '8%',
                    right: '8%',
                    height: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, transparent, #10b3a0, #c8a13a, #10b3a0, transparent)',
                    boxShadow: '0 0 18px rgba(16,179,160,0.9)',
                    animation: 'scanLine 1.4s cubic-bezier(0.45,0,0.55,1) infinite',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    position: 'absolute',
                    left: '8%',
                    right: '8%',
                    top: '50%',
                    height: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, transparent, rgba(16,179,160,0.5), transparent)',
                  }}
                />
              )}

              <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                <QrCode2Icon
                  className={phase === 'scanning' ? 'pulse-dot' : undefined}
                  sx={{
                    fontSize: 84,
                    color: phase === 'scanning' ? '#10b3a0' : 'rgba(255,255,255,0.16)',
                    filter: phase === 'scanning' ? 'drop-shadow(0 0 14px rgba(16,179,160,0.8))' : 'none',
                  }}
                />
              </Box>

              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  py: 1,
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.35)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: phase === 'scanning' ? '#10b3a0' : 'rgba(255,255,255,0.6)',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                  }}
                >
                  {scanStatus}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="بيانات رمز QR (JSON)"
              value={qrData}
              onChange={(e) => setQrData(e.target.value)}
              multiline
              minRows={5}
              fullWidth
              dir="ltr"
              sx={{ mb: 1.5 }}
            />
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button size="small" onClick={loadDemo} disabled={loadingDemo} startIcon={loadingDemo ? <CircularProgress size={16} /> : <VerifiedIcon />}>
                  {loadingDemo ? 'جارٍ التجهيز...' : 'نموذج تجريبي'}
                </Button>
                <Button size="small" onClick={() => setQrData(JSON.stringify(sampleLabPayload, null, 2))}>
                  نموذج نتيجة مخبرية
                </Button>
              </Stack>
              <Button
                variant="contained"
                onClick={submit}
                disabled={!qrData.trim() || phase === 'scanning'}
                startIcon={phase === 'scanning' ? <CircularProgress size={18} color="inherit" /> : <QrCode2Icon />}
              >
                {phase === 'scanning' ? 'جارٍ التحقق...' : 'تحقق'}
              </Button>
            </Stack>
            {parseError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {parseError}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        {phase === 'scanning' && !result && !labResult ? (
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                جارٍ التحقق من الرمز...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                تتم مطابقة بيانات الرمز مع السجلات الرسمية لمنصة الحجر الصحي.
              </Typography>
            </CardContent>
          </Card>
        ) : result ? (
          <Card
            className="fade-in"
            sx={{ border: '1px solid', borderColor: result.valid ? 'success.main' : 'error.main' }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                {result.valid ? (
                  <CheckCircleIcon sx={{ fontSize: 44, color: 'success.main' }} />
                ) : (
                  <CancelIcon sx={{ fontSize: 44, color: 'error.main' }} />
                )}
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: result.valid ? 'success.main' : 'error.main' }}>
                    {result.valid ? 'QR صالح ومعتمد' : 'رمز QR غير صالح'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })} - تم الانتهاء من عملية التحقق
                  </Typography>
                </Box>
              </Stack>
              {result.valid && result.traveler ? (
                <Stack spacing={1}>
                  <Typography variant="body1">
                    <b>الاسم:</b> {result.traveler.full_name}
                  </Typography>
                  <Typography variant="body1">
                    <b>جواز السفر:</b> {result.traveler.passport_number}
                  </Typography>
                  <Typography variant="body1">
                    <b>الحالة:</b> {registrationLabels[result.traveler.registration_status] || result.traveler.registration_status}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {result.reason === 'NOT_FOUND' && 'لا يوجد مسافر مطابق لهذا الرمز.'}
                  {result.reason === 'INVALID_SIGNATURE' && 'توقيع رمز QR غير صالح أو البيانات منقولة عن مصدر غير معتمد.'}
                  {result.reason === 'NOT_APPROVED' && 'الطلب لم يُعتمد بعد.'}
                  {result.reason === 'QR_EXPIRED' && 'رمز QR منتهي الصلاحية.'}
                </Typography>
              )}
            </CardContent>
          </Card>
        ) : labResult ? (
          <Card
            className="fade-in"
            sx={{ border: '1px solid', borderColor: labResult.found ? 'success.main' : 'error.main' }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                {labResult.found ? (
                  <CheckCircleIcon sx={{ fontSize: 44, color: 'success.main' }} />
                ) : (
                  <CancelIcon sx={{ fontSize: 44, color: 'error.main' }} />
                )}
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: labResult.found ? 'success.main' : 'error.main' }}>
                    {labResult.found ? 'نتيجة مخبرية معتمدة' : 'رمز QR غير صالح'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })} - تم الانتهاء من عملية التحقق
                  </Typography>
                </Box>
              </Stack>
              {labResult.found && labResult.sample ? (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                    <Chip label={`رقم العينة: ${labResult.sample.sample_number}`} variant="outlined" />
                    {labResult.sample.section_name && (
                      <Chip label={`القسم: ${labResult.sample.section_name}`} variant="outlined" />
                    )}
                  </Stack>
                  <Stack spacing={1}>
                    {labResult.tests?.map((test, index) => (
                      <Stack key={`${test.test_name}-${index}`} direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          color={test.outcome === 'POSITIVE' ? 'error' : test.outcome === 'NEGATIVE' ? 'success' : 'warning'}
                          label={test.outcome_label || test.outcome}
                          variant="filled"
                        />
                        <Typography variant="body2">
                          {test.test_name}
                          {test.disease_name ? ` — ${test.disease_name}` : ''}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لم يتم العثور على نتيجة مخبرية مطابقة لهذا الرمز.
                </Typography>
              )}
            </CardContent>
          </Card>
        ) : null}
      </Grid>
    </Grid>
  );
};

const CertificateTab = () => {
  const [certNumber, setCertNumber] = useState('');
  const [result, setResult] = useState<CertificateVerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!certNumber.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await verifyCertificate(certNumber.trim());
      setResult(response.data.data);
    } catch {
      setError('تعذر التحقق من الشهادة، حاول مرة أخرى لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              التحقق من شهادة صحية
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              أدخل رقم الشهادة الصحية الدولية للتحقق من صحتها وصلاحيتها (مثال: NQP-YF-2026-0001).
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="رقم الشهادة"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                fullWidth
                dir="ltr"
              />
              <Button
                variant="contained"
                onClick={submit}
                disabled={!certNumber.trim() || loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <VerifiedIcon />}
              >
                تحقق
              </Button>
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        {result && (
          <Card sx={{ border: '1px solid', borderColor: result.valid ? 'success.main' : 'error.main' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                {result.valid ? (
                  <VerifiedIcon sx={{ fontSize: 44, color: 'success.main' }} />
                ) : (
                  <CancelIcon sx={{ fontSize: 44, color: 'error.main' }} />
                )}
                <Typography variant="h6" sx={{ fontWeight: 700, color: result.valid ? 'success.main' : 'error.main' }}>
                  {result.valid ? 'الشهادة سارية ومعتمدة' : 'الشهادة غير صالحة'}
                </Typography>
              </Stack>
              {result.valid && result.certificate ? (
                <Stack spacing={1}>
                  <Typography variant="body1">
                    <b>رقم الشهادة:</b> {result.certificate.certificate_number}
                  </Typography>
                  <Typography variant="body1">
                    <b>اسم الحامل:</b> {result.certificate.traveler_name}
                  </Typography>
                  <Typography variant="body1">
                    <b>جواز السفر:</b> {result.certificate.passport_number}
                  </Typography>
                  <Typography variant="body1">
                    <b>النوع:</b> {certificateTypeLabels[result.certificate.certificate_type] || result.certificate.certificate_type}
                  </Typography>
                  {result.certificate.disease && (
                    <Typography variant="body1">
                      <b>التطعيم/المرض:</b> {result.certificate.disease}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    تاريخ الإصدار: {result.certificate.issued_date}
                    {result.certificate.expiry_date ? ` · الانتهاء: ${result.certificate.expiry_date}` : ' · سارية مدى الحياة'}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {result.reason === 'NOT_FOUND' && 'لا توجد شهادة مسجلة بهذا الرقم.'}
                  {result.reason === 'REVOKED' && 'تم إلغاء هذه الشهادة.'}
                  {result.reason === 'EXPIRED' && 'انتهت صلاحية هذه الشهادة.'}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
};

const SERVICE_WORKER_PATH = '/sw.js';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const NotificationsTab = () => {
  const [notices, setNotices] = useState<Array<{ id: string; title: string; description: string; priority: string; published_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [notSupported, setNotSupported] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    getNotices()
      .then((response) => setNotices(response.data.data))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, []);

  const subscribe = async () => {
    setNotSupported(false);
    setPermissionDenied(false);
    setSubscribeError(null);

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotSupported(true);
      return;
    }

    setSubscribing(true);
    try {
      const vapidResponse = await getWebPushVapidKey();
      const vapidPublicKey = vapidResponse.data.data.vapid_public_key;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPermissionDenied(true);
        return;
      }

      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const sub = pushSubscription.toJSON();
      await subscribeWebPush({
        endpoint: sub.endpoint ?? '',
        keys: {
          p256dh: sub.keys?.p256dh ?? '',
          auth: sub.keys?.auth ?? '',
        },
      });

      setSubscribed(true);
      registration.showNotification('منصة الحجر الصحي القومي', {
        body: 'تم تفعيل الإشعارات الفورية بنجاح.',
        icon: '/favicon.svg',
        dir: 'rtl',
        lang: 'ar',
        data: { url: '/services/tools' },
      });
    } catch {
      setSubscribeError('تعذر تفعيل الإشعارات، تحقق من دعم المتصفح وحاول مجدداً.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              الإشعارات الفورية
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              فعّل إشعارات المتصفح ليصلك تنبيه فوري عند إصدار إعلانات صحية أو تحديث متطلبات السفر.
            </Typography>
            <Button
              variant="contained"
              onClick={subscribe}
              disabled={subscribed || subscribing}
              startIcon={subscribed ? <CheckCircleIcon /> : subscribing ? <CircularProgress size={18} color="inherit" /> : <NotificationsActiveIcon />}
              fullWidth
            >
              {subscribed ? 'تم تفعيل الإشعارات' : subscribing ? 'جارٍ التفعيل...' : 'تفعيل الإشعارات'}
            </Button>
            {notSupported && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                متصفحك لا يدعم الإشعارات الفورية.
              </Alert>
            )}
            {permissionDenied && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                تم رفض إذن الإشعارات. يمكنك تفعيله من إعدادات المتصفح ثم المحاولة مرة أخرى.
              </Alert>
            )}
            {subscribeError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {subscribeError}
              </Alert>
            )}
            {subscribed && (
              <Alert severity="success" sx={{ mt: 2 }}>
                تم تفعيل الإشعارات الفورية بنجاح.
              </Alert>
            )}
            <Alert severity="info" icon={<BadgeIcon />} sx={{ mt: 2.5 }}>
              سيتم إرسال التنبيهات الهامة فقط (إنذارات وبائية، تغيير متطلبات الدخول).
            </Alert>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              أحدث الإشعارات الصحية
            </Typography>
            {loading ? (
              <ListSkeleton count={3} />
            ) : notices.length === 0 ? (
              <EmptyState icon={<NotificationsIcon />} title="لا توجد إشعارات حالياً" />
            ) : (
              <List>
                {notices.map((notice) => (
                  <ListItem
                    key={notice.id}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: 'primary.lighter',
                      alignItems: 'flex-start',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={notice.priority === 'HIGH' ? 'عالي' : notice.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                            size="small"
                            color={notice.priority === 'HIGH' ? 'error' : notice.priority === 'MEDIUM' ? 'warning' : 'info'}
                          />
                          <Typography sx={{ fontWeight: 700 }}>{notice.title}</Typography>
                        </Stack>
                      }
                      secondary={notice.description}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const riskTone = (risk: string): 'success' | 'warning' | 'error' => {
  if (risk === 'RED') return 'error';
  if (risk === 'YELLOW') return 'warning';
  return 'success';
};

const riskLabel = (risk: string): string => {
  if (risk === 'RED') return 'خطورة عالية';
  if (risk === 'YELLOW') return 'خطورة متوسطة';
  return 'خطورة منخفضة';
};

const TravelAdviceTab = () => {
  const [countries, setCountries] = useState<PublicCountry[]>([]);
  const [selected, setSelected] = useState<PublicCountry | null>(null);
  const [advice, setAdvice] = useState<TravelRequirement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCountries()
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setCountries(Array.isArray(d) ? d : []);
      })
      .catch(() => setCountries([]));
  }, []);

  const choose = (c: PublicCountry | null) => {
    setSelected(c);
    if (!c) return;
    setLoading(true);
    getTravelRequirements(c.code)
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setAdvice(Array.isArray(d) && d[0] ? d[0] : null);
      })
      .catch(() => {
        setAdvice(null);
        notifyError('تعذّر جلب بيانات الدولة');
      })
      .finally(() => setLoading(false));
  };

  return (
    <Stack spacing={2}>
      <Autocomplete
        options={countries}
        getOptionLabel={(c) => c.name_ar || c.name}
        value={selected}
        onChange={(_, c) => choose(c)}
        loading={countries.length === 0}
        renderInput={(params) => (
          <TextField
            {...params}
            label="اختر دولة الوجهة أو المنشأ"
            placeholder="مثال: الصين، الهند، السعودية…"
          />
        )}
      />
      {loading && <CircularProgress size={24} />}
      {selected && !loading && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 700 }}>{advice?.country_name_ar || selected.name_ar || selected.name}</Typography>
              <StatusChip label={riskLabel(selected.risk_level)} tone={riskTone(selected.risk_level)} />
            </Stack>
          </Box>
        </Alert>
      )}
      {advice && (advice.requirements ?? []).length > 0 && (
        <Stack spacing={1}>
          {advice.requirements.slice(0, 5).map((req) => (
            <Card key={req.title} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{req.title}</Typography>
                <Typography variant="body2" color="text.secondary">{req.description}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      {advice && (advice.requirements ?? []).length === 0 && selected && !loading && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          لا توجد متطلبات صحية مفروضة حالياً لدخول هذه الدولة — لكن راقب التنبيهات الصحية أولاً بأول.
        </Alert>
      )}
    </Stack>
  );
};

const FlightTab = () => {
  const [number, setNumber] = useState('');
  const [flights, setFlights] = useState<PublicFlight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!number.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getFlightStatus(number.trim());
      setFlights(r.data?.data ?? r.data ?? []);
    } catch {
      setFlights([]);
      setError('لا توجد رحلة بهذا الرقم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          label="رقم الرحلة"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void run(); }}
          placeholder="مثال: J4001 أو BDR12"
          sx={{ flexGrow: 1 }}
        />
        <Button variant="contained" startIcon={<FlightTakeoffIcon />} disabled={loading || !number.trim()} onClick={() => void run()}>
          {loading ? 'جارٍ البحث…' : 'بحث'}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {!error && flights.length === 0 && number && !loading && (
        <EmptyState title="لا توجد نتائج" description="أدخل رقم رحلة للاستعلام عن حالتها" />
      )}
      <Stack spacing={1}>
        {flights.map((f) => (
          <Card key={f.flight_number + f.scheduled_arrival} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 16 }}>
                    {f.flight_number}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{f.carrier_name}</Typography>
                </Stack>
                <StatusChip label={f.status_label} tone={f.status === 'CANCELLED' ? 'error' : f.status === 'ARRIVED' ? 'success' : 'primary'} />
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">من</Typography>
                <TextField label="المغادرة" value={f.origin_code} size="small" disabled />
                <Typography variant="body2" color="text.secondary">إلى</Typography>
                <TextField label="الوجهة" value={f.destination_name} size="small" disabled />
                <Typography variant="body2" color="text.secondary">{f.scheduled_arrival ? formatDateTime(f.scheduled_arrival) : ''}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};

const FoodShipmentTab = () => {
  const [reference, setReference] = useState('');
  const [shipment, setShipment] = useState<FoodShipmentTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!reference.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await trackFoodShipment(reference.trim());
      setShipment(r.data?.data ?? r.data);
    } catch {
      setShipment(null);
      setError('لم يُعثر على شحنة بهذا الرقم');
    } finally {
      setLoading(false);
    }
  };

  const released = shipment?.status === 'RELEASED' || shipment?.status === 'CONDITIONAL_RELEASE';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          label="رقم البيان أو رقم شهادة الإفراج"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void run(); }}
          placeholder="مثال: شحنة NQC-1001"
          sx={{ flexGrow: 1 }}
        />
        <Button variant="contained" startIcon={<LocalShippingIcon />} disabled={loading || !reference.trim()} onClick={() => void run()}>
          {loading ? 'جارٍ الفحص…' : 'تتبع'}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {shipment && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 16 }}>{shipment.manifest_number}</Typography>
                <Typography variant="caption" color="text.secondary">{shipment.port_name}</Typography>
              </Stack>
              <StatusChip label={shipment.status_label} tone={released ? 'success' : shipment.status === 'REJECTED' || shipment.status === 'DESTROYED' || shipment.status === 'HOLD' ? 'error' : 'warning'} />
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField label="المورد" value={shipment.supplier_name} size="small" disabled />
              <TextField label="دولة المنشأ" value={shipment.origin_country} size="small" disabled />
              <TextField label="تاريخ الوصول" value={shipment.arrival_date ?? '—'} size="small" disabled />
              <TextField label="الوزن الكلي (كغ)" value={String(shipment.total_weight_kg)} size="small" disabled />
              {shipment.vessel_name && <TextField label="الباخرة/الوسيلة" value={shipment.vessel_name} size="small" disabled />}
              {shipment.decision && (
                <TextField label="القرار النهائي" value={shipment.decision} size="small" disabled />
              )}
            </Box>
            {(shipment.products ?? []).length > 0 && (
              <>
                <Typography sx={{ fontWeight: 700, mt: 2, mb: 1 }}>المنتجات</Typography>
                <Stack spacing={1}>
                  {shipment.products.map((p, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="body2">{p.name}</Typography>
                      {p.quantity !== '' && <Chip size="small" label={String(p.quantity)} variant="outlined" />}
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
            {shipment.release_certificate && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }} icon={<VerifiedIcon />}>
                تم الإفراج عن الشحنة — شهادة الإفراج: <b>{shipment.release_certificate}</b>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

const VerifyTools = () => {
  const [tab, setTab] = useState(0);

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="أدوات التحقق"
        >
          <Tab icon={<SearchIcon />} iconPosition="start" label="بحث عن الطلب" />
          <Tab icon={<QrCode2Icon />} iconPosition="start" label="QR Code" />
          <Tab icon={<VerifiedIcon />} iconPosition="start" label="شهادة صحية" />
          <Tab icon={<NotificationsIcon />} iconPosition="start" label="إشعارات فورية" />
          <Tab icon={<PublicIcon />} iconPosition="start" label="مشورة السفر" />
          <Tab icon={<FlightTakeoffIcon />} iconPosition="start" label="حالة الرحلة" />
          <Tab icon={<LocalShippingIcon />} iconPosition="start" label="تتبع الشحنة" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <LookupTab />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <QrTab />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <CertificateTab />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <NotificationsTab />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <TravelAdviceTab />
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <FlightTab />
      </TabPanel>
      <TabPanel value={tab} index={6}>
        <FoodShipmentTab />
      </TabPanel>
    </Card>
  );
};

export default VerifyTools;
