import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import PersonIcon from '@mui/icons-material/Person';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DownloadIcon from '@mui/icons-material/Download';
import BadgeIcon from '@mui/icons-material/Badge';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import ScienceIcon from '@mui/icons-material/Science';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader, ListSkeleton, EmptyState } from '../../components/common';
import { getTraveler, getTravelerDocuments, getTravelerQr } from '../../api/endpoints/travelers';
import type { TravelerDocument, TravelerQrResult } from '../../api/endpoints/travelers';
import type { Traveler } from '../../types/traveler';
import { getCountries, getPorts } from '../../api/endpoints/public';
import type { PublicCountry, PublicPort } from '../../api/endpoints/public';
import { getTravelerSession, clearTravelerSession } from '../../utils/travelerSession';

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

const riskColors: Record<string, 'success' | 'warning' | 'error'> = {
  منخفض: 'success',
  متوسط: 'warning',
  مرتفع: 'error',
};

const symptomLabels: Record<string, string> = {
  fever: 'حمى',
  headache: 'صداع',
  body_pain: 'ألم في الجسم',
  vomiting: 'قيء',
  diarrhea: 'إسهال',
  loss_of_appetite: 'فقدان الشهية',
  difficulty_swallowing: 'صعوبة في البلع',
  bleeding: 'نزيف',
  contact_with_patient: 'مخالطة مريض',
  other_symptoms: 'أعراض أخرى',
};

const transportLabels: Record<string, string> = {
  AIR: 'طائرة',
  SEA: 'سفينة',
  LAND: 'بر',
};

const documentTypeMeta: Record<string, { label: string; icon: React.ReactNode }> = {
  PASSPORT: { label: 'جواز السفر', icon: <BadgeIcon /> },
  VACCINE: { label: 'شهادة تطعيم', icon: <VaccinesIcon /> },
  TEST_RESULT: { label: 'نتيجة فحص', icon: <ScienceIcon /> },
  OTHER: { label: 'أخرى', icon: <FolderOpenIcon /> },
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

const formatFileSize = (bytes?: number | null) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
};

interface InfoRowProps {
  label: string;
  value: string;
  dir?: string;
}

const InfoRow = ({ label, value, dir }: InfoRowProps) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ py: 0.6 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0, fontWeight: 600 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }} dir={dir}>
      {value}
    </Typography>
  </Stack>
);

