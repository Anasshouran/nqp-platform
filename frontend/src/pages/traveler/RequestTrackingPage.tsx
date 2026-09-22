import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import UploadIcon from '@mui/icons-material/Upload';
import { PageHeader, EmptyState, ListSkeleton } from '../../components/common';
import { lookupTraveler } from '../../api/endpoints/public';
import { getTravelerStatus, getTravelerQr, refreshTravelerQr, getTravelerTimeline } from '../../api/endpoints/travelers';
import type { TravelerLookupResult } from '../../api/endpoints/public';
import type { TravelerQrResult, TravelerStatusResult, TravelerStatusLog } from '../../api/endpoints/travelers';
import { getTravelerSession, setTravelerSession } from '../../utils/travelerSession';

const registrationLabels: Record<string, string> = {
  PENDING_DOCUMENTS: 'بانتظار المستندات',
  UNDER_REVIEW: 'قيد المراجعة',
  ACTION_REQUIRED: 'إجراء مطلوب',
  COMPLETED: 'مكتمل',
  REJECTED: 'مرفوض',
};

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  PENDING_DOCUMENTS: 'warning',
  UNDER_REVIEW: 'info',
  ACTION_REQUIRED: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error',
};

const progressFor = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return 100;
    case 'UNDER_REVIEW':
      return 60;
    case 'ACTION_REQUIRED':
      return 40;
    case 'PENDING_DOCUMENTS':
      return 20;
    default:
      return 0;
  }
};

const buildTimeline = (status: TravelerStatusResult) => {
  const steps = [
    { label: 'تم إنشاء الطلب', status: 'done' },
    { label: 'رفع المستندات', status: status.registration_status !== 'PENDING_DOCUMENTS' ? 'done' : 'current' },
    { label: 'الإقرار الصحي والمراجعة', status: status.registration_status === 'UNDER_REVIEW' ? 'current' : status.registration_status === 'ACTION_REQUIRED' ? 'current' : status.registration_status === 'COMPLETED' ? 'done' : 'upcoming' },
    { label: 'اعتماد الطلب وإصدار QR', status: status.registration_status === 'COMPLETED' ? 'done' : 'upcoming' },
  ];
  if (status.registration_status === 'REJECTED') {
    return steps.map((step) => (step.status === 'current' ? { ...step, status: 'rejected' } : step));
  }
  return steps;
};

const RequestTrackingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [passport, setPassport] = useState('');
  const [dob, setDob] = useState('');
  const [lookup, setLookup] = useState<TravelerLookupResult | null>(null);
  const [status, setStatus] = useState<TravelerStatusResult | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<TravelerStatusLog[]>([]);
  const [qr, setQr] = useState<TravelerQrResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingQr, setRefreshingQr] = useState(false);

  const refreshQr = async () => {
    if (!lookup?.traveler_id || refreshingQr) return;
    setRefreshingQr(true);
    try {
      const res = await refreshTravelerQr(lookup.traveler_id);
      setQr(res.data.data);
    } catch {
      setError('تعذر إعادة إصدار رمز QR، حاول مرة أخرى.');
    } finally {
      setRefreshingQr(false);
    }
  };

  const qrExpired = Boolean(
    qr && qr.qr_data.expires_at && new Date(qr.qr_data.expires_at).getTime() < Date.now(),
  );
  const qrExpiringSoon = Boolean(
    qr &&
      qr.qr_data.expires_at &&
      !qrExpired &&
      new Date(qr.qr_data.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000,
  );

  const load = async (passportNumber: string, dobValue: string) => {
    setLoading(true);
    setError(null);
    setLookup(null);
    setStatus(null);
    setTimelineLogs([]);
    setQr(null);
    try {
      const lookupResponse = await lookupTraveler(passportNumber, dobValue);
      const result = lookupResponse.data.data;
      setLookup(result);
      if (result.found && result.traveler_id) {
        setTravelerSession({
          traveler_id: result.traveler_id,
          passport_number: result.passport_number || passportNumber,
          full_name: result.full_name || '',
          nationality: result.nationality,
          registration_status: result.registration_status,
        });
        const statusResponse = await getTravelerStatus(result.traveler_id);
        setStatus(statusResponse.data.data);
        try {
          const timelineResponse = await getTravelerTimeline(result.traveler_id);
          setTimelineLogs(timelineResponse.data.data);
        } catch {
          setTimelineLogs([]);
        }
        if (statusResponse.data.data.registration_status === 'COMPLETED') {
          try {
            const qrResponse = await getTravelerQr(result.traveler_id);
            setQr(qrResponse.data.data);
          } catch {
            setQr(null);
          }
        }
      }
    } catch {
      setError('تعذر تحميل حالة الطلب، حاول مرة أخرى لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getTravelerSession();
    const initial = searchParams.get('passport') || session?.passport_number || '';
    if (initial) {
      setPassport(initial);
    }
  }, []);

  const submit = () => {
    if (!passport.trim() || !dob.trim()) {
      setError(!passport.trim() ? 'يرجى إدخال رقم جواز السفر.' : 'يرجى إدخال تاريخ الميلاد للتحقق من الهوية.');
      return;
    }
    load(passport.trim(), dob.trim());
  };

  const downloadQr = () => {
    if (!qr?.qr_code) return;
    const link = document.createElement('a');
    link.href = qr.qr_code;
    link.download = 'nqp-qr-code.png';
    link.click();
  };

  const printQr = () => {
    if (!qr?.qr_code) return;
    const win = window.open('', '_blank', 'width=600,height=700');
    if (!win) return;
    win.document.write(
      `<html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px">` +
        `<h2>منصة الحجر الصحي القومي</h2>` +
        `<p>${lookup?.full_name || ''} · ${lookup?.passport_number || ''}</p>` +
        `<img src="${qr.qr_code}" width="320" height="320" style="margin:20px 0" />` +
        `<p>اعرض هذا الرمز لموظف الحجر الصحي عند الوصول.</p>` +
        `</body></html>`
    );
    win.document.close();
    win.print();
  };

  const shareQr = async () => {
    if (!qr?.qr_code || !navigator.share) return;
    try {
      const response = await fetch(qr.qr_code);
      const blob = await response.blob();
      const file = new File([blob], 'nqp-qr-code.png', { type: 'image/png' });
      await navigator.share({ files: [file], title: 'رمز QR - NQP' });
    } catch {
      // user cancelled or share unsupported
    }
  };

  const progress = progressFor(status?.registration_status || lookup?.registration_status);
  const timeline = status ? buildTimeline(status) : [];
  const historyLogs = [...timelineLogs].reverse();

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/traveler/dashboard')} sx={{ mb: 2 }}>
        العودة إلى لوحة التحكم
      </Button>
      <PageHeader
        title="تتبع الطلب"
        subtitle="تابع حالة طلب التسجيل المسبق والخطوات المتبقية"
        eyebrow="بوابة المسافرين"
      />

      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
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
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </CardContent>
      </Card>

      {loading ? (
        <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
          <CardContent><ListSkeleton count={4} /></CardContent>
        </Card>
      ) : lookup?.found ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main' }}>
                      <QrCode2Icon />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {lookup.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" dir="ltr" textAlign="right">
                        {lookup.passport_number}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={registrationLabels[status?.registration_status || lookup.registration_status || ''] || status?.registration_status}
                    color={statusColors[status?.registration_status || lookup.registration_status || ''] || 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Box sx={{ flex: 1, height: 12, borderRadius: 6, bgcolor: 'divider', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${progress}%`, bgcolor: 'primary.main', borderRadius: 6 }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {progress}%
                  </Typography>
                </Box>

                <Stack spacing={1} sx={{ mb: 3 }}>
                  {timeline.map((step, index) => (
                    <Stack key={index} direction="row" spacing={1.5} alignItems="center">
                      {step.status === 'done' ? (
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />
                      ) : step.status === 'current' ? (
                        <ScheduleIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                      ) : step.status === 'rejected' ? (
                        <ScheduleIcon sx={{ color: 'error.main', fontSize: 22 }} />
                      ) : (
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid', borderColor: 'divider' }} />
                      )}
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: step.status === 'current' ? 700 : 500,
                          color: step.status === 'done' ? 'success.main' : step.status === 'rejected' ? 'error.main' : step.status === 'current' ? 'warning.main' : 'text.secondary',
                        }}
                      >
                        {step.label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                {status?.registration_status === 'REJECTED' && status.rejection_reason && (
                  <Alert severity="error">
                    سبب الرفض: {status.rejection_reason}
                  </Alert>
                )}
                {status?.registration_status === 'PENDING_DOCUMENTS' && (
                  <Alert severity="warning">
                    الإجراء المطلوب: يرجى رفع المستندات المطلوبة.
                    <Button size="small" sx={{ mt: 1 }} startIcon={<UploadIcon />} onClick={() => navigate('/traveler/documents')}>
                      رفع المستندات
                    </Button>
                  </Alert>
                )}
                {status?.registration_status === 'ACTION_REQUIRED' && (
                  <Alert severity="warning">
                    {status.rejection_reason || 'طلبك يحتاج إلى إجراء منك قبل متابعة المراجعة.'}
                    <Button size="small" sx={{ mt: 1 }} startIcon={<EditIcon />} onClick={() => navigate(`/traveler/documents`)}>
                      تعديل الطلب
                    </Button>
                  </Alert>
                )}
                {status?.registration_status === 'UNDER_REVIEW' && (
                  <Alert severity="info">طلبك قيد المراجعة، سيتم إشعارك عند تحديث الحالة.</Alert>
                )}
                {status?.registration_status === 'COMPLETED' && (
                  <Alert severity="success">
                    تم اعتماد طلبك بنجاح! يمكنك الآن تنزيل رمز QR الخاص بك.
                  </Alert>
                )}
              </CardContent>
            </Card>

            {historyLogs.length > 0 && (
              <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, mt: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    سجل التحديثات
                  </Typography>
                  <Stack spacing={2}>
                    {historyLogs.map((log) => (
                      <Stack key={log.id} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.6 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {registrationLabels[log.to_status] || log.to_status}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {new Date(log.created_at).toLocaleString('ar-SA')}
                            {log.changed_by_name ? ` — ${log.changed_by_name}` : ''}
                          </Typography>
                          {log.note && (
                            <Typography variant="body2" color="text.secondary">
                              {log.note}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>

          <Grid item xs={12} md={5}>
            {status?.registration_status === 'COMPLETED' && qr ? (
              <Card sx={{ border: '1px solid', borderColor: 'success.main', borderRadius: 4 }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    رمز QR الخاص بك
                  </Typography>
                  <Box
                    component="img"
                    src={qr.qr_code}
                    alt="رمز QR"
                    sx={{ width: 240, height: 240, border: '1px solid', borderColor: 'divider', borderRadius: 3, mx: 'auto', display: 'block' }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 2 }}>
                    {lookup.full_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" dir="ltr">
                    {lookup.passport_number}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    صادر: {new Date(qr.qr_data.issued_at).toLocaleString('ar-SA')}
                  </Typography>
                  {qrExpired ? (
                    <Alert severity="error" sx={{ mt: 1.5, textAlign: 'right' }}>
                      منتهي الصلاحية — يرجى طلب إعادة الإصدار.
                    </Alert>
                  ) : qrExpiringSoon ? (
                    <Alert severity="warning" sx={{ mt: 1.5, textAlign: 'right' }}>
                      سينتهي صلاحية الرمز خلال 24 ساعة.
                    </Alert>
                  ) : (
                    <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 1.5, textAlign: 'right' }}>
                      نشط — صالح للاستخدام حتى {new Date(qr.qr_data.expires_at).toLocaleString('ar-SA')}
                    </Alert>
                  )}
                  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2.5 }} flexWrap="wrap" gap={1}>
                    <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={downloadQr}>
                      تنزيل
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={printQr}>
                      طباعة
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<ShareIcon />} onClick={shareQr}>
                      مشاركة
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={refreshingQr ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                      onClick={refreshQr}
                      disabled={refreshingQr}
                    >
                      إعادة الإصدار
                    </Button>
                  </Stack>
                  <Alert severity="info" icon={<RefreshIcon />} sx={{ mt: 2.5, textAlign: 'right' }}>
                    اعرض هذا الرمز لموظف الحجر الصحي عند وصولك إلى المنفذ لتسريع إجراءاتك.
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
                <CardContent sx={{ p: 3 }}>
                  <EmptyState
                    icon={<QrCode2Icon />}
                    title="رمز QR غير متاح بعد"
                    description={
                      status?.registration_status === 'REJECTED'
                        ? 'تم رفض طلبك. يرجى التواصل مع الدعم.'
                        : 'سيتم إصدار رمز QR بعد اعتماد الطلب واكتمال جميع الخطوات.'
                    }
                  />
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      ) : (
        <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
          <CardContent>
            <EmptyState
              icon={<SearchIcon />}
              title={lookup ? 'لم يتم العثور على الطلب' : 'ابحث عن طلبك'}
              description="أدخل رقم جواز السفر وتاريخ الميلاد أعلاه لعرض حالة الطلب، أو سجّل مسبقاً من بوابة المسافرين."
            />
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default RequestTrackingPage;