const SectionCard = ({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main' }}>
            {icon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        {action}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

const HealthProfilePage = () => {
  const navigate = useNavigate();
  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [documents, setDocuments] = useState<TravelerDocument[]>([]);
  const [qr, setQr] = useState<TravelerQrResult | null>(null);
  const [countries, setCountries] = useState<PublicCountry[]>([]);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCountries(), getPorts()])
      .then(([countryResponse, portResponse]) => {
        setCountries(countryResponse.data.data);
        setPorts(portResponse.data.data);
      })
      .catch(() => undefined);
  }, []);

  const load = async (travelerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const travelerResponse = await getTraveler(travelerId);
      setTraveler(travelerResponse.data.data);
      try {
        const docsResponse = await getTravelerDocuments(travelerId);
        setDocuments(docsResponse.data.data);
      } catch {
        setDocuments([]);
      }
      if (travelerResponse.data.data.registration_status === 'COMPLETED') {
        try {
          const qrResponse = await getTravelerQr(travelerId);
          setQr(qrResponse.data.data);
        } catch {
          setQr(null);
        }
      }
    } catch {
      setError('تعذر تحميل الملف الصحي، حاول مرة أخرى لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getTravelerSession();
    if (session?.traveler_id) {
      load(session.traveler_id);
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    clearTravelerSession();
    setTraveler(null);
    setDocuments([]);
    setQr(null);
  };

  const med = useMemo(() => (traveler?.medical_history || {}) as Record<string, any>, [traveler]);
  const declaration = useMemo(() => (med.health_declaration || {}) as Record<string, any>, [med]);
  const trip = useMemo(() => (med.trip || {}) as Record<string, any>, [med]);
  const contact = useMemo(() => (med.contact || {}) as Record<string, any>, [med]);

  const countryName = (code?: string) =>
    countries.find((c) => c.code === code)?.name_ar || countries.find((c) => c.code === code)?.name || code || '—';

  const portName = (id?: string) => ports.find((p) => p.id === id)?.name_ar || id || '—';

  const activeSymptoms = useMemo(
    () =>
      declaration.symptoms
        ? Object.entries(declaration.symptoms as Record<string, { has: boolean }>)
            .filter(([, s]) => s.has)
            .map(([key]) => symptomLabels[key] || key)
        : [],
    [declaration],
  );

  const groupedDocuments = useMemo(() => {
    const groups: Record<string, TravelerDocument[]> = {};
    documents.forEach((doc) => {
      const key = doc.document_type || 'OTHER';
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });
    return groups;
  }, [documents]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <PageHeader title="الملف الصحي" subtitle="جارٍ تحميل الملف الصحي للمسافر" eyebrow="بوابة المسافرين" />
        <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
          <CardContent><ListSkeleton count={5} /></CardContent>
        </Card>
      </Container>
    );
  }

  if (error || !traveler) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <PageHeader title="الملف الصحي" subtitle="الملف الصحي الكامل للمسافر" eyebrow="بوابة المسافرين" />
        <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <EmptyState
              icon={<PersonIcon />}
              title="لا يوجد ملف صحي"
              description="سجّل مسبقاً عبر بوابة المسافرين أو ابحث عن طلبك من لوحة التحكم."
            />
            <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => navigate('/traveler/register')}>
                تسجيل مسبق
              </Button>
              <Button variant="outlined" onClick={() => navigate('/traveler/dashboard')}>
                لوحة التحكم
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const hasAnyDocument = Object.keys(groupedDocuments).length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/traveler/dashboard')} sx={{ mb: 2 }}>
        العودة إلى لوحة التحكم
      </Button>
      <PageHeader
        title="الملف الصحي"
        subtitle="ملف المسافر الصحي الكامل — البيانات الشخصية والطبية والمستندات"
        eyebrow="بوابة المسافرين"
        action={
          <Button variant="outlined" startIcon={<QrCode2Icon />} onClick={() => navigate('/traveler/tracking')}>
            تتبع الطلب
          </Button>
        }
      />

      {/* Identity header */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, mb: 3, overflow: 'hidden' }}>
        <Box sx={{ background: 'linear-gradient(135deg, #075447, #0e8a72 60%, #12a585)', px: 3, py: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.35)' }}>
                <PersonIcon sx={{ fontSize: 34, color: '#fff' }} />
              </Avatar>
              <Box sx={{ color: '#fff' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {traveler.full_name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }} dir="ltr" textAlign="right">
                  {traveler.passport_number}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip
                label={registrationLabels[traveler.registration_status] || traveler.registration_status}
                color={statusColors[traveler.registration_status] || 'default'}
                sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.92)' }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={logout}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: '#fff' } }}
              >
                تسجيل الخروج
              </Button>
            </Stack>
          </Stack>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <InfoRow label="تاريخ الميلاد" value={formatDate(traveler.date_of_birth)} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <InfoRow label="الجنسية" value={countryName(traveler.nationality)} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <InfoRow label="الجنس" value={med.gender || '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <InfoRow label="تاريخ التسجيل" value={formatDate(traveler.created_at)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Main column */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Health declaration */}
            <SectionCard icon={<HealthAndSafetyIcon />} title="الإقرار الصحي">
              {declaration.risk_level ? (
                <>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`${declaration.risk_level} (${declaration.risk_score ?? 0} نقطة)`}
                      color={riskColors[declaration.risk_level] || 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      تم التقديم في {formatDate(med.updated_at || traveler.updated_at)}
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />
                  <InfoRow
                    label="الأعراض المصرَّح بها"
                    value={
                      activeSymptoms.length > 0
                        ? activeSymptoms.join('، ')
                        : 'لا توجد أعراض'
                    }
                  />
                </>
              ) : (
                <Alert severity="info" sx={{ mb: 1 }}>
                  لم يتم تقديم الإقرار الصحي بعد.
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/traveler/register')}>
                    تقديم الإقرار الصحي
                  </Button>
                </Alert>
              )}
            </SectionCard>

            {/* Trip info */}
            <SectionCard icon={<FlightTakeoffIcon />} title="بيانات الرحلة">
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="دولة القدوم" value={countryName(trip.origin_country)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="منفذ الدخول" value={portName(trip.port_of_entry)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="وسيلة النقل" value={transportLabels[trip.transport_mode] || trip.transport_mode || '—'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow
                    label="الرحلة / المقعد"
                    value={`${trip.flight_number || '—'}${trip.seat_number ? ` · ${trip.seat_number}` : ''}`}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="تاريخ الوصول" value={formatDate(trip.arrival_date)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow
                    label="دول العبور"
                    value={
                      Array.isArray(trip.transit_countries) && trip.transit_countries.length > 0
                        ? trip.transit_countries.map((c: string) => countryName(c)).join('، ')
                        : '—'
                    }
                  />
                </Grid>
                {med.purpose && (
                  <Grid item xs={12}>
                    <InfoRow label="الغرض من الزيارة" value={med.purpose} />
                  </Grid>
                )}
              </Grid>
            </SectionCard>

            {/* Medical documents */}
            <SectionCard icon={<FolderOpenIcon />} title="المستندات الطبية" action={<Chip size="small" label={`${documents.length} مستند`} color="primary" variant="outlined" />}>
              {!hasAnyDocument ? (
                <Alert severity="info">
                  لا توجد مستندات مرفوعة بعد.
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/traveler/documents')}>
                    رفع المستندات
                  </Button>
                </Alert>
              ) : (
                Object.entries(groupedDocuments).map(([type, docs]) => {
                  const meta = documentTypeMeta[type] || documentTypeMeta.OTHER;
                  return (
                    <Box key={type} sx={{ mb: 2.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Box sx={{ color: 'primary.main', display: 'flex' }}>{meta.icon}</Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {meta.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({docs.length})
                        </Typography>
                      </Stack>
                      <Stack spacing={1}>
                        {docs.map((doc) => (
                          <Card key={doc.id} variant="outlined" sx={{ borderColor: 'divider' }}>
                            <CardContent sx={{ p: 2, py: 1.5 }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" gap={1}>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }} dir="ltr" textAlign="right">
                                    {doc.file_url?.split('/').pop() || doc.file}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(doc.uploaded_at)}
                                    {doc.expiry_date ? ` · ينتهي ${formatDate(doc.expiry_date)}` : ''}
                                    {doc.file_size != null ? ` · ${formatFileSize(doc.file_size)}` : ''}
                                  </Typography>
                                </Box>
                                {doc.file_url && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    sx={{ flexShrink: 0 }}
                                  >
                                    تحميل
                                  </Button>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  );
                })
              )}
            </SectionCard>
          </Stack>
        </Grid>

        {/* Side column */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Contact */}
            <SectionCard icon={<ContactMailIcon />} title="التواصل">
              <Stack spacing={1}>
                <InfoRow label="رقم الجوال" value={traveler.phone || '—'} dir="ltr" />
                <InfoRow label="واتساب" value={contact.whatsapp || '—'} dir="ltr" />
                <InfoRow label="البريد الإلكتروني" value={traveler.email || '—'} dir="ltr" />
                <InfoRow label="رقم الطوارئ" value={contact.emergency_phone || '—'} dir="ltr" />
              </Stack>
            </SectionCard>

            {/* QR code */}
            <Card sx={{ border: '1px solid', borderColor: qr ? 'success.main' : 'divider', borderRadius: 4 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  رمز QR الصحي
                </Typography>
                {qr ? (
                  <>
                    <Box
                      component="img"
                      src={qr.qr_code}
                      alt="رمز QR"
                      sx={{ width: 200, height: 200, border: '1px solid', borderColor: 'divider', borderRadius: 3, mx: 'auto', display: 'block' }}
                    />
                    <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2, textAlign: 'right' }}>
                      نشط — صالح حتى {new Date(qr.qr_data.expires_at).toLocaleString('ar-SA')}
                    </Alert>
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/traveler/tracking')}
                    >
                      عرض وتنزيل الرمز
                    </Button>
                  </>
                ) : (
                  <>
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        mx: 'auto',
                        borderRadius: 3,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'action.hover',
                        color: 'text.disabled',
                      }}
                    >
                      <QrCode2Icon sx={{ fontSize: 60 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {traveler.registration_status === 'COMPLETED'
                        ? 'يمكنك عرض الرمز من صفحة تتبع الطلب.'
                        : 'سيتم إصدار رمز QR بعد اعتماد الطلب واكتمال جميع الخطوات.'}
                    </Typography>
                    <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/traveler/tracking')}>
                      عرض حالة الطلب
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HealthProfilePage;